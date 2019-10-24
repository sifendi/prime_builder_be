'use strict';
var async = require('async');
var http = require('http');
var schedule = require('node-schedule');
var Promise = require("bluebird");
var taskQueue = require("promise-task-queue");

var queue = taskQueue();
var failedRequests = 0;


module.exports = function(app){
	
	// this will execute the function every 20mins
	queue.define("targetCron1", function(sphJson) {
		return Promise.try(function() {
			app.cronExecuteForStatsNew(sphJson);
		}).then(function(response) {
			return true;
		});
	},
	{
		concurrency: 1
	});
	
	
	//to insert/update stats
	var j = schedule.scheduleJob('*/2 * * * *', function(cb){
		Promise.try(function() {
			return queue.push("targetCron1", []);
		}).then(function(jsonResponse) {
			console.log("Cron Non Cement success: "+jsonResponse);
		})
	});
	
	app.cronExecuteForStatsNew = function(sphIdArr){
		var sphIdArr = [19718];
		// get monthly stats for the current monthly
		return new Promise((resolve,reject)=>{

			var date = new Date();
			var currentMonth = (date.getMonth())+1;
			var currentYear = date.getFullYear();
			var todayDate = currentYear+"-"+currentMonth+"-"+date.getDate();
			
			// get all sph
			var sphQuery = "select distinct u.username, u.id, r.name from [User] u, Role r, RoleMapping rm  where r.id = rm.roleId and u.id = rm.principalId and r.name = '$sph'  and u.status = 1";
			
			if(sphIdArr!=""){
				var sph_no = [];
				for(var i=0; i<sphIdArr.length; i++){
					sph_no.push("(?)");
				}
				sph_no = sph_no.join(",");
				sphQuery+=" AND u.id IN ("+sph_no+")";
			}
			
			app.dataSources.accountDS.connector.execute(sphQuery,sphIdArr,(err,sphData)=>{
				
				if((sphData) && (sphData.length > 0)){
				
					async.each(sphData, function(sph, callback) {
					
						// get all the stats for the current month for non cement product
						var selectapp = "select * from monthly_actual_target where target_label not in ('srku_house_num','new_switching_hpb','cement_vol_maintain','cement_vol_switching','srku_vol') and target_month = "+currentMonth+" and target_year = "+currentYear+" and status = 1 and sph_id = "+sph.id;
						
						app.dataSources.accountDS.connector.execute(selectapp,null,(err,result)=>{
							
							var checkDate = Math.floor(new Date(currentYear+"-"+currentMonth+"-01"));
							var todayDateTimestamp = Math.floor(new Date(todayDate));
							var totalDays = (new Date(currentYear, currentMonth, 0).getDate())-(date.getDate());
							var targetFor = "";
							
							if((result) && (result.length > 0)){
								// for each target, run this loop
								async.each(result, function(statsDetail, callback2) {
									
									targetFor = statsDetail.target_label;
									
									// for estimated values
									var selectDailyStats = "select sum(target_value) as target_value from monthly_forecast_target where target_label = '"+statsDetail.target_label+"' and target_date = '"+todayDate+"' and sph_id = "+sph.id+" and status = 1";
									
									app.dataSources.accountDS.connector.execute(selectDailyStats,null,(err,estimatedDataRes)=>{
										
										if(estimatedDataRes){
											estimatedDataRes = estimatedDataRes[0].target_value;
										}else{
											estimatedDataRes = 0;
										}
										
										var estimated = estimatedDataRes;
										var monthly = statsDetail.target_value;
										var productname = (statsDetail.target_label).replace(/_/g," ");
										var nonCementAchievement = 0;
										var nonCementTodayAchievemntVal = 0;
										// check if product exist
										var selectProd = "select id from products_tbl where is_cement = 0 and name = (?)";
										app.dataSources.accountDS.connector.execute(selectProd,[productname],(err,prodResult)=>{
											
											//console.log("statsDetail.target_label 2",statsDetail.target_label);
											//console.log("product name",productname);
											
											if(prodResult && prodResult.length > 0){ // if product is valid
												
												nonCementAchievement = 0;
												nonCementTodayAchievemntVal = 0;
												
												// approved product receipt quantity for non cement product with 2 approvals
												var nonCementProd = "select distinct pr.receipt_id, pr.quantity, prod.unit_value, p.is_srku, h.hpb_status, pr.created_date from products_receipt_tbl pr, hpb_info_tbl h, products_receipt_approval_tbl pra, products_receipt_approval_tbl pra2, products_receipt_approval_tbl pra3, products_tbl prod, projects_tbl p left join srku_approval_status_tbl s on p.project_id = s.project_id where pra.receipt_id = pr.receipt_id and pra.approval_status = 1 and pra.approval_role = 'TLH' and pra.is_closed = 0 and  pra2.receipt_id = pr.receipt_id and pra2.approval_role = 'SA' and pra2.approval_status != -1 and pra2.is_closed = 0 and  pra3.receipt_id = pr.receipt_id and pra3.approval_role = 'AC' and pra3.approval_status != -1 and pra3.is_closed = 0 and prod.id = pr.product_id and p.project_id = pr.project_id and p.hpb_id = h.hpb_id and pr.created_by = "+sph.id+" and pr.created_date >= "+checkDate+" and prod.id = "+prodResult[0]['id']+" and pr.receipt_id in ( select  receipt_id from products_receipt_approval_tbl where is_closed = 0 group by receipt_id having count (receipt_id) = 3 )";
												console.log('nonCementProd2',nonCementProd);
													
												app.dataSources.accountDS.connector.execute(nonCementProd,null,(err,queryResult)=>{	
													
													//console.log("statsDetail.target_label 1",statsDetail.target_label);
													console.log('nonCementProd');
													// loop through all product receipts
													async.each(queryResult, function(queryResultData, callback3) {
														if(queryResultData.created_date >= todayDateTimestamp){
															var value = queryResultData.quantity*queryResultData.unit_value;
															nonCementTodayAchievemntVal = nonCementTodayAchievemntVal + value;
														}
														var value = queryResultData.quantity*queryResultData.unit_value;
														nonCementAchievement = nonCementAchievement + value;
														
														callback3();
													},
													(err)=>{
														//console.log("statsDetail.target_label",statsDetail.target_label);
														
														// approved product receipt quantity for non cement product with 3 approvals
														var nonCementProd2 = "select distinct pr.receipt_id, pr.quantity, prod.unit_value, p.is_srku, h.hpb_status, pr.created_date from products_receipt_tbl pr, hpb_info_tbl h, products_receipt_approval_tbl pra, products_receipt_approval_tbl pra2, products_tbl prod, projects_tbl p left join srku_approval_status_tbl s on p.project_id = s.project_id where pra.receipt_id = pr.receipt_id and pra.approval_status = 1 and pra.approval_role = 'TLH' and pra.is_closed = 0 and  pra2.receipt_id = pr.receipt_id and pra2.approval_role = 'SA' and pra2.approval_status != -1 and pra2.is_closed = 0 and prod.id = pr.product_id and p.project_id = pr.project_id and p.hpb_id = h.hpb_id and pr.created_by = "+sph.id+" and pr.created_date >= "+checkDate+" and prod.id = "+prodResult[0]['id']+" and pr.receipt_id in ( select  receipt_id from products_receipt_approval_tbl where is_closed = 0 group by receipt_id having count (receipt_id) = 2 )";
														app.dataSources.accountDS.connector.execute(nonCementProd2,null,(err,queryResult)=>{	
															
															//console.log('queryResult approval 3',queryResult);
															
															// loop through all product receipts
															async.each(queryResult, function(queryResultData, callbackApproval) {
																if(queryResultData.created_date >= todayDateTimestamp){
																	var value = queryTodayResultData.quantity*queryTodayResultData.unit_value;
																	nonCementTodayAchievemntVal = nonCementTodayAchievemntVal + value;
																}
																var value = queryResultData.quantity*queryResultData.unit_value;
																nonCementAchievement = nonCementAchievement + value;
																
																callbackApproval();
															},
															(err)=>{
																
																// on completion of all the calculation
																var selectHouse = "select * from [monthly_stats] where sph_id = (?) and target_for = (?) and stat_date = (?) ";
																var arr = [sph.id,statsDetail.target_label,todayDate];
																app.dataSources.accountDS.connector.execute(selectHouse,arr,(err,queryResult)=>{
																	
																	if(statsDetail.target_label!=''){
																		var insertArr = [];
																		var remaining = (monthly - nonCementAchievement).toFixed(2);
																		var todayTarget = (remaining/totalDays).toFixed(2);
																		var createdDate = Math.floor(Date.now());
																		insertArr.push(monthly,nonCementAchievement,remaining,todayTarget,estimated,nonCementTodayAchievemntVal,createdDate,sph.id,statsDetail.target_label,todayDate);
																		
																		if(queryResult && queryResult.length > 0){
																			var updateQuery = "update [monthly_stats] set monthly_target = (?), achieved_target = (?), remaining_target = (?), todays_target = (?), estimated_target = (?), todays_achievement = (?), updated_date = (?) where sph_id = (?) and target_for = (?) and stat_date = (?) ";
																		}else{
																			var updateQuery = "insert into [monthly_stats] (monthly_target, achieved_target, remaining_target, todays_target, estimated_target, todays_achievement, updated_date, sph_id, target_for,stat_date,created_date) values ((?),(?),(?),(?),(?),(?),(?),(?),(?),(?),(?))";
																			insertArr.push(createdDate);
																		}
																		
																		//console.log('insertArr',insertArr);
																		//console.log('updateQuery',updateQuery);
																		
																		app.dataSources.accountDS.connector.execute(updateQuery,insertArr,(err,updateResult)=>{
																			callback2();
																		});
																	}else{
																		callback2();
																	}
																});
															});
														});
													});
													
												});
											}
											else{
												callback2(); // on completion of stats, call callback 2
											}
										});
									});
								},
								(err)=>{
									// when entire processing is done
									callback();
								});
							}
							else{
								callback();
							}
						});
					},
					(err)=>{
						console.log("Cron for non cement khatam?");
						resolve(true);
					});
				}else{
					resolve(true);
				}
			});
		});
	};
};
