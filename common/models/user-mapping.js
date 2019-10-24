'use strict';
var async = require('async');

module.exports = function(Usermapping) {
	
	Usermapping.getUserMapped = function(user_id,rolename,cb){
		var dataArr = [];
		if(rolename == "$tlh"){
			var sqlQuery =	"select u.realm as user_name, r.name as rolename, um.uid, pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, user_mapping um2, postal_code p where u.id = rm.principalId and um2.meta_value = p.subdistrict_id and um.meta_value = p.id and u.id = um.uid and r.id = rm.roleId and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id and um.meta_key = 'postal_code' and um.meta_value in ( select id from postal_code where subdistrict_id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'subdistrict_id' ) ) AND u.status=1  order by u.id";
			dataArr.push(user_id);
		}
		else if(rolename == "$ac"){
			
			// get all tlh under this ac
			var sqlQuery =	"select u.realm as user_name, r.name as rolename, um.uid, pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, postal_code p where u.id = rm.principalId and um.meta_value = p.subdistrict_id and u.id = um.uid and r.id = rm.roleId and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id and um.meta_key = 'subdistrict_id' and um.meta_value in (select p.subdistrict_id from postal_code p, subdistrict sd, district d, municipality m  where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'district_id' ) ) AND u.status=1 order by u.id";
			dataArr.push(user_id);
		}
		else if(rolename == "$am"){
			
			// get all ac under this am
			var sqlQuery =	"select u.realm as user_name, r.name as rolename, um.uid, pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code, p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, postal_code p , region rg where rg.id = pro.region_id and u.id = rm.principalId and um.meta_value = d.id and u.id = um.uid and r.id = rm.roleId and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id and um.meta_key = 'district_id' and um.meta_value in ( select distinct d.id from district d, municipality m, province p, region r  where d.id = m.district_id and d.province_id = p.id and p.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' )) AND u.status=1 order by u.id";
			dataArr.push(user_id);
		}
		
		var user = {};
		var result = [];
		var actualData = {};
		var postalCodeArr = [];
		var districtArr = [];
		var subDistrictArr = [];
		var municipalityArr = [];
		var provinceArr = [];
		var userId = "";
		var tlhArr = [];
		Usermapping.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObject)=>{
			
			if(resultObject){
				async.each(resultObject, function(json, callback) {
					
					if(userId!=json.uid){
						
						if(Object.keys(user).length){
							result.push(user);
						}
						
						userId = json.uid;

						postalCodeArr = [];
						districtArr = [];
						subDistrictArr = [];
						municipalityArr = [];
						provinceArr = [];

						user = {};
						user['uid'] = "";
						user['rolename'] = "";
						user['user_name'] = "";
						user['parent_id'] = "";
						user['postal_code'] = [];
						user['province'] = [];
						user['municipality'] = [];
						user['subdistrict'] = [];
						user['district'] = [];
					}
					
					if(tlhArr.indexOf(json.uid) < 0){
						tlhArr.push(json.uid);
					}
					
					user['uid'] = json.uid;
					user['user_name'] = json.user_name;
					user['parent_id'] = user_id;
					
					user['rolename'] = json.rolename;
					if(postalCodeArr.indexOf(json.postal_code) < 0){
						postalCodeArr.push(json.postal_code);
						var arr = { "name":json.postal_code, "id":json.postal_code_id };
						user['postal_code'].push(arr);
					}
					if(provinceArr.indexOf(json.province_id) < 0){
						provinceArr.push(json.province_id);
						var arr = { "name":json.province_name, "id":json.province_id };
						user['province'].push(arr);
					}
					if(municipalityArr.indexOf(json.municipality_id) < 0){
						municipalityArr.push(json.municipality_id);
						var arr = { "name":json.municipality_name, "id":json.municipality_id };
						user['municipality'].push(arr);
					}
					if(districtArr.indexOf(json.district_id) < 0){
						districtArr.push(json.district_id);
						var arr = { "name":json.district_name, "id":json.district_id };
						user['district'].push(arr);
					}
					if(subDistrictArr.indexOf(json.subdistrict_id) < 0){
						subDistrictArr.push(json.subdistrict_id);
						var arr = { "name":json.subdistrict_name, "id":json.subdistrict_id };
						user['subdistrict'].push(arr);
					}
					callback();
				},
				(err)=>{
					result.push(user);
					
					if(rolename == "$ac"){
						
						var tlhId="";
						for(var i=0; i<tlhArr.length; i++){
							if(tlhArr.length == i+1){
								tlhId+="(?)";
							}else{
								tlhId+="(?),";
							}
						}
						
						postalCodeArr = [];
						districtArr = [];
						subDistrictArr = [];
						municipalityArr = [];
						provinceArr = [];
						userId = "";
						user = {};
						
						var sqlQuery =	"select um3.uid as tlh_id, u.realm as user_name, r.name as rolename, um.uid, pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, municipality m, RoleMapping rm, user_mapping um, user_mapping um2, postal_code p, subdistrict sd left join user_mapping um3 on um3.meta_value = sd.id where um3.meta_key='subdistrict_id' and u.id = rm.principalId and um2.meta_value = p.subdistrict_id and um.meta_value = p.id and u.id = um.uid and r.id = rm.roleId and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id and um.meta_key = 'postal_code' and r.name !='$hpb' and um.meta_value in ( select id from postal_code where subdistrict_id in ( select meta_value from user_mapping where uid IN ("+tlhId+") and meta_key = 'subdistrict_id'  ) ) group by um3.uid, u.realm, r.name, um.uid, pro.name, pro.id, d.name, d.id, sd.name, sd.id, m.name, m.id, p.postal_code, p.id, u.id order by u.id";
						Usermapping.app.dbConnection.execute(sqlQuery,tlhArr,(err,sphObject)=>{
							
							if(sphObject){
								async.each(sphObject, function(json, callback2) {
									
									if(userId!=json.uid){
										
										if(Object.keys(user).length){
											result.push(user);
										}
										
										userId = json.uid;

										postalCodeArr = [];
										districtArr = [];
										subDistrictArr = [];
										municipalityArr = [];
										provinceArr = [];

										user = {};
										user['uid'] = "";
										user['rolename'] = "";
										user['user_name'] = "";
										user['parent_id'] = "";
										user['postal_code'] = [];
										user['province'] = [];
										user['municipality'] = [];
										user['subdistrict'] = [];
										user['district'] = [];
									}
									
									user['uid'] = json.uid;
									user['user_name'] = json.user_name;
									user['parent_id'] = json.tlh_id;
									
									user['rolename'] = json.rolename;
									if(postalCodeArr.indexOf(json.postal_code) < 0){
										postalCodeArr.push(json.postal_code);
										var arr = { "name":json.postal_code, "id":json.postal_code_id };
										user['postal_code'].push(arr);
									}
									if(provinceArr.indexOf(json.province_id) < 0){
										provinceArr.push(json.province_id);
										var arr = { "name":json.province_name, "id":json.province_id };
										user['province'].push(arr);
									}
									if(municipalityArr.indexOf(json.municipality_id) < 0){
										municipalityArr.push(json.municipality_id);
										var arr = { "name":json.municipality_name, "id":json.municipality_id };
										user['municipality'].push(arr);
									}
									if(districtArr.indexOf(json.district_id) < 0){
										districtArr.push(json.district_id);
										var arr = { "name":json.district_name, "id":json.district_id };
										user['district'].push(arr);
									}
									if(subDistrictArr.indexOf(json.subdistrict_id) < 0){
										subDistrictArr.push(json.subdistrict_id);
										var arr = { "name":json.subdistrict_name, "id":json.subdistrict_id };
										user['subdistrict'].push(arr);
									}
									callback2();
								},
								(err)=>{
									result.push(user);
									cb(null, result);
								});
						
							}
							else{
								cb(null, result);
							}
						});
					}
					else if(rolename == "$am"){
						
						// get all the TLH under this AM now according to AC Id
						var acId="";
						for(var i=0; i<tlhArr.length; i++){
							if(tlhArr.length == i+1){
								acId+="(?)";
							}else{
								acId+="(?),";
							}
						}
						
						postalCodeArr = [];
						districtArr = [];
						subDistrictArr = [];
						municipalityArr = [];
						provinceArr = [];
						userId = "";
						user = {};
						var tlhArrNew = [];
						
						var sqlQuery =	"select um3.uid as ac_id, u.realm as user_name, r.name as rolename, um.uid, pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, municipality m, RoleMapping rm, user_mapping um, user_mapping um2, postal_code p, subdistrict sd, district d left join user_mapping um3 on um3.meta_value = d.id where  um3.meta_key='district_id' and u.id = rm.principalId and um2.meta_value = p.subdistrict_id and um.meta_value = sd.id and u.id = um.uid and r.id = rm.roleId and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id and um.meta_key = 'subdistrict_id' and r.name !='$hpb' and um.meta_value in ( select sd.id from subdistrict sd, district d, municipality m where sd.municipality_id = m.id and m.district_id = d.id and d.id in ( select meta_value from user_mapping where uid IN ("+acId+") and meta_key = 'district_id'  ) ) group by um3.uid, u.realm, r.name, um.uid, pro.name, pro.id, d.name, d.id, sd.name, sd.id, m.name, m.id, p.postal_code, p.id, u.id order by u.id";
						
						Usermapping.app.dbConnection.execute(sqlQuery,tlhArr,(err,tlhObject)=>{
							
							if(tlhObject){
								
								async.each(tlhObject, function(json, callback2) {
									
									if(userId!=json.uid){
										
										if(Object.keys(user).length){
											result.push(user);
										}
										
										userId = json.uid;

										postalCodeArr = [];
										districtArr = [];
										subDistrictArr = [];
										municipalityArr = [];
										provinceArr = [];

										user = {};
										user['uid'] = "";
										user['rolename'] = "";
										user['user_name'] = "";
										user['parent_id'] = "";
										user['postal_code'] = [];
										user['province'] = [];
										user['municipality'] = [];
										user['subdistrict'] = [];
										user['district'] = [];
									}
									
									if(tlhArrNew.indexOf(json.uid) < 0){
										tlhArrNew.push(json.uid);
									}
									
									user['uid'] = json.uid;
									user['user_name'] = json.user_name;
									user['parent_id'] = json.ac_id;
									
									user['rolename'] = json.rolename;
									if(postalCodeArr.indexOf(json.postal_code) < 0){
										postalCodeArr.push(json.postal_code);
										var arr = { "name":json.postal_code, "id":json.postal_code_id };
										user['postal_code'].push(arr);
									}
									if(provinceArr.indexOf(json.province_id) < 0){
										provinceArr.push(json.province_id);
										var arr = { "name":json.province_name, "id":json.province_id };
										user['province'].push(arr);
									}
									if(municipalityArr.indexOf(json.municipality_id) < 0){
										municipalityArr.push(json.municipality_id);
										var arr = { "name":json.municipality_name, "id":json.municipality_id };
										user['municipality'].push(arr);
									}
									if(districtArr.indexOf(json.district_id) < 0){
										districtArr.push(json.district_id);
										var arr = { "name":json.district_name, "id":json.district_id };
										user['district'].push(arr);
									}
									if(subDistrictArr.indexOf(json.subdistrict_id) < 0){
										subDistrictArr.push(json.subdistrict_id);
										var arr = { "name":json.subdistrict_name, "id":json.subdistrict_id };
										user['subdistrict'].push(arr);
									}
									callback2();
								},
								(err)=>{
									result.push(user);
									
									var tlhId="";
									for(var i=0; i<tlhArrNew.length; i++){
										if(tlhArrNew.length == i+1){
											tlhId+="(?)";
										}else{
											tlhId+="(?),";
										}
									}
									
									postalCodeArr = [];
									districtArr = [];
									subDistrictArr = [];
									municipalityArr = [];
									provinceArr = [];
									userId = "";
									user = {};
									
									// get all SPH according to tlh ids
									var sqlQuery =	"select um3.uid as tlh_id, u.realm as user_name, r.name as rolename, um.uid, pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, municipality m, RoleMapping rm, user_mapping um, user_mapping um2, postal_code p, subdistrict sd left join user_mapping um3 on um3.meta_value = sd.id where um3.meta_key='subdistrict_id' and u.id = rm.principalId and um2.meta_value = p.subdistrict_id and um.meta_value = p.id and u.id = um.uid and r.id = rm.roleId and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id and um.meta_key = 'postal_code' and r.name !='$hpb' and um.meta_value in ( select id from postal_code where subdistrict_id in ( select meta_value from user_mapping where uid IN ("+tlhId+") and meta_key = 'subdistrict_id'  ) ) group by um3.uid, u.realm, r.name, um.uid, pro.name, pro.id, d.name, d.id, sd.name, sd.id, m.name, m.id, p.postal_code, p.id, u.id order by u.id";
									
									
									Usermapping.app.dbConnection.execute(sqlQuery,tlhArrNew,(err,sphObject)=>{
										
										if(sphObject){
											async.each(sphObject, function(json, callback2) {
												
												if(userId!=json.uid){
													
													if(Object.keys(user).length){
														result.push(user);
													}
													
													userId = json.uid;

													postalCodeArr = [];
													districtArr = [];
													subDistrictArr = [];
													municipalityArr = [];
													provinceArr = [];

													user = {};
													user['uid'] = "";
													user['rolename'] = "";
													user['user_name'] = "";
													user['parent_id'] = "";
													user['postal_code'] = [];
													user['province'] = [];
													user['municipality'] = [];
													user['subdistrict'] = [];
													user['district'] = [];
												}
												
												user['uid'] = json.uid;
												user['user_name'] = json.user_name;
												user['parent_id'] = json.tlh_id;
												
												user['rolename'] = json.rolename;
												if(postalCodeArr.indexOf(json.postal_code) < 0){
													postalCodeArr.push(json.postal_code);
													var arr = { "name":json.postal_code, "id":json.postal_code_id };
													user['postal_code'].push(arr);
												}
												if(provinceArr.indexOf(json.province_id) < 0){
													provinceArr.push(json.province_id);
													var arr = { "name":json.province_name, "id":json.province_id };
													user['province'].push(arr);
												}
												if(municipalityArr.indexOf(json.municipality_id) < 0){
													municipalityArr.push(json.municipality_id);
													var arr = { "name":json.municipality_name, "id":json.municipality_id };
													user['municipality'].push(arr);
												}
												if(districtArr.indexOf(json.district_id) < 0){
													districtArr.push(json.district_id);
													var arr = { "name":json.district_name, "id":json.district_id };
													user['district'].push(arr);
												}
												if(subDistrictArr.indexOf(json.subdistrict_id) < 0){
													subDistrictArr.push(json.subdistrict_id);
													var arr = { "name":json.subdistrict_name, "id":json.subdistrict_id };
													user['subdistrict'].push(arr);
												}
												callback2();
											},
											(err)=>{
												result.push(user);
												cb(null, result);
											});
									
										}
										else{
											cb(null, result);
										}
									});
								});
							}
							else{
								cb(null, result);
							}
						});
					}
					else{
						cb(null, result);
					}
				});
			}else{
				cb(null, result);
			}
			
		});
	}
	
	Usermapping.remoteMethod('getUserMapped',{
		http:{ path:'', verb:'' },
		accepts:[
					{ arg:'user_id', type:'number' },
					{ arg:'rolename', type:'string' }
				],
		returns:{ arg:'result', type:'object' }
	});
	
	
	// AM Reports with Web View
	
	Usermapping.getScorecardAM = function(target_for,res,rolename,user_id,region_id,from_month,to_month,year,cb){
		var date = new Date();
		var currentMonth = (date.getMonth())+1;
		var currentYear = date.getFullYear();
		
		if(!from_month){
			from_month = 1;
		}
		
		if(!to_month){
			to_month = currentMonth;
		}
		
		if(!year){
			year = currentYear;
		}
		
		var Excel = require("exceljs");
		const tempfile = require('tempfile');

		var workbook = new Excel.Workbook();
		var sheetName =  (target_for.replace(/_/g , " ")).toUpperCase();
		var worksheet = workbook.addWorksheet(sheetName);
		var columns = [{ header: 'Region', key: 'region', width: 10 },{ header: 'Total Target', key: 'target', width: 10 },{ header: 'Total Achieved', key: 'achieved', width: 10 }];
		
		var months = ["Jan","Feb","March","April","May","Jun","July","Aug","Sep","Oct","Nov","Dec"];
		var totalRows = 3+((to_month-from_month)*3); // to get the total number of columns
		for(var i=(from_month-1); i<to_month; i++){
			var obj1 = { header: months[i]+' Target', key: i+'target', width: 10 };
			var obj2 = { header: months[i]+' Achieved', key: i+'achieved', width: 10 };
			var obj3 = { header: months[i]+'Estimated', key: i+'estimated', width: 10 };
			columns.push(obj1);
			columns.push(obj2);
			columns.push(obj3);
		}
		worksheet.columns = columns;
		
		// get all Region data
		var regArr = [];
		if(rolename == "$ra" && user_id > 0){
			var getAllRegion = "select * from region r where r.id in ( select meta_value from user_mapping where meta_key = 'region_id' and uid = (?) )";
			regArr.push(user_id);
		}else{								
			var getAllRegion = "select * from region r where 1=1 ";
		}
		if(region_id > 0){
			getAllRegion+=" AND r.id = (?) ";
			regArr.push(region_id);
		}
		
		Usermapping.app.dbConnection.execute(getAllRegion,regArr,(err,regData)=>{
			
			async.forEachOf(regData, function(regionDet, acKey, regCallback){
			
				var acMonthlyTarget = [];
				var acMonthlyAchieved = [];
				var acMonthlyEstimated = [];
				
				regionDet['reg'] = {};
				regionDet['reg']["region"] = regionDet.name;
				regionDet['reg']["target"] = 0;
				regionDet['reg']["achieved"] = 0;
				
				// foreach AC -> district, get its TLH
				var getTLHDistrict = "select d.* from province p join district d on p.id = d.province_id where p.region_id = (?) and d.status = 1";
				Usermapping.app.dbConnection.execute(getTLHDistrict,[regionDet.id],(err,districtData)=>{
					
					regionDet['dis'] = [];
					
					async.forEachOf(districtData, function(districtDet, disKey, disCallback){
						regionDet['dis'][disKey] = {};
						regionDet['dis'][disKey]['region'] = districtDet.name;
						regionDet['dis'][disKey]['target'] = 0;
						regionDet['dis'][disKey]['achieved'] = 0;
						
						// Get SPH stats
						var getStats = "select target_label, target_month, sum(monthly_target) as monthly_target, sum(achieved_target) as achieved_target, sum(estimated_target) as estimated_target  from monthly_scorecard_reports where sph_id in ( select um.uid from user_mapping um join postal_code p on um.meta_value = p.id and um.meta_key = 'postal_code' join subdistrict sd on p.subdistrict_id = sd.id join municipality m on m.id = sd.municipality_id where target_label = (?) and m.district_id = (?) ) group by target_label, target_month order by target_month";
						var sphArr = [target_for,districtDet.id];
						
						Usermapping.app.dbConnection.execute(getStats,sphArr,(err,statData)=>{
											
							// for each month, add the data value
							var target = 0;
							var achieved = 0;
							var estimated = 0;
							
							for(var i=(from_month-1); i<to_month; i++){
								regionDet['dis'][disKey][i+'target'] = 0;
								regionDet['dis'][disKey][i+'achieved'] = 0;
								regionDet['dis'][disKey][i+'estimated'] = 0;
							}
							
							async.forEachOf(statData, function(stats, statKey, statCallback){
								
								//stats for each month
								statKey = stats['target_month'] - 1;
								regionDet['dis'][disKey][statKey+'target'] = stats['monthly_target'];
								regionDet['dis'][disKey][statKey+'achieved'] = stats['achieved_target'];
								regionDet['dis'][disKey][statKey+'estimated'] = stats['estimated_target'];
								
								target = target + stats['monthly_target'];
								achieved = achieved + stats['achieved_target'];
								estimated = estimated + stats['estimated_target'];
								statCallback();
							},
							(err)=>{
								regionDet['dis'][disKey]['target'] = target;
								regionDet['dis'][disKey]['achieved'] = achieved;
								regionDet['dis'][disKey]['estimated'] = estimated;
								disCallback(); // run the loop for next month
							});
							
						});
										
					},
					(err)=>{
						
						// all the district is over for this region
						var districtLength = (regionDet['dis']).length;
						regionDet['reg']["target"] = 0;
						regionDet['reg']["achieved"] = 0;
						
						for(var j=0; j<districtLength; j++){
							regionDet['reg']["target"] = regionDet['reg']["target"] +  regionDet['dis'][j]['target'];
							regionDet['reg']["achieved"] = regionDet['reg']["achieved"] +  regionDet['dis'][j]['achieved'];
						}
						
						// all the data for district under this region is calculated
						for(var i=(from_month-1); i<to_month; i++){
							for(var j=0; j<districtLength; j++){									
								
								if(typeof(regionDet['reg'][i+"target"]) == "undefined" || isNaN(regionDet['reg'][i+"target"])){
									regionDet['reg'][i+"target"] = 0;
								}
								if(typeof(regionDet['reg'][i+"achieved"]) == "undefined" || isNaN(regionDet['reg'][i+"achieved"])){
									regionDet['reg'][i+"achieved"] = 0;
								}
								if(typeof(regionDet['reg'][i+"estimated"]) == "undefined" || isNaN(regionDet['reg'][i+"estimated"])){
									regionDet['reg'][i+"estimated"] = 0;
								}
								
								if(typeof(regionDet['dis'][j][i+'target']) == "undefined" || isNaN(regionDet['dis'][j][i+'target'])){
									regionDet['dis'][j][i+'target'] = 0;
								}
								if(typeof(regionDet['dis'][j][i+'achieved']) == "undefined" || isNaN(regionDet['dis'][j][i+'achieved'])){
									regionDet['dis'][j][i+'achieved'] = 0;
								}
								if(typeof(regionDet['dis'][j][i+'estimated']) == "undefined" || isNaN(regionDet['dis'][j][i+'estimated'])){
									regionDet['dis'][j][i+'estimated'] = 0;
								}
								
								regionDet['reg'][i+"target"] = regionDet['reg'][i+"target"] +  regionDet['dis'][j][i+'target'];
								regionDet['reg'][i+"achieved"] = regionDet['reg'][i+"achieved"] +  regionDet['dis'][j][i+'achieved'];
								regionDet['reg'][i+"estimated"] = regionDet['reg'][i+"estimated"] +  regionDet['dis'][j][i+'estimated'];
								
							}
							if(i+1 == to_month){
								regCallback();
							}
						}
					
					});
				
				});
			},
			(err)=>{
				for(var ac=0; ac<regData.length; ac++){
					
					if(ac != 0){
						worksheet.addRow();
					}
					
					// add AC's record first
					worksheet.addRow(regData[ac]['reg']);
					var rowNo = worksheet.lastRow;
					//expect(worksheet.getRow(rowNo).collapsed).to.equal(false);
					rowNo.getCell('A').font = {
						bold: true
					};
					
					// once you have added AC's row, add TLH
					var disLength = (regData[ac]['dis']).length;
					for(var dis=0; dis<disLength; dis++){
						worksheet.addRow(regData[ac]['dis'][dis]);
					}
				}
				
				var tempFilePath = tempfile('.xlsx');
				var date = new Date();
				var filename = "am-"+target_for+"-"+date.getDate()+"-"+(date.getMonth()+1)+"-"+date.getFullYear()+"-"+date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds()+".xlsx";
				workbook.xlsx.writeFile("storage/report/"+filename).then(function() {
					var resultObj = [{"serverPath":"api/container/report/download/"+filename}];
					cb(null,resultObj);
				});
			});
		});

	};
	
	Usermapping.remoteMethod('getScorecardAM',{
		http:{ path:'/getScorecardAM', verb:'' },
		accepts:[
				{arg: 'target_for', type: 'string', 'http': {source: 'query'}},
				{arg: 'res', type: 'object', 'http': {source: 'res'}},
				{arg: 'rolename', type: 'string', 'http': {source: 'query'}},
				{arg: 'user_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'region_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'from_month', type: 'number', 'http': {source: 'query'}},
				{arg: 'to_month', type: 'number', 'http': {source: 'query'}},
				{arg: 'year', type: 'number', 'http': {source: 'query'}}
		],
		returns:{ arg:'result', type:'object' }
	})

	Usermapping.getScorecardAMWebView = function(target_for,rolename,user_id,region_id,from_month,to_month,year,cb){
		var date = new Date();
		var currentMonth = (date.getMonth())+1;
		var currentYear = date.getFullYear();
		
		if(!from_month){
			from_month = 1;
		}
		
		if(!to_month){
			to_month = currentMonth;
		}
		
		if(!year){
			year = currentYear;
		}
		
		var columns = [{ header: 'Region', key: 'region', width: 10 },{ header: 'Total Target', key: 'target', width: 10 },{ header: 'Total Achieved', key: 'achieved', width: 10 },{ header: 'IsRegion', key: 'isregion', width: 10 }];
		
		var months = ["Jan","Feb","March","April","May","Jun","July","Aug","Sep","Oct","Nov","Dec"];
		var totalRows = 3+((to_month-from_month)*3); // to get the total number of columns
		for(var i=(from_month-1); i<to_month; i++){
			var obj1 = { header: months[i]+' Target', key: i+'target', width: 10 };
			var obj2 = { header: months[i]+' Achieved', key: i+'achieved', width: 10 };
			var obj3 = { header: months[i]+'Estimated', key: i+'estimated', width: 10 };
			columns.push(obj1);
			columns.push(obj2);
			columns.push(obj3);
		}
		
		// get all Region data
		var regArr = [];
		var report = [];
		if(rolename == "$ra" && user_id > 0){
			var getAllRegion = "select * from region r where r.id in ( select meta_value from user_mapping where meta_key = 'region_id' and uid = (?) )";
			regArr.push(user_id);
		}else{								
			var getAllRegion = "select * from region r where 1=1 ";
		}
		if(region_id > 0){
			getAllRegion+=" AND r.id = (?) ";
			regArr.push(region_id);
		}
		
		Usermapping.app.dbConnection.execute(getAllRegion,regArr,(err,regData)=>{
			
			async.forEachOf(regData, function(regionDet, acKey, regCallback){
			
				var acMonthlyTarget = [];
				var acMonthlyAchieved = [];
				var acMonthlyEstimated = [];
				
				regionDet['reg'] = {};
				regionDet['reg']["region"] = regionDet.name;
				regionDet['reg']['isregion'] = "yes";
				regionDet['reg']["target"] = 0;
				regionDet['reg']["achieved"] = 0;
				
				// foreach AC -> district, get its TLH
				var getTLHDistrict = "select d.* from province p join district d on p.id = d.province_id where p.region_id = (?) and d.status = 1";
				Usermapping.app.dbConnection.execute(getTLHDistrict,[regionDet.id],(err,districtData)=>{
					
					regionDet['dis'] = [];
					
					async.forEachOf(districtData, function(districtDet, disKey, disCallback){
						regionDet['dis'][disKey] = {};
						regionDet['dis'][disKey]['region'] = districtDet.name;
						regionDet['dis'][disKey]['isregion'] = "";
						regionDet['dis'][disKey]['target'] = 0;
						regionDet['dis'][disKey]['achieved'] = 0;
						
						// Get SPH stats
						var getStats = "select target_label, target_month, sum(monthly_target) as monthly_target, sum(achieved_target) as achieved_target, sum(estimated_target) as estimated_target  from monthly_scorecard_reports where sph_id in ( select um.uid from user_mapping um join postal_code p on um.meta_value = p.id and um.meta_key = 'postal_code' join subdistrict sd on p.subdistrict_id = sd.id join municipality m on m.id = sd.municipality_id where target_label = (?) and m.district_id = (?) ) group by target_label, target_month order by target_month";
						var sphArr = [target_for,districtDet.id];
						
						Usermapping.app.dbConnection.execute(getStats,sphArr,(err,statData)=>{
											
							// for each month, add the data value
							var target = 0;
							var achieved = 0;
							var estimated = 0;
							for(var i=(from_month-1); i<to_month; i++){
								regionDet['dis'][disKey][i+'target'] = 0;
								regionDet['dis'][disKey][i+'achieved'] = 0;
								regionDet['dis'][disKey][i+'estimated'] = 0;
							}
							async.forEachOf(statData, function(stats, statKey, statCallback){
								
								//stats for each month
								statKey = stats['target_month']-1;
								regionDet['dis'][disKey][statKey+'target'] = stats['monthly_target'];
								regionDet['dis'][disKey][statKey+'achieved'] = stats['achieved_target'];
								regionDet['dis'][disKey][statKey+'estimated'] = stats['estimated_target'];
								
								target = target + stats['monthly_target'];
								achieved = achieved + stats['achieved_target'];
								estimated = estimated + stats['estimated_target'];
								statCallback();
							},
							(err)=>{
								regionDet['dis'][disKey]['target'] = target;
								regionDet['dis'][disKey]['achieved'] = achieved;
								regionDet['dis'][disKey]['estimated'] = estimated;
								disCallback(); // run the loop for next month
							});
							
						});
										
					},
					(err)=>{
						
						// all the district is over for this region
						var districtLength = (regionDet['dis']).length;
						regionDet['reg']["target"] = 0;
						regionDet['reg']["achieved"] = 0;
						
						for(var j=0; j<districtLength; j++){
							regionDet['reg']["target"] = regionDet['reg']["target"] +  regionDet['dis'][j]['target'];
							regionDet['reg']["achieved"] = regionDet['reg']["achieved"] +  regionDet['dis'][j]['achieved'];
						}
						
						// all the data for district under this region is calculated
						for(var i=(from_month-1); i<to_month; i++){
							for(var j=0; j<districtLength; j++){									
								
								if(typeof(regionDet['reg'][i+"target"]) == "undefined" || isNaN(regionDet['reg'][i+"target"])){
									regionDet['reg'][i+"target"] = 0;
								}
								if(typeof(regionDet['reg'][i+"achieved"]) == "undefined" || isNaN(regionDet['reg'][i+"achieved"])){
									regionDet['reg'][i+"achieved"] = 0;
								}
								if(typeof(regionDet['reg'][i+"estimated"]) == "undefined" || isNaN(regionDet['reg'][i+"estimated"])){
									regionDet['reg'][i+"estimated"] = 0;
								}
								
								if(typeof(regionDet['dis'][j][i+'target']) == "undefined" || isNaN(regionDet['dis'][j][i+'target'])){
									regionDet['dis'][j][i+'target'] = 0;
								}
								if(typeof(regionDet['dis'][j][i+'achieved']) == "undefined" || isNaN(regionDet['dis'][j][i+'achieved'])){
									regionDet['dis'][j][i+'achieved'] = 0;
								}
								if(typeof(regionDet['dis'][j][i+'estimated']) == "undefined" || isNaN(regionDet['dis'][j][i+'estimated'])){
									regionDet['dis'][j][i+'estimated'] = 0;
								}
								
								regionDet['reg'][i+"target"] = regionDet['reg'][i+"target"] +  regionDet['dis'][j][i+'target'];
								regionDet['reg'][i+"achieved"] = regionDet['reg'][i+"achieved"] +  regionDet['dis'][j][i+'achieved'];
								regionDet['reg'][i+"estimated"] = regionDet['reg'][i+"estimated"] +  regionDet['dis'][j][i+'estimated'];
								
							}
							if(i+1 == to_month){
								regCallback();
							}
						}
					
					});
				
				});
			},
			(err)=>{
				if(regData){
					for(var ac=0; ac<regData.length; ac++){
					
						if(ac != 0){
							report.push({});
						}
						
						// add AC's record first
						report.push(regData[ac]['reg']);
						
						// once you have added AC's row, add TLH
						var disLength = (regData[ac]['dis']).length;
						for(var dis=0; dis<disLength; dis++){
							report.push(regData[ac]['dis'][dis]);
						}
					}
				}
				var date = new Date();
				var filename = "am-"+target_for+"-"+date.getDate()+"-"+(date.getMonth()+1)+"-"+date.getFullYear()+"-"+date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds()+".xlsx";
				cb(null,report);
			});
		});

	};
	
	Usermapping.remoteMethod('getScorecardAMWebView',{
		http:{ path:'/getScorecardAMWebView', verb:'' },
		accepts:[
				{arg: 'target_for', type: 'string', 'http': {source: 'query'}},
				{arg: 'rolename', type: 'string', 'http': {source: 'query'}},
				{arg: 'user_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'region_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'from_month', type: 'number', 'http': {source: 'query'}},
				{arg: 'to_month', type: 'number', 'http': {source: 'query'}},
				{arg: 'year', type: 'number', 'http': {source: 'query'}}
		],
		returns:{ arg:'result', type:'object' }
	})

	
	// AM Scorecard Summary with Web View
	
	Usermapping.getAMScorecardSummary = function(target_for,res,rolename,user_id,ac_id, district_id, month, year,cb){
		var date = new Date();
		var currentMonth = (date.getMonth())+1;
		var currentYear = date.getFullYear();
		
		if(!month){
			month = currentMonth;
		}
		
		if(!year){
			year = currentYear;
		}
		
		var todayDate = date.getDate();
		var total = (new Date(year, todayDate, 0).getDate());
		var monthTimeFactor = Math.round((todayDate/total)*100);
		
		var totalDays = todayDate;
		for(var i=1; i<month; i++){
			totalDays = totalDays + (new Date(year, i, 0).getDate());
		}
		
		var totalDaysYear = 0;
		if(year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)){
			totalDaysYear = 366;
		}else{
			totalDaysYear = 365;
		}
		
		var yearTimeFactor = Math.round((totalDays/totalDaysYear)*100);
		
		var statsArr = [];
		if((rolename == "$ra" && user_id > 0)||(rolename == "$sa" && user_id > 0)){
			var getAllDistinctAC = "SELECT distinct u.id, u.realm FROM [USER] u JOIN Rolemapping rm ON u.id = rm.principalId  JOIN user_mapping um ON rm.principalId = um.uid  AND um.meta_key = 'district_id' AND um.meta_value IN ( select d.id from [User] u join user_mapping um1 on u.id = um.uid join region r on um1.meta_value = r.id and um1.meta_key = 'region_id' and um1.uid = (?) join province p on p.region_id = r.id join district d on d.province_id = p.id )  JOIN Role r ON rm.roleId = r.id AND r.name = '$ac' WHERE 1=1";
			statsArr = [user_id];
		}else{
			// get all AC data
			var getAllDistinctAC = "SELECT distinct u.id, u.realm FROM [USER] u JOIN Rolemapping rm ON u.id = rm.principalId  JOIN user_mapping um ON rm.principalId = um.uid  AND um.meta_key = 'district_id' JOIN Role r ON rm.roleId = r.id AND r.name = '$ac' where 1=1";
		}
		
		if(district_id > 0){
			getAllDistinctAC+=" AND um.meta_value = (?)";
			statsArr.push(district_id);
		}
		if(ac_id > 0){
			getAllDistinctAC+=" AND um.uid = (?)";
			statsArr.push(ac_id);
		}

		getAllDistinctAC +=" ORDER BY u.id";
		
		var Excel = require("exceljs");
		const tempfile = require('tempfile');

		var workbook = new Excel.Workbook();
		var worksheet = workbook.addWorksheet('Scorecard AM');
		
		var columns = [
			{ header: 'Date', key: 'name', width: 10 },
			{ header: '', key: 'district', width: 10 },
			{ header: 'Month', key: 'srku_vol_target_month', width: 10 },
			{ header: '', key: 'srku_vol_achieved_month', width: 10 },
			{ header: 'No. of AC', key: 'srku_vol_month_percent', width: 10 },
			{ header: '', key: 'srku_vol_target_year', width: 10 },
			{ header: 'Month Time Factor', key: 'srku_vol_achieved_year', width: 10 },
			{ header: '', key: 'srku_vol_year_percent', width: 10 },
			{ header: 'Year Time Factor', key: 'cement_vol_maintain_target_month', width: 10 },
			{ header: '', key: 'cement_vol_maintain_achieved_month', width: 10 },
			{ header: '', key: 'cement_vol_maintain_month_percent', width: 10 },
			{ header: '', key: 'cement_vol_maintain_target_year', width: 10 },
			{ header: '', key: 'cement_vol_maintain_achieved_year', width: 10 },
			{ header: '', key: 'cement_vol_maintain_year_percent', width: 10 },
			{ header: '', key: 'cement_vol_switching_target_month', width: 10 },
			{ header: '', key: 'cement_vol_switching_achieved_month', width: 10 },
			{ header: '', key: 'cement_vol_switching_month_percent', width: 10 },
			{ header: '', key: 'cement_vol_switching_target_year', width: 10 },
			{ header: '', key: 'cement_vol_switching_achieved_year', width: 10 },
			{ header: '', key: 'cement_vol_switching_year_percent', width: 10 },
			{ header: '', key: 'new_switching_hpb_target_month', width: 10 },
			{ header: '', key: 'new_switching_hpb_achieved_month', width: 10 },
			{ header: '', key: 'new_switching_hpb_month_percent', width: 10 },
			{ header: '', key: 'new_switching_hpb_target_year', width: 10 },
			{ header: '', key: 'new_switching_hpb_achieved_year', width: 10 },
			{ header: '', key: 'new_switching_hpb_year_percent', width: 10 },
			{ header: '', key: 'srku_house_num_target_month', width: 10 },
			{ header: '', key: 'srku_house_num_achieved_month', width: 10 },
			{ header: '', key: 'srku_house_num_month_percent', width: 10 },
			{ header: '', key: 'srku_house_num_target_year', width: 10 },
			{ header: '', key: 'srku_house_num_achieved_year', width: 10 },
			{ header: '', key: 'srku_house_num_year_percent', width: 10 }
		];
		
		var totalRows = 23; // total number of columns
		worksheet.columns = columns;
		var row = {
			'name':'Name','district':'District','srku_vol_target_month':'SRKU Target MTD','srku_vol_achieved_month':'SRKU Achieved MTD','srku_vol_month_percent':'% SRKU MTD','srku_vol_target_year':'SRKU Target YTD','srku_vol_achieved_year':'SRKU Achieved YTD','srku_vol_year_percent':'% SRKU YTD','cement_vol_maintain_target_month':'HPB Maintain Target MTD','cement_vol_maintain_achieved_month':'HPB Maintain Achieved MTD','cement_vol_maintain_month_percent':'% HPB Maintain MTD','cement_vol_maintain_target_year':'HPB Maintain Target YTD','cement_vol_maintain_achieved_year':'HPB Maintain Achieved YTD','cement_vol_maintain_year_percent':'% HPB Maintain YTD','cement_vol_switching_target_month':'HPB Switching Target MTD','cement_vol_switching_achieved_month':'HPB Switching Achieved MTD','cement_vol_switching_month_percent':'% HPB Switching MTD','cement_vol_switching_target_year':'HPB Switching Target YTD','cement_vol_switching_achieved_year':'HPB Switching Achieved YTD','cement_vol_switching_year_percent':'% HPB Switching YTD',
			'new_switching_hpb_target_month':'New Member Target MTD','new_switching_hpb_achieved_month':'New Member Achieved MTD','new_switching_hpb_month_percent':'% New Member MTD','new_switching_hpb_target_year':'New Member Target YTD','new_switching_hpb_achieved_year':'New Member Achieved YTD','new_switching_hpb_year_percent':'% New Member YTD','srku_house_num_target_month':'SRKU House Target MTD','srku_house_num_achieved_month':'SRKU House Achieved MTD','srku_house_num_month_percent':'% SRKU House MTD','srku_house_num_target_year':'SRKU House Target YTD','srku_house_num_achieved_year':'SRKU House Achieved YTD','srku_house_num_year_percent':'% SRKU House YTD'};
		
		
		Usermapping.app.dbConnection.execute(getAllDistinctAC,statsArr,(err,acDistinctData)=>{
		
			// for the first row, time factor
			worksheet.addRow({"name":todayDate,"district":"","srku_vol_target_month":currentMonth,"srku_vol_achieved_month":"","srku_vol_month_percent":(acDistinctData.length),"srku_vol_target_year":"","srku_vol_achieved_year":monthTimeFactor,"srku_vol_year_percent":"","cement_vol_maintain_target_month":yearTimeFactor});
			worksheet.addRow();
			worksheet.addRow(row);
			
			// for unique AC
			async.forEachOf(acDistinctData, function(acDistinct, acDisKey, acDisCallback){		
				
				acDistinct['ac'] = {};
				
				acDistinct['ac']['name'] = acDistinct.realm;
				acDistinct['ac']['district'] = "";
				acDistinct['ac']['srku_vol_target_month'] = 0;
				acDistinct['ac']['srku_vol_achieved_month'] = 0;
				acDistinct['ac']['srku_vol_month_percent'] = 0;
				acDistinct['ac']['srku_vol_target_year'] = 0;
				acDistinct['ac']['srku_vol_achieved_year'] = 0;
				acDistinct['ac']['srku_vol_year_percent'] = 0;
				acDistinct['ac']['cement_vol_maintain_target_month'] = 0;
				acDistinct['ac']['cement_vol_maintain_achieved_month'] = 0;
				acDistinct['ac']['cement_vol_maintain_month_percent'] = 0;
				acDistinct['ac']['cement_vol_maintain_target_year'] = 0;
				acDistinct['ac']['cement_vol_maintain_achieved_year'] = 0;
				acDistinct['ac']['cement_vol_maintain_year_percent'] = 0;
				acDistinct['ac']['cement_vol_switching_target_month'] = 0;
				acDistinct['ac']['cement_vol_switching_achieved_month'] = 0;
				acDistinct['ac']['cement_vol_switching_month_percent'] = 0;
				acDistinct['ac']['cement_vol_switching_target_year'] = 0;
				acDistinct['ac']['cement_vol_switching_achieved_year'] = 0;
				acDistinct['ac']['cement_vol_switching_year_percent'] = 0;
				acDistinct['ac']['srku_house_num_target_month'] = 0;
				acDistinct['ac']['srku_house_num_achieved_month'] = 0;
				acDistinct['ac']['srku_house_num_month_percent'] = 0;
				acDistinct['ac']['srku_house_num_target_year'] = 0;
				acDistinct['ac']['srku_house_num_achieved_year'] = 0;
				acDistinct['ac']['srku_house_num_year_percent'] = 0;
				acDistinct['ac']['new_switching_hpb_target_month'] = 0;
				acDistinct['ac']['new_switching_hpb_achieved_month'] = 0;
				acDistinct['ac']['new_switching_hpb_month_percent'] = 0;
				acDistinct['ac']['new_switching_hpb_target_year'] = 0;
				acDistinct['ac']['new_switching_hpb_achieved_year'] = 0;
				acDistinct['ac']['new_switching_hpb_year_percent'] = 0;

				acDistinct['dis'] = [];
				
				var getAcDistrict = "SELECT um.uid, um.meta_value, u.id, u.realm, d.name as district, d.id as dId FROM [USER] u JOIN Rolemapping rm ON u.id = rm.principalId  and u.id = (?) JOIN user_mapping um ON rm.principalId = um.uid  AND um.meta_key = 'district_id' JOIN Role r ON rm.roleId = r.id AND r.name = '$ac' JOIN district d ON d.id = um.meta_value ORDER BY um.uid";
				var statsArr = [acDistinct.id];
				
				Usermapping.app.dbConnection.execute(getAcDistrict,statsArr,(err,acData)=>{
				
					async.forEachOf(acData, function(acDetail, acKey, acCallback){
					
						var acMonthlyTarget = [];
						var acMonthlyAchieved = [];
						var acMonthlyEstimated = [];
						acDistinct['dis'][acKey] = {};
						
						acDistinct['dis'][acKey]["name"] = "";
						acDistinct['dis'][acKey]["district"] = acDetail.district;
						acDistinct['dis'][acKey]['srku_vol_target_month'] = 0;
						acDistinct['dis'][acKey]['srku_vol_achieved_month'] = 0;
						acDistinct['dis'][acKey]['srku_vol_month_percent'] = 0;
						acDistinct['dis'][acKey]['srku_vol_target_year'] = 0;
						acDistinct['dis'][acKey]['srku_vol_achieved_year'] = 0;
						acDistinct['dis'][acKey]['srku_vol_year_percent'] = 0;
						acDistinct['dis'][acKey]['cement_vol_maintain_target_month'] = 0;
						acDistinct['dis'][acKey]['cement_vol_maintain_achieved_month'] = 0;
						acDistinct['dis'][acKey]['cement_vol_maintain_month_percent'] = 0;
						acDistinct['dis'][acKey]['cement_vol_maintain_target_year'] = 0;
						acDistinct['dis'][acKey]['cement_vol_maintain_achieved_year'] = 0;
						acDistinct['dis'][acKey]['cement_vol_maintain_year_percent'] = 0;
						acDistinct['dis'][acKey]['cement_vol_switching_target_month'] = 0;
						acDistinct['dis'][acKey]['cement_vol_switching_achieved_month'] = 0;
						acDistinct['dis'][acKey]['cement_vol_switching_month_percent'] = 0;
						acDistinct['dis'][acKey]['cement_vol_switching_target_year'] = 0;
						acDistinct['dis'][acKey]['cement_vol_switching_achieved_year'] = 0;
						acDistinct['dis'][acKey]['cement_vol_switching_year_percent'] = 0;
						acDistinct['dis'][acKey]['srku_house_num_target_month'] = 0;
						acDistinct['dis'][acKey]['srku_house_num_achieved_month'] = 0;
						acDistinct['dis'][acKey]['srku_house_num_month_percent'] = 0;
						acDistinct['dis'][acKey]['srku_house_num_target_year'] = 0;
						acDistinct['dis'][acKey]['srku_house_num_achieved_year'] = 0;
						acDistinct['dis'][acKey]['srku_house_num_year_percent'] = 0;
						acDistinct['dis'][acKey]['new_switching_hpb_target_month'] = 0;
						acDistinct['dis'][acKey]['new_switching_hpb_achieved_month'] = 0;
						acDistinct['dis'][acKey]['new_switching_hpb_month_percent'] = 0;
						acDistinct['dis'][acKey]['new_switching_hpb_target_year'] = 0;
						acDistinct['dis'][acKey]['new_switching_hpb_achieved_year'] = 0;
						acDistinct['dis'][acKey]['new_switching_hpb_year_percent'] = 0;
						
						// for each SPH get records from monthly stats report table
						var getStats = "select sc.target_label, sc.monthly_target, sc.achieved_target, target_month from monthly_scorecard_reports sc where  sc.target_year = (?) and sph_id in ( select um.uid from user_mapping um join postal_code p on um.meta_value = p.id and um.meta_key = 'postal_code' join subdistrict sd on p.subdistrict_id = sd.id join municipality m on m.id = sd.municipality_id where m.district_id = (?) ) and sc.target_label != 'vol_total' and sc.target_year = (?) and sc.target_month >= (?)";
						var statsArr = [currentYear,acDetail.dId,year,month];
						
						Usermapping.app.dbConnection.execute(getStats,statsArr,(err,statData)=>{
							
							var srku_vol_target_month = 0;
							var srku_vol_achieved_month = 0;
							var srku_vol_month_percent = 0;
							var srku_vol_target_year = 0;
							var srku_vol_achieved_year = 0;
							var srku_vol_year_percent = 0;
							
							var cement_vol_maintain_target_month = 0;
							var cement_vol_maintain_achieved_month = 0;
							var cement_vol_maintain_month_percent = 0;
							var cement_vol_maintain_target_year = 0;
							var cement_vol_maintain_achieved_year = 0;
							var cement_vol_maintain_year_percent = 0;
							
							var cement_vol_switching_target_month = 0;
							var cement_vol_switching_achieved_month = 0;
							var cement_vol_switching_month_percent = 0;
							var cement_vol_switching_target_year = 0;
							var cement_vol_switching_achieved_year = 0;
							var cement_vol_switching_year_percent = 0;
							
							var new_switching_hpb_target_month = 0;
							var new_switching_hpb_achieved_month = 0;
							var new_switching_hpb_month_percent = 0;
							var new_switching_hpb_target_year = 0;
							var new_switching_hpb_achieved_year = 0;
							var new_switching_hpb_year_percent = 0;
							
							var srku_house_num_target_month = 0;
							var srku_house_num_achieved_month = 0;
							var srku_house_num_month_percent = 0;
							var srku_house_num_target_year = 0;
							var srku_house_num_achieved_year = 0;
							var srku_house_num_year_percent = 0;
											
							
							async.forEachOf(statData, function(stats, statKey, statCallback){
								
								// sph stats for each target label
								var target_label = stats.target_label;
								if(target_label == "srku_vol"){
									if(stats.target_month == month){
										srku_vol_target_month = srku_vol_target_month + stats['monthly_target'];
										srku_vol_achieved_month = srku_vol_achieved_month + stats['achieved_target'];
									}
									srku_vol_target_year = srku_vol_target_year + stats['monthly_target'];
									srku_vol_achieved_year = srku_vol_achieved_year + stats['achieved_target'];
								}
								else if(target_label == "cement_vol_maintain"){
									if(stats.target_month == month){
										cement_vol_maintain_target_month = cement_vol_maintain_target_month + stats['monthly_target'];
										cement_vol_maintain_achieved_month = cement_vol_maintain_achieved_month + stats['achieved_target'];
									}
									cement_vol_maintain_target_year = cement_vol_maintain_target_year + stats['monthly_target'];
									cement_vol_maintain_achieved_year = cement_vol_maintain_achieved_year + stats['achieved_target'];
								}
								else if(target_label == "cement_vol_switching"){
									if(stats.target_month == month){
										cement_vol_switching_target_month = cement_vol_switching_target_month + stats['monthly_target'];
										cement_vol_switching_achieved_month = cement_vol_switching_achieved_month + stats['achieved_target'];
									}
									cement_vol_switching_target_year = cement_vol_switching_target_year + stats['monthly_target'];
									cement_vol_switching_achieved_year = cement_vol_switching_achieved_year + stats['achieved_target'];
								}
								else if(target_label == "srku_house_num"){
									if(stats.target_month == month){
										srku_house_num_target_month = srku_house_num_target_month + stats['monthly_target'];
										srku_house_num_achieved_month = srku_house_num_achieved_month + stats['achieved_target'];
									}
									srku_house_num_target_year = srku_house_num_target_year + stats['monthly_target'];
									srku_house_num_achieved_year = srku_house_num_achieved_year + stats['achieved_target'];
								}
								else if(target_label == "new_switching_hpb"){
									if(stats.target_month == month){
										new_switching_hpb_target_month = new_switching_hpb_target_month + stats['monthly_target'];
										new_switching_hpb_achieved_month = new_switching_hpb_achieved_month + stats['achieved_target'];
									}
									new_switching_hpb_target_year = new_switching_hpb_target_year + stats['monthly_target'];
									new_switching_hpb_achieved_year = new_switching_hpb_achieved_year + stats['achieved_target'];
								}
								statCallback();
							},
							(err)=>{
								
								srku_vol_month_percent = Math.round((srku_vol_achieved_month*100)/(srku_vol_target_month));
								srku_vol_year_percent = Math.round((srku_vol_achieved_year*100)/(srku_vol_target_year));
								if(isNaN(srku_vol_month_percent) || (!isFinite(srku_vol_month_percent))){ srku_vol_month_percent = 0; }
								if(isNaN(srku_vol_year_percent) || (!isFinite(srku_vol_year_percent))){ srku_vol_year_percent = 0; }
								
								// for unique district of a AC
								acDistinct['dis'][acKey]['srku_vol_target_month'] = srku_vol_target_month;
								acDistinct['dis'][acKey]['srku_vol_achieved_month'] = srku_vol_achieved_month;
								acDistinct['dis'][acKey]['srku_vol_month_percent'] = srku_vol_month_percent;
								acDistinct['dis'][acKey]['srku_vol_target_year'] = srku_vol_target_year;
								acDistinct['dis'][acKey]['srku_vol_achieved_year'] = srku_vol_achieved_year;
								acDistinct['dis'][acKey]['srku_vol_year_percent'] = srku_vol_year_percent;
								
								// for unique AC
								acDistinct['ac']['srku_vol_target_month'] = acDistinct['ac']['srku_vol_target_month'] + srku_vol_target_month;
								acDistinct['ac']['srku_vol_achieved_month'] = acDistinct['ac']['srku_vol_achieved_month'] + srku_vol_achieved_month;
								acDistinct['ac']['srku_vol_target_year'] = acDistinct['ac']['srku_vol_target_year'] + srku_vol_target_year;
								acDistinct['ac']['srku_vol_achieved_year'] = acDistinct['ac']['srku_vol_achieved_year'] + srku_vol_achieved_year;
								
								var monthpercent = Math.round((acDistinct['ac']['srku_vol_achieved_month']*100)/(acDistinct['ac']['srku_vol_target_month']));
								var yearpercent = Math.round((acDistinct['ac']['srku_vol_achieved_year']*100)/(acDistinct['ac']['srku_vol_target_year']));
								
								if(isNaN(monthpercent)){ monthpercent = 0; }
								if(isNaN(yearpercent)){ yearpercent = 0; }
								
								acDistinct['ac']['srku_vol_month_percent'] = monthpercent;
								acDistinct['ac']['srku_vol_year_percent'] = yearpercent;
								
								cement_vol_maintain_month_percent = Math.round((cement_vol_maintain_achieved_month*100)/(cement_vol_maintain_target_month));
								cement_vol_maintain_year_percent = Math.round((cement_vol_maintain_achieved_year*100)/(cement_vol_maintain_target_year));
								if(isNaN(cement_vol_maintain_month_percent) || (!isFinite(cement_vol_maintain_month_percent))){ cement_vol_maintain_month_percent = 0; }
								if(isNaN(cement_vol_maintain_year_percent) || (!isFinite(cement_vol_maintain_year_percent))){ cement_vol_maintain_year_percent = 0; }
								
								// for unique district of a AC
								acDistinct['dis'][acKey]['cement_vol_maintain_target_month'] = cement_vol_maintain_target_month;
								acDistinct['dis'][acKey]['cement_vol_maintain_achieved_month'] = cement_vol_maintain_achieved_month;
								acDistinct['dis'][acKey]['cement_vol_maintain_month_percent'] = cement_vol_maintain_month_percent;
								acDistinct['dis'][acKey]['cement_vol_maintain_target_year'] = cement_vol_maintain_target_year;
								acDistinct['dis'][acKey]['cement_vol_maintain_achieved_year'] = cement_vol_maintain_achieved_year;
								acDistinct['dis'][acKey]['cement_vol_maintain_year_percent'] = cement_vol_maintain_year_percent;
								
								// for unique AC
								acDistinct['ac']['cement_vol_maintain_target_month'] = acDistinct['ac']['cement_vol_maintain_target_month'] + cement_vol_maintain_target_month;
								acDistinct['ac']['cement_vol_maintain_achieved_month'] = acDistinct['ac']['cement_vol_maintain_achieved_month'] + cement_vol_maintain_achieved_month;
								acDistinct['ac']['cement_vol_maintain_target_year'] = acDistinct['ac']['cement_vol_maintain_target_year'] + cement_vol_maintain_target_year;
								acDistinct['ac']['cement_vol_maintain_achieved_year'] = acDistinct['ac']['cement_vol_maintain_achieved_year'] + cement_vol_maintain_achieved_year;
								
								var monthpercent = Math.round((acDistinct['ac']['cement_vol_maintain_achieved_month']*100)/(acDistinct['ac']['cement_vol_maintain_target_month']));
								var yearpercent = Math.round((acDistinct['ac']['cement_vol_maintain_achieved_year']*100)/(acDistinct['ac']['cement_vol_maintain_target_year']));
								
								if(isNaN(monthpercent)){ monthpercent = 0; }
								if(isNaN(yearpercent)){ yearpercent = 0; }
								
								acDistinct['ac']['cement_vol_maintain_month_percent'] = monthpercent;
								acDistinct['ac']['cement_vol_maintain_year_percent'] = yearpercent;
								
								cement_vol_switching_month_percent = Math.round((cement_vol_switching_achieved_month*100)/(cement_vol_switching_target_month));
								cement_vol_switching_year_percent = Math.round((cement_vol_switching_achieved_year*100)/(cement_vol_switching_target_year));
								if(isNaN(cement_vol_switching_month_percent) || (!isFinite(cement_vol_switching_month_percent))){ cement_vol_switching_month_percent = 0; }
								if(isNaN(cement_vol_switching_year_percent) || (!isFinite(cement_vol_switching_year_percent))){ cement_vol_switching_year_percent = 0; }
								
								// for unique district of a AC
								acDistinct['dis'][acKey]['cement_vol_switching_target_month'] = cement_vol_switching_target_month;
								acDistinct['dis'][acKey]['cement_vol_switching_achieved_month'] = cement_vol_switching_achieved_month;
								acDistinct['dis'][acKey]['cement_vol_switching_month_percent'] = cement_vol_switching_month_percent;
								acDistinct['dis'][acKey]['cement_vol_switching_target_year'] = cement_vol_switching_target_year;
								acDistinct['dis'][acKey]['cement_vol_switching_achieved_year'] = cement_vol_switching_achieved_year;
								acDistinct['dis'][acKey]['cement_vol_switching_year_percent'] = cement_vol_switching_year_percent;
								
								// for unique AC
								acDistinct['ac']['cement_vol_switching_target_month'] = acDistinct['ac']['cement_vol_switching_target_month'] + cement_vol_switching_target_month;
								acDistinct['ac']['cement_vol_switching_achieved_month'] = acDistinct['ac']['cement_vol_switching_achieved_month'] + cement_vol_switching_achieved_month;
								acDistinct['ac']['cement_vol_switching_target_year'] = acDistinct['ac']['cement_vol_switching_target_year'] + cement_vol_switching_target_year;
								acDistinct['ac']['cement_vol_switching_achieved_year'] = acDistinct['ac']['cement_vol_switching_achieved_year'] + cement_vol_switching_achieved_year;
								
								var monthpercent = Math.round((acDistinct['ac']['cement_vol_switching_achieved_month']*100)/(acDistinct['ac']['cement_vol_switching_target_month']));
								var yearpercent = Math.round((acDistinct['ac']['cement_vol_switching_achieved_year']*100)/(acDistinct['ac']['cement_vol_switching_target_year']));
								
								if(isNaN(monthpercent)){ monthpercent = 0; }
								if(isNaN(yearpercent)){ yearpercent = 0; }
								
								acDistinct['ac']['cement_vol_switching_month_percent'] = monthpercent;
								acDistinct['ac']['cement_vol_switching_year_percent'] = yearpercent;
								
								srku_house_num_month_percent = Math.round((srku_house_num_achieved_month*100)/(srku_house_num_target_month));
								srku_house_num_year_percent = Math.round((srku_house_num_achieved_year*100)/(srku_house_num_target_year));
								if(isNaN(srku_house_num_month_percent) || (!isFinite(srku_house_num_month_percent))){ srku_house_num_month_percent = 0; }
								if(isNaN(srku_house_num_year_percent) || (!isFinite(srku_house_num_year_percent))){ srku_house_num_year_percent = 0; }
								
								// for unique district of a AC
								acDistinct['dis'][acKey]['srku_house_num_target_month'] = srku_house_num_target_month;
								acDistinct['dis'][acKey]['srku_house_num_achieved_month'] = srku_house_num_achieved_month;
								acDistinct['dis'][acKey]['srku_house_num_month_percent'] = srku_house_num_month_percent;
								acDistinct['dis'][acKey]['srku_house_num_target_year'] = srku_house_num_target_year;
								acDistinct['dis'][acKey]['srku_house_num_achieved_year'] = srku_house_num_achieved_year;
								acDistinct['dis'][acKey]['srku_house_num_year_percent'] = srku_house_num_year_percent;
								
								// for unique AC
								acDistinct['ac']['srku_house_num_target_month'] = acDistinct['ac']['srku_house_num_target_month'] + srku_house_num_target_month;
								acDistinct['ac']['srku_house_num_achieved_month'] = acDistinct['ac']['srku_house_num_achieved_month'] + srku_house_num_achieved_month;
								acDistinct['ac']['srku_house_num_target_year'] = acDistinct['ac']['srku_house_num_target_year'] + srku_house_num_target_year;
								acDistinct['ac']['srku_house_num_achieved_year'] = acDistinct['ac']['srku_house_num_achieved_year'] + srku_house_num_achieved_year;
								
								var monthpercent = Math.round((acDistinct['ac']['srku_house_num_achieved_month']*100)/(acDistinct['ac']['srku_house_num_target_month']));
								var yearpercent = Math.round((acDistinct['ac']['srku_house_num_achieved_year']*100)/(acDistinct['ac']['srku_house_num_target_year']));
								
								if(isNaN(monthpercent)){ monthpercent = 0; }
								if(isNaN(yearpercent)){ yearpercent = 0; }
								
								acDistinct['ac']['srku_house_num_month_percent'] = monthpercent;
								acDistinct['ac']['srku_house_num_year_percent'] = yearpercent;
								
								new_switching_hpb_month_percent = Math.round((new_switching_hpb_achieved_month*100)/(new_switching_hpb_target_month));
								new_switching_hpb_year_percent = Math.round((new_switching_hpb_achieved_year*100)/(new_switching_hpb_target_year));
								if(isNaN(new_switching_hpb_month_percent) || (!isFinite(new_switching_hpb_month_percent))){ new_switching_hpb_month_percent = 0; }
								if(isNaN(new_switching_hpb_year_percent) || (!isFinite(new_switching_hpb_year_percent))){ new_switching_hpb_year_percent = 0; }
								
								// for unique district of a AC
								acDistinct['dis'][acKey]['new_switching_hpb_target_month'] = new_switching_hpb_target_month;
								acDistinct['dis'][acKey]['new_switching_hpb_achieved_month'] = new_switching_hpb_achieved_month;
								acDistinct['dis'][acKey]['new_switching_hpb_month_percent'] = new_switching_hpb_month_percent;
								acDistinct['dis'][acKey]['new_switching_hpb_target_year'] = new_switching_hpb_target_year;
								acDistinct['dis'][acKey]['new_switching_hpb_achieved_year'] = new_switching_hpb_achieved_year;
								acDistinct['dis'][acKey]['new_switching_hpb_year_percent'] = new_switching_hpb_year_percent;
								
								// for unique AC
								acDistinct['ac']['new_switching_hpb_target_month'] = acDistinct['ac']['new_switching_hpb_target_month'] + new_switching_hpb_target_month;
								acDistinct['ac']['new_switching_hpb_achieved_month'] = acDistinct['ac']['new_switching_hpb_achieved_month'] + new_switching_hpb_achieved_month;
								acDistinct['ac']['new_switching_hpb_target_year'] = acDistinct['ac']['new_switching_hpb_target_year'] + new_switching_hpb_target_year;
								acDistinct['ac']['new_switching_hpb_achieved_year'] = acDistinct['ac']['new_switching_hpb_achieved_year'] + new_switching_hpb_achieved_year;
								
								var monthpercent = Math.round((acDistinct['ac']['new_switching_hpb_achieved_month']*100)/(acDistinct['ac']['new_switching_hpb_target_month']));
								var yearpercent = Math.round((acDistinct['ac']['new_switching_hpb_achieved_year']*100)/(acDistinct['ac']['new_switching_hpb_target_year']));
								
								if(isNaN(monthpercent)){ monthpercent = 0; }
								if(isNaN(yearpercent)){ yearpercent = 0; }
								
								acDistinct['ac']['new_switching_hpb_month_percent'] = monthpercent;
								acDistinct['ac']['new_switching_hpb_year_percent'] = yearpercent;
								
								acCallback(); // run the loop for next sph
							});
						});
					},
					(err)=>{
						// one AC data is completed
						acDisCallback();
					});
					// End of async loop of AC data
				});
			},
			(err)=>{
				
				for(var ac=0; ac<acDistinctData.length; ac++){
					
					if(ac > 0){
						worksheet.addRow();
					}
					worksheet.addRow(acDistinctData[ac]['ac']);
					var rowNo = worksheet.lastRow;
					//expect(worksheet.getRow(rowNo).collapsed).to.equal(false);
							
					var srkuMonthData = parseInt(acDistinctData[ac]['ac']['srku_vol_month_percent']);
					var srkuYearData = parseInt(acDistinctData[ac]['ac']['srku_vol_year_percent']);
					if(srkuMonthData < monthTimeFactor){
						rowNo.getCell('E').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FFFF0000' }
						};
					}else{
						rowNo.getCell('E').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FF00FF00' }
						};
					}
					
					if(srkuYearData < yearTimeFactor){
						rowNo.getCell('H').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FFFF0000' }
						};
					}else{
						rowNo.getCell('H').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FF00FF00' }
						};
					}
					
					var maintainMonthData = parseInt(acDistinctData[ac]['ac']['cement_vol_maintain_month_percent']);
					var maintainYearData = parseInt(acDistinctData[ac]['ac']['cement_vol_maintain_year_percent']);
					if(maintainMonthData < monthTimeFactor){
						rowNo.getCell('K').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FFFF0000' }
						};
					}else{
						rowNo.getCell('K').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FF00FF00' }
						};
					}
					
					if(maintainYearData < yearTimeFactor){
						rowNo.getCell('N').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FFFF0000' }
						};
					}else{
						rowNo.getCell('N').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FF00FF00' }
						};
					}
					
					var switchingMonthData = parseInt(acDistinctData[ac]['ac']['cement_vol_switching_month_percent']);
					var switchingYearData = parseInt(acDistinctData[ac]['ac']['cement_vol_switching_year_percent']);
					if(switchingMonthData < monthTimeFactor){
						rowNo.getCell('Q').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FFFF0000' }
						};
					}else{
						rowNo.getCell('Q').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FF00FF00' }
						};
					}
					
					if(switchingYearData < yearTimeFactor){
						rowNo.getCell('T').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FFFF0000' }
						};
					}else{
						rowNo.getCell('T').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FF00FF00' }
						};
					}
					
					var hpbMonthData = parseInt(acDistinctData[ac]['ac']['new_switching_hpb_month_percent']);
					var hpbYearData = parseInt(acDistinctData[ac]['ac']['new_switching_hpb_year_percent']);
					if(hpbMonthData < monthTimeFactor){
						rowNo.getCell('W').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FFFF0000' }
						};
					}else{
						rowNo.getCell('W').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FF00FF00' }
						};
					}
					
					if(hpbYearData < yearTimeFactor){
						rowNo.getCell('Z').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FFFF0000' }
						};
					}else{
						rowNo.getCell('Z').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FF00FF00' }
						};
					}
					
					var houseMonthData = parseInt(acDistinctData[ac]['ac']['srku_house_num_month_percent']);
					var houseYearData = parseInt(acDistinctData[ac]['ac']['srku_house_num_year_percent']);
					if(houseMonthData < monthTimeFactor){
						rowNo.getCell('AC').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FFFF0000' }
						};
					}else{
						rowNo.getCell('AC').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FF00FF00' }
						};
					}
					
					if(houseYearData < yearTimeFactor){
						rowNo.getCell('AF').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FFFF0000' }
						};
					}else{
						rowNo.getCell('AF').fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FF00FF00' }
						};
					}
					
					// once you have added AC's row, add TLH
					var disData = (acDistinctData[ac]['dis']).length;
					for(var disCount=0; disCount<disData; disCount++){
						worksheet.addRow(acDistinctData[ac]['dis'][disCount]);
						var rowNo = worksheet.lastRow;
						//expect(worksheet.getRow(rowNo).collapsed).to.equal(false);
						
						var srkuMonthData = parseInt(acDistinctData[ac]['dis'][disCount]['srku_vol_month_percent']);
						var srkuYearData = parseInt(acDistinctData[ac]['dis'][disCount]['srku_vol_year_percent']);
						if(srkuMonthData < monthTimeFactor){
							rowNo.getCell('E').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FFFF0000' }
							};
						}else{
							rowNo.getCell('E').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FF00FF00' }
							};
						}
						
						if(srkuYearData < yearTimeFactor){
							rowNo.getCell('H').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FFFF0000' }
							};
						}else{
							rowNo.getCell('H').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FF00FF00' }
							};
						}
						
						var maintainMonthData = parseInt(acDistinctData[ac]['dis'][disCount]['cement_vol_maintain_month_percent']);
						var maintainYearData = parseInt(acDistinctData[ac]['dis'][disCount]['cement_vol_maintain_year_percent']);
						if(maintainMonthData < monthTimeFactor){
							rowNo.getCell('K').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FFFF0000' }
							};
						}else{
							rowNo.getCell('K').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FF00FF00' }
							};
						}
						
						if(maintainYearData < yearTimeFactor){
							rowNo.getCell('N').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FFFF0000' }
							};
						}else{
							rowNo.getCell('N').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FF00FF00' }
							};
						}
						
						var switchingMonthData = parseInt(acDistinctData[ac]['dis'][disCount]['cement_vol_switching_month_percent']);
						var switchingYearData = parseInt(acDistinctData[ac]['dis'][disCount]['cement_vol_switching_year_percent']);
						if(switchingMonthData < monthTimeFactor){
							rowNo.getCell('Q').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FFFF0000' }
							};
						}else{
							rowNo.getCell('Q').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FF00FF00' }
							};
						}
						
						if(switchingYearData < yearTimeFactor){
							rowNo.getCell('T').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FFFF0000' }
							};
						}else{
							rowNo.getCell('T').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FF00FF00' }
							};
						}
						
						var hpbMonthData = parseInt(acDistinctData[ac]['dis'][disCount]['new_switching_hpb_month_percent']);
						var hpbYearData = parseInt(acDistinctData[ac]['dis'][disCount]['new_switching_hpb_year_percent']);
						if(hpbMonthData < monthTimeFactor){
							rowNo.getCell('W').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FFFF0000' }
							};
						}else{
							rowNo.getCell('W').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FF00FF00' }
							};
						}
						
						if(hpbYearData < yearTimeFactor){
							rowNo.getCell('Z').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FFFF0000' }
							};
						}else{
							rowNo.getCell('Z').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FF00FF00' }
							};
						}
						
						var houseMonthData = parseInt(acDistinctData[ac]['dis'][disCount]['srku_house_num_month_percent']);
						var houseYearData = parseInt(acDistinctData[ac]['dis'][disCount]['srku_house_num_year_percent']);
						if(houseMonthData < monthTimeFactor){
							rowNo.getCell('AC').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FFFF0000' }
							};
						}else{
							rowNo.getCell('AC').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FF00FF00' }
							};
						}
						
						if(houseYearData < yearTimeFactor){
							rowNo.getCell('AF').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FFFF0000' }
							};
						}else{
							rowNo.getCell('AF').fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FF00FF00' }
							};
						}
					}
				}
				
				// All AC's are done
				var tempFilePath = tempfile('.xlsx');
				var date = new Date();
				var filename = "am-scorecard"+date.getDate()+"-"+(date.getMonth()+1)+"-"+date.getFullYear()+"-"+date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds()+".xlsx";
				workbook.xlsx.writeFile("storage/report/"+filename).then(function() {
					var resultObj = [{"serverPath":"api/container/report/download/"+filename}];
					cb(null,resultObj);
				});
			});
		});
	};
	
	Usermapping.remoteMethod('getAMScorecardSummary',{
		http:{ path:'/getAMScorecardSummary', verb:'' },
		accepts:[
				{arg: 'target_for', type: 'string', 'http': {source: 'query'}},
				{arg: 'res', type: 'object', 'http': {source: 'res'}},
				{arg: 'rolename', type: 'string', 'http': {source: 'query'}},
				{arg: 'user_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'ac_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'district_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'month', type: 'number', 'http': {source: 'query'}},
				{arg: 'year', type: 'number', 'http': {source: 'query'}}
		],
		returns:{ arg:'result', type:'object' }
	})
	
	Usermapping.getAMScorecardSummaryWebView = function(rolename,user_id,ac_id,district_id,month,year,cb){
		
		var date = new Date();
		var currentMonth = (date.getMonth())+1;
		var currentYear = date.getFullYear();
		
		if(!month){
			month = currentMonth;
		}
		
		if(!year){
			year = currentYear;
		}
		
		var todayDate = date.getDate();
		var total = (new Date(year, todayDate, 0).getDate());
		var monthTimeFactor = Math.round((todayDate/total)*100);
		
		var totalDays = todayDate;
		for(var i=1; i<month; i++){
			totalDays = totalDays + (new Date(year, i, 0).getDate());
		}
		
		var totalDaysYear = 0;
		if(year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)){
			totalDaysYear = 366;
		}else{
			totalDaysYear = 365;
		}
		
		var yearTimeFactor = Math.round((totalDays/totalDaysYear)*100);
		
		var statsArr = [];
		if((rolename == "$ra" && user_id > 0)||(rolename == "$sa" && user_id > 0)){
			
			var getAllDistinctAC = "SELECT distinct u.id, u.realm FROM [USER] u JOIN Rolemapping rm ON u.id = rm.principalId  JOIN user_mapping um ON rm.principalId = um.uid  AND um.meta_key = 'district_id' AND um.meta_value IN ( select d.id from [User] u join user_mapping um1 on u.id = um.uid join region r on um1.meta_value = r.id and um1.meta_key = 'region_id' and um1.uid = (?) join province p on p.region_id = r.id join district d on d.province_id = p.id )  JOIN Role r ON rm.roleId = r.id AND r.name = '$ac' WHERE 1=1";
			statsArr = [user_id];
		}else{
			// get all AC data
			var getAllDistinctAC = "SELECT distinct u.id, u.realm FROM [USER] u JOIN Rolemapping rm ON u.id = rm.principalId  JOIN user_mapping um ON rm.principalId = um.uid  AND um.meta_key = 'district_id' JOIN Role r ON rm.roleId = r.id AND r.name = '$ac' where 1=1 ";
		}
		
		if(district_id > 0){
			getAllDistinctAC+=" AND um.meta_value = (?)";
			statsArr.push(district_id);
		}
		if(ac_id > 0){
			getAllDistinctAC+=" AND um.uid = (?)";
			statsArr.push(ac_id);
		}
		getAllDistinctAC+=" ORDER BY u.id";
		
		var timeFactorRow= [];
		var report = [];
		Usermapping.app.dbConnection.execute(getAllDistinctAC,statsArr,(err,acDistinctData)=>{
			
			// for the first row, time factor
			timeFactorRow.push({"date":todayDate,"month":month,"totalAC":(acDistinctData.length),"monthFactor":monthTimeFactor,"yearFactor":yearTimeFactor});
			
			// for unique AC
			async.forEachOf(acDistinctData, function(acDistinct, acDisKey, acDisCallback){		
				
				acDistinct['ac'] = {};
				
				acDistinct['ac']['name'] = acDistinct.realm;
				acDistinct['ac']['district'] = "";
				acDistinct['ac']['srku_vol_target_month'] = 0;
				acDistinct['ac']['srku_vol_achieved_month'] = 0;
				acDistinct['ac']['srku_vol_month_percent'] = 0;
				acDistinct['ac']['srku_vol_target_year'] = 0;
				acDistinct['ac']['srku_vol_achieved_year'] = 0;
				acDistinct['ac']['srku_vol_year_percent'] = 0;
				acDistinct['ac']['cement_vol_maintain_target_month'] = 0;
				acDistinct['ac']['cement_vol_maintain_achieved_month'] = 0;
				acDistinct['ac']['cement_vol_maintain_month_percent'] = 0;
				acDistinct['ac']['cement_vol_maintain_target_year'] = 0;
				acDistinct['ac']['cement_vol_maintain_achieved_year'] = 0;
				acDistinct['ac']['cement_vol_maintain_year_percent'] = 0;
				acDistinct['ac']['cement_vol_switching_target_month'] = 0;
				acDistinct['ac']['cement_vol_switching_achieved_month'] = 0;
				acDistinct['ac']['cement_vol_switching_month_percent'] = 0;
				acDistinct['ac']['cement_vol_switching_target_year'] = 0;
				acDistinct['ac']['cement_vol_switching_achieved_year'] = 0;
				acDistinct['ac']['cement_vol_switching_year_percent'] = 0;
				acDistinct['ac']['srku_house_num_target_month'] = 0;
				acDistinct['ac']['srku_house_num_achieved_month'] = 0;
				acDistinct['ac']['srku_house_num_month_percent'] = 0;
				acDistinct['ac']['srku_house_num_target_year'] = 0;
				acDistinct['ac']['srku_house_num_achieved_year'] = 0;
				acDistinct['ac']['srku_house_num_year_percent'] = 0;
				acDistinct['ac']['new_switching_hpb_target_month'] = 0;
				acDistinct['ac']['new_switching_hpb_achieved_month'] = 0;
				acDistinct['ac']['new_switching_hpb_month_percent'] = 0;
				acDistinct['ac']['new_switching_hpb_target_year'] = 0;
				acDistinct['ac']['new_switching_hpb_achieved_year'] = 0;
				acDistinct['ac']['new_switching_hpb_year_percent'] = 0;

				acDistinct['dis'] = [];
				
				var getAcDistrict = "SELECT um.uid, um.meta_value, u.id, u.realm, d.name as district, d.id as dId FROM [USER] u JOIN Rolemapping rm ON u.id = rm.principalId  and u.id = (?) JOIN user_mapping um ON rm.principalId = um.uid  AND um.meta_key = 'district_id' JOIN Role r ON rm.roleId = r.id AND r.name = '$ac' JOIN district d ON d.id = um.meta_value ORDER BY um.uid";
				var statsArr = [acDistinct.id];
				
				Usermapping.app.dbConnection.execute(getAcDistrict,statsArr,(err,acData)=>{
				
					async.forEachOf(acData, function(acDetail, acKey, acCallback){
					
						var acMonthlyTarget = [];
						var acMonthlyAchieved = [];
						var acMonthlyEstimated = [];
						acDistinct['dis'][acKey] = {};
						
						acDistinct['dis'][acKey]["name"] = "";
						acDistinct['dis'][acKey]["district"] = acDetail.district;
						acDistinct['dis'][acKey]['srku_vol_target_month'] = 0;
						acDistinct['dis'][acKey]['srku_vol_achieved_month'] = 0;
						acDistinct['dis'][acKey]['srku_vol_month_percent'] = 0;
						acDistinct['dis'][acKey]['srku_vol_target_year'] = 0;
						acDistinct['dis'][acKey]['srku_vol_achieved_year'] = 0;
						acDistinct['dis'][acKey]['srku_vol_year_percent'] = 0;
						acDistinct['dis'][acKey]['cement_vol_maintain_target_month'] = 0;
						acDistinct['dis'][acKey]['cement_vol_maintain_achieved_month'] = 0;
						acDistinct['dis'][acKey]['cement_vol_maintain_month_percent'] = 0;
						acDistinct['dis'][acKey]['cement_vol_maintain_target_year'] = 0;
						acDistinct['dis'][acKey]['cement_vol_maintain_achieved_year'] = 0;
						acDistinct['dis'][acKey]['cement_vol_maintain_year_percent'] = 0;
						acDistinct['dis'][acKey]['cement_vol_switching_target_month'] = 0;
						acDistinct['dis'][acKey]['cement_vol_switching_achieved_month'] = 0;
						acDistinct['dis'][acKey]['cement_vol_switching_month_percent'] = 0;
						acDistinct['dis'][acKey]['cement_vol_switching_target_year'] = 0;
						acDistinct['dis'][acKey]['cement_vol_switching_achieved_year'] = 0;
						acDistinct['dis'][acKey]['cement_vol_switching_year_percent'] = 0;
						acDistinct['dis'][acKey]['srku_house_num_target_month'] = 0;
						acDistinct['dis'][acKey]['srku_house_num_achieved_month'] = 0;
						acDistinct['dis'][acKey]['srku_house_num_month_percent'] = 0;
						acDistinct['dis'][acKey]['srku_house_num_target_year'] = 0;
						acDistinct['dis'][acKey]['srku_house_num_achieved_year'] = 0;
						acDistinct['dis'][acKey]['srku_house_num_year_percent'] = 0;
						acDistinct['dis'][acKey]['new_switching_hpb_target_month'] = 0;
						acDistinct['dis'][acKey]['new_switching_hpb_achieved_month'] = 0;
						acDistinct['dis'][acKey]['new_switching_hpb_month_percent'] = 0;
						acDistinct['dis'][acKey]['new_switching_hpb_target_year'] = 0;
						acDistinct['dis'][acKey]['new_switching_hpb_achieved_year'] = 0;
						acDistinct['dis'][acKey]['new_switching_hpb_year_percent'] = 0;
						
						// for each SPH get records from monthly stats report table
						var getStats = "select sc.target_label, sc.monthly_target, sc.achieved_target, target_month from monthly_scorecard_reports sc where  sc.target_year = (?) and sph_id in ( select um.uid from user_mapping um join postal_code p on um.meta_value = p.id and um.meta_key = 'postal_code' join subdistrict sd on p.subdistrict_id = sd.id join municipality m on m.id = sd.municipality_id where m.district_id = (?) ) and sc.target_label != 'vol_total' and sc.target_month >= (?) and sc.target_year = (?) ";
						var statsArr = [year,acDetail.dId,month,year];
						
						Usermapping.app.dbConnection.execute(getStats,statsArr,(err,statData)=>{
							
							var srku_vol_target_month = 0;
							var srku_vol_achieved_month = 0;
							var srku_vol_month_percent = 0;
							var srku_vol_target_year = 0;
							var srku_vol_achieved_year = 0;
							var srku_vol_year_percent = 0;
							
							var cement_vol_maintain_target_month = 0;
							var cement_vol_maintain_achieved_month = 0;
							var cement_vol_maintain_month_percent = 0;
							var cement_vol_maintain_target_year = 0;
							var cement_vol_maintain_achieved_year = 0;
							var cement_vol_maintain_year_percent = 0;
							
							var cement_vol_switching_target_month = 0;
							var cement_vol_switching_achieved_month = 0;
							var cement_vol_switching_month_percent = 0;
							var cement_vol_switching_target_year = 0;
							var cement_vol_switching_achieved_year = 0;
							var cement_vol_switching_year_percent = 0;
							
							var new_switching_hpb_target_month = 0;
							var new_switching_hpb_achieved_month = 0;
							var new_switching_hpb_month_percent = 0;
							var new_switching_hpb_target_year = 0;
							var new_switching_hpb_achieved_year = 0;
							var new_switching_hpb_year_percent = 0;
							
							var srku_house_num_target_month = 0;
							var srku_house_num_achieved_month = 0;
							var srku_house_num_month_percent = 0;
							var srku_house_num_target_year = 0;
							var srku_house_num_achieved_year = 0;
							var srku_house_num_year_percent = 0;
											
							
							async.forEachOf(statData, function(stats, statKey, statCallback){
								
								// sph stats for each target label
								var target_label = stats.target_label;
								if(target_label == "srku_vol"){
									if(stats.target_month == month){
										srku_vol_target_month = srku_vol_target_month + stats['monthly_target'];
										srku_vol_achieved_month = srku_vol_achieved_month + stats['achieved_target'];
									}
									srku_vol_target_year = srku_vol_target_year + stats['monthly_target'];
									srku_vol_achieved_year = srku_vol_achieved_year + stats['achieved_target'];
								}
								else if(target_label == "cement_vol_maintain"){
									if(stats.target_month == month){
										cement_vol_maintain_target_month = cement_vol_maintain_target_month + stats['monthly_target'];
										cement_vol_maintain_achieved_month = cement_vol_maintain_achieved_month + stats['achieved_target'];
									}
									cement_vol_maintain_target_year = cement_vol_maintain_target_year + stats['monthly_target'];
									cement_vol_maintain_achieved_year = cement_vol_maintain_achieved_year + stats['achieved_target'];
								}
								else if(target_label == "cement_vol_switching"){
									if(stats.target_month == month){
										cement_vol_switching_target_month = cement_vol_switching_target_month + stats['monthly_target'];
										cement_vol_switching_achieved_month = cement_vol_switching_achieved_month + stats['achieved_target'];
									}
									cement_vol_switching_target_year = cement_vol_switching_target_year + stats['monthly_target'];
									cement_vol_switching_achieved_year = cement_vol_switching_achieved_year + stats['achieved_target'];
								}
								else if(target_label == "srku_house_num"){
									if(stats.target_month == month){
										srku_house_num_target_month = srku_house_num_target_month + stats['monthly_target'];
										srku_house_num_achieved_month = srku_house_num_achieved_month + stats['achieved_target'];
									}
									srku_house_num_target_year = srku_house_num_target_year + stats['monthly_target'];
									srku_house_num_achieved_year = srku_house_num_achieved_year + stats['achieved_target'];
								}
								else if(target_label == "new_switching_hpb"){
									if(stats.target_month == month){
										new_switching_hpb_target_month = new_switching_hpb_target_month + stats['monthly_target'];
										new_switching_hpb_achieved_month = new_switching_hpb_achieved_month + stats['achieved_target'];
									}
									new_switching_hpb_target_year = new_switching_hpb_target_year + stats['monthly_target'];
									new_switching_hpb_achieved_year = new_switching_hpb_achieved_year + stats['achieved_target'];
								}
								statCallback();
							},
							(err)=>{
								
								srku_vol_month_percent = Math.round((srku_vol_achieved_month*100)/(srku_vol_target_month));
								srku_vol_year_percent = Math.round((srku_vol_achieved_year*100)/(srku_vol_target_year));
								if(isNaN(srku_vol_month_percent) || (!isFinite(srku_vol_month_percent))){ srku_vol_month_percent = 0; }
								if(isNaN(srku_vol_year_percent) || (!isFinite(srku_vol_year_percent))){ srku_vol_year_percent = 0; }
								
								// for unique district of a AC
								acDistinct['dis'][acKey]['srku_vol_target_month'] = srku_vol_target_month;
								acDistinct['dis'][acKey]['srku_vol_achieved_month'] = srku_vol_achieved_month;
								acDistinct['dis'][acKey]['srku_vol_month_percent'] = srku_vol_month_percent;
								acDistinct['dis'][acKey]['srku_vol_target_year'] = srku_vol_target_year;
								acDistinct['dis'][acKey]['srku_vol_achieved_year'] = srku_vol_achieved_year;
								acDistinct['dis'][acKey]['srku_vol_year_percent'] = srku_vol_year_percent;
								
								// for unique AC
								acDistinct['ac']['srku_vol_target_month'] = acDistinct['ac']['srku_vol_target_month'] + srku_vol_target_month;
								acDistinct['ac']['srku_vol_achieved_month'] = acDistinct['ac']['srku_vol_achieved_month'] + srku_vol_achieved_month;
								acDistinct['ac']['srku_vol_target_year'] = acDistinct['ac']['srku_vol_target_year'] + srku_vol_target_year;
								acDistinct['ac']['srku_vol_achieved_year'] = acDistinct['ac']['srku_vol_achieved_year'] + srku_vol_achieved_year;
								
								var monthpercent = Math.round((acDistinct['ac']['srku_vol_achieved_month']*100)/(acDistinct['ac']['srku_vol_target_month']));
								var yearpercent = Math.round((acDistinct['ac']['srku_vol_achieved_year']*100)/(acDistinct['ac']['srku_vol_target_year']));
								
								if(isNaN(monthpercent)){ monthpercent = 0; }
								if(isNaN(yearpercent)){ yearpercent = 0; }
								
								acDistinct['ac']['srku_vol_month_percent'] = monthpercent;
								acDistinct['ac']['srku_vol_year_percent'] = yearpercent;
								
								cement_vol_maintain_month_percent = Math.round((cement_vol_maintain_achieved_month*100)/(cement_vol_maintain_target_month));
								cement_vol_maintain_year_percent = Math.round((cement_vol_maintain_achieved_year*100)/(cement_vol_maintain_target_year));
								if(isNaN(cement_vol_maintain_month_percent) || (!isFinite(cement_vol_maintain_month_percent))){ cement_vol_maintain_month_percent = 0; }
								if(isNaN(cement_vol_maintain_year_percent) || (!isFinite(cement_vol_maintain_year_percent))){ cement_vol_maintain_year_percent = 0; }
								
								// for unique district of a AC
								acDistinct['dis'][acKey]['cement_vol_maintain_target_month'] = cement_vol_maintain_target_month;
								acDistinct['dis'][acKey]['cement_vol_maintain_achieved_month'] = cement_vol_maintain_achieved_month;
								acDistinct['dis'][acKey]['cement_vol_maintain_month_percent'] = cement_vol_maintain_month_percent;
								acDistinct['dis'][acKey]['cement_vol_maintain_target_year'] = cement_vol_maintain_target_year;
								acDistinct['dis'][acKey]['cement_vol_maintain_achieved_year'] = cement_vol_maintain_achieved_year;
								acDistinct['dis'][acKey]['cement_vol_maintain_year_percent'] = cement_vol_maintain_year_percent;
								
								// for unique AC
								acDistinct['ac']['cement_vol_maintain_target_month'] = acDistinct['ac']['cement_vol_maintain_target_month'] + cement_vol_maintain_target_month;
								acDistinct['ac']['cement_vol_maintain_achieved_month'] = acDistinct['ac']['cement_vol_maintain_achieved_month'] + cement_vol_maintain_achieved_month;
								acDistinct['ac']['cement_vol_maintain_target_year'] = acDistinct['ac']['cement_vol_maintain_target_year'] + cement_vol_maintain_target_year;
								acDistinct['ac']['cement_vol_maintain_achieved_year'] = acDistinct['ac']['cement_vol_maintain_achieved_year'] + cement_vol_maintain_achieved_year;
								
								var monthpercent = Math.round((acDistinct['ac']['cement_vol_maintain_achieved_month']*100)/(acDistinct['ac']['cement_vol_maintain_target_month']));
								var yearpercent = Math.round((acDistinct['ac']['cement_vol_maintain_achieved_year']*100)/(acDistinct['ac']['cement_vol_maintain_target_year']));
								
								if(isNaN(monthpercent)){ monthpercent = 0; }
								if(isNaN(yearpercent)){ yearpercent = 0; }
								
								acDistinct['ac']['cement_vol_maintain_month_percent'] = monthpercent;
								acDistinct['ac']['cement_vol_maintain_year_percent'] = yearpercent;
								
								cement_vol_switching_month_percent = Math.round((cement_vol_switching_achieved_month*100)/(cement_vol_switching_target_month));
								cement_vol_switching_year_percent = Math.round((cement_vol_switching_achieved_year*100)/(cement_vol_switching_target_year));
								if(isNaN(cement_vol_switching_month_percent) || (!isFinite(cement_vol_switching_month_percent))){ cement_vol_switching_month_percent = 0; }
								if(isNaN(cement_vol_switching_year_percent) || (!isFinite(cement_vol_switching_year_percent))){ cement_vol_switching_year_percent = 0; }
								
								// for unique district of a AC
								acDistinct['dis'][acKey]['cement_vol_switching_target_month'] = cement_vol_switching_target_month;
								acDistinct['dis'][acKey]['cement_vol_switching_achieved_month'] = cement_vol_switching_achieved_month;
								acDistinct['dis'][acKey]['cement_vol_switching_month_percent'] = cement_vol_switching_month_percent;
								acDistinct['dis'][acKey]['cement_vol_switching_target_year'] = cement_vol_switching_target_year;
								acDistinct['dis'][acKey]['cement_vol_switching_achieved_year'] = cement_vol_switching_achieved_year;
								acDistinct['dis'][acKey]['cement_vol_switching_year_percent'] = cement_vol_switching_year_percent;
								
								// for unique AC
								acDistinct['ac']['cement_vol_switching_target_month'] = acDistinct['ac']['cement_vol_switching_target_month'] + cement_vol_switching_target_month;
								acDistinct['ac']['cement_vol_switching_achieved_month'] = acDistinct['ac']['cement_vol_switching_achieved_month'] + cement_vol_switching_achieved_month;
								acDistinct['ac']['cement_vol_switching_target_year'] = acDistinct['ac']['cement_vol_switching_target_year'] + cement_vol_switching_target_year;
								acDistinct['ac']['cement_vol_switching_achieved_year'] = acDistinct['ac']['cement_vol_switching_achieved_year'] + cement_vol_switching_achieved_year;
								
								var monthpercent = Math.round((acDistinct['ac']['cement_vol_switching_achieved_month']*100)/(acDistinct['ac']['cement_vol_switching_target_month']));
								var yearpercent = Math.round((acDistinct['ac']['cement_vol_switching_achieved_year']*100)/(acDistinct['ac']['cement_vol_switching_target_year']));
								
								if(isNaN(monthpercent)){ monthpercent = 0; }
								if(isNaN(yearpercent)){ yearpercent = 0; }
								
								acDistinct['ac']['cement_vol_switching_month_percent'] = monthpercent;
								acDistinct['ac']['cement_vol_switching_year_percent'] = yearpercent;
								
								srku_house_num_month_percent = Math.round((srku_house_num_achieved_month*100)/(srku_house_num_target_month));
								srku_house_num_year_percent = Math.round((srku_house_num_achieved_year*100)/(srku_house_num_target_year));
								if(isNaN(srku_house_num_month_percent) || (!isFinite(srku_house_num_month_percent))){ srku_house_num_month_percent = 0; }
								if(isNaN(srku_house_num_year_percent) || (!isFinite(srku_house_num_year_percent))){ srku_house_num_year_percent = 0; }
								
								// for unique district of a AC
								acDistinct['dis'][acKey]['srku_house_num_target_month'] = srku_house_num_target_month;
								acDistinct['dis'][acKey]['srku_house_num_achieved_month'] = srku_house_num_achieved_month;
								acDistinct['dis'][acKey]['srku_house_num_month_percent'] = srku_house_num_month_percent;
								acDistinct['dis'][acKey]['srku_house_num_target_year'] = srku_house_num_target_year;
								acDistinct['dis'][acKey]['srku_house_num_achieved_year'] = srku_house_num_achieved_year;
								acDistinct['dis'][acKey]['srku_house_num_year_percent'] = srku_house_num_year_percent;
								
								// for unique AC
								acDistinct['ac']['srku_house_num_target_month'] = acDistinct['ac']['srku_house_num_target_month'] + srku_house_num_target_month;
								acDistinct['ac']['srku_house_num_achieved_month'] = acDistinct['ac']['srku_house_num_achieved_month'] + srku_house_num_achieved_month;
								acDistinct['ac']['srku_house_num_target_year'] = acDistinct['ac']['srku_house_num_target_year'] + srku_house_num_target_year;
								acDistinct['ac']['srku_house_num_achieved_year'] = acDistinct['ac']['srku_house_num_achieved_year'] + srku_house_num_achieved_year;
								
								var monthpercent = Math.round((acDistinct['ac']['srku_house_num_achieved_month']*100)/(acDistinct['ac']['srku_house_num_target_month']));
								var yearpercent = Math.round((acDistinct['ac']['srku_house_num_achieved_year']*100)/(acDistinct['ac']['srku_house_num_target_year']));
								
								if(isNaN(monthpercent)){ monthpercent = 0; }
								if(isNaN(yearpercent)){ yearpercent = 0; }
								
								acDistinct['ac']['srku_house_num_month_percent'] = monthpercent;
								acDistinct['ac']['srku_house_num_year_percent'] = yearpercent;
								
								new_switching_hpb_month_percent = Math.round((new_switching_hpb_achieved_month*100)/(new_switching_hpb_target_month));
								new_switching_hpb_year_percent = Math.round((new_switching_hpb_achieved_year*100)/(new_switching_hpb_target_year));
								if(isNaN(new_switching_hpb_month_percent) || (!isFinite(new_switching_hpb_month_percent))){ new_switching_hpb_month_percent = 0; }
								if(isNaN(new_switching_hpb_year_percent) || (!isFinite(new_switching_hpb_year_percent))){ new_switching_hpb_year_percent = 0; }
								
								// for unique district of a AC
								acDistinct['dis'][acKey]['new_switching_hpb_target_month'] = new_switching_hpb_target_month;
								acDistinct['dis'][acKey]['new_switching_hpb_achieved_month'] = new_switching_hpb_achieved_month;
								acDistinct['dis'][acKey]['new_switching_hpb_month_percent'] = new_switching_hpb_month_percent;
								acDistinct['dis'][acKey]['new_switching_hpb_target_year'] = new_switching_hpb_target_year;
								acDistinct['dis'][acKey]['new_switching_hpb_achieved_year'] = new_switching_hpb_achieved_year;
								acDistinct['dis'][acKey]['new_switching_hpb_year_percent'] = new_switching_hpb_year_percent;
								
								// for unique AC
								acDistinct['ac']['new_switching_hpb_target_month'] = acDistinct['ac']['new_switching_hpb_target_month'] + new_switching_hpb_target_month;
								acDistinct['ac']['new_switching_hpb_achieved_month'] = acDistinct['ac']['new_switching_hpb_achieved_month'] + new_switching_hpb_achieved_month;
								acDistinct['ac']['new_switching_hpb_target_year'] = acDistinct['ac']['new_switching_hpb_target_year'] + new_switching_hpb_target_year;
								acDistinct['ac']['new_switching_hpb_achieved_year'] = acDistinct['ac']['new_switching_hpb_achieved_year'] + new_switching_hpb_achieved_year;
								
								var monthpercent = Math.round((acDistinct['ac']['new_switching_hpb_achieved_month']*100)/(acDistinct['ac']['new_switching_hpb_target_month']));
								var yearpercent = Math.round((acDistinct['ac']['new_switching_hpb_achieved_year']*100)/(acDistinct['ac']['new_switching_hpb_target_year']));
								
								if(isNaN(monthpercent)){ monthpercent = 0; }
								if(isNaN(yearpercent)){ yearpercent = 0; }
								
								acDistinct['ac']['new_switching_hpb_month_percent'] = monthpercent;
								acDistinct['ac']['new_switching_hpb_year_percent'] = yearpercent;
								
								acCallback(); // run the loop for next sph
							});
						});
					},
					(err)=>{
						// one AC data is completed
						acDisCallback();
					});
					// End of async loop of AC data
				});
			},
			(err)=>{
				
				for(var ac=0; ac<acDistinctData.length; ac++){
					
					if(ac > 0){
						report.push({});
					}
					report.push(acDistinctData[ac]['ac']);
							
					// once you have added AC's row, add TLH
					var disData = (acDistinctData[ac]['dis']).length;
					for(var disCount=0; disCount<disData; disCount++){
						report.push(acDistinctData[ac]['dis'][disCount]);
					}
				}
				
				// All AC's are done
				var date = new Date();
				var filename = "am-scorecard"+date.getDate()+"-"+(date.getMonth()+1)+"-"+date.getFullYear()+"-"+date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds()+".xlsx";
				var result = [{"report":report,"timeFactor":timeFactorRow}];
				cb(null,result);
			});
		});
	};
	
	Usermapping.remoteMethod('getAMScorecardSummaryWebView',{
		http:{ path:'/getAMScorecardSummaryWebView', verb:'' },
		accepts:[
				{arg: 'rolename', type: 'string', 'http': {source: 'query'}},
				{arg: 'user_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'ac_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'district_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'month', type: 'number', 'http': {source: 'query'}},
				{arg: 'year', type: 'number', 'http': {source: 'query'}}
		],
		returns:{ arg:'result', type:'object' }
	})
	
	
	// AC Reports with Web View
	
	Usermapping.getScorecard = function(target_for,res,rolename,user_id,ac_id,district_id,from_month,to_month,year,cb){
		var date = new Date();
		var currentMonth = (date.getMonth())+1;
		var currentYear = date.getFullYear();
		
		if(!from_month){
			from_month = 1;
		}
		
		if(!to_month){
			to_month = currentMonth;
		}
		
		if(!year){
			year = currentYear;
		}
	
		var Excel = require("exceljs");
		const tempfile = require('tempfile');
		
		var workbook = new Excel.Workbook();
		var sheetName =  (target_for.replace(/_/g , " ")).toUpperCase();
		var worksheet = workbook.addWorksheet(sheetName);
		var columns = [{ header: 'Name', key: 'name', width: 10 },{ header: 'Role', key: 'role', width: 10 },{ header: 'District', key: 'district', width: 10 },{ header: 'Total Target', key: 'target', width: 10 },{ header: 'Total Achieved', key: 'achieved', width: 10 }];
		
		var months = ["Jan","Feb","March","April","May","Jun","July","Aug","Sep","Oct","Nov","Dec"];
		var totalRows = 3+((to_month-from_month)*3); // to get the total number of columns
		for(var i=(from_month-1); i<to_month; i++){
			var obj1 = { header: months[i]+' Target', key: i+'target', width: 10 };
			var obj2 = { header: months[i]+' Achieved', key: i+'achieved', width: 10 };
			var obj3 = { header: months[i]+'Estimated', key: i+'estimated', width: 10 };
			columns.push(obj1);
			columns.push(obj2);
			columns.push(obj3);
		}
		worksheet.columns = columns;
		
		var acArr = [];
		if(rolename == "$ra" && user_id > 0){
			// get all AC data
			var getAllAc = "SELECT um.uid, um.meta_value, u.id, u.realm, d.name as district, d.id as dId FROM [USER] u JOIN Rolemapping rm ON u.id = rm.principalId JOIN user_mapping um ON rm.principalId = um.uid  AND um.meta_key = 'district_id' AND um.meta_value IN ( select d.id from [User] u join user_mapping um on u.id = um.uid join region r on um.meta_value = r.id and um.meta_key = 'region_id' and um.uid = (?) join province p on p.region_id = r.id join district d on d.province_id = p.id ) JOIN Role r ON rm.roleId = r.id AND r.name = '$ac' JOIN district d ON d.id = um.meta_value WHERE 1=1 ";
			acArr.push(user_id);
		}else{
			// get all AC data
			var getAllAc = "SELECT um.uid, um.meta_value, u.id, u.realm, d.name as district, d.id as dId FROM [USER] u JOIN Rolemapping rm ON u.id = rm.principalId JOIN user_mapping um ON rm.principalId = um.uid  AND um.meta_key = 'district_id' JOIN Role r ON rm.roleId = r.id AND r.name = '$ac' JOIN district d ON d.id = um.meta_value WHERE 1=1 ";
		}
		if(ac_id > 0){
			getAllAc+=" AND um.uid = (?) ";
			acArr.push(ac_id);
		}
		if(district_id > 0){
			getAllAc+=" AND um.meta_value = (?) ";
			acArr.push(district_id);
		}
		getAllAc+=" ORDER BY um.uid";
		
		var getSPH = "select u.realm, m.name, sr.* from monthly_scorecard_reports sr join [User] u on sr.sph_id = u.id join subdistrict sd on sd.id = subdistrict.value('(/subdistrictXml/subdistrict)[1]','varchar(max)') join municipality m on m.id = sd.municipality_id where target_label = (?) and target_month >= (?) and target_month <= (?) and target_year = (?) order by sr.target_month";
		
		Usermapping.app.dbConnection.execute(getSPH,[target_for,from_month,to_month,year],(err,sphData)=>{
			
			Usermapping.app.dbConnection.execute(getAllAc,acArr,(err,acData)=>{
			
				async.forEachOf(acData, function(acDetail, acKey, acCallback){
				
					var acMonthlyTarget = [];
					var acMonthlyAchieved = [];
					var acMonthlyEstimated = [];
					
					acDetail['ac'] = {};
					acDetail['ac']["name"] = acDetail.realm;
					acDetail['ac']["role"] = "AC";
					acDetail['ac']["district"] = "";
					acDetail['ac']["target"] = 0;
					acDetail['ac']["achieved"] = 0;
					
					// foreach AC -> district, get its TLH
					var getTLHDistrict = "select distinct u.id, u.realm, sd.id as subId, m.name as city from [User] u join Rolemapping rm on u.id = rm.principalId join user_mapping um on rm.principalId = um.uid  and um.meta_key = 'subdistrict_id' join Role r on rm.roleId = r.id and r.name = '$tlh' join subdistrict sd on um.meta_value = sd.id join municipality m on m.id = sd.municipality_id where m.district_id = (?) order by u.id ";
					Usermapping.app.dbConnection.execute(getTLHDistrict,[acDetail.meta_value],(err,tlhData)=>{
						
						if(tlhData.length == 0){
							//worksheet.addRow();
						}
						
						var userId = 0;
						var user = {};
						var resultTlh = [];
						var subDistrictArr = [];
						async.forEachOf(tlhData, function(json, tlhKey, jsonCallback){
							
							if(userId!=json.id){
								
								if(Object.keys(user).length){
									resultTlh.push(user);
								}
								userId = json.id;
								subDistrictArr = [];
								user = {};
								user['id'] = "";
								user['realm'] = "";
								user['subdistrictNo'] = "";
								user['subdistrict'] = [];
								user['cityName'] = [];
							}
							
							user['id'] = json.id;
							user['realm'] = json.realm;
							if(subDistrictArr.indexOf(json.subId) < 0){
								subDistrictArr.push(json.subId);
								user['subdistrict'] = subDistrictArr;
								user['subdistrictNo'] = user['subdistrictNo'] + '(?),';
							}
							if((user['cityName']).indexOf(json.city) < 0){
								user['cityName'].push(json.city);
							}
							jsonCallback();
						},
						(err)=>{
							if(Object.keys(user).length){
								resultTlh.push(user);
							}
							acDetail['tlh'] = [];						
							
							async.forEachOf(resultTlh, function(tlhDetail, tlhKey, tlhCallback){
								acDetail['tlh'][tlhKey] = {};
								acDetail['tlh'][tlhKey]['name'] = tlhDetail.realm;
								acDetail['tlh'][tlhKey]['role'] = 'TLH';
								acDetail['tlh'][tlhKey]['district'] = acDetail.district;
								acDetail['tlh'][tlhKey]['target'] = 0;
								acDetail['tlh'][tlhKey]['achieved'] = 0;
								acDetail['tlh'][tlhKey]['sphCount'] = [];
								
								var tlhMonthlyTarget = [];
								var tlhMonthlyAchieved = [];
								var tlhMonthlyEstimated = [];
								
								var sphArr = tlhDetail.subdistrict;
								
								// foreach TLH loop -> Get SPH under him
								tlhDetail.subdistrictNo = (tlhDetail.subdistrictNo).replace(/(^,)|(,$)/g, "");
								var target = 0;
								var achieved = 0;
								var estimated = 0;
								var statKey = 0;
								var sphId = 0;
								var sphIdArr = [];
								acDetail['tlh'][tlhKey]['sph'] = [];
								
								async.forEachOf(sphData, function(stats, statKey, statCallback){
										
										function checkExists(subId){
											if(subId && stats.subdistrict){
												if((stats.subdistrict).indexOf("<subdistrict>"+subId+"</subdistrict>") >= 0){ 
													return subId; 
												}
											}
										}
										var subDistrictMatches = sphArr.filter(checkExists);
										
										if(subDistrictMatches.length > 0){
											sphId = stats.sph_id;
											
											if(sphIdArr.indexOf(stats.sph_id) < 0){
												target = 0;
												achieved = 0;
												estimated = 0;
												acDetail['tlh'][tlhKey]['sph'][sphId] = {};
												for(var i=(from_month-1); i<to_month; i++){
													acDetail['tlh'][tlhKey]['sph'][sphId][i+'target'] = 0;
													acDetail['tlh'][tlhKey]['sph'][sphId][i+'achieved'] = 0;
													acDetail['tlh'][tlhKey]['sph'][sphId][i+'estimated'] = 0;
												}
											}
											
											if(isNaN(acDetail['tlh'][tlhKey]['sph'][sphId]['target'])){ 
												acDetail['tlh'][tlhKey]['sph'][sphId]['target'] = 0; 
											}
											if(isNaN(acDetail['tlh'][tlhKey]['sph'][sphId]["achieved"])){ 
												acDetail['tlh'][tlhKey]['sph'][sphId]["achieved"] = 0; 
											}
											
											statKey = (stats.target_month-1);
											
											acDetail['tlh'][tlhKey]['sph'][sphId]['name'] = stats.realm;
											acDetail['tlh'][tlhKey]['sph'][sphId]['role'] = 'SPH';
											acDetail['tlh'][tlhKey]['sph'][sphId]['district'] = (tlhDetail.cityName).join(",");
											
											acDetail['tlh'][tlhKey]['sph'][sphId][statKey+'target'] = stats['monthly_target'];
											acDetail['tlh'][tlhKey]['sph'][sphId][statKey+'achieved'] = stats['achieved_target'];
											acDetail['tlh'][tlhKey]['sph'][sphId][statKey+'estimated'] = stats['estimated_target'];
											
											acDetail['tlh'][tlhKey]['sph'][sphId]['target'] = acDetail['tlh'][tlhKey]['sph'][sphId]['target'] + acDetail['tlh'][tlhKey]['sph'][sphId][statKey+'target'];
											acDetail['tlh'][tlhKey]['sph'][sphId]['achieved'] = acDetail['tlh'][tlhKey]['sph'][sphId]['achieved'] + acDetail['tlh'][tlhKey]['sph'][sphId][statKey+'achieved'];
											
											if(sphIdArr.indexOf(stats.sph_id) < 0){
												sphIdArr.push(stats.sph_id);
											}
											acDetail['tlh'][tlhKey]['sphCount'] = sphIdArr;
										}
										statCallback();
								},
								(err)=>{
										
										var sphLength = sphIdArr.length;
										for(var i=(from_month-1); i<to_month; i++){
											for(var j=0; j<sphLength; j++){
												
												if(isNaN(acDetail['tlh'][tlhKey][i+"target"])){ acDetail['tlh'][tlhKey][i+"target"] = 0; }
												if(isNaN(acDetail['tlh'][tlhKey][i+"achieved"])){ acDetail['tlh'][tlhKey][i+"achieved"] = 0; }
												if(isNaN(acDetail['tlh'][tlhKey][i+"estimated"])){ acDetail['tlh'][tlhKey][i+"estimated"] = 0; }
												
												
												if(isNaN(acDetail['tlh'][tlhKey]["target"])){ acDetail['tlh'][tlhKey]["target"] = 0; }
												if(isNaN(acDetail['tlh'][tlhKey]["achieved"])){ acDetail['tlh'][tlhKey]["achieved"] = 0; }
												
												acDetail['tlh'][tlhKey][i+"target"] = acDetail['tlh'][tlhKey][i+"target"] +  acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]][i+'target'];
												acDetail['tlh'][tlhKey][i+"achieved"] = acDetail['tlh'][tlhKey][i+"achieved"] +  acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]][i+'achieved'];
												acDetail['tlh'][tlhKey][i+"estimated"] = acDetail['tlh'][tlhKey][i+"estimated"] +  acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]][i+'estimated'];
												
												acDetail['tlh'][tlhKey]['target'] = acDetail['tlh'][tlhKey]['target'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]][i+'target'];
												acDetail['tlh'][tlhKey]['achieved'] = acDetail['tlh'][tlhKey]['achieved'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]][i+'achieved'];
											}
											if(i+1 == to_month){
												tlhCallback();
											}
										}
									});
								// loop of sph gets over here
							},
							(err)=>{
								
								// all the tlh is over for this district
								var tlhLength = (acDetail['tlh']).length;
								
								// all the data for tlh under this ac is calculated
								for(var i=(from_month-1); i<to_month; i++){
									for(var j=0; j<tlhLength; j++){									
										
										if(typeof(acDetail['ac']["target"]) == "undefined" || isNaN(acDetail['ac']["target"])){
											acDetail['ac']["target"] = 0;
										}
										if(typeof(acDetail['ac']["achieved"]) == "undefined" || isNaN(acDetail['ac']["achieved"])){
											acDetail['ac']["achieved"] = 0;
										}
										
										if(typeof(acDetail['ac'][i+"target"]) == "undefined" || isNaN(acDetail['ac'][i+"target"])){
											acDetail['ac'][i+"target"] = 0;
										}
										if(typeof(acDetail['ac'][i+"achieved"]) == "undefined" || isNaN(acDetail['ac'][i+"achieved"])){
											acDetail['ac'][i+"achieved"] = 0;
										}
										if(typeof(acDetail['ac'][i+"estimated"]) == "undefined" || isNaN(acDetail['ac'][i+"estimated"])){
											acDetail['ac'][i+"estimated"] = 0;
										}
										
										if(typeof(acDetail['tlh'][j][i+'target']) == "undefined" || isNaN(acDetail['tlh'][j][i+'target'])){
											acDetail['tlh'][j][i+'target'] = 0;
										}
										if(typeof(acDetail['tlh'][j][i+'achieved']) == "undefined" || isNaN(acDetail['tlh'][j][i+'achieved'])){
											acDetail['tlh'][j][i+'achieved'] = 0;
										}
										if(typeof(acDetail['tlh'][j][i+'estimated']) == "undefined" || isNaN(acDetail['tlh'][j][i+'estimated'])){
											acDetail['tlh'][j][i+'estimated'] = 0;
										}
										
										acDetail['ac'][i+"target"] = acDetail['ac'][i+"target"] +  acDetail['tlh'][j][i+'target'];
										acDetail['ac'][i+"achieved"] = acDetail['ac'][i+"achieved"] +  acDetail['tlh'][j][i+'achieved'];
										acDetail['ac'][i+"estimated"] = acDetail['ac'][i+"estimated"] +  acDetail['tlh'][j][i+'estimated'];
										
										acDetail['ac']["target"] = acDetail['ac']["target"] +  acDetail['tlh'][j][i+'target'];
										acDetail['ac']["achieved"] = acDetail['ac']["achieved"] +  acDetail['tlh'][j][i+'achieved'];
										
									}
									if(i+1 == to_month){
										acCallback();
									}
								}
								
							})
						});
					});
					
				},
				(err)=>{
					for(var ac=0; ac<acData.length; ac++){
						// add AC's record first
						worksheet.addRow(acData[ac]['ac']);
						var rowNo = worksheet.lastRow;
						//expect(worksheet.getRow(rowNo).collapsed).to.equal(false);
						
						// once you have added AC's row, add TLH
						var tlhLength = (acData[ac]['tlh']).length;
						if(tlhLength == 0){
							worksheet.addRow();
						}
						
						for(var tlhCount=0; tlhCount<tlhLength; tlhCount++){									
							
							worksheet.addRow(acData[ac]['tlh'][tlhCount]);
							var rowNo = worksheet.lastRow;
							//expect(worksheet.getRow(rowNo).collapsed).to.equal(false);
							
							// once you have added TLH's row, add SPH
							var sphLength = (acData[ac]['tlh'][tlhCount]['sphCount']).length;
							var sphData = acData[ac]['tlh'][tlhCount]['sphCount'];
							if(sphLength == 0){
								worksheet.addRow();
							}
							
							for(var sphCount=0; sphCount<sphLength; sphCount++){
								
								worksheet.addRow(acData[ac]['tlh'][tlhCount]['sph'][sphData[sphCount]]);
								var rowNo = worksheet.lastRow;
								//expect(worksheet.getRow(rowNo).collapsed).to.equal(false);
								if(sphCount+1 == sphLength){
									worksheet.addRow();
								}
							}
						}
					}
					
					
					var tempFilePath = tempfile('.xlsx');
					var date = new Date();
					var filename = "ac-"+target_for+"-"+date.getDate()+"-"+(date.getMonth()+1)+"-"+date.getFullYear()+"-"+date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds()+".xlsx";
					workbook.xlsx.writeFile("storage/report/"+filename).then(function() {
						var resultObj = [{"serverPath":"api/container/report/download/"+filename}];
						cb(null,resultObj);
					});
				});
				// End of async loop of AC data
				
			});

		});
			
	};
	
	Usermapping.remoteMethod('getScorecard',{
		http:{ path:'/getScorecard', verb:'' },
		accepts:[
				{arg: 'target_for', type: 'string', 'http': {source: 'query'}},
				{arg: 'res', type: 'object', 'http': {source: 'res'}},
				{arg: 'rolename', type: 'string', 'http': {source: 'query'}},
				{arg: 'user_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'ac_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'district_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'from_month', type: 'number', 'http': {source: 'query'}},
				{arg: 'to_month', type: 'number', 'http': {source: 'query'}},
				{arg: 'year', type: 'number', 'http': {source: 'query'}}
		],
		returns:{ arg:'result', type:'object' }
	})

	Usermapping.getScorecardWebView = function(target_for,rolename,user_id,ac_id,district_id,from_month,to_month,year,cb){
		
		var date = new Date();
		var currentMonth = (date.getMonth())+1;
		var currentYear = date.getFullYear();
		
		if(!from_month){
			from_month = 1;
		}
		
		if(!to_month){
			to_month = currentMonth;
		}
		
		if(!year){
			year = currentYear;
		}
		
		var columns = [{ header: 'Name', key: 'name', width: 10 },{ header: 'Role', key: 'role', width: 10 },{ header: 'District', key: 'district', width: 10 },{ header: 'Total Target', key: 'target', width: 10 },{ header: 'Total Achieved', key: 'achieved', width: 10 }];
		
		var months = ["Jan","Feb","March","April","May","Jun","July","Aug","Sep","Oct","Nov","Dec"];
		var totalRows = 3+((to_month-from_month)*3); // to get the total number of columns
		
		for(var i=(from_month-1); i<to_month; i++){			
			var obj1 = { header: months[i]+' Target', key: i+'target', width: 10 };
			var obj2 = { header: months[i]+' Achieved', key: i+'achieved', width: 10 };
			var obj3 = { header: months[i]+'Estimated', key: i+'estimated', width: 10 };
			columns.push(obj1);
			columns.push(obj2);
			columns.push(obj3);
		}
		
		var report = [];
		var acArr = [];
		
		if(rolename == "$ra" && user_id > 0){
			// get all AC data
			var getAllAc = "SELECT um.uid, um.meta_value, u.id, u.realm, d.name as district, d.id as dId FROM [USER] u JOIN Rolemapping rm ON u.id = rm.principalId JOIN user_mapping um ON rm.principalId = um.uid  AND um.meta_key = 'district_id' AND um.meta_value IN ( select d.id from [User] u join user_mapping um on u.id = um.uid join region r on um.meta_value = r.id and um.meta_key = 'region_id' and um.uid = (?) join province p on p.region_id = r.id join district d on d.province_id = p.id ) JOIN Role r ON rm.roleId = r.id AND r.name = '$ac' JOIN district d ON d.id = um.meta_value WHERE 1=1 ";
			acArr.push(user_id);
		}else{
			// get all AC data
			var getAllAc = "SELECT um.uid, um.meta_value, u.id, u.realm, d.name as district, d.id as dId FROM [USER] u JOIN Rolemapping rm ON u.id = rm.principalId JOIN user_mapping um ON rm.principalId = um.uid  AND um.meta_key = 'district_id' JOIN Role r ON rm.roleId = r.id AND r.name = '$ac' JOIN district d ON d.id = um.meta_value WHERE 1=1 ";
		}
		if(ac_id > 0){
			getAllAc+=" AND um.uid = (?) ";
			acArr.push(ac_id);
		}
		if(district_id > 0){
			getAllAc+=" AND um.meta_value = (?) ";
			acArr.push(district_id);
		}
		getAllAc+=" ORDER BY um.uid";
		
		var getSPH = "select u.realm, m.name, sr.* from monthly_scorecard_reports sr join [User] u on sr.sph_id = u.id join subdistrict sd on sd.id = subdistrict.value('(/subdistrictXml/subdistrict)[1]','varchar(max)') join municipality m on m.id = sd.municipality_id where target_label = (?) and target_month >= (?) and target_month <= (?) and target_year = (?) order by sr.target_month";
		
		Usermapping.app.dbConnection.execute(getSPH,[target_for,from_month,to_month,year],(err,sphData)=>{
			
			Usermapping.app.dbConnection.execute(getAllAc,acArr,(err,acData)=>{
				
				if(acData){
				
				async.forEachOf(acData, function(acDetail, acKey, acCallback){
				
					var acMonthlyTarget = [];
					var acMonthlyAchieved = [];
					var acMonthlyEstimated = [];
					
					acDetail['ac'] = {};
					acDetail['ac']["name"] = acDetail.realm;
					acDetail['ac']["role"] = "AC";
					acDetail['ac']["district"] = "";
					acDetail['ac']["target"] = 0;
					acDetail['ac']["achieved"] = 0;
					
					// foreach AC -> district, get its TLH
					var getTLHDistrict = "select distinct u.id, u.realm, sd.id as subId, m.name as city from [User] u join Rolemapping rm on u.id = rm.principalId join user_mapping um on rm.principalId = um.uid  and um.meta_key = 'subdistrict_id' join Role r on rm.roleId = r.id and r.name = '$tlh' join subdistrict sd on um.meta_value = sd.id join municipality m on m.id = sd.municipality_id where m.district_id = (?) order by u.id ";
					Usermapping.app.dbConnection.execute(getTLHDistrict,[acDetail.meta_value],(err,tlhData)=>{
						
						var userId = 0;
						var user = {};
						var resultTlh = [];
						var subDistrictArr = [];
						async.forEachOf(tlhData, function(json, tlhKey, jsonCallback){
							
							if(userId!=json.id){
								
								if(Object.keys(user).length){
									resultTlh.push(user);
								}
								userId = json.id;
								subDistrictArr = [];
								user = {};
								user['id'] = "";
								user['realm'] = "";
								user['subdistrictNo'] = "";
								user['subdistrict'] = [];
								user['cityName'] = [];
							}
							
							user['id'] = json.id;
							user['realm'] = json.realm;
							if(subDistrictArr.indexOf(json.subId) < 0){
								subDistrictArr.push(json.subId);
								user['subdistrict'] = subDistrictArr;
								user['subdistrictNo'] = user['subdistrictNo'] + '(?),';
							}
							if((user['cityName']).indexOf(json.city) < 0){
								user['cityName'].push(json.city);
							}
							jsonCallback();
						},
						(err)=>{
							if(Object.keys(user).length){
								resultTlh.push(user);
							}
							acDetail['tlh'] = [];						
							
							async.forEachOf(resultTlh, function(tlhDetail, tlhKey, tlhCallback){
								acDetail['tlh'][tlhKey] = {};
								acDetail['tlh'][tlhKey]['name'] = tlhDetail.realm;
								acDetail['tlh'][tlhKey]['role'] = 'TLH';
								acDetail['tlh'][tlhKey]['district'] = acDetail.district;
								acDetail['tlh'][tlhKey]['target'] = 0;
								acDetail['tlh'][tlhKey]['achieved'] = 0;
								acDetail['tlh'][tlhKey]['sphCount'] = [];
								
								var tlhMonthlyTarget = [];
								var tlhMonthlyAchieved = [];
								var tlhMonthlyEstimated = [];
								
								var sphArr = tlhDetail.subdistrict;
								
								// foreach TLH loop -> Get SPH under him
								tlhDetail.subdistrictNo = (tlhDetail.subdistrictNo).replace(/(^,)|(,$)/g, "");
								var target = 0;
								var achieved = 0;
								var estimated = 0;
								var statKey = 0;
								var sphId = 0;
								var sphIdArr = [];
								
								
								acDetail['tlh'][tlhKey]['sph'] = [];
								async.forEachOf(sphData, function(stats, statKey, statCallback){
												
										function checkExists(subId){
											if(subId && stats.subdistrict){
												if((stats.subdistrict).indexOf("<subdistrict>"+subId+"</subdistrict>") >= 0){ 
													return subId; 
												}
											}
										}
										var subDistrictMatches = sphArr.filter(checkExists);
										
										if(subDistrictMatches.length > 0){
											sphId = stats.sph_id;
											
											if(sphIdArr.indexOf(stats.sph_id) < 0){
												target = 0;
												achieved = 0;
												estimated = 0;
												acDetail['tlh'][tlhKey]['sph'][sphId] = {};
												for(var i=(from_month-1); i<to_month; i++){
													acDetail['tlh'][tlhKey]['sph'][sphId][i+'target'] = 0;
													acDetail['tlh'][tlhKey]['sph'][sphId][i+'achieved'] = 0;
													acDetail['tlh'][tlhKey]['sph'][sphId][i+'estimated'] = 0;
												}
											}
											
											if(isNaN(acDetail['tlh'][tlhKey]['sph'][sphId]['target'])){ 
												acDetail['tlh'][tlhKey]['sph'][sphId]['target'] = 0; 
											}
											if(isNaN(acDetail['tlh'][tlhKey]['sph'][sphId]["achieved"])){ 
												acDetail['tlh'][tlhKey]['sph'][sphId]["achieved"] = 0; 
											}
											statKey = (stats.target_month-1);
											
											acDetail['tlh'][tlhKey]['sph'][sphId]['name'] = stats.realm;
											acDetail['tlh'][tlhKey]['sph'][sphId]['role'] = 'SPH';
											acDetail['tlh'][tlhKey]['sph'][sphId]['district'] = (tlhDetail.cityName).join(",");
											
											acDetail['tlh'][tlhKey]['sph'][sphId][statKey+'target'] = stats['monthly_target'];
											acDetail['tlh'][tlhKey]['sph'][sphId][statKey+'achieved'] = stats['achieved_target'];
											acDetail['tlh'][tlhKey]['sph'][sphId][statKey+'estimated'] = stats['estimated_target'];
											
											target = target + stats['monthly_target'];
											achieved = achieved + stats['achieved_target'];
											estimated = estimated + stats['estimated_target'];
											
											acDetail['tlh'][tlhKey]['sph'][sphId]['target'] = acDetail['tlh'][tlhKey]['sph'][sphId]['target'] + acDetail['tlh'][tlhKey]['sph'][sphId][statKey+'target'];
											acDetail['tlh'][tlhKey]['sph'][sphId]['achieved'] = acDetail['tlh'][tlhKey]['sph'][sphId]['achieved'] + acDetail['tlh'][tlhKey]['sph'][sphId][statKey+'achieved'];
											
											if(sphIdArr.indexOf(stats.sph_id) < 0){
												sphIdArr.push(stats.sph_id);
											}
											acDetail['tlh'][tlhKey]['sphCount'] = sphIdArr;
										}
										statCallback();
								},
								(err)=>{
										
										var sphLength = sphIdArr.length;
										for(var i=(from_month-1); i<to_month; i++){
											for(var j=0; j<sphLength; j++){
												
												if(isNaN(acDetail['tlh'][tlhKey][i+"target"])){ acDetail['tlh'][tlhKey][i+"target"] = 0; }
												if(isNaN(acDetail['tlh'][tlhKey][i+"achieved"])){ acDetail['tlh'][tlhKey][i+"achieved"] = 0; }
												if(isNaN(acDetail['tlh'][tlhKey][i+"estimated"])){ acDetail['tlh'][tlhKey][i+"estimated"] = 0; }
												
												if(isNaN(acDetail['tlh'][tlhKey]["target"])){ acDetail['tlh'][tlhKey]["target"] = 0; }
												if(isNaN(acDetail['tlh'][tlhKey]["achieved"])){ acDetail['tlh'][tlhKey]["achieved"] = 0; }
												
												acDetail['tlh'][tlhKey][i+"target"] = acDetail['tlh'][tlhKey][i+"target"] +  acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]][i+'target'];
												acDetail['tlh'][tlhKey][i+"achieved"] = acDetail['tlh'][tlhKey][i+"achieved"] +  acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]][i+'achieved'];
												acDetail['tlh'][tlhKey][i+"estimated"] = acDetail['tlh'][tlhKey][i+"estimated"] +  acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]][i+'estimated'];
												
												acDetail['tlh'][tlhKey]['target'] = acDetail['tlh'][tlhKey]['target'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]][i+'target'];
												acDetail['tlh'][tlhKey]['achieved'] = acDetail['tlh'][tlhKey]['achieved'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]][i+'achieved'];
											}
											if(i+1 == to_month){
												tlhCallback();
											}
										}
									});
								// loop of sph gets over here3
							},
							(err)=>{
								
								// all the tlh is over for this district
								var tlhLength = (acDetail['tlh']).length;
								
								// all the data for tlh under this ac is calculated
								for(var i=(from_month-1); i<to_month; i++){
									for(var j=0; j<tlhLength; j++){									

										if(typeof(acDetail['ac']["target"]) == "undefined" || isNaN(acDetail['ac']["target"])){
											acDetail['ac']["target"] = 0;
										}
										if(typeof(acDetail['ac']["achieved"]) == "undefined" || isNaN(acDetail['ac']["achieved"])){
											acDetail['ac']["achieved"] = 0;
										}
										if(typeof(acDetail['ac'][i+"target"]) == "undefined" || isNaN(acDetail['ac'][i+"target"])){
											acDetail['ac'][i+"target"] = 0;
										}
										if(typeof(acDetail['ac'][i+"achieved"]) == "undefined" || isNaN(acDetail['ac'][i+"achieved"])){
											acDetail['ac'][i+"achieved"] = 0;
										}
										if(typeof(acDetail['ac'][i+"estimated"]) == "undefined" || isNaN(acDetail['ac'][i+"estimated"])){
											acDetail['ac'][i+"estimated"] = 0;
										}
										
										if(typeof(acDetail['tlh'][j][i+'target']) == "undefined" || isNaN(acDetail['tlh'][j][i+'target'])){
											acDetail['tlh'][j][i+'target'] = 0;
										}
										if(typeof(acDetail['tlh'][j][i+'achieved']) == "undefined" || isNaN(acDetail['tlh'][j][i+'achieved'])){
											acDetail['tlh'][j][i+'achieved'] = 0;
										}
										if(typeof(acDetail['tlh'][j][i+'estimated']) == "undefined" || isNaN(acDetail['tlh'][j][i+'estimated'])){
											acDetail['tlh'][j][i+'estimated'] = 0;
										}
										
										acDetail['ac'][i+"target"] = acDetail['ac'][i+"target"] +  acDetail['tlh'][j][i+'target'];
										acDetail['ac'][i+"achieved"] = acDetail['ac'][i+"achieved"] +  acDetail['tlh'][j][i+'achieved'];
										acDetail['ac'][i+"estimated"] = acDetail['ac'][i+"estimated"] +  acDetail['tlh'][j][i+'estimated'];
										
										acDetail['ac']["target"] = acDetail['ac']["target"] +  acDetail['tlh'][j][i+'target'];
										acDetail['ac']["achieved"] = acDetail['ac']["achieved"] +  acDetail['tlh'][j][i+'achieved'];
										
									}
									if(i+1 == to_month){
										acCallback();
									}
								}
								
							})
						});
					});
					
				},
				(err)=>{
					for(var ac=0; ac<acData.length; ac++){
						// add AC's record first
						report.push(acData[ac]['ac']);
						
						// once you have added AC's row, add TLH
						var tlhLength = (acData[ac]['tlh']).length;
						if(tlhLength == 0){
							report.push({});
						}
						
						for(var tlhCount=0; tlhCount<tlhLength; tlhCount++){									
							
							report.push(acData[ac]['tlh'][tlhCount]);
							
							// once you have added TLH's row, add SPH
							var sphLength = (acData[ac]['tlh'][tlhCount]['sphCount']).length;
							var sphData = acData[ac]['tlh'][tlhCount]['sphCount'];
							if(sphLength == 0){
								report.push({});
							}
							
							for(var sphCount=0; sphCount<sphLength; sphCount++){
								
								report.push(acData[ac]['tlh'][tlhCount]['sph'][sphData[sphCount]]);
								if(sphCount+1 == sphLength){
									report.push({});
								}
							}
						}
					}
					
					
					cb(null,report);
				});
				// End of async loop of AC data
				}else{
					cb(err,null);
				}
			});

		});
		
		
	};
	
	Usermapping.remoteMethod('getScorecardWebView',{
		http:{ path:'/getScorecardWebView', verb:'' },
		accepts:[
				{arg: 'target_for', type: 'string', 'http': {source: 'query'}},
				{arg: 'rolename', type: 'string', 'http': {source: 'query'}},
				{arg: 'user_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'ac_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'district_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'from_month', type: 'number', 'http': {source: 'query'}},
				{arg: 'to_month', type: 'number', 'http': {source: 'query'}},
				{arg: 'year', type: 'number', 'http': {source: 'query'}}
		],
		returns:{ arg:'result', type:'object' }
	});

	
	// AC Scorecard Summary with Web View
	
	Usermapping.getScorecardSummary = function(target_for,res,rolename,user_id,ac_id,district_id,month,year,cb){
		
		var date = new Date();
		var currentMonth = (date.getMonth())+1;
		var currentYear = date.getFullYear();
		
		if(!month){
			month = currentMonth;
		}

		if(!year){
			year = currentYear;
		}
		
		// var actualDate = date.getDate();
		// if(month != currentMonth){
			// var date = new Date(year+"-"+month+"-01");
			// var todayDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
			// todayDate = todayDate.getDate();
		// }else{
			// var todayDate = date.getDate();
		// }
		
		var actualDate = date.getDate();
		var date = new Date(year+"-"+month+"-01");
		var todayDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
		todayDate = todayDate.getDate();
		
		var total = (new Date(year, todayDate, 0).getDate());
		var monthTimeFactor = Math.round((todayDate/total)*100);
		
		//var totalDays = actualDate;
		var totalDays = todayDate;
		for(var i=1; i<month; i++){
			totalDays = totalDays + (new Date(year, i, 0).getDate());
		}
		
		var totalDaysYear = 0;
		if(year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)){
			totalDaysYear = 366;
		}else{
			totalDaysYear = 365;
		}
		
		var yearTimeFactor = Math.round((totalDays/totalDaysYear)*100);
		
		
		var Excel = require("exceljs");
		const tempfile = require('tempfile');

		var workbook = new Excel.Workbook();
		var worksheet = workbook.addWorksheet('Scorecard AC');
		
		var columns = [
			{ header: 'Date', key: 'name', width: 10 },
			{ header: '', key: 'role', width: 10 },
			{ header: 'Month', key: 'district', width: 10 },
			{ header: '', key: 'srku_vol_target_month', width: 10 },
			{ header: 'No. of AC', key: 'srku_vol_achieved_month', width: 10 },
			{ header: '', key: 'srku_vol_month_percent', width: 10 },
			{ header: 'Month Time Factor', key: 'srku_vol_target_year', width: 10 },
			{ header: '', key: 'srku_vol_achieved_year', width: 10 },
			{ header: 'Year Time Factor', key: 'srku_vol_year_percent', width: 10 },
			{ header: '', key: 'cement_vol_maintain_target_month', width: 10 },
			{ header: '', key: 'cement_vol_maintain_achieved_month', width: 10 },
			{ header: '', key: 'cement_vol_maintain_month_percent', width: 10 },
			{ header: '', key: 'cement_vol_maintain_target_year', width: 10 },
			{ header: '', key: 'cement_vol_maintain_achieved_year', width: 10 },
			{ header: '', key: 'cement_vol_maintain_year_percent', width: 10 },
			{ header: '', key: 'cement_vol_switching_target_month', width: 10 },
			{ header: '', key: 'cement_vol_switching_achieved_month', width: 10 },
			{ header: '', key: 'cement_vol_switching_month_percent', width: 10 },
			{ header: '', key: 'cement_vol_switching_target_year', width: 10 },
			{ header: '', key: 'cement_vol_switching_achieved_year', width: 10 },
			{ header: '', key: 'cement_vol_switching_year_percent', width: 10 },
			{ header: '', key: 'new_switching_hpb_target_month', width: 10 },
			{ header: '', key: 'new_switching_hpb_achieved_month', width: 10 },
			{ header: '', key: 'new_switching_hpb_month_percent', width: 10 },
			{ header: '', key: 'new_switching_hpb_target_year', width: 10 },
			{ header: '', key: 'new_switching_hpb_achieved_year', width: 10 },
			{ header: '', key: 'new_switching_hpb_year_percent', width: 10 },
			{ header: '', key: 'srku_house_num_target_month', width: 10 },
			{ header: '', key: 'srku_house_num_achieved_month', width: 10 },
			{ header: '', key: 'srku_house_num_month_percent', width: 10 },
			{ header: '', key: 'srku_house_num_target_year', width: 10 },
			{ header: '', key: 'srku_house_num_achieved_year', width: 10 },
			{ header: '', key: 'srku_house_num_year_percent', width: 10 }
		];
		
		var totalRows = 23; // total number of columns
		worksheet.columns = columns;
		
		var row = {
			'name':'Name','role':'Role','district':'District','srku_vol_target_month':'SRKU Target MTD','srku_vol_achieved_month':'SRKU Achieved MTD','srku_vol_month_percent':'% SRKU MTD','srku_vol_target_year':'SRKU Target YTD','srku_vol_achieved_year':'SRKU Achieved YTD','srku_vol_year_percent':'% SRKU YTD','cement_vol_maintain_target_month':'HPB Maintain Target MTD','cement_vol_maintain_achieved_month':'HPB Maintain Achieved MTD','cement_vol_maintain_month_percent':'% HPB Maintain MTD','cement_vol_maintain_target_year':'HPB Maintain Target YTD','cement_vol_maintain_achieved_year':'HPB Maintain Achieved YTD','cement_vol_maintain_year_percent':'% HPB Maintain YTD','cement_vol_switching_target_month':'HPB Switching Target MTD','cement_vol_switching_achieved_month':'HPB Switching Achieved MTD','cement_vol_switching_month_percent':'% HPB Switching MTD','cement_vol_switching_target_year':'HPB Switching Target YTD','cement_vol_switching_achieved_year':'HPB Switching Achieved YTD','cement_vol_switching_year_percent':'% HPB Switching YTD',
			'new_switching_hpb_target_month':'New Member Target MTD','new_switching_hpb_achieved_month':'New Member Achieved MTD','new_switching_hpb_month_percent':'% New Member MTD','new_switching_hpb_target_year':'New Member Target YTD','new_switching_hpb_achieved_year':'New Member Achieved YTD','new_switching_hpb_year_percent':'% New Member YTD','srku_house_num_target_month':'SRKU House Target MTD','srku_house_num_achieved_month':'SRKU House Achieved MTD','srku_house_num_month_percent':'% SRKU House MTD','srku_house_num_target_year':'SRKU House Target YTD','srku_house_num_achieved_year':'SRKU House Achieved YTD','srku_house_num_year_percent':'% SRKU House YTD'};
		
		var acArr = [];
		if(rolename == "$ra" && user_id > 0){
			// get all AC data
			var getAllAc = "SELECT um.uid, um.meta_value, u.id, u.realm, d.name as district, d.id as dId FROM [USER] u JOIN Rolemapping rm ON u.id = rm.principalId JOIN user_mapping um ON rm.principalId = um.uid  AND um.meta_key = 'district_id' AND um.meta_value IN ( select d.id from [User] u join user_mapping um on u.id = um.uid join region r on um.meta_value = r.id and um.meta_key = 'region_id' and um.uid = (?) join province p on p.region_id = r.id join district d on d.province_id = p.id ) JOIN Role r ON rm.roleId = r.id AND r.name = '$ac' JOIN district d ON d.id = um.meta_value WHERE 1=1 ";
			acArr.push(user_id);
		}else{
			// get all AC data
			var getAllAc = "SELECT um.uid, um.meta_value, u.id, u.realm, d.name as district, d.id as dId FROM [USER] u JOIN Rolemapping rm ON u.id = rm.principalId JOIN user_mapping um ON rm.principalId = um.uid  AND um.meta_key = 'district_id' JOIN Role r ON rm.roleId = r.id AND r.name = '$ac' JOIN district d ON d.id = um.meta_value WHERE 1=1 ";
		}
		if(ac_id > 0){
			getAllAc+=" AND um.uid = (?) ";
			acArr.push(ac_id);
		}
		if(district_id > 0){
			getAllAc+=" AND um.meta_value = (?) ";
			acArr.push(district_id);
		}
		getAllAc+=" ORDER BY um.uid";
		
		// var getSPH = "select u.realm, m.name, sr.* from monthly_scorecard_reports sr join [User] u on sr.sph_id = u.id join subdistrict sd on sd.id = subdistrict.value('(/subdistrictXml/subdistrict)[1]','varchar(max)') join municipality m on m.id = sd.municipality_id order by sr.target_month";
		// Usermapping.app.dbConnection.execute(getSPH,null,(err,sphData)=>{
		var getSPH = "select u.realm, m.name, sr.* from monthly_scorecard_reports sr join [User] u on sr.sph_id = u.id join subdistrict sd on sd.id = subdistrict.value('(/subdistrictXml/subdistrict)[1]','varchar(max)') join municipality m on m.id = sd.municipality_id where sr.target_year = (?) and sr.target_month <= (?) order by sr.target_month";
		Usermapping.app.dbConnection.execute(getSPH,[year,month],(err,sphData)=>{
			console.log("getSPH==>",sphData);
				Usermapping.app.dbConnection.execute(getAllAc,acArr,(err,acData)=>{
					console.log("getAllAc==>",acData);
					var acArr = [];
					async.each(acData, function(ac, callback) {
						if(acArr.indexOf(ac.uid) < 0){
							acArr.push(ac.uid);
						}
						callback();
					},
					(err)=>{
						worksheet.addRow({"name":todayDate,"role":"","district":month,"srku_vol_target_month":"","srku_vol_achieved_month":(acArr.length),"srku_vol_month_percent":"","srku_vol_target_year":monthTimeFactor,"srku_vol_achieved_year":"","srku_vol_year_percent":yearTimeFactor});
					});
					

					worksheet.addRow();
					worksheet.addRow(row);
					
					async.forEachOf(acData, function(acDetail, acKey, acCallback){
					
						var acMonthlyTarget = [];
						var acMonthlyAchieved = [];
						var acMonthlyEstimated = [];
						
						acDetail['ac'] = {};
						acDetail['ac']["name"] = acDetail.realm;
						acDetail['ac']["role"] = "AC";
						acDetail['ac']["district"] = "";
						
						// foreach AC -> district, get its TLH
						var getTLHDistrict = "select distinct u.id, u.realm, sd.id as subId, m.name as city from [User] u join Rolemapping rm on u.id = rm.principalId join user_mapping um on rm.principalId = um.uid  and um.meta_key = 'subdistrict_id' join Role r on rm.roleId = r.id and r.name = '$tlh' join subdistrict sd on um.meta_value = sd.id join municipality m on m.id = sd.municipality_id where m.district_id = (?) order by u.id ";
						Usermapping.app.dbConnection.execute(getTLHDistrict,[acDetail.meta_value],(err,tlhData)=>{
							console.log("getTLHDistrict==>",tlhData);
							if(tlhData.length == 0){
								//worksheet.addRow();
							}
							
							var userId = 0;
							var user = {};
							var resultTlh = [];
							var subDistrictArr = [];
							async.forEachOf(tlhData, function(json, tlhKey, jsonCallback){
								
								if(userId!=json.id){
									
									if(Object.keys(user).length){
										resultTlh.push(user);
									}
									userId = json.id;
									subDistrictArr = [];
									user = {};
									user['id'] = "";
									user['realm'] = "";
									user['subdistrict'] = [];
									user['subdistrictNo'] = "";
									user['cityName'] = [];
								}
								
								user['id'] = json.id;
								user['realm'] = json.realm;
								if(subDistrictArr.indexOf(json.subId) < 0){
									subDistrictArr.push(json.subId);
									user['subdistrict'] = subDistrictArr;
									user['subdistrictNo'] = user['subdistrictNo'] + '(?),';
								}
								if((user['cityName']).indexOf(json.city) < 0){
									user['cityName'].push(json.city);
								}
								jsonCallback();
							},
							(err)=>{
								resultTlh.push(user);
								acDetail['tlh'] = [];						
								
								async.forEachOf(resultTlh, function(tlhDetail, tlhKey, tlhCallback){
									acDetail['tlh'][tlhKey] = {};
									acDetail['tlh'][tlhKey]['name'] = tlhDetail.realm;
									acDetail['tlh'][tlhKey]['role'] = 'TLH';
									acDetail['tlh'][tlhKey]['district'] = acDetail.district;
									acDetail['tlh'][tlhKey]['target'] = 0;
									acDetail['tlh'][tlhKey]['achieved'] = 0;
									acDetail['tlh'][tlhKey]['sphCount'] = [];
									acDetail['tlh'][tlhKey]['sph'] = [];
									var statKey = 0;
									var sphId = 0;
									var sphIdArr = [];
									var tlhMonthlyTarget = [];
									var tlhMonthlyAchieved = [];
									var tlhMonthlyEstimated = [];
									
									if(tlhDetail.subdistrict){
										var sphArr = tlhDetail.subdistrict;
									}else{
										var sphArr = [];
									}
									var sphIdArr = [];
									
									if(tlhDetail.subdistrictNo){
										tlhDetail.subdistrictNo = (tlhDetail.subdistrictNo).replace(/(^,)|(,$)/g, "");
									}
									
									
									async.forEachOf(sphData, function(stats, statKey, statCallback){
												
										function checkExists(subId){
											if(subId && stats.subdistrict){
												if((stats.subdistrict).indexOf("<subdistrict>"+subId+"</subdistrict>") >= 0){ 
													return subId; 
												}
											}
										}
										var subDistrictMatches = sphArr.filter(checkExists);
										
										if(subDistrictMatches.length > 0){
											sphId = stats.sph_id;
											
											if(sphIdArr.indexOf(stats.sph_id) < 0){
												acDetail['tlh'][tlhKey]['sph'][sphId] = {};
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_vol_target_month"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_vol_achieved_month"] = 0;
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_vol_month_percent"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_vol_target_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_vol_achieved_year"] = 0;
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_vol_year_percent"] = 0; 
												
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_maintain_target_month"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_maintain_achieved_month"] = 0;
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_maintain_month_percent"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_maintain_target_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_maintain_achieved_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_maintain_year_percent"] = 0; 
												
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_switching_target_month"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_switching_achieved_month"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_switching_month_percent"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_switching_target_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_switching_achieved_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_switching_year_percent"] = 0; 
												
												acDetail['tlh'][tlhKey]['sph'][sphId]["new_switching_hpb_target_month"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["new_switching_hpb_achieved_month"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["new_switching_hpb_month_percent"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["new_switching_hpb_target_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["new_switching_hpb_achieved_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["new_switching_hpb_year_percent"] = 0; 
												
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_house_num_target_month"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_house_num_achieved_month"] = 0;
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_house_num_month_percent"] = 0; 										
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_house_num_target_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_house_num_achieved_year"] = 0;
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_house_num_year_percent"] = 0;
											}
											
											// sph stats for each target label
											var target_label = stats.target_label;
											acDetail['tlh'][tlhKey]['sph'][sphId]['name'] = stats.realm;
											acDetail['tlh'][tlhKey]['sph'][sphId]['role'] = 'SPH';
											acDetail['tlh'][tlhKey]['sph'][sphId]['district'] = (tlhDetail.cityName).join(",");
											
											if(target_label == "srku_vol"){
												
												if(stats['target_month'] == month){
													acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_target_month'] = stats['monthly_target'];
													acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_achieved_month'] = stats['achieved_target'];
													
													var monthpercent = Math.round((stats['achieved_target']*100)/(stats['monthly_target']));
													if(isNaN(monthpercent)){ monthpercent = 0; }
													acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_month_percent'] = monthpercent;
												}
												
												acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_target_year']+=stats['monthly_target'];
												acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_achieved_year']+= stats['achieved_target'];
												
												var yearpercent = Math.round((acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_achieved_year']*100)/(acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_target_year']));
												if(isNaN(yearpercent)){ yearpercent = 0; }
												acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_year_percent'] = yearpercent;
											}
											else if(target_label == "cement_vol_maintain"){
												if(stats['target_month'] == month){
													acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_target_month'] = stats['monthly_target'];
													acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_achieved_month'] = stats['achieved_target'];
													
													var monthpercent = Math.round((stats['achieved_target']*100)/(stats['monthly_target']));
													if(isNaN(monthpercent)){ monthpercent = 0; }
													acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_month_percent'] = monthpercent;
												}
												acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_target_year']+= stats['monthly_target'];
												acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_achieved_year']+= stats['achieved_target'];
												
												var yearpercent = Math.round((acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_achieved_year']*100)/(acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_target_year']));
												if(isNaN(yearpercent)){ yearpercent = 0; }
												acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_year_percent'] = yearpercent;
												
											}
											else if(target_label == "cement_vol_switching"){
												if(stats['target_month'] == month){
													acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_target_month'] = stats['monthly_target'];
													acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_achieved_month'] = stats['achieved_target'];
													
													var monthpercent = Math.round((stats['achieved_target']*100)/(stats['monthly_target']));
													if(isNaN(monthpercent)){ monthpercent = 0; }
													acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_month_percent'] = monthpercent;
												}
												acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_target_year']+= stats['monthly_target'];
												acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_achieved_year']+= stats['achieved_target'];
												
												var yearpercent = Math.round((acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_achieved_year']*100)/(acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_target_year']));
												if(isNaN(yearpercent)){ yearpercent = 0; }
												acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_year_percent'] = yearpercent;
											}
											else if(target_label == "srku_house_num"){
												if(stats['target_month'] == month){
													acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_target_month'] = stats['monthly_target'];
													acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_achieved_month'] = stats['achieved_target'];
													
													var monthpercent = Math.round((stats['achieved_target']*100)/(stats['monthly_target']));
													if(isNaN(monthpercent)){ monthpercent = 0; }
													acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_month_percent'] = monthpercent;
												}
												acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_target_year']+= stats['monthly_target'];
												acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_achieved_year']+= stats['achieved_target'];
												
												var yearpercent = Math.round((acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_achieved_year']*100)/(acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_target_year']));
												if(isNaN(yearpercent)){ yearpercent = 0; }
												acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_year_percent'] = yearpercent;
											}
											else if(target_label == "new_switching_hpb"){
												if(stats['target_month'] == month){
													acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_target_month'] = stats['monthly_target'];
													acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_achieved_month'] = stats['achieved_target'];
													
													var monthpercent = Math.round((stats['achieved_target']*100)/(stats['monthly_target']));
													if(isNaN(monthpercent)){ monthpercent = 0; }
													acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_month_percent'] = monthpercent;
												}
												acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_target_year']+= stats['monthly_target'];
												acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_achieved_year']+= stats['achieved_target'];
												
												var yearpercent = Math.round((acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_achieved_year']*100)/(acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_target_year']));
												if(isNaN(yearpercent)){ yearpercent = 0; }
												acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_year_percent'] = yearpercent;
											}
											if(sphIdArr.indexOf(stats.sph_id) < 0){
												sphIdArr.push(stats.sph_id);
											}
											acDetail['tlh'][tlhKey]['sphCount'] = sphIdArr;
										}
										statCallback();				
									},
									(err)=>{
										// all the data for sph for this tlh is calculated
										var sphIdArr = acDetail['tlh'][tlhKey]['sphCount'];
										var sphLength = sphIdArr.length;
												
										acDetail['tlh'][tlhKey]["srku_vol_target_month"] = 0; 
										acDetail['tlh'][tlhKey]["srku_vol_achieved_month"] = 0;
										acDetail['tlh'][tlhKey]["srku_vol_month_percent"] = 0; 
										acDetail['tlh'][tlhKey]["srku_vol_target_year"] = 0; 
										acDetail['tlh'][tlhKey]["srku_vol_achieved_year"] = 0;
										acDetail['tlh'][tlhKey]["srku_vol_year_percent"] = 0; 
										
										acDetail['tlh'][tlhKey]["cement_vol_maintain_target_month"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_maintain_achieved_month"] = 0;
										acDetail['tlh'][tlhKey]["cement_vol_maintain_month_percent"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_maintain_target_year"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_maintain_achieved_year"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_maintain_year_percent"] = 0; 
										
										acDetail['tlh'][tlhKey]["cement_vol_switching_target_month"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_switching_achieved_month"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_switching_month_percent"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_switching_target_year"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_switching_achieved_year"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_switching_year_percent"] = 0; 
										
										acDetail['tlh'][tlhKey]["new_switching_hpb_target_month"] = 0; 
										acDetail['tlh'][tlhKey]["new_switching_hpb_achieved_month"] = 0; 
										acDetail['tlh'][tlhKey]["new_switching_hpb_month_percent"] = 0; 
										acDetail['tlh'][tlhKey]["new_switching_hpb_target_year"] = 0; 
										acDetail['tlh'][tlhKey]["new_switching_hpb_achieved_year"] = 0; 
										acDetail['tlh'][tlhKey]["new_switching_hpb_year_percent"] = 0; 
										
										acDetail['tlh'][tlhKey]["srku_house_num_target_month"] = 0; 
										acDetail['tlh'][tlhKey]["srku_house_num_achieved_month"] = 0;
										acDetail['tlh'][tlhKey]["srku_house_num_month_percent"] = 0; 										
										acDetail['tlh'][tlhKey]["srku_house_num_target_year"] = 0; 
										acDetail['tlh'][tlhKey]["srku_house_num_achieved_year"] = 0;
										acDetail['tlh'][tlhKey]["srku_house_num_year_percent"] = 0; 

										for(var j=0; j<sphLength; j++){				
											
											// srku achievement
											acDetail['tlh'][tlhKey]['srku_vol_target_month'] = acDetail['tlh'][tlhKey]['srku_vol_target_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_vol_target_month'];
											acDetail['tlh'][tlhKey]['srku_vol_achieved_month'] = acDetail['tlh'][tlhKey]['srku_vol_achieved_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_vol_achieved_month'];
											acDetail['tlh'][tlhKey]['srku_vol_target_year'] = acDetail['tlh'][tlhKey]['srku_vol_target_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_vol_target_year'];
											acDetail['tlh'][tlhKey]['srku_vol_achieved_year'] = acDetail['tlh'][tlhKey]['srku_vol_achieved_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_vol_achieved_year'];
											
											var monthpercent = Math.round((acDetail['tlh'][tlhKey]['srku_vol_achieved_month']*100)/(acDetail['tlh'][tlhKey]['srku_vol_target_month']));
											var yearpercent = Math.round((acDetail['tlh'][tlhKey]['srku_vol_achieved_year']*100)/(acDetail['tlh'][tlhKey]['srku_vol_target_year']));
											
											if(isNaN(monthpercent)){ monthpercent = 0; }
											if(isNaN(yearpercent)){ yearpercent = 0; }
											
											acDetail['tlh'][tlhKey]['srku_vol_month_percent'] = monthpercent;
											acDetail['tlh'][tlhKey]['srku_vol_year_percent'] = yearpercent;
													
											// cement volume maintain achievement
											acDetail['tlh'][tlhKey]['cement_vol_maintain_target_month'] = acDetail['tlh'][tlhKey]['cement_vol_maintain_target_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_maintain_target_month'];
											acDetail['tlh'][tlhKey]['cement_vol_maintain_achieved_month'] = acDetail['tlh'][tlhKey]['cement_vol_maintain_achieved_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_maintain_achieved_month'];
											acDetail['tlh'][tlhKey]['cement_vol_maintain_target_year'] = acDetail['tlh'][tlhKey]['cement_vol_maintain_target_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_maintain_target_year'];
											acDetail['tlh'][tlhKey]['cement_vol_maintain_achieved_year'] = acDetail['tlh'][tlhKey]['cement_vol_maintain_achieved_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_maintain_achieved_year'];
													
											var monthpercent = Math.round((acDetail['tlh'][tlhKey]['cement_vol_maintain_achieved_month']*100)/(acDetail['tlh'][tlhKey]['cement_vol_maintain_target_month']));
											var yearpercent = Math.round((acDetail['tlh'][tlhKey]['cement_vol_maintain_achieved_year']*100)/(acDetail['tlh'][tlhKey]['cement_vol_maintain_target_year']));
											
											if(isNaN(monthpercent)){ monthpercent = 0; }
											if(isNaN(yearpercent)){ yearpercent = 0; }
													
											acDetail['tlh'][tlhKey]['cement_vol_maintain_month_percent'] = monthpercent;
											acDetail['tlh'][tlhKey]['cement_vol_maintain_year_percent'] = yearpercent;
											
											// cement volume switching achievement
											acDetail['tlh'][tlhKey]['cement_vol_switching_target_month'] = acDetail['tlh'][tlhKey]['cement_vol_switching_target_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_switching_target_month'];
											acDetail['tlh'][tlhKey]['cement_vol_switching_achieved_month'] = acDetail['tlh'][tlhKey]['cement_vol_switching_achieved_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_switching_achieved_month'];
											acDetail['tlh'][tlhKey]['cement_vol_switching_target_year'] = acDetail['tlh'][tlhKey]['cement_vol_switching_target_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_switching_target_year'];
											acDetail['tlh'][tlhKey]['cement_vol_switching_achieved_year'] = acDetail['tlh'][tlhKey]['cement_vol_switching_achieved_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_switching_achieved_year'];
													
											var monthpercent = Math.round((acDetail['tlh'][tlhKey]['cement_vol_switching_achieved_month']*100)/(acDetail['tlh'][tlhKey]['cement_vol_switching_target_month']));
											var yearpercent = Math.round((acDetail['tlh'][tlhKey]['cement_vol_switching_achieved_year']*100)/(acDetail['tlh'][tlhKey]['cement_vol_switching_target_year']));
											
											if(isNaN(monthpercent)){ monthpercent = 0; }
											if(isNaN(yearpercent)){ yearpercent = 0; }
											
											acDetail['tlh'][tlhKey]['cement_vol_switching_month_percent'] = monthpercent;
											acDetail['tlh'][tlhKey]['cement_vol_switching_year_percent'] = yearpercent;
											
											// new member achievement
											acDetail['tlh'][tlhKey]['new_switching_hpb_target_month'] = acDetail['tlh'][tlhKey]['new_switching_hpb_target_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['new_switching_hpb_target_month'];
											acDetail['tlh'][tlhKey]['new_switching_hpb_achieved_month'] = acDetail['tlh'][tlhKey]['new_switching_hpb_achieved_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['new_switching_hpb_achieved_month'];
											acDetail['tlh'][tlhKey]['new_switching_hpb_target_year'] = acDetail['tlh'][tlhKey]['new_switching_hpb_target_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['new_switching_hpb_target_year'];
											acDetail['tlh'][tlhKey]['new_switching_hpb_achieved_year'] = acDetail['tlh'][tlhKey]['new_switching_hpb_achieved_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['new_switching_hpb_achieved_year'];
											
											var monthpercent = Math.round((acDetail['tlh'][tlhKey]['new_switching_hpb_achieved_month']*100)/(acDetail['tlh'][tlhKey]['new_switching_hpb_target_month']));
											var yearpercent = Math.round((acDetail['tlh'][tlhKey]['new_switching_hpb_achieved_year']*100)/(acDetail['tlh'][tlhKey]['new_switching_hpb_target_year']));
											
											if(isNaN(monthpercent)){ monthpercent = 0; }
											if(isNaN(yearpercent)){ yearpercent = 0; }
											
											acDetail['tlh'][tlhKey]['new_switching_hpb_month_percent'] = monthpercent;
											acDetail['tlh'][tlhKey]['new_switching_hpb_year_percent'] = yearpercent;
											
											// srku house num achievement
											acDetail['tlh'][tlhKey]['srku_house_num_target_month'] = acDetail['tlh'][tlhKey]['srku_house_num_target_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_house_num_target_month'];
											acDetail['tlh'][tlhKey]['srku_house_num_achieved_month'] = acDetail['tlh'][tlhKey]['srku_house_num_achieved_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_house_num_achieved_month'];
											acDetail['tlh'][tlhKey]['srku_house_num_target_year'] = acDetail['tlh'][tlhKey]['srku_house_num_target_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_house_num_target_year'];
											acDetail['tlh'][tlhKey]['srku_house_num_achieved_year'] = acDetail['tlh'][tlhKey]['srku_house_num_achieved_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_house_num_achieved_year'];
											
											var monthpercent = Math.round((acDetail['tlh'][tlhKey]['srku_house_num_achieved_month']*100)/(acDetail['tlh'][tlhKey]['srku_house_num_target_month']));
											var yearpercent = Math.round((acDetail['tlh'][tlhKey]['srku_house_num_achieved_year']*100)/(acDetail['tlh'][tlhKey]['srku_house_num_target_year']));
											
											if(isNaN(monthpercent)){ monthpercent = 0; }
											if(isNaN(yearpercent)){ yearpercent = 0; }
											
											acDetail['tlh'][tlhKey]['srku_house_num_month_percent'] = monthpercent;
											acDetail['tlh'][tlhKey]['srku_house_num_year_percent'] = yearpercent;
													
										}
										tlhCallback();
									});
									
								},
								(err)=>{
									
									// all the tlh is over for this district
									acDetail['ac']["srku_vol_target_month"] = 0; 
									acDetail['ac']["srku_vol_achieved_month"] = 0; 
									acDetail['ac']["srku_vol_month_percent"] = 0; 
									acDetail['ac']["srku_vol_target_year"] = 0; 
									acDetail['ac']["srku_vol_achieved_year"] = 0; 
									acDetail['ac']["srku_vol_year_percent"] = 0; 
									
									acDetail['ac']["cement_vol_maintain_target_month"] = 0; 
									acDetail['ac']["cement_vol_maintain_achieved_month"] = 0; 
									acDetail['ac']["cement_vol_maintain_month_percent"] = 0; 
									acDetail['ac']["cement_vol_maintain_target_year"] = 0; 
									acDetail['ac']["cement_vol_maintain_achieved_year"] = 0; 
									acDetail['ac']["cement_vol_maintain_year_percent"] = 0; 
									
									acDetail['ac']["cement_vol_switching_target_month"] = 0; 
									acDetail['ac']["cement_vol_switching_achieved_month"] = 0; 
									acDetail['ac']["cement_vol_switching_month_percent"] = 0; 
									acDetail['ac']["cement_vol_switching_target_year"] = 0; 
									acDetail['ac']["cement_vol_switching_achieved_year"] = 0; 
									acDetail['ac']["cement_vol_switching_year_percent"] = 0; 
									
									acDetail['ac']["new_switching_hpb_target_month"] = 0; 
									acDetail['ac']["new_switching_hpb_achieved_month"] = 0; 
									acDetail['ac']["new_switching_hpb_month_percent"] = 0; 
									acDetail['ac']["new_switching_hpb_target_year"] = 0; 
									acDetail['ac']["new_switching_hpb_achieved_year"] = 0; 
									acDetail['ac']["new_switching_hpb_year_percent"] = 0; 
									
									acDetail['ac']["srku_house_num_target_month"] = 0; 
									acDetail['ac']["srku_house_num_achieved_month"] = 0; 
									acDetail['ac']["srku_house_num_month_percent"] = 0; 
									acDetail['ac']["srku_house_num_target_year"] = 0; 
									acDetail['ac']["srku_house_num_achieved_year"] = 0;
									acDetail['ac']["srku_house_num_year_percent"] = 0; 
									
									var tlhLength = (acDetail['tlh']).length;
									for(var j=0; j<tlhLength; j++){
										acDetail['ac']["srku_vol_target_month"] = acDetail['ac']["srku_vol_target_month"] +  acDetail['tlh'][j]['srku_vol_target_month'];
										acDetail['ac']["srku_vol_achieved_month"] = acDetail['ac']["srku_vol_achieved_month"] +  acDetail['tlh'][j]['srku_vol_achieved_month'];
										acDetail['ac']["srku_vol_target_year"] = acDetail['ac']["srku_vol_target_year"] +  acDetail['tlh'][j]['srku_vol_target_year'];
										acDetail['ac']["srku_vol_achieved_year"] = acDetail['ac']["srku_vol_achieved_year"] +  acDetail['tlh'][j]['srku_vol_achieved_year'];
										
										var monthpercent = Math.round((acDetail['ac']['srku_vol_achieved_month']*100)/(acDetail['ac']['srku_vol_target_month']));
										var yearpercent = Math.round((acDetail['ac']['srku_vol_achieved_year']*100)/(acDetail['ac']['srku_vol_target_year']));
										
										if(isNaN(monthpercent)){ monthpercent = 0; }
										if(isNaN(yearpercent)){ yearpercent = 0; }
										
										acDetail['ac']['srku_vol_month_percent'] = monthpercent;
										acDetail['ac']['srku_vol_year_percent'] = yearpercent;
										
										
										acDetail['ac']["cement_vol_maintain_target_month"] = acDetail['ac']["cement_vol_maintain_target_month"] +  acDetail['tlh'][j]['cement_vol_maintain_target_month'];
										acDetail['ac']["cement_vol_maintain_achieved_month"] = acDetail['ac']["cement_vol_maintain_achieved_month"] +  acDetail['tlh'][j]['cement_vol_maintain_achieved_month'];
										acDetail['ac']["cement_vol_maintain_target_year"] = acDetail['ac']["cement_vol_maintain_target_year"] +  acDetail['tlh'][j]['cement_vol_maintain_target_year'];
										acDetail['ac']["cement_vol_maintain_achieved_year"] = acDetail['ac']["cement_vol_maintain_achieved_year"] +  acDetail['tlh'][j]['cement_vol_maintain_achieved_year'];
										
										var monthpercent = Math.round((acDetail['ac']['cement_vol_maintain_achieved_month']*100)/(acDetail['ac']['cement_vol_maintain_target_month']));
										var yearpercent = Math.round((acDetail['ac']['cement_vol_maintain_achieved_year']*100)/(acDetail['ac']['cement_vol_maintain_target_year']));
										
										if(isNaN(monthpercent)){ monthpercent = 0; }
										if(isNaN(yearpercent)){ yearpercent = 0; }
										
										acDetail['ac']['cement_vol_maintain_month_percent'] = monthpercent;
										acDetail['ac']['cement_vol_maintain_year_percent'] = yearpercent;
										
										acDetail['ac']["cement_vol_switching_target_month"] = acDetail['ac']["cement_vol_switching_target_month"] +  acDetail['tlh'][j]['cement_vol_switching_target_month'];
										acDetail['ac']["cement_vol_switching_achieved_month"] = acDetail['ac']["cement_vol_switching_achieved_month"] +  acDetail['tlh'][j]['cement_vol_switching_achieved_month'];
										acDetail['ac']["cement_vol_switching_target_year"] = acDetail['ac']["cement_vol_switching_target_year"] +  acDetail['tlh'][j]['cement_vol_switching_target_year'];
										acDetail['ac']["cement_vol_switching_achieved_year"] = acDetail['ac']["cement_vol_switching_achieved_year"] +  acDetail['tlh'][j]['cement_vol_switching_achieved_year'];
										
										var monthpercent = Math.round((acDetail['ac']['cement_vol_switching_achieved_month']*100)/(acDetail['ac']['cement_vol_switching_target_month']));
										var yearpercent = Math.round((acDetail['ac']['cement_vol_switching_achieved_year']*100)/(acDetail['ac']['cement_vol_switching_target_year']));
										
										if(isNaN(monthpercent)){ monthpercent = 0; }
										if(isNaN(yearpercent)){ yearpercent = 0; }
										
										acDetail['ac']['cement_vol_switching_month_percent'] = monthpercent;
										acDetail['ac']['cement_vol_switching_year_percent'] = yearpercent;
										
										
										acDetail['ac']["new_switching_hpb_target_month"] = acDetail['ac']["new_switching_hpb_target_month"] +  acDetail['tlh'][j]['new_switching_hpb_target_month'];
										acDetail['ac']["new_switching_hpb_achieved_month"] = acDetail['ac']["new_switching_hpb_achieved_month"] +  acDetail['tlh'][j]['new_switching_hpb_achieved_month'];
										acDetail['ac']["new_switching_hpb_target_year"] = acDetail['ac']["new_switching_hpb_target_year"] +  acDetail['tlh'][j]['new_switching_hpb_target_year'];
										acDetail['ac']["new_switching_hpb_achieved_year"] = acDetail['ac']["new_switching_hpb_achieved_year"] +  acDetail['tlh'][j]['new_switching_hpb_achieved_year'];
										
										var monthpercent = Math.round((acDetail['ac']['new_switching_hpb_achieved_month']*100)/(acDetail['ac']['new_switching_hpb_target_month']));
										var yearpercent = Math.round((acDetail['ac']['new_switching_hpb_achieved_year']*100)/(acDetail['ac']['new_switching_hpb_target_year']));
										
										if(isNaN(monthpercent)){ monthpercent = 0; }
										if(isNaN(yearpercent)){ yearpercent = 0; }
										
										acDetail['ac']['new_switching_hpb_month_percent'] = monthpercent;
										acDetail['ac']['new_switching_hpb_year_percent'] = yearpercent;
										
										acDetail['ac']["srku_house_num_target_month"] = acDetail['ac']["srku_house_num_target_month"] +  acDetail['tlh'][j]['srku_house_num_target_month'];
										acDetail['ac']["srku_house_num_achieved_month"] = acDetail['ac']["srku_house_num_achieved_month"] +  acDetail['tlh'][j]['srku_house_num_achieved_month'];
										acDetail['ac']["srku_house_num_target_year"] = acDetail['ac']["srku_house_num_target_year"] +  acDetail['tlh'][j]['srku_house_num_target_year'];
										acDetail['ac']["srku_house_num_achieved_year"] = acDetail['ac']["srku_house_num_achieved_year"] + acDetail['tlh'][j]['srku_house_num_achieved_year'];
										
										var monthpercent = Math.round((acDetail['ac']['srku_house_num_achieved_month']*100)/(acDetail['ac']['srku_house_num_target_month']));
										var yearpercent = Math.round((acDetail['ac']['srku_house_num_achieved_year']*100)/(acDetail['ac']['srku_house_num_target_year']));
										
										if(isNaN(monthpercent)){ monthpercent = 0; }
										if(isNaN(yearpercent)){ yearpercent = 0; }
										
										acDetail['ac']['srku_house_num_month_percent'] = monthpercent;
										acDetail['ac']['srku_house_num_year_percent'] = yearpercent;
									}
									
									// all the data for tlh under this ac is calculated
									for(var i=0; i<month; i++){
										for(var j=0; j<tlhLength; j++){									
											
										}
										if(i+1 == month){
											acCallback();
										}
									}
									
								})
								
							});
							
						});
						
					},
					(err)=>{
						for(var ac=0; ac<acData.length; ac++){
							// add AC's record first
							worksheet.addRow(acData[ac]['ac']);
							var rowNo = worksheet.lastRow;
							//expect(worksheet.getRow(rowNo).collapsed).to.equal(false);
									
							var srkuMonthData = parseInt(acData[ac]['ac']['srku_vol_month_percent']);
							var srkuYearData = parseInt(acData[ac]['ac']['srku_vol_year_percent']);
							if(srkuMonthData < monthTimeFactor){
								rowNo.getCell('F').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FFFF0000' }
								};
							}else{
								rowNo.getCell('F').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FF00FF00' }
								};
							}
							
							if(srkuYearData < yearTimeFactor){
								rowNo.getCell('I').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FFFF0000' }
								};
							}else{
								rowNo.getCell('I').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FF00FF00' }
								};
							}
							
							var maintainMonthData = parseInt(acData[ac]['ac']['cement_vol_maintain_month_percent']);
							var maintainYearData = parseInt(acData[ac]['ac']['cement_vol_maintain_year_percent']);
							if(maintainMonthData < monthTimeFactor){
								rowNo.getCell('L').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FFFF0000' }
								};
							}else{
								rowNo.getCell('L').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FF00FF00' }
								};
							}
							
							if(maintainYearData < yearTimeFactor){
								rowNo.getCell('O').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FFFF0000' }
								};
							}else{
								rowNo.getCell('O').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FF00FF00' }
								};
							}
							
							var switchingMonthData = parseInt(acData[ac]['ac']['cement_vol_switching_month_percent']);
							var switchingYearData = parseInt(acData[ac]['ac']['cement_vol_switching_year_percent']);
							if(switchingMonthData < monthTimeFactor){
								rowNo.getCell('R').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FFFF0000' }
								};
							}else{
								rowNo.getCell('R').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FF00FF00' }
								};
							}
							
							if(switchingYearData < yearTimeFactor){
								rowNo.getCell('U').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FFFF0000' }
								};
							}else{
								rowNo.getCell('U').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FF00FF00' }
								};
							}
							
							var hpbMonthData = parseInt(acData[ac]['ac']['new_switching_hpb_month_percent']);
							var hpbYearData = parseInt(acData[ac]['ac']['new_switching_hpb_year_percent']);
							if(hpbMonthData < monthTimeFactor){
								rowNo.getCell('X').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FFFF0000' }
								};
							}else{
								rowNo.getCell('X').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FF00FF00' }
								};
							}
							
							if(hpbYearData < yearTimeFactor){
								rowNo.getCell('AA').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FFFF0000' }
								};
							}else{
								rowNo.getCell('AA').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FF00FF00' }
								};
							}
							
							var houseMonthData = parseInt(acData[ac]['ac']['srku_house_num_month_percent']);
							var houseYearData = parseInt(acData[ac]['ac']['srku_house_num_year_percent']);
							if(houseMonthData < monthTimeFactor){
								rowNo.getCell('AD').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FFFF0000' }
								};
							}else{
								rowNo.getCell('AD').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FF00FF00' }
								};
							}
							
							if(houseYearData < yearTimeFactor){
								rowNo.getCell('AG').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FFFF0000' }
								};
							}else{
								rowNo.getCell('AG').fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FF00FF00' }
								};
							}
							
							
							// once you have added AC's row, add TLH
							var tlhLength = (acData[ac]['tlh']).length;
							if(tlhLength == 0){
								worksheet.addRow();
							}
							
							for(var tlhCount=0; tlhCount<tlhLength; tlhCount++){									
								
								worksheet.addRow(acData[ac]['tlh'][tlhCount]);
								var rowNo = worksheet.lastRow;
								//expect(worksheet.getRow(rowNo).collapsed).to.equal(false);
									
								var srkuMonthData = parseInt(acData[ac]['tlh'][tlhCount]['srku_vol_month_percent']);
								var srkuYearData = parseInt(acData[ac]['tlh'][tlhCount]['srku_vol_year_percent']);
								if(srkuMonthData < monthTimeFactor){
									rowNo.getCell('F').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FFFF0000' }
									};
								}else{
									rowNo.getCell('F').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FF00FF00' }
									};
								}
								
								if(srkuYearData < yearTimeFactor){
									rowNo.getCell('I').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FFFF0000' }
									};
								}else{
									rowNo.getCell('I').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FF00FF00' }
									};
								}
								
								var maintainMonthData = parseInt(acData[ac]['tlh'][tlhCount]['cement_vol_maintain_month_percent']);
								var maintainYearData = parseInt(acData[ac]['tlh'][tlhCount]['cement_vol_maintain_year_percent']);
								if(maintainMonthData < monthTimeFactor){
									rowNo.getCell('L').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FFFF0000' }
									};
								}else{
									rowNo.getCell('L').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FF00FF00' }
									};
								}
								
								if(maintainYearData < yearTimeFactor){
									rowNo.getCell('O').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FFFF0000' }
									};
								}else{
									rowNo.getCell('O').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FF00FF00' }
									};
								}
								
								var switchingMonthData = parseInt(acData[ac]['tlh'][tlhCount]['cement_vol_switching_month_percent']);
								var switchingYearData = parseInt(acData[ac]['tlh'][tlhCount]['cement_vol_switching_year_percent']);
								if(switchingMonthData < monthTimeFactor){
									rowNo.getCell('R').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FFFF0000' }
									};
								}else{
									rowNo.getCell('R').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FF00FF00' }
									};
								}
								
								if(switchingYearData < yearTimeFactor){
									rowNo.getCell('U').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FFFF0000' }
									};
								}else{
									rowNo.getCell('U').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FF00FF00' }
									};
								}
								
								var hpbMonthData = parseInt(acData[ac]['tlh'][tlhCount]['new_switching_hpb_month_percent']);
								var hpbYearData = parseInt(acData[ac]['tlh'][tlhCount]['new_switching_hpb_year_percent']);
								if(hpbMonthData < monthTimeFactor){
									rowNo.getCell('X').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FFFF0000' }
									};
								}else{
									rowNo.getCell('X').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FF00FF00' }
									};
								}
								
								if(hpbYearData < yearTimeFactor){
									rowNo.getCell('AA').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FFFF0000' }
									};
								}else{
									rowNo.getCell('AA').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FF00FF00' }
									};
								}
								
								var houseMonthData = parseInt(acData[ac]['tlh'][tlhCount]['srku_house_num_month_percent']);
								var houseYearData = parseInt(acData[ac]['tlh'][tlhCount]['srku_house_num_year_percent']);
								if(houseMonthData < monthTimeFactor){
									rowNo.getCell('AD').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FFFF0000' }
									};
								}else{
									rowNo.getCell('AD').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FF00FF00' }
									};
								}
								
								if(houseYearData < yearTimeFactor){
									rowNo.getCell('AG').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FFFF0000' }
									};
								}else{
									rowNo.getCell('AG').fill = {
										type: 'pattern',
										pattern: 'solid',
										fgColor: { argb: 'FF00FF00' }
									};
								}
								
								// once you have added TLH's row, add SPH
								var sphLength = (acData[ac]['tlh'][tlhCount]['sphCount']).length;
								var sphData = acData[ac]['tlh'][tlhCount]['sphCount'];
								if(sphLength == 0){
									worksheet.addRow();
								}
								
								for(var sphCount=0; sphCount<sphLength; sphCount++){
									
									worksheet.addRow(acData[ac]['tlh'][tlhCount]['sph'][sphData[sphCount]]);
									
									var rowNo = worksheet.lastRow;
									//expect(worksheet.getRow(rowNo).collapsed).to.equal(false);
									
									var srkuMonthData = parseInt(acData[ac]['tlh'][tlhCount]['sph'][sphData[sphCount]]['srku_vol_month_percent']);
									var srkuYearData = parseInt(acData[ac]['tlh'][tlhCount]['sph'][sphData[sphCount]]['srku_vol_year_percent']);
									if(srkuMonthData < monthTimeFactor){
										rowNo.getCell('F').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FFFF0000' }
										};
									}else{
										rowNo.getCell('F').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FF00FF00' }
										};
									}
									
									if(srkuYearData < yearTimeFactor){
										rowNo.getCell('I').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FFFF0000' }
										};
									}else{
										rowNo.getCell('I').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FF00FF00' }
										};
									}
									
									var maintainMonthData = parseInt(acData[ac]['tlh'][tlhCount]['sph'][sphData[sphCount]]['cement_vol_maintain_month_percent']);
									var maintainYearData = parseInt(acData[ac]['tlh'][tlhCount]['sph'][sphData[sphCount]]['cement_vol_maintain_year_percent']);
									if(maintainMonthData < monthTimeFactor){
										rowNo.getCell('L').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FFFF0000' }
										};
									}else{
										rowNo.getCell('L').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FF00FF00' }
										};
									}
									
									if(maintainYearData < yearTimeFactor){
										rowNo.getCell('O').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FFFF0000' }
										};
									}else{
										rowNo.getCell('O').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FF00FF00' }
										};
									}
									
									var switchingMonthData = parseInt(acData[ac]['tlh'][tlhCount]['sph'][sphData[sphCount]]['cement_vol_switching_month_percent']);
									var switchingYearData = parseInt(acData[ac]['tlh'][tlhCount]['sph'][sphData[sphCount]]['cement_vol_switching_year_percent']);
									if(switchingMonthData < monthTimeFactor){
										rowNo.getCell('R').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FFFF0000' }
										};
									}else{
										rowNo.getCell('R').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FF00FF00' }
										};
									}
									
									if(switchingYearData < yearTimeFactor){
										rowNo.getCell('U').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FFFF0000' }
										};
									}else{
										rowNo.getCell('U').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FF00FF00' }
										};
									}
									
									var hpbMonthData = parseInt(acData[ac]['tlh'][tlhCount]['sph'][sphData[sphCount]]['new_switching_hpb_month_percent']);
									var hpbYearData = parseInt(acData[ac]['tlh'][tlhCount]['sph'][sphData[sphCount]]['new_switching_hpb_year_percent']);
									if(hpbMonthData < monthTimeFactor){
										rowNo.getCell('X').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FFFF0000' }
										};
									}else{
										rowNo.getCell('X').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FF00FF00' }
										};
									}
									
									if(hpbYearData < yearTimeFactor){
										rowNo.getCell('AA').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FFFF0000' }
										};
									}else{
										rowNo.getCell('AA').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FF00FF00' }
										};
									}
									
									var houseMonthData = parseInt(acData[ac]['tlh'][tlhCount]['sph'][sphData[sphCount]]['srku_house_num_month_percent']);
									var houseYearData = parseInt(acData[ac]['tlh'][tlhCount]['sph'][sphData[sphCount]]['srku_house_num_year_percent']);
									if(houseMonthData < monthTimeFactor){
										rowNo.getCell('AD').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FFFF0000' }
										};
									}else{
										rowNo.getCell('AD').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FF00FF00' }
										};
									}
									
									if(houseYearData < yearTimeFactor){
										rowNo.getCell('AG').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FFFF0000' }
										};
									}else{
										rowNo.getCell('AG').fill = {
											type: 'pattern',
											pattern: 'solid',
											fgColor: { argb: 'FF00FF00' }
										};
									}
									
									
									if(sphCount+1 == sphLength){
										worksheet.addRow();
									}
								}
							}
						}
						
						
						var tempFilePath = tempfile('.xlsx');
						var date = new Date();
						var filename = "ac-summary-"+date.getDate()+"-"+(date.getMonth()+1)+"-"+date.getFullYear()+"-"+date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds()+".xlsx";
						workbook.xlsx.writeFile("storage/report/"+filename).then(function() {
							var resultObj = [{"serverPath":"api/container/report/download/"+filename}];
							cb(null,resultObj);
						});
					});
					// End of async loop of AC data
					
				});
		});
	};
	
	Usermapping.remoteMethod('getScorecardSummary',{
		http:{ path:'/getScorecardSummary', verb:'' },
		accepts:[
				{arg: 'target_for', type: 'string', 'http': {source: 'query'}},
				{arg: 'res', type: 'object', 'http': {source: 'res'}},
				{arg: 'rolename', type: 'string', 'http': {source: 'query'}},
				{arg: 'user_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'ac_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'district_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'month', type: 'number', 'http': {source: 'query'}},
				{arg: 'year', type: 'number', 'http': {source: 'query'}}
		],
		returns:{ arg:'result', type:'object' }
	});

	Usermapping.getScorecardSummaryWebView = function(rolename,user_id,ac_id,district_id,month,year,cb){
		
		var date = new Date();
		var currentMonth = (date.getMonth())+1;
		var currentYear = date.getFullYear();
		
		if(!month){
			month = currentMonth;
		}

		if(!year){
			year = currentYear;
		}
		
		// var actualDate = date.getDate();
		// if(month != currentMonth){
			// var date = new Date(year+"-"+month+"-01");
			// var todayDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
			// todayDate = todayDate.getDate();
		// }else{
			// var todayDate = date.getDate();
		// }
		var actualDate = date.getDate();
		var date = new Date(year+"-"+month+"-01");
		var todayDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
		todayDate = todayDate.getDate();
		
		var total = (new Date(year, todayDate, 0).getDate());
		var monthTimeFactor = Math.round((todayDate/total)*100);
		
		var totalDays = todayDate;
		for(var i=1; i<month; i++){
			totalDays = totalDays + (new Date(year, i, 0).getDate());
		}
		
		var totalDaysYear = 0;
		if(year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)){
			totalDaysYear = 366;
		}else{
			totalDaysYear = 365;
		}
		
		var yearTimeFactor = Math.round((totalDays/totalDaysYear)*100);
		
		var report = [];
		var timeFactorRow = [];
		var acArr = [];
		if(rolename == "$ra" && user_id > 0){
			// get all AC data
			var getAllAc = "SELECT um.uid, um.meta_value, u.id, u.realm, d.name as district, d.id as dId FROM [USER] u JOIN Rolemapping rm ON u.id = rm.principalId JOIN user_mapping um ON rm.principalId = um.uid  AND um.meta_key = 'district_id' AND um.meta_value IN ( select d.id from [User] u join user_mapping um on u.id = um.uid join region r on um.meta_value = r.id and um.meta_key = 'region_id' and um.uid = (?) join province p on p.region_id = r.id join district d on d.province_id = p.id ) JOIN Role r ON rm.roleId = r.id AND r.name = '$ac' JOIN district d ON d.id = um.meta_value WHERE 1=1 ";
			acArr.push(user_id);
		}else{
			// get all AC data
			var getAllAc = "SELECT distinct um.uid, um.meta_value, u.id, u.realm, d.name as district, d.id as dId FROM [USER] u JOIN Rolemapping rm ON u.id = rm.principalId JOIN user_mapping um ON rm.principalId = um.uid  AND um.meta_key = 'district_id' JOIN Role r ON rm.roleId = r.id AND r.name = '$ac' JOIN district d ON d.id = um.meta_value WHERE 1=1 ";
		}
		if(ac_id > 0){
			getAllAc+=" AND um.uid = (?) ";
			acArr.push(ac_id);
		}
		if(district_id > 0){
			getAllAc+=" AND um.meta_value = (?) ";
			acArr.push(district_id);
		}
		getAllAc+=" ORDER BY um.uid";
		
		var getSPH = "select u.realm, sr.target_label, sr.target_month, sr.monthly_target, sr.achieved_target, sr.sph_id, sr.subdistrict from monthly_scorecard_reports sr join [User] u on sr.sph_id = u.id and u.status = 1 where sr.target_year = (?) and sr.target_month <= (?) order by sr.target_month";
		
		Usermapping.app.dbConnection.execute(getSPH,[year,month],(err,sphData)=>{
				
				Usermapping.app.dbConnection.execute(getAllAc,acArr,(err,acData)=>{	
				
					var acArr = [];
					async.each(acData, function(ac, callback) {
						if(acArr.indexOf(ac.uid) < 0){
							acArr.push(ac.uid);
						}
						callback();
					},
					(err)=>{
						timeFactorRow.push({"date":todayDate,"month":month,"totalAC":(acArr.length),"monthFactor":monthTimeFactor,"yearFactor":yearTimeFactor});
					});
					
					async.forEachOf(acData, function(acDetail, acKey, acCallback){
					
						var acMonthlyTarget = [];
						var acMonthlyAchieved = [];
						var acMonthlyEstimated = [];
						
						acDetail['ac'] = {};
						acDetail['ac']["name"] = acDetail.realm;
						acDetail['ac']["role"] = "AC";
						acDetail['ac']["district"] = "";
						
						// foreach AC -> district, get its TLH
						var getTLHDistrict = "select distinct u.id, u.realm, sd.id as subId, m.name as city from [User] u join user_mapping um on u.id = um.uid  and um.meta_key = 'subdistrict_id'  join subdistrict sd on um.meta_value = sd.id join municipality m on m.id = sd.municipality_id and m.district_id = (?) order by u.id ";
						Usermapping.app.dbConnection.execute(getTLHDistrict,[acDetail.meta_value],(err,tlhData)=>{
							
							var userId = 0;
							var user = {};
							var resultTlh = [];
							var subDistrictArr = [];
							async.forEachOf(tlhData, function(json, tlhKey, jsonCallback){
								
								if(userId!=json.id){
									
									if(Object.keys(user).length){
										resultTlh.push(user);
									}
									userId = json.id;
									subDistrictArr = [];
									user = {};
									user['id'] = "";
									user['realm'] = "";
									user['subdistrict'] = [];
									user['subdistrictNo'] = "";
									user['cityName'] = [];
								}
								
								user['id'] = json.id;
								user['realm'] = json.realm;
								if(subDistrictArr.indexOf(json.subId) < 0){
									subDistrictArr.push(json.subId);
									user['subdistrict'] = subDistrictArr;
									user['subdistrictNo'] = user['subdistrictNo'] + '(?),';
								}
								if((user['cityName']).indexOf(json.city) < 0){
									user['cityName'].push(json.city);
								}
								jsonCallback();
							},
							(err)=>{
								resultTlh.push(user);
								acDetail['tlh'] = [];						
								
								async.forEachOf(resultTlh, function(tlhDetail, tlhKey, tlhCallback){
									acDetail['tlh'][tlhKey] = {};
									acDetail['tlh'][tlhKey]['name'] = tlhDetail.realm;
									acDetail['tlh'][tlhKey]['role'] = 'TLH';
									acDetail['tlh'][tlhKey]['district'] = acDetail.district;
									acDetail['tlh'][tlhKey]['target'] = 0;
									acDetail['tlh'][tlhKey]['achieved'] = 0;
									acDetail['tlh'][tlhKey]['sphCount'] = [];
									acDetail['tlh'][tlhKey]['sph'] = [];
									var statKey = 0;
									var sphId = 0;
									var sphIdArr = [];
									var tlhMonthlyTarget = [];
									var tlhMonthlyAchieved = [];
									var tlhMonthlyEstimated = [];
									
									if(tlhDetail.subdistrict){
										var sphArr = tlhDetail.subdistrict;
									}else{
										var sphArr = [];
									}
									var sphIdArr = [];
									
									if(tlhDetail.subdistrictNo){
										tlhDetail.subdistrictNo = (tlhDetail.subdistrictNo).replace(/(^,)|(,$)/g, "");
									}
									
									
									async.forEachOf(sphData, function(stats, statKey, statCallback){
												
										function checkExists(subId){
											if(subId && stats.subdistrict){
												if((stats.subdistrict).indexOf("<subdistrict>"+subId+"</subdistrict>") >= 0){ 
													return subId; 
												}
											}
										}
										var subDistrictMatches = sphArr.filter(checkExists);
										
										if(subDistrictMatches.length > 0){
											sphId = stats.sph_id;
											
											if(sphIdArr.indexOf(stats.sph_id) < 0){
												acDetail['tlh'][tlhKey]['sph'][sphId] = {};
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_vol_target_month"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_vol_achieved_month"] = 0;
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_vol_month_percent"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_vol_target_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_vol_achieved_year"] = 0;
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_vol_year_percent"] = 0; 
												
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_maintain_target_month"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_maintain_achieved_month"] = 0;
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_maintain_month_percent"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_maintain_target_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_maintain_achieved_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_maintain_year_percent"] = 0; 
												
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_switching_target_month"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_switching_achieved_month"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_switching_month_percent"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_switching_target_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_switching_achieved_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["cement_vol_switching_year_percent"] = 0; 
												
												acDetail['tlh'][tlhKey]['sph'][sphId]["new_switching_hpb_target_month"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["new_switching_hpb_achieved_month"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["new_switching_hpb_month_percent"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["new_switching_hpb_target_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["new_switching_hpb_achieved_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["new_switching_hpb_year_percent"] = 0; 
												
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_house_num_target_month"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_house_num_achieved_month"] = 0;
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_house_num_month_percent"] = 0; 										
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_house_num_target_year"] = 0; 
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_house_num_achieved_year"] = 0;
												acDetail['tlh'][tlhKey]['sph'][sphId]["srku_house_num_year_percent"] = 0;
											}
											
											// sph stats for each target label
											var target_label = stats.target_label;
											acDetail['tlh'][tlhKey]['sph'][sphId]['name'] = stats.realm;
											acDetail['tlh'][tlhKey]['sph'][sphId]['role'] = 'SPH';
											acDetail['tlh'][tlhKey]['sph'][sphId]['district'] = (tlhDetail.cityName).join(",");
											
											if(target_label == "srku_vol"){
												if(stats['target_month'] == month){
													acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_target_month'] = stats['monthly_target'];
													acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_achieved_month'] = stats['achieved_target'];
													
													var monthpercent = Math.round((stats['achieved_target']*100)/(stats['monthly_target']));
													if(isNaN(monthpercent)){ monthpercent = 0; }
													acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_month_percent'] = monthpercent;
												}
												
												acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_target_year']+=stats['monthly_target'];
												acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_achieved_year']+= stats['achieved_target'];
												
												var yearpercent = Math.round((acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_achieved_year']*100)/(acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_target_year']));
												if(isNaN(yearpercent)){ yearpercent = 0; }
												acDetail['tlh'][tlhKey]['sph'][sphId]['srku_vol_year_percent'] = yearpercent;
											}
											else if(target_label == "cement_vol_maintain"){
												if(stats['target_month'] == month){
													acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_target_month'] = stats['monthly_target'];
													acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_achieved_month'] = stats['achieved_target'];
													
													var monthpercent = Math.round((stats['achieved_target']*100)/(stats['monthly_target']));
													if(isNaN(monthpercent)){ monthpercent = 0; }
													acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_month_percent'] = monthpercent;
												}
												acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_target_year']+= stats['monthly_target'];
												acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_achieved_year']+= stats['achieved_target'];
												
												var yearpercent = Math.round((acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_achieved_year']*100)/(acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_target_year']));
												if(isNaN(yearpercent)){ yearpercent = 0; }
												acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_maintain_year_percent'] = yearpercent;
												
											}
											else if(target_label == "cement_vol_switching"){
												if(stats['target_month'] == month){
													acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_target_month'] = stats['monthly_target'];
													acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_achieved_month'] = stats['achieved_target'];
													
													var monthpercent = Math.round((stats['achieved_target']*100)/(stats['monthly_target']));
													if(isNaN(monthpercent)){ monthpercent = 0; }
													acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_month_percent'] = monthpercent;
												}
												acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_target_year']+= stats['monthly_target'];
												acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_achieved_year']+= stats['achieved_target'];
												
												var yearpercent = Math.round((acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_achieved_year']*100)/(acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_target_year']));
												if(isNaN(yearpercent)){ yearpercent = 0; }
												acDetail['tlh'][tlhKey]['sph'][sphId]['cement_vol_switching_year_percent'] = yearpercent;
											}
											else if(target_label == "srku_house_num"){
												if(stats['target_month'] == month){
													acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_target_month'] = stats['monthly_target'];
													acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_achieved_month'] = stats['achieved_target'];
													
													var monthpercent = Math.round((stats['achieved_target']*100)/(stats['monthly_target']));
													if(isNaN(monthpercent)){ monthpercent = 0; }
													acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_month_percent'] = monthpercent;
												}
												acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_target_year']+= stats['monthly_target'];
												acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_achieved_year']+= stats['achieved_target'];
												
												var yearpercent = Math.round((acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_achieved_year']*100)/(acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_target_year']));
												if(isNaN(yearpercent)){ yearpercent = 0; }
												acDetail['tlh'][tlhKey]['sph'][sphId]['srku_house_num_year_percent'] = yearpercent;
											}
											else if(target_label == "new_switching_hpb"){
												if(stats['target_month'] == month){
													acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_target_month'] = stats['monthly_target'];
													acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_achieved_month'] = stats['achieved_target'];
													
													var monthpercent = Math.round((stats['achieved_target']*100)/(stats['monthly_target']));
													if(isNaN(monthpercent)){ monthpercent = 0; }
													acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_month_percent'] = monthpercent;
												}
												acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_target_year']+= stats['monthly_target'];
												acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_achieved_year']+= stats['achieved_target'];
												
												var yearpercent = Math.round((acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_achieved_year']*100)/(acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_target_year']));
												if(isNaN(yearpercent)){ yearpercent = 0; }
												acDetail['tlh'][tlhKey]['sph'][sphId]['new_switching_hpb_year_percent'] = yearpercent;
											}
											if(sphIdArr.indexOf(stats.sph_id) < 0){
												sphIdArr.push(stats.sph_id);
											}
											acDetail['tlh'][tlhKey]['sphCount'] = sphIdArr;
										}
										statCallback();				
									},
									(err)=>{
										// all the data for sph for this tlh is calculated
										var sphIdArr = acDetail['tlh'][tlhKey]['sphCount'];
										var sphLength = sphIdArr.length;
												
										acDetail['tlh'][tlhKey]["srku_vol_target_month"] = 0; 
										acDetail['tlh'][tlhKey]["srku_vol_achieved_month"] = 0;
										acDetail['tlh'][tlhKey]["srku_vol_month_percent"] = 0; 
										acDetail['tlh'][tlhKey]["srku_vol_target_year"] = 0; 
										acDetail['tlh'][tlhKey]["srku_vol_achieved_year"] = 0;
										acDetail['tlh'][tlhKey]["srku_vol_year_percent"] = 0; 
										
										acDetail['tlh'][tlhKey]["cement_vol_maintain_target_month"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_maintain_achieved_month"] = 0;
										acDetail['tlh'][tlhKey]["cement_vol_maintain_month_percent"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_maintain_target_year"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_maintain_achieved_year"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_maintain_year_percent"] = 0; 
										
										acDetail['tlh'][tlhKey]["cement_vol_switching_target_month"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_switching_achieved_month"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_switching_month_percent"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_switching_target_year"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_switching_achieved_year"] = 0; 
										acDetail['tlh'][tlhKey]["cement_vol_switching_year_percent"] = 0; 
										
										acDetail['tlh'][tlhKey]["new_switching_hpb_target_month"] = 0; 
										acDetail['tlh'][tlhKey]["new_switching_hpb_achieved_month"] = 0; 
										acDetail['tlh'][tlhKey]["new_switching_hpb_month_percent"] = 0; 
										acDetail['tlh'][tlhKey]["new_switching_hpb_target_year"] = 0; 
										acDetail['tlh'][tlhKey]["new_switching_hpb_achieved_year"] = 0; 
										acDetail['tlh'][tlhKey]["new_switching_hpb_year_percent"] = 0; 
										
										acDetail['tlh'][tlhKey]["srku_house_num_target_month"] = 0; 
										acDetail['tlh'][tlhKey]["srku_house_num_achieved_month"] = 0;
										acDetail['tlh'][tlhKey]["srku_house_num_month_percent"] = 0; 										
										acDetail['tlh'][tlhKey]["srku_house_num_target_year"] = 0; 
										acDetail['tlh'][tlhKey]["srku_house_num_achieved_year"] = 0;
										acDetail['tlh'][tlhKey]["srku_house_num_year_percent"] = 0; 

										for(var j=0; j<sphLength; j++){				
											
											// srku achievement
											acDetail['tlh'][tlhKey]['srku_vol_target_month'] = acDetail['tlh'][tlhKey]['srku_vol_target_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_vol_target_month'];
											acDetail['tlh'][tlhKey]['srku_vol_achieved_month'] = acDetail['tlh'][tlhKey]['srku_vol_achieved_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_vol_achieved_month'];
											acDetail['tlh'][tlhKey]['srku_vol_target_year'] = acDetail['tlh'][tlhKey]['srku_vol_target_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_vol_target_year'];
											acDetail['tlh'][tlhKey]['srku_vol_achieved_year'] = acDetail['tlh'][tlhKey]['srku_vol_achieved_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_vol_achieved_year'];
											
											var monthpercent = Math.round((acDetail['tlh'][tlhKey]['srku_vol_achieved_month']*100)/(acDetail['tlh'][tlhKey]['srku_vol_target_month']));
											var yearpercent = Math.round((acDetail['tlh'][tlhKey]['srku_vol_achieved_year']*100)/(acDetail['tlh'][tlhKey]['srku_vol_target_year']));
											
											if(isNaN(monthpercent)){ monthpercent = 0; }
											if(isNaN(yearpercent)){ yearpercent = 0; }
											
											acDetail['tlh'][tlhKey]['srku_vol_month_percent'] = monthpercent;
											acDetail['tlh'][tlhKey]['srku_vol_year_percent'] = yearpercent;
													
											// cement volume maintain achievement
											acDetail['tlh'][tlhKey]['cement_vol_maintain_target_month'] = acDetail['tlh'][tlhKey]['cement_vol_maintain_target_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_maintain_target_month'];
											acDetail['tlh'][tlhKey]['cement_vol_maintain_achieved_month'] = acDetail['tlh'][tlhKey]['cement_vol_maintain_achieved_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_maintain_achieved_month'];
											acDetail['tlh'][tlhKey]['cement_vol_maintain_target_year'] = acDetail['tlh'][tlhKey]['cement_vol_maintain_target_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_maintain_target_year'];
											acDetail['tlh'][tlhKey]['cement_vol_maintain_achieved_year'] = acDetail['tlh'][tlhKey]['cement_vol_maintain_achieved_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_maintain_achieved_year'];
													
											var monthpercent = Math.round((acDetail['tlh'][tlhKey]['cement_vol_maintain_achieved_month']*100)/(acDetail['tlh'][tlhKey]['cement_vol_maintain_target_month']));
											var yearpercent = Math.round((acDetail['tlh'][tlhKey]['cement_vol_maintain_achieved_year']*100)/(acDetail['tlh'][tlhKey]['cement_vol_maintain_target_year']));
											
											if(isNaN(monthpercent)){ monthpercent = 0; }
											if(isNaN(yearpercent)){ yearpercent = 0; }
													
											acDetail['tlh'][tlhKey]['cement_vol_maintain_month_percent'] = monthpercent;
											acDetail['tlh'][tlhKey]['cement_vol_maintain_year_percent'] = yearpercent;
											
											// cement volume switching achievement
											acDetail['tlh'][tlhKey]['cement_vol_switching_target_month'] = acDetail['tlh'][tlhKey]['cement_vol_switching_target_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_switching_target_month'];
											acDetail['tlh'][tlhKey]['cement_vol_switching_achieved_month'] = acDetail['tlh'][tlhKey]['cement_vol_switching_achieved_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_switching_achieved_month'];
											acDetail['tlh'][tlhKey]['cement_vol_switching_target_year'] = acDetail['tlh'][tlhKey]['cement_vol_switching_target_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_switching_target_year'];
											acDetail['tlh'][tlhKey]['cement_vol_switching_achieved_year'] = acDetail['tlh'][tlhKey]['cement_vol_switching_achieved_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['cement_vol_switching_achieved_year'];
													
											var monthpercent = Math.round((acDetail['tlh'][tlhKey]['cement_vol_switching_achieved_month']*100)/(acDetail['tlh'][tlhKey]['cement_vol_switching_target_month']));
											var yearpercent = Math.round((acDetail['tlh'][tlhKey]['cement_vol_switching_achieved_year']*100)/(acDetail['tlh'][tlhKey]['cement_vol_switching_target_year']));
											
											if(isNaN(monthpercent)){ monthpercent = 0; }
											if(isNaN(yearpercent)){ yearpercent = 0; }
											
											acDetail['tlh'][tlhKey]['cement_vol_switching_month_percent'] = monthpercent;
											acDetail['tlh'][tlhKey]['cement_vol_switching_year_percent'] = yearpercent;
											
											// new member achievement
											acDetail['tlh'][tlhKey]['new_switching_hpb_target_month'] = acDetail['tlh'][tlhKey]['new_switching_hpb_target_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['new_switching_hpb_target_month'];
											acDetail['tlh'][tlhKey]['new_switching_hpb_achieved_month'] = acDetail['tlh'][tlhKey]['new_switching_hpb_achieved_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['new_switching_hpb_achieved_month'];
											acDetail['tlh'][tlhKey]['new_switching_hpb_target_year'] = acDetail['tlh'][tlhKey]['new_switching_hpb_target_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['new_switching_hpb_target_year'];
											acDetail['tlh'][tlhKey]['new_switching_hpb_achieved_year'] = acDetail['tlh'][tlhKey]['new_switching_hpb_achieved_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['new_switching_hpb_achieved_year'];
											
											var monthpercent = Math.round((acDetail['tlh'][tlhKey]['new_switching_hpb_achieved_month']*100)/(acDetail['tlh'][tlhKey]['new_switching_hpb_target_month']));
											var yearpercent = Math.round((acDetail['tlh'][tlhKey]['new_switching_hpb_achieved_year']*100)/(acDetail['tlh'][tlhKey]['new_switching_hpb_target_year']));
											
											if(isNaN(monthpercent)){ monthpercent = 0; }
											if(isNaN(yearpercent)){ yearpercent = 0; }
											
											acDetail['tlh'][tlhKey]['new_switching_hpb_month_percent'] = monthpercent;
											acDetail['tlh'][tlhKey]['new_switching_hpb_year_percent'] = yearpercent;
											
											// srku house num achievement
											acDetail['tlh'][tlhKey]['srku_house_num_target_month'] = acDetail['tlh'][tlhKey]['srku_house_num_target_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_house_num_target_month'];
											acDetail['tlh'][tlhKey]['srku_house_num_achieved_month'] = acDetail['tlh'][tlhKey]['srku_house_num_achieved_month'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_house_num_achieved_month'];
											acDetail['tlh'][tlhKey]['srku_house_num_target_year'] = acDetail['tlh'][tlhKey]['srku_house_num_target_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_house_num_target_year'];
											acDetail['tlh'][tlhKey]['srku_house_num_achieved_year'] = acDetail['tlh'][tlhKey]['srku_house_num_achieved_year'] + acDetail['tlh'][tlhKey]['sph'][sphIdArr[j]]['srku_house_num_achieved_year'];
											
											var monthpercent = Math.round((acDetail['tlh'][tlhKey]['srku_house_num_achieved_month']*100)/(acDetail['tlh'][tlhKey]['srku_house_num_target_month']));
											var yearpercent = Math.round((acDetail['tlh'][tlhKey]['srku_house_num_achieved_year']*100)/(acDetail['tlh'][tlhKey]['srku_house_num_target_year']));
											
											if(isNaN(monthpercent)){ monthpercent = 0; }
											if(isNaN(yearpercent)){ yearpercent = 0; }
											
											acDetail['tlh'][tlhKey]['srku_house_num_month_percent'] = monthpercent;
											acDetail['tlh'][tlhKey]['srku_house_num_year_percent'] = yearpercent;
													
										}
										tlhCallback();
									});
									
								},
								(err)=>{
									
									// all the tlh is over for this district
									acDetail['ac']["srku_vol_target_month"] = 0; 
									acDetail['ac']["srku_vol_achieved_month"] = 0; 
									acDetail['ac']["srku_vol_month_percent"] = 0; 
									acDetail['ac']["srku_vol_target_year"] = 0; 
									acDetail['ac']["srku_vol_achieved_year"] = 0; 
									acDetail['ac']["srku_vol_year_percent"] = 0; 
									
									acDetail['ac']["cement_vol_maintain_target_month"] = 0; 
									acDetail['ac']["cement_vol_maintain_achieved_month"] = 0; 
									acDetail['ac']["cement_vol_maintain_month_percent"] = 0; 
									acDetail['ac']["cement_vol_maintain_target_year"] = 0; 
									acDetail['ac']["cement_vol_maintain_achieved_year"] = 0; 
									acDetail['ac']["cement_vol_maintain_year_percent"] = 0; 
									
									acDetail['ac']["cement_vol_switching_target_month"] = 0; 
									acDetail['ac']["cement_vol_switching_achieved_month"] = 0; 
									acDetail['ac']["cement_vol_switching_month_percent"] = 0; 
									acDetail['ac']["cement_vol_switching_target_year"] = 0; 
									acDetail['ac']["cement_vol_switching_achieved_year"] = 0; 
									acDetail['ac']["cement_vol_switching_year_percent"] = 0; 
									
									acDetail['ac']["new_switching_hpb_target_month"] = 0; 
									acDetail['ac']["new_switching_hpb_achieved_month"] = 0; 
									acDetail['ac']["new_switching_hpb_month_percent"] = 0; 
									acDetail['ac']["new_switching_hpb_target_year"] = 0; 
									acDetail['ac']["new_switching_hpb_achieved_year"] = 0; 
									acDetail['ac']["new_switching_hpb_year_percent"] = 0; 
									
									acDetail['ac']["srku_house_num_target_month"] = 0; 
									acDetail['ac']["srku_house_num_achieved_month"] = 0; 
									acDetail['ac']["srku_house_num_month_percent"] = 0; 
									acDetail['ac']["srku_house_num_target_year"] = 0; 
									acDetail['ac']["srku_house_num_achieved_year"] = 0;
									acDetail['ac']["srku_house_num_year_percent"] = 0; 
									
									var tlhLength = (acDetail['tlh']).length;
									for(var j=0; j<tlhLength; j++){
										acDetail['ac']["srku_vol_target_month"] = acDetail['ac']["srku_vol_target_month"] +  acDetail['tlh'][j]['srku_vol_target_month'];
										acDetail['ac']["srku_vol_achieved_month"] = acDetail['ac']["srku_vol_achieved_month"] +  acDetail['tlh'][j]['srku_vol_achieved_month'];
										acDetail['ac']["srku_vol_target_year"] = acDetail['ac']["srku_vol_target_year"] +  acDetail['tlh'][j]['srku_vol_target_year'];
										acDetail['ac']["srku_vol_achieved_year"] = acDetail['ac']["srku_vol_achieved_year"] +  acDetail['tlh'][j]['srku_vol_achieved_year'];
										
										var monthpercent = Math.round((acDetail['ac']['srku_vol_achieved_month']*100)/(acDetail['ac']['srku_vol_target_month']));
										var yearpercent = Math.round((acDetail['ac']['srku_vol_achieved_year']*100)/(acDetail['ac']['srku_vol_target_year']));
										
										if(isNaN(monthpercent)){ monthpercent = 0; }
										if(isNaN(yearpercent)){ yearpercent = 0; }
										
										acDetail['ac']['srku_vol_month_percent'] = monthpercent;
										acDetail['ac']['srku_vol_year_percent'] = yearpercent;
										
										
										acDetail['ac']["cement_vol_maintain_target_month"] = acDetail['ac']["cement_vol_maintain_target_month"] +  acDetail['tlh'][j]['cement_vol_maintain_target_month'];
										acDetail['ac']["cement_vol_maintain_achieved_month"] = acDetail['ac']["cement_vol_maintain_achieved_month"] +  acDetail['tlh'][j]['cement_vol_maintain_achieved_month'];
										acDetail['ac']["cement_vol_maintain_target_year"] = acDetail['ac']["cement_vol_maintain_target_year"] +  acDetail['tlh'][j]['cement_vol_maintain_target_year'];
										acDetail['ac']["cement_vol_maintain_achieved_year"] = acDetail['ac']["cement_vol_maintain_achieved_year"] +  acDetail['tlh'][j]['cement_vol_maintain_achieved_year'];
										
										var monthpercent = Math.round((acDetail['ac']['cement_vol_maintain_achieved_month']*100)/(acDetail['ac']['cement_vol_maintain_target_month']));
										var yearpercent = Math.round((acDetail['ac']['cement_vol_maintain_achieved_year']*100)/(acDetail['ac']['cement_vol_maintain_target_year']));
										
										if(isNaN(monthpercent)){ monthpercent = 0; }
										if(isNaN(yearpercent)){ yearpercent = 0; }
										
										acDetail['ac']['cement_vol_maintain_month_percent'] = monthpercent;
										acDetail['ac']['cement_vol_maintain_year_percent'] = yearpercent;
										
										acDetail['ac']["cement_vol_switching_target_month"] = acDetail['ac']["cement_vol_switching_target_month"] +  acDetail['tlh'][j]['cement_vol_switching_target_month'];
										acDetail['ac']["cement_vol_switching_achieved_month"] = acDetail['ac']["cement_vol_switching_achieved_month"] +  acDetail['tlh'][j]['cement_vol_switching_achieved_month'];
										acDetail['ac']["cement_vol_switching_target_year"] = acDetail['ac']["cement_vol_switching_target_year"] +  acDetail['tlh'][j]['cement_vol_switching_target_year'];
										acDetail['ac']["cement_vol_switching_achieved_year"] = acDetail['ac']["cement_vol_switching_achieved_year"] +  acDetail['tlh'][j]['cement_vol_switching_achieved_year'];
										
										var monthpercent = Math.round((acDetail['ac']['cement_vol_switching_achieved_month']*100)/(acDetail['ac']['cement_vol_switching_target_month']));
										var yearpercent = Math.round((acDetail['ac']['cement_vol_switching_achieved_year']*100)/(acDetail['ac']['cement_vol_switching_target_year']));
										
										if(isNaN(monthpercent)){ monthpercent = 0; }
										if(isNaN(yearpercent)){ yearpercent = 0; }
										
										acDetail['ac']['cement_vol_switching_month_percent'] = monthpercent;
										acDetail['ac']['cement_vol_switching_year_percent'] = yearpercent;
										
										
										acDetail['ac']["new_switching_hpb_target_month"] = acDetail['ac']["new_switching_hpb_target_month"] +  acDetail['tlh'][j]['new_switching_hpb_target_month'];
										acDetail['ac']["new_switching_hpb_achieved_month"] = acDetail['ac']["new_switching_hpb_achieved_month"] +  acDetail['tlh'][j]['new_switching_hpb_achieved_month'];
										acDetail['ac']["new_switching_hpb_target_year"] = acDetail['ac']["new_switching_hpb_target_year"] +  acDetail['tlh'][j]['new_switching_hpb_target_year'];
										acDetail['ac']["new_switching_hpb_achieved_year"] = acDetail['ac']["new_switching_hpb_achieved_year"] +  acDetail['tlh'][j]['new_switching_hpb_achieved_year'];
										
										var monthpercent = Math.round((acDetail['ac']['new_switching_hpb_achieved_month']*100)/(acDetail['ac']['new_switching_hpb_target_month']));
										var yearpercent = Math.round((acDetail['ac']['new_switching_hpb_achieved_year']*100)/(acDetail['ac']['new_switching_hpb_target_year']));
										
										if(isNaN(monthpercent)){ monthpercent = 0; }
										if(isNaN(yearpercent)){ yearpercent = 0; }
										
										acDetail['ac']['new_switching_hpb_month_percent'] = monthpercent;
										acDetail['ac']['new_switching_hpb_year_percent'] = yearpercent;
										
										acDetail['ac']["srku_house_num_target_month"] = acDetail['ac']["srku_house_num_target_month"] +  acDetail['tlh'][j]['srku_house_num_target_month'];
										acDetail['ac']["srku_house_num_achieved_month"] = acDetail['ac']["srku_house_num_achieved_month"] +  acDetail['tlh'][j]['srku_house_num_achieved_month'];
										acDetail['ac']["srku_house_num_target_year"] = acDetail['ac']["srku_house_num_target_year"] +  acDetail['tlh'][j]['srku_house_num_target_year'];
										acDetail['ac']["srku_house_num_achieved_year"] = acDetail['ac']["srku_house_num_achieved_year"] + acDetail['tlh'][j]['srku_house_num_achieved_year'];
										
										var monthpercent = Math.round((acDetail['ac']['srku_house_num_achieved_month']*100)/(acDetail['ac']['srku_house_num_target_month']));
										var yearpercent = Math.round((acDetail['ac']['srku_house_num_achieved_year']*100)/(acDetail['ac']['srku_house_num_target_year']));
										
										if(isNaN(monthpercent)){ monthpercent = 0; }
										if(isNaN(yearpercent)){ yearpercent = 0; }
										
										acDetail['ac']['srku_house_num_month_percent'] = monthpercent;
										acDetail['ac']['srku_house_num_year_percent'] = yearpercent;
									}
									
									// all the data for tlh under this ac is calculated
									acCallback();
									
								})
								
							});
							
						});
						
					},
					(err)=>{
						
						for(var ac=0; ac<acData.length; ac++){
							// add AC's record first
							report.push(acData[ac]['ac']);
							
							// once you have added AC's row, add TLH
							var tlhLength = (acData[ac]['tlh']).length;
							if(tlhLength == 0){
								report.push({});
							}
							
							for(var tlhCount=0; tlhCount<tlhLength; tlhCount++){									
								
								report.push(acData[ac]['tlh'][tlhCount]);
								
								// once you have added TLH's row, add SPH
								var sphData = acData[ac]['tlh'][tlhCount]['sphCount'];
								var sphLength = sphData.length;
								if(sphLength == 0){
									report.push({});
								}
								
								for(var sphCount=0; sphCount<sphLength; sphCount++){
									
									report.push(acData[ac]['tlh'][tlhCount]['sph'][sphData[sphCount]]);
									
									if(sphCount+1 == sphLength){
										report.push({});
									}
								}
							}
						}
						var result = [{"report":report,"timeFactor":timeFactorRow}];
						cb(null,result);
					});
					// End of async loop of AC data
					
				});
		});
	};
	
	Usermapping.remoteMethod('getScorecardSummaryWebView',{
		http:{ path:'/getScorecardSummaryWebView', verb:'' },
		accepts:[
				{arg: 'rolename', type: 'string', 'http': {source: 'query'}},
				{arg: 'user_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'ac_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'district_id', type: 'number', 'http': {source: 'query'}},
				{arg: 'month', type: 'number', 'http': {source: 'query'}},
				{arg: 'year', type: 'number', 'http': {source: 'query'}}
		],
		returns:{ arg:'result', type:'object' }
	});

};