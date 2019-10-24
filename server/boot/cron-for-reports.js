'use strict';
var async = require('async');
var http = require('http');
var schedule = require('node-schedule');
var Promise = require("bluebird");
var taskQueue = require("promise-task-queue");
var each = require('sync-each');
var queue = taskQueue();
var failedRequests = 0;

module.exports = function(app){
	
	
	// pushes the queue for a particular sphid
	app.cronExecuteForMonthlyStatsQueue = function(sphJson){
		var date = new Date();
		var currentMonth = (date.getMonth())+1;
		var lastMonth = (date.getMonth())+1;
		var currentYear = date.getFullYear();
		
		if(Object.keys(sphJson).length > 0){
			var createdDate = new Date(parseInt(sphJson.created_date));
			currentMonth = createdDate.getMonth()+1;
		}
		
		var monthObj = [];
		var insertArr = [];
		
		for(var i=currentMonth; i<=lastMonth; i++){
			monthObj.push(i);
		}
		
		each(monthObj, function (mnth,next) {
			var todayDate = currentYear+"-"+mnth+"-"+date.getDate();
			
			var totalDaysMonth = (new Date(currentYear, mnth, 0).getDate());
			
			var lastDay = Math.floor(new Date(currentYear+"-"+mnth+"-"+totalDaysMonth));
			var checkDate = Math.floor(new Date(currentYear+"-"+mnth+"-01"));
			
			var totalDays = (new Date(currentYear, mnth, 0).getDate())-(date.getDate());
			
			// get all sph
			var sphArr = [];
			var sphQuery = "select u.id, u.username, r.name, stuff((select distinct '%subdistrict%' + CONVERT(varchar(10), p.subdistrict_id) + '%/subdistrict%' from user_mapping um join postal_code p on um.meta_value = p.id and um.meta_key = 'postal_code' where (u.id=um.uid)  FOR XML PATH ('')),1,1,'') as subdistrict from [User] u join RoleMapping rm on u.id = rm.principalId and u.status = 1 join Role r  on r.id = rm.roleId and r.name = '$sph'";

			if(Object.keys(sphJson).length > 0){
				sphArr = sphJson.sph_id;
				var sph_no = [];
				for(var i=0; i<sphArr.length; i++){
					sph_no.push("(?)");
				}
				sph_no = sph_no.join(",");
				sphQuery+=" AND u.id IN ("+sph_no+")";
			}
			else{
				sphQuery+=" AND u.id IN (19718)";
			}
			app.dataSources.accountDS.connector.execute(sphQuery,sphArr,(err,sphData)=>{
				
				if((sphData) && (sphData.length > 0)){
					
					async.each(sphData, function(sph, callback) {
						
						var sphSubdistrict = "";
						// make json of subdistrict ids
						if(sph.subdistrict && sph.subdistrict != ""){
							sphSubdistrict = "%"+sph.subdistrict;
							sphSubdistrict = sphSubdistrict.replace(/%\/subdistrict%/g,"</subdistrict>");
							sphSubdistrict = sphSubdistrict.replace(/%subdistrict%/g,"<subdistrict>");
							sphSubdistrict = "<subdistrictXml>"+sphSubdistrict+"</subdistrictXml>";								
						}
						
						
						insertArr[sph.id] = [];
						
						for(var i=0; i<=mnth; i++){
							insertArr[sph.id][i] = [];
						}
						
						// get all the stats for the current month
						var selectapp = "select * from monthly_actual_target where target_label in ('srku_house_num','new_switching_hpb','cement_vol_maintain','cement_vol_switching','srku_vol') and target_month = "+mnth+" and target_year = "+currentYear+" and status = 1 and sph_id = "+sph.id;
						app.dataSources.accountDS.connector.execute(selectapp,null,(err,result)=>{
							
							var query = "";
							var query2 = "";
							var volumeQuan = "";
							
							var houseNum = 0;
							var hpb = 0;
							var maintain = 0;
							var voltotal = 0;
							var switching = 0;
							var srkuvol = 0;
							
							var houseNumToday = 0;
							var hpbToday = 0;
							var maintainToday = 0;
							var voltotalToday = 0;
							var switchingToday = 0;
							var srkuvolToday = 0;
							
							var houseNumMonthly = 0;
							var hpbMonthly = 0;
							var maintainMonthly = 0;
							var voltotalMonthly = 0;
							var switchingMonthly = 0;
							var srkuVolMonthly = 0;
							
							var houseEstimated = 0;
							var hpbEstimated = 0;
							var maintainEstimated = 0;
							var voltotalEstimated = 0;
							var switchingEstimated = 0;
							var srkuEstimated = 0;
							
							var houseCalculated = 0;
							var hpbCalculated = 0;
							var maintainCalculated = 0;
							var voltotalCalculated = 0;
							var switchingCalculated = 0;
							var srkuCalculated = 0;
							
							if((result) && (result.length > 0)){
								
								// for each target, run this loop
								async.each(result, function(statsDetail, callback2) {
									
									var targetFor = statsDetail.target_label;
									
									// store the monthly value in its variable
									if(targetFor == "cement_vol_maintain"){
										maintainMonthly = statsDetail.target_value;
										voltotalMonthly = voltotalMonthly + statsDetail.target_value;
									}
									else if(targetFor == "cement_vol_switching"){
										switchingMonthly = statsDetail.target_value;
										voltotalMonthly = voltotalMonthly + statsDetail.target_value;
									}
									else if(targetFor == "srku_vol"){
										srkuVolMonthly = statsDetail.target_value;
										voltotalMonthly = voltotalMonthly + statsDetail.target_value;
									}
									else if(targetFor == "srku_house_num"){
										houseNumMonthly = statsDetail.target_value;
									}
									else if(targetFor == "new_switching_hpb"){
										hpbMonthly = statsDetail.target_value;
									}
									
									if(targetFor == "srku_house_num"){
										
										query = "select count(*) as total from projects_tbl p, srku_approval_status_tbl s where p.is_srku = 1 and s.srku_approval_status = 1 and p.project_id = s.project_id and p.created_by = "+sph.id+" and p.created_date >= "+checkDate+" and p.created_date <= "+lastDay;
										app.dataSources.accountDS.connector.execute(query,null,(err,queryResult)=>{
											
											if(queryResult && queryResult.length > 0){
												houseNum = queryResult[0].total;
											}else{
												houseNum = 0;
											}
											callback2();
											
										});
									}
									
									// for current achievement of hpb
									else if(targetFor == "new_switching_hpb"){
										query = "select count(*) as total from hpb_info_tbl where created_by = "+sph.id+" and prospect_switching_dt >= "+checkDate+" and prospect_switching_dt <= "+lastDay;
										app.dataSources.accountDS.connector.execute(query,null,(err,queryResult)=>{
										
											if(queryResult && queryResult.length > 0){
												hpb = queryResult[0].total;
											}else{
												hpb = 0;
											}
											callback2();
										});
									}
									
									// for current achievement of cement targets, this needs to be called once
									else if((volumeQuan== "") && ((targetFor == "cement_vol_maintain") || (targetFor == "cement_vol_switching") || (targetFor == "srku_vol"))){
										
										// approved product receipt quantity
										volumeQuan = "executed";
										query = "select distinct pr.receipt_id, pr.quantity, prod.unit_value, p.is_srku, h.hpb_status, h.prospect_switching_dt, h.switching_maintain_dt, pr.created_date from products_receipt_tbl pr, hpb_info_tbl h, products_receipt_approval_tbl pra, products_receipt_approval_tbl pra2, products_tbl prod, projects_tbl p left join srku_approval_status_tbl s on p.project_id = s.project_id where pra.receipt_id = pr.receipt_id and pra.approval_status = 1 and pra.approval_role = 'TLH' and pra.is_closed = 0 and  pra2.receipt_id = pr.receipt_id and pra2.approval_role = 'SA' and pra2.approval_status != -1 and pra2.is_closed = 0 and prod.is_cement = 1 and prod.id = pr.product_id and p.project_id = pr.project_id and p.hpb_id = h.hpb_id and pr.created_by = "+sph.id+" and pr.created_date >= "+checkDate+" and pr.created_date <= "+lastDay+" and pr.receipt_id in ( select  receipt_id from products_receipt_approval_tbl where is_closed = 0 group by receipt_id having count (receipt_id) = 2 )";
										
										query2 = "select distinct pr.receipt_id, pr.quantity, prod.unit_value, p.is_srku, h.hpb_status, h.prospect_switching_dt, h.switching_maintain_dt, pr.created_date from products_receipt_tbl pr, hpb_info_tbl h, products_receipt_approval_tbl pra, products_receipt_approval_tbl pra2, products_receipt_approval_tbl pra3, products_tbl prod, projects_tbl p left join srku_approval_status_tbl s on p.project_id = s.project_id where pra.receipt_id = pr.receipt_id and pra.approval_status = 1 and pra.approval_role = 'TLH' and pra.is_closed = 0 and  pra2.receipt_id = pr.receipt_id and pra2.approval_role = 'SA' and pra2.approval_status != -1 and pra2.is_closed = 0 and  pra3.receipt_id = pr.receipt_id and pra3.approval_role = 'AC' and pra3.approval_status != -1 and pra3.is_closed = 0 and prod.is_cement = 1 and prod.id = pr.product_id and p.project_id = pr.project_id and p.hpb_id = h.hpb_id and pr.created_by = "+sph.id+" and pr.created_date >= "+checkDate+" and pr.created_date <= "+lastDay+" and pr.receipt_id in ( select  receipt_id from products_receipt_approval_tbl where is_closed = 0 group by receipt_id having count (receipt_id) = 3 )";
										
										
										app.dataSources.accountDS.connector.execute(query,null,(err,queryResult)=>{
											
											if(query2!=""){
												app.dataSources.accountDS.connector.execute(query2,null,(err,resultObject2)=>{
													
													async.each(resultObject2, function(json2, callbackReceipt) {
														queryResult.push(json2);
														callbackReceipt();
													},
													(err)=>{
														async.each(queryResult, function(queryResultData, callback3) {
															
															voltotal = voltotal + (queryResultData.quantity*queryResultData.unit_value);
															
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
															callback2(); // on completion of stats, call callback 2
														});
													});
													
												});
											}
											else{
												async.each(queryResult, function(queryResultData, callback3) {
													
													voltotal = voltotal + (queryResultData.quantity*queryResultData.unit_value);
													
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
													callback2(); // on completion of stats, call callback 2
												});
											}
											
										});
									}
									else{
										callback2();
									}
								},
								(err)=>{
									
									var targetFor = [{"target_for":'srku_house_num'},{"target_for":'new_switching_hpb'},{"target_for":'cement_vol_maintain'},{"target_for":'cement_vol_switching'},{"target_for":'srku_vol'},{"target_for":'vol_total'}];

									houseEstimated = 0;
									hpbEstimated = 0;
									maintainEstimated = 0;
									switchingEstimated = 0;
									srkuEstimated = 0;
									voltotalEstimated = 0;
									
									houseCalculated = 0;
									hpbCalculated = 0;
									maintainCalculated = 0;
									switchingCalculated = 0;
									srkuCalculated = 0;
									voltotalCalculated = 0;
									
									//async.forEachOf(targetFor, function(target, key, callback4){
									each(targetFor, function (target,callback4) {
										
										// get previous one month stats
										var getPreviousStats = "select * from monthly_scorecard_reports where sph_id = (?) and target_label = (?) and target_year = (?) and target_month = (?) order by target_month desc";
										var dataArr = [sph.id,target['target_for'],currentYear,(mnth-1)];
										app.dataSources.accountDS.connector.execute(getPreviousStats,dataArr,(err,previousStats)=>{
											
											var selectStats = "select * from monthly_scorecard_reports where target_month = (?) and target_year = (?) and target_label = (?) and sph_id = (?) ";
											
											app.dataSources.accountDS.connector.execute(selectStats,[mnth,currentYear,target['target_for'],sph.id],(err,result)=>{
												
												if(target['target_for'] == "srku_house_num"){
													if(houseNum < houseNumMonthly){
														houseCalculated = Math.round(((houseNumMonthly - houseNum)/(12-mnth)));
													}
												}
												else if(target['target_for'] == "new_switching_hpb"){
													if(hpb < hpbMonthly){
														hpbCalculated =  Math.round(((hpbMonthly - hpb)/(12-mnth)));
													}
												}
												else if(target['target_for'] == "cement_vol_maintain"){
													maintain = Math.round(maintain/1000);
													if(maintain < maintainMonthly){
														maintainCalculated =  Math.round(((maintainMonthly - maintain)/(12-mnth)));
													}
												}
												else if(target['target_for'] == "cement_vol_switching"){
													switching = Math.round(switching/1000);
													if(switching < switchingMonthly){
														switchingCalculated =  Math.round(((switchingMonthly - switching)/(12-mnth)));
													}
												}
												else if(target['target_for'] == "vol_total"){
													voltotal = Math.round(voltotal/1000);
													if(voltotal < voltotalMonthly){
														voltotalCalculated =  Math.round(((voltotalMonthly - voltotal)/(12-mnth)));
													}
												}
												else if(target['target_for'] == "srku_vol"){
													srkuvol = Math.round(srkuvol/1000);
													if(srkuvol < srkuVolMonthly){
														srkuCalculated =  Math.round(((srkuVolMonthly - srkuvol)/(12-mnth)));
													}
												}
												
												// if its not the first month of the year
												if(previousStats && previousStats.length > 0){
													if(target['target_for'] == "srku_house_num"){
														if(previousStats[0]['target_month'] == 1){
															houseEstimated = previousStats[0]['calculated_value'] + houseCalculated;
														}else{
															houseEstimated = previousStats[0]['estimated_target'] + houseCalculated;
														}
														
													}
													else if(target['target_for'] == "new_switching_hpb"){
														if(previousStats[0]['target_month'] == 1){
															hpbEstimated = previousStats[0]['calculated_value'] + hpbCalculated;
														}else{
															hpbEstimated = previousStats[0]['estimated_target'] + hpbCalculated;
														}
														
													}
													else if(target['target_for'] == "cement_vol_maintain"){
														if(previousStats[0]['target_month'] == 1){
															maintainEstimated = previousStats[0]['calculated_value'] + maintainCalculated;
														}else{
															maintainEstimated = previousStats[0]['estimated_target'] + maintainCalculated;
														}
														
													}
													else if(target['target_for'] == "cement_vol_switching"){
														if(previousStats[0]['target_month'] == 1){
															switchingEstimated = previousStats[0]['calculated_value'] + switchingCalculated;
														}else{
															switchingEstimated = previousStats[0]['estimated_target'] + switchingCalculated;
														}
														
													}
													else if(target['target_for'] == "vol_total"){
														if(previousStats[0]['target_month'] == 1){
															voltotalEstimated = previousStats[0]['calculated_value'] + voltotalCalculated;
														}else{
															voltotalEstimated = previousStats[0]['estimated_target'] + voltotalCalculated;
														}
														
													}
													else if(target['target_for'] == "srku_vol"){
														if(previousStats[0]['target_month'] == 1){
															srkuEstimated = previousStats[0]['calculated_value'] + srkuCalculated;
														}else{
															if(!isNaN(insertArr[sph.id][mnth-1][2])){
																srkuEstimated = insertArr[sph.id][mnth-1][2] + srkuCalculated;
															}else{
																srkuEstimated = previousStats[0]['estimated_target'] + srkuCalculated;
															}
														}
													}
												}
												
												var created_date = Math.floor(Date.now());
												
												if(target['target_for'] == "srku_house_num"){
													insertArr[sph.id][mnth] = [houseNumMonthly,houseNum,houseEstimated,houseCalculated,created_date,sphSubdistrict,mnth,currentYear,sph.id,"srku_house_num"];
												}
												else if(target['target_for'] == "srku_vol"){
													insertArr[sph.id][mnth] = [srkuVolMonthly,srkuvol,srkuEstimated,srkuCalculated,created_date,sphSubdistrict,mnth,currentYear,sph.id,"srku_vol"];
												}
												else if(target['target_for'] == "cement_vol_maintain"){
													insertArr[sph.id][mnth] = [maintainMonthly,maintain, maintainEstimated,maintainCalculated,created_date,sphSubdistrict,mnth,currentYear,sph.id,"cement_vol_maintain"];
												}
												else if(target['target_for'] == "cement_vol_switching"){
													insertArr[sph.id][mnth] = [switchingMonthly,switching,switchingEstimated,switchingCalculated,created_date,sphSubdistrict,mnth,currentYear,sph.id,"cement_vol_switching"];
												}
												else if(target['target_for'] == "vol_total"){
													insertArr[sph.id][mnth] = [voltotalMonthly,voltotal,voltotalEstimated,voltotalCalculated,created_date,sphSubdistrict,mnth,currentYear,sph.id,"vol_total"];
												}
												else if(target['target_for'] == "new_switching_hpb"){
													insertArr[sph.id][mnth] = [hpbMonthly,hpb,hpbEstimated,hpbCalculated,created_date,sphSubdistrict,mnth,currentYear,sph.id,"new_switching_hpb"];
												}
												
												if(result.length == 0){
													// insert the data in stats
													var insertQuery = "insert into monthly_scorecard_reports (monthly_target, achieved_target, estimated_target, calculated_value, created_date, subdistrict, target_month, target_year, sph_id, target_label) values ((?),(?),(?),(?),(?),(?),(?),(?),(?),(?))";
													
													app.dataSources.accountDS.connector.execute(insertQuery,insertArr[sph.id][mnth],(err,result)=>{
														callback4();
													});	
												}else{
													// insert the data in stats
													var insertQuery = "update monthly_scorecard_reports set monthly_target= (?), achieved_target= (?), estimated_target= (?), calculated_value= (?), updated_date = (?), subdistrict = (?) where target_month= (?) and target_year= (?) and sph_id= (?) and target_label= (?)";
													app.dataSources.accountDS.connector.execute(insertQuery,insertArr[sph.id][mnth],(err,result)=>{
														callback4();
													});
												}
												
											});
										});
									},
									function (err,transformedItems) {
										//console.log("next?");
									});
								});
							}
							// if there is no target set for this sph for this target
							else{
								var targetForJson = [{ "targetFor": "srku_house_num" },{ "targetFor": "srku_vol" },{ "targetFor": "cement_vol_maintain" },{ "targetFor": "cement_vol_switching" },{ "targetFor": "new_switching_hpb" },{ "targetFor": "vol_total" }];
								async.each(targetForJson, function(tar, targetCallback) {
									
									var selectStats = "select * from monthly_scorecard_reports where target_month = (?) and target_year = (?) and target_label = (?) and sph_id = (?) ";
									app.dataSources.accountDS.connector.execute(selectStats,[mnth,currentYear,tar.targetFor,sph.id],(err,result)=>{
										
										var created_date = Math.floor(Date.now());
										
										if(tar.targetFor == "srku_house_num"){
											insertArr[sph.id][mnth] = [0,0,0,0,created_date,sphSubdistrict,mnth,currentYear,sph.id,"srku_house_num"];
										}
										else if(tar.targetFor == "srku_vol"){
											insertArr[sph.id][mnth] = [0,0,0,0,created_date,sphSubdistrict,mnth,currentYear,sph.id,"srku_vol"];
										}
										else if(tar.targetFor == "cement_vol_maintain"){
											insertArr[sph.id][mnth] = [0,0,0,0,created_date,sphSubdistrict,mnth,currentYear,sph.id,"cement_vol_maintain"];
										}
										else if(tar.targetFor == "cement_vol_switching"){
											insertArr[sph.id][mnth] = [0,0,0,0,created_date,sphSubdistrict,mnth,currentYear,sph.id,"cement_vol_switching"];
										}
										else if(tar.targetFor == "vol_total"){
											insertArr[sph.id][mnth] = [0,0,0,0,created_date,sphSubdistrict,mnth,currentYear,sph.id,"vol_total"];
										}
										else if(tar.targetFor == "new_switching_hpb"){
											insertArr[sph.id][mnth] = [0,0,0,0,created_date,sphSubdistrict,mnth,currentYear,sph.id,"new_switching_hpb"];
										}
											
											
										if(result.length == 0){
											// insert the data in stats
											var insertQuery = "insert into monthly_scorecard_reports (monthly_target, achieved_target, estimated_target, calculated_value, created_date, subdistrict, target_month, target_year, sph_id, target_label) values ((?),(?),(?),(?),(?),(?),(?),(?),(?),(?))";
											app.dataSources.accountDS.connector.execute(insertQuery,insertArr[sph.id][mnth],(err,result)=>{
												targetCallback();
											});	
										}else{
											// insert the data in stats
											var insertQuery = "update monthly_scorecard_reports set monthly_target= (?), achieved_target= (?), estimated_target= (?), calculated_value= (?), updated_date = (?), subdistrict = (?) where target_month= (?) and target_year= (?) and sph_id= (?) and target_label= (?)";
											app.dataSources.accountDS.connector.execute(insertQuery,insertArr[sph.id][mnth],(err,result)=>{
												targetCallback();
											});
										}
										
									});
								},
								(err)=>{
									
								});
							}
						});
						callback();
					},
					(err)=>{
						next();
					});
				}
			});
		},
		function (err,transformedItems) {
			return true;
		});
	}
	
	
	// this will execute the function every 20mins
	queue.define("monthlyCron", function(sphJson) {
		return Promise.try(function() {
			app.cronExecuteForMonthlyStatsQueue(sphJson);
		}).then(function(response) {
			return true;
		});
	},
	{
		concurrency: 1
	});
	
	
	//to insert/update stats
	var j = schedule.scheduleJob('*/1 * * * *', function(cb){
		Promise.try(function() {
			return queue.push("monthlyCron", {});
		}).then(function(jsonResponse) {
			console.log("Cron success: "+jsonResponse);
		})
	});
};