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
	queue.define("targetCron", function(sphJson) {
		return Promise.try(function() {
			app.cronExecuteForStats(sphJson);
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
			return queue.push("targetCron", []);
		}).then(function(jsonResponse) {
			console.log("Cron success: "+jsonResponse);
		})
	});
	
	app.cronExecuteForStats = function(sphIdArr){
		// get monthly stats for the current monthly
		return new Promise((resolve,reject)=>{
		console.log("started target cron");
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
					
					// first delete the record
					//var deleteQuery = "delete from monthly_stats where sph_id = "+sph.id+" and stat_date = '"+todayDate+"' ";
					//app.dataSources.accountDS.connector.execute(deleteQuery,null,(err,deleted)=>{
					
						// get all the stats for the current month
						var selectapp = "select * from monthly_actual_target where target_label in ('srku_house_num','new_switching_hpb','cement_vol_maintain','cement_vol_switching','srku_vol') and target_month = "+currentMonth+" and target_year = "+currentYear+" and status = 1 and sph_id = "+sph.id;
						app.dataSources.accountDS.connector.execute(selectapp,null,(err,result)=>{
							
							var query = "";
							var query2 = "";
							var checkDate = Math.floor(new Date(currentYear+"-"+currentMonth+"-01"));
							var todayDateTimestamp = Math.floor(new Date(todayDate));
							var volumeQuan = "";
							var totalDays = (new Date(currentYear, currentMonth, 0).getDate())-(date.getDate());
							if(totalDays==0){
								totalDays = 1;
							}
							var houseNum = 0;
							var hpb = 0;
							var maintain = 0;
							var switching = 0;
							var srkuvol = 0;
							
							var houseNumToday = 0;
							var hpbToday = 0;
							var maintainToday = 0;
							var switchingToday = 0;
							var srkuvolToday = 0;
							
							var houseNumMonthly = 0;
							var hpbMonthly = 0;
							var maintainMonthly = 0;
							var switchingMonthly = 0;
							var srkuVolMonthly = 0;
							
							var houseNumEstimated = 0;
							var hpbEstimated = 0;
							var maintainEstimated = 0;
							var switchingEstimated = 0;
							var srkuVolEstimated = 0;
							
							var todayAchievemnt = [];
							
							if((result) && (result.length > 0)){
								
								// for each target, run this loop
								async.each(result, function(statsDetail, callback2) {
									
									var targetFor = statsDetail.target_label;
									
									// for estimated values
									var selectDailyStats = "select sum(target_value) as target_value from monthly_forecast_target where target_label = '"+targetFor+"' and target_date = '"+todayDate+"' and sph_id = "+sph.id+" and status = 1";
									app.dataSources.accountDS.connector.execute(selectDailyStats,null,(err,estimatedData)=>{
										
										if(estimatedData){
											estimatedData = estimatedData[0].target_value;
										}else{
											estimatedData = 0;
										}
										
										if(targetFor == "srku_house_num"){
											houseNumEstimated = estimatedData;
											houseNumMonthly = statsDetail.target_value;
										}
										else if(targetFor == "new_switching_hpb"){
											hpbEstimated = estimatedData;
											hpbMonthly = statsDetail.target_value;
										}
										if(targetFor == "cement_vol_maintain"){
											maintainEstimated = estimatedData;
											maintainMonthly = statsDetail.target_value;
										}
										if(targetFor == "cement_vol_switching"){
											switchingEstimated = estimatedData;
											switchingMonthly = statsDetail.target_value;
										}
										if(targetFor == "srku_vol"){
											srkuVolEstimated = estimatedData;
											srkuVolMonthly = statsDetail.target_value;
										}
										
										// for current achievement of srk approved houses
										if(targetFor == "srku_house_num"){
											
											query = "select count(*) as total from projects_tbl p, srku_approval_status_tbl s where p.is_srku = 1 and s.srku_approval_status = 1 and p.project_id = s.project_id and p.created_by = "+sph.id+" and p.created_date >= "+checkDate;
											app.dataSources.accountDS.connector.execute(query,null,(err,queryResult)=>{
												
												if(queryResult && queryResult.length > 0){
													houseNum = queryResult[0].total;
												}else{
													houseNum = 0;
												}
												
												// get today's achievement
												var todayquery = "select count(*) as total from projects_tbl p, srku_approval_status_tbl s where p.is_srku = 1 and s.srku_approval_status = 1 and p.project_id = s.project_id and p.created_by = "+sph.id+" and p.created_date >= "+todayDateTimestamp;
												app.dataSources.accountDS.connector.execute(todayquery,null,(err,todayResult)=>{
													
													if(todayResult && todayResult.length > 0){
														houseNumToday = todayResult[0].total;
													}else{
														houseNumToday = 0;
													}
													callback2();
												});
												
											});
										}
										
										// for current achievement of hpb
										else if(targetFor == "new_switching_hpb"){
											query = "select count(*) as total from hpb_info_tbl where created_by = "+sph.id+" and created_date >= "+checkDate;
											app.dataSources.accountDS.connector.execute(query,null,(err,queryResult)=>{
											
												if(queryResult && queryResult.length > 0){
													hpb = queryResult[0].total;
												}else{
													hpb = 0;
												}
												
												// get today's achievement
												var todayquery = "select count(*) as total from hpb_info_tbl where created_by = "+sph.id+" and created_date >= "+todayDateTimestamp;
												app.dataSources.accountDS.connector.execute(todayquery,null,(err,todayResult)=>{
													
													if(todayResult && todayResult.length > 0){
														hpbToday = todayResult[0].total;
													}else{
														hpbToday = 0;
													}
													callback2();
												});
												
											});
										}
										
										// for current achievement of cement targets, this needs to be called once
										else if((volumeQuan== "") && ((targetFor == "cement_vol_maintain") || (targetFor == "cement_vol_switching") || (targetFor == "srku_vol"))){
											
											// approved product receipt quantity
											volumeQuan = "executed";
											query = "select distinct pr.receipt_id, pr.quantity, prod.unit_value, p.is_srku, h.hpb_status, pr.created_date from products_receipt_tbl pr, hpb_info_tbl h, products_receipt_approval_tbl pra, products_receipt_approval_tbl pra2, products_tbl prod, projects_tbl p left join srku_approval_status_tbl s on p.project_id = s.project_id where pra.receipt_id = pr.receipt_id and pra.approval_status = 1 and pra.approval_role = 'TLH' and pra.is_closed = 0 and  pra2.receipt_id = pr.receipt_id and pra2.approval_role = 'SA' and pra2.approval_status != -1 and pra2.is_closed = 0 and prod.is_cement = 1 and prod.id = pr.product_id and p.project_id = pr.project_id and p.hpb_id = h.hpb_id and pr.created_by = "+sph.id+" and pr.created_date >= "+checkDate+" and pr.receipt_id in ( select  receipt_id from products_receipt_approval_tbl where is_closed = 0 group by receipt_id having count (receipt_id) = 2 )";
											
											query2 = "select distinct pr.receipt_id, pr.quantity, prod.unit_value, p.is_srku, h.hpb_status, pr.created_date from products_receipt_tbl pr, hpb_info_tbl h, products_receipt_approval_tbl pra, products_receipt_approval_tbl pra2, products_receipt_approval_tbl pra3, products_tbl prod, projects_tbl p left join srku_approval_status_tbl s on p.project_id = s.project_id where pra.receipt_id = pr.receipt_id and pra.approval_status = 1 and pra.approval_role = 'TLH' and pra.is_closed = 0 and  pra2.receipt_id = pr.receipt_id and pra2.approval_role = 'SA' and pra2.approval_status != -1 and pra2.is_closed = 0 and  pra3.receipt_id = pr.receipt_id and pra3.approval_role = 'AC' and pra3.approval_status != -1 and pra3.is_closed = 0 and prod.is_cement = 1 and prod.id = pr.product_id and p.project_id = pr.project_id and p.hpb_id = h.hpb_id and pr.created_by = "+sph.id+" and pr.created_date >= "+checkDate+" and pr.receipt_id in ( select  receipt_id from products_receipt_approval_tbl where is_closed = 0 group by receipt_id having count (receipt_id) = 3 )";
											
											
											app.dataSources.accountDS.connector.execute(query,null,(err,queryResult)=>{
												
												var totalResult = queryResult;
												if(query2!=""){
													app.dataSources.accountDS.connector.execute(query2,null,(err,resultObject2)=>{
														async.each(resultObject2, function(json2, callbackReceipt) {
															totalResult.push(json2);
															callbackReceipt();
														},
														(err)=>{
															async.each(totalResult, function(queryResultData, callback3) {
																
																if(queryResultData.created_date >= todayDateTimestamp){
																	todayAchievemnt.push(queryResultData);
																}
																
																if(queryResultData.hpb_status == "maintain"){
																	var value = queryResultData.quantity*queryResultData.unit_value;
																	maintain = maintain + value;
																}
																
																if(queryResultData.hpb_status == "switching"){
																	var value = queryResultData.quantity*queryResultData.unit_value;
																	switching = switching + value;
																}
																
																if(queryResultData.is_srku == 1){
																	var value = queryResultData.quantity*queryResultData.unit_value;
																	srkuvol = srkuvol + value;
																}
																
																callback3();
															},
															(err)=>{
																
																	
																if(todayAchievemnt && (todayAchievemnt.length > 0)){
																	async.each(todayAchievemnt, function(queryTodayResultData, callback4) {
																	
																		if(queryTodayResultData.hpb_status == "maintain"){
																			var value = queryTodayResultData.quantity*queryTodayResultData.unit_value;
																			maintainToday = maintainToday + value;
																		}
																		
																		if(queryTodayResultData.hpb_status == "switching"){
																			var value = queryTodayResultData.quantity*queryTodayResultData.unit_value;
																			switchingToday = switchingToday + value;
																		}
																		
																		if(queryTodayResultData.is_srku == 1){
																			var value = queryTodayResultData.quantity*queryTodayResultData.unit_value;
																			srkuvolToday = srkuvolToday + value;
																		}
																		callback4();
																	},
																	(err)=>{
																		callback2(); // on completion of stats, call callback 2
																	});
																}else{
																	callback2(); // on completion of stats, call callback 2
																}
																
															});
														});
														
													});
												}
												else{
													async.each(queryResult, function(queryResultData, callback3) {
														if(queryResultData.created_date >= todayDateTimestamp){
															todayAchievemnt.push(queryResultData);
														}
														if(queryResultData.hpb_status == "maintain"){
															var value = queryResultData.quantity*queryResultData.unit_value;
															maintain = maintain + value;
														}
														
														if(queryResultData.hpb_status == "switching"){
															var value = queryResultData.quantity*queryResultData.unit_value;
															switching = switching + value;
														}
														
														if(queryResultData.is_srku == 1){
															var value = queryResultData.quantity*queryResultData.unit_value;
															srkuvol = srkuvol + value;
														}
														
														callback3();
													},
													(err)=>{
														
														if(todayAchievemnt && (todayAchievemnt.length > 0)){
															async.each(todayAchievemnt, function(queryTodayResultData, callback4) {
															
																if(queryTodayResultData.hpb_status == "maintain"){
																	var value = queryTodayResultData.quantity*queryTodayResultData.unit_value;
																	maintainToday = maintainToday + value;
																}
																
																if(queryTodayResultData.hpb_status == "switching"){
																	var value = queryTodayResultData.quantity*queryTodayResultData.unit_value;
																	switchingToday = switchingToday + value;
																}
																
																if(queryTodayResultData.is_srku == 1){
																	var value = queryTodayResultData.quantity*queryTodayResultData.unit_value;
																	srkuvolToday = srkuvolToday + value;
																}
																callback4();
															},
															(err)=>{
																callback2(); // on completion of stats, call callback 2
															});
														}else{
															callback2(); // on completion of stats, call callback 2
														}
														
													});
												}
												
											});
										}
										
										// if doesnt match
										else{
											callback2(); // on completion of stats, call callback 2
										}
										
									});
								
								},
								(err)=>{
									
									// when entire processing is done
									var targetForJson = [{ "targetFor": "srku_house_num" },{ "targetFor": "srku_vol" },{ "targetFor": "cement_vol_maintain" },{ "targetFor": "cement_vol_switching" },{ "targetFor": "new_switching_hpb" }];
									
									async.each(targetForJson, function(tar, targetCallback) {
										
										var selectHouse = "select * from [monthly_stats] where sph_id = (?) and target_for = (?) and stat_date = (?) ";
										var arr = [sph.id,tar.targetFor,todayDate];
										app.dataSources.accountDS.connector.execute(selectHouse,arr,(err,queryResult)=>{
											
											var insertArr = [];
											if(tar.targetFor == "srku_house_num"){
												var houseNumRemaining = (houseNumMonthly - houseNum).toFixed(2);
												var todayTarget = (houseNumRemaining/totalDays).toFixed(2);
												var createdDate = Math.floor(Date.now());
												insertArr.push(houseNumMonthly,houseNum,houseNumRemaining,todayTarget,houseNumEstimated,houseNumToday,createdDate,sph.id,"srku_house_num",todayDate);
											}
											else if(tar.targetFor == "srku_vol"){
												srkuvol = (srkuvol/1000).toFixed(2);
												srkuvolToday = (srkuvolToday/1000).toFixed(2);
												var srkuVolRemaining = (srkuVolMonthly - srkuvol).toFixed(2);
												var todayTarget = (srkuVolRemaining/totalDays).toFixed(2);
												var createdDate = Math.floor(Date.now());
												insertArr.push(srkuVolMonthly,srkuvol,srkuVolRemaining,todayTarget,srkuVolEstimated,srkuvolToday,createdDate,sph.id,"srku_vol",todayDate);
											}
											else if(tar.targetFor == "cement_vol_maintain"){
												maintain = (maintain/1000).toFixed(2);
												maintainToday = (maintainToday/1000).toFixed(2);
												var maintainRemaining = (maintainMonthly - maintain).toFixed(2);
												var todayTarget = (maintainRemaining/totalDays).toFixed(2);
												var createdDate = Math.floor(Date.now());
												insertArr.push(maintainMonthly,maintain,maintainRemaining,todayTarget,maintainEstimated,maintainToday,createdDate,sph.id,"cement_vol_maintain",todayDate);
											}
											else if(tar.targetFor == "cement_vol_switching"){
												switching = (switching/1000).toFixed(2);
												switchingToday = (switchingToday/1000).toFixed(2);
												var switchingRemaining = (switchingMonthly - switching).toFixed(2);
												var todayTarget = (switchingRemaining/totalDays).toFixed(2);
												var createdDate = Math.floor(Date.now());
												insertArr.push(switchingMonthly,switching,switchingRemaining,todayTarget,switchingEstimated,switchingToday,createdDate,sph.id,"cement_vol_switching",todayDate);
											}
											else if(tar.targetFor == "new_switching_hpb"){
												var hpbRemaining = (hpbMonthly - hpb).toFixed(2);
												var todayTarget = (hpbRemaining/totalDays).toFixed(2);
												var createdDate = Math.floor(Date.now());
												insertArr.push(hpbMonthly,hpb,hpbRemaining,todayTarget,hpbEstimated,hpbToday,createdDate,sph.id,"new_switching_hpb",todayDate);
											}
											
											if(queryResult && queryResult.length > 0){
												var updateQuery = "update [monthly_stats] set monthly_target = (?), achieved_target = (?), remaining_target = (?), todays_target = (?), estimated_target = (?), todays_achievement = (?), updated_date = (?) where sph_id = (?) and target_for = (?) and stat_date = (?) ";
											}else{
												var updateQuery = "insert into [monthly_stats] (monthly_target, achieved_target, remaining_target, todays_target, estimated_target, todays_achievement, updated_date, sph_id, target_for,stat_date,created_date) values ((?),(?),(?),(?),(?),(?),(?),(?),(?),(?),(?))";
												insertArr.push(createdDate);
											}
											
											app.dataSources.accountDS.connector.execute(updateQuery,insertArr,(err,updateResult)=>{
											});
											targetCallback();
										});
										
									});
									
								});
								
							}
							else{
								var createdDate = Math.floor(Date.now());
								
								var targetForJson = [{ "targetFor": "srku_house_num" },{ "targetFor": "srku_vol" },{ "targetFor": "cement_vol_maintain" },{ "targetFor": "cement_vol_switching" },{ "targetFor": "new_switching_hpb" }];
									
								async.each(targetForJson, function(tar, targetCallback2) {
									
									var selectHouse = "select * from [monthly_stats] where sph_id = (?) and target_for = (?) and stat_date = (?) ";
									var arr = [sph.id,tar.targetFor,todayDate];
									app.dataSources.accountDS.connector.execute(selectHouse,arr,(err,queryResult)=>{
										
										var insertArr = [];
										var createdDate = Math.floor(Date.now());
										insertArr.push(0,0,0,0,0,0,createdDate,sph.id,tar.targetFor,todayDate);
										
										if(queryResult && queryResult.length > 0){
											var updateQuery = "update [monthly_stats] set monthly_target = (?), achieved_target = (?), remaining_target = (?), todays_target = (?), estimated_target = (?), todays_achievement = (?), updated_date = (?) where sph_id = (?) and target_for = (?) and stat_date = (?) ";
										}else{
											var updateQuery = "insert into [monthly_stats] (monthly_target, achieved_target, remaining_target, todays_target, estimated_target, todays_achievement, updated_date, sph_id, target_for,stat_date,created_date) values ((?),(?),(?),(?),(?),(?),(?),(?),(?),(?),(?))";
											insertArr.push(createdDate);
										}
										
										app.dataSources.accountDS.connector.execute(updateQuery,insertArr,(err,updateResult)=>{
										});
										targetCallback2();
									});
									
								});
							}
						});
					//});
					callback();
				},
				(err)=>{
					console.log("Daily Cron khatam?");
					resolve(true);
				});
			}else{
				resolve(true);
			}
		});
			
		});
	};
};
