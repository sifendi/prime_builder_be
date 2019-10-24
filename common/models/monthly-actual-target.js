'use strict';
var objectValues = require('object-values');
var async = require('async');

module.exports = function(Monthlyactualtarget) {

	// to insert monthly target
	Monthlyactualtarget.insertMonthlyTarget = function(jsonData,month,year,rows,cb){
		
		jsonData = objectValues(jsonData);
		var createdAt = Math.floor(Date.now() / 1000);
		var insertedData = [];
		
		var counter = 0;
		var totalData = jsonData.length*rows
		var totalRows = jsonData.length;
		var sphIdArr = [];
		
		async.each(jsonData, function(json, callback) {
			
			if((!json.sph_mobile) || (!json.status) || (!json.sph_name)){
				totalRows = totalRows-1;
				totalData = totalRows*rows;
				
				var updateArr = { "target_date":json.target_date, "target_status":json.visit_status,"sph_mobile":json.sph_mobile, "hpb_mobile":json.visitor_mobile, "status":"Incomplete details", "class":"badge-danger" };
				insertedData.push(updateArr);
				callback();
			}
			else{
				
				async.forEachOf(json, function(json2, k, callback2){
				//Object.keys(json).map(function(k){
					if(k!="sph_mobile" && k!="status" && k!="sph_code" && k!="sph_name"  && k!="user_id"  && k!="rolename"){
						
						var target_value = json[k];
						
						if(target_value){
							target_value = (target_value.toString()).replace("\r","");
						}
						
						var status = json.status;
						var target_label = k.toLowerCase();
						status = status.toLowerCase();
						
						if(status == "active"){ status = 1; }
						else if(status == "inactive"){ status = 0; }
						
						var sphArr = [];
						
						if(json.rolename == "$ra"){
							var selectQuery = "select p.postal_code, um.uid from RoleMapping rm, Role r, user_mapping um, postal_code p, [User] u where rm.principalId = u.id and u.username = (?) and  r.id = rm.roleId and r.name = '$sph' and rm.principalId = um.uid  and p.id = um.meta_value and um.uid in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
							sphArr = [json.sph_mobile,json.user_id];
						}else{
							var selectQuery = "select p.postal_code, um.uid from RoleMapping rm, Role r, user_mapping um, postal_code p, [User] u where rm.principalId = u.id and u.username = (?) and  r.id = rm.roleId and r.name = '$sph' and rm.principalId = um.uid  and p.id = um.meta_value ";
							sphArr = [json.sph_mobile];
						}
						
						
						var  mobileNo = json.sph_mobile;
						Monthlyactualtarget.app.dbConnection.execute(selectQuery,sphArr,function(err,data){
							if(data.length > 0){
								
								var postalCodes = [];
								for(var ps=0; ps<data.length; ps++){
									postalCodes.push(data[ps].postal_code);
									
									if(ps+1 == data.length){
										
										var postalCode = { "postal_code": postalCodes };
										postalCode = JSON.stringify(postalCode);
										
										var sph_id = data[ps].uid;
										
										target_value = target_value*1; // convert it back to int
										
										// check if entry exists or not
										var checkIfExist = "select target_id from [monthly_actual_target] where sph_id = (?) and target_label = (?) and target_month = (?) and target_year = (?)";
										Monthlyactualtarget.app.dbConnection.execute(checkIfExist,[sph_id,target_label,month,year],(err,targetData)=>{
											
											if(targetData.length > 0){
												
												var insertQuery = "update [monthly_actual_target] set target_value = (?), status = (?), updated_date = (?), updated_by = (?) where target_id = (?) ";
												var insertArr = [target_value,status,createdAt,json.user_id,targetData[0].target_id];
												
												Monthlyactualtarget.app.dbConnection.execute(insertQuery,insertArr,(err,target)=>{
													counter++;
													
													if(err){
														var updateArr = { "target_label":target_label,"target_value":target_value,"sph_mobile":mobileNo, "status":"Invalid Data", "class":"badge-danger" };
														insertedData.push(updateArr);
													}else{
														var updateArr = { "target_label":target_label,"target_value":target_value,"sph_mobile":mobileNo, "status":"updated", "class":"badge-warning" };
														insertedData.push(updateArr);
														if(sphIdArr.indexOf(sph_id) < 0){
															sphIdArr.push(sph_id);
														}
													}
													callback2();
												});
											}
											else{
												var insertQuery = "insert into [monthly_actual_target] (sph_id,postal_code,target_month,target_year,target_label,target_value,status,created_date,created_by,updated_date,updated_by) OUTPUT Inserted.target_id values ( (?),(?),(?),(?),(?),(?),(?),(?),(?),(?),(?))";
												var insertArr = [sph_id,postalCode,month,year,target_label,target_value,status,createdAt,json.user_id,createdAt,json.user_id];
												
												Monthlyactualtarget.app.dbConnection.execute(insertQuery,insertArr,(err,target)=>{
													counter++;
													if(err){
														var updateArr = { "target_label":target_label,"target_value":target_value,"sph_mobile":mobileNo, "status":"Invalid data", "class":"badge-danger" };
														insertedData.push(updateArr);
													}else{
														var updateArr = { "target_label":target_label,"target_value":target_value,"sph_mobile":mobileNo, "status":"inserted", "class":"badge-success" };
														insertedData.push(updateArr);
														if(sphIdArr.indexOf(sph_id) < 0){
															sphIdArr.push(sph_id);
														}
													}
													callback2();
												});
											}
											
										});
									}
								}
							}
							else{
								counter++;
								var updateArr = { "target_label":target_label,"target_value":target_value,"sph_mobile":mobileNo, "status":"Invalid SPH", "class":"badge-danger" };
								insertedData.push(updateArr);
								callback2();
							}
							
						});
					
					}else{
						callback2();
					}
				},
				(err)=>{
					callback();
				})
				
			}
		},
		(err)=>{
			if(sphIdArr.length > 0){
				var sphObj = {};
				sphObj.sph_id = sphIdArr;
				sphObj.created_date = Math.floor(new Date(year+"/"+month+"/01"));
						
				Monthlyactualtarget.app.cronExecuteForMonthlyStatsQueue(sphObj);
				Monthlyactualtarget.app.cronExecuteForStats(sphIdArr).then(()=>{
					cb(null,insertedData);
				},()=>{
					cb(null,insertedData);
				});
			}else{
				cb(null,insertedData);
			}
		});
		
	}
	
	Monthlyactualtarget.remoteMethod('insertMonthlyTarget',{
		http:{ path:'/insertMonthlyTarget', verb:'post' },
		accepts:[
					{ arg:"jsonData", type:"array", http:{ source:"body"} },
					{ arg:"month", type:"number" },
					{ arg:"year", type:"number" },
					{ arg:"rows", type:"number" }
				],
		returns:{ arg:"result", type:"object" }
	});
	
	
	
	// to filter data and give the output
	Monthlyactualtarget.getMonthlyTarget = function(sph_id,month,year,status,sph_mobile,user_id,rolename,cb){
		var sqlQuery = "select u.realm, u.username as sph_mobile, mt.* from [monthly_actual_target] mt, [User] u  where mt.sph_id = u.id ";
		var dataArr = [];
		
		if(rolename == "$ra"){
			sqlQuery+=" and mt.sph_id in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
			dataArr.push(user_id);
		}
		else if(rolename == "$ac"){
			sqlQuery+=" and mt.sph_id in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'district_id' ) ) )";
			dataArr.push(user_id);
		}
		
		if(sph_id){
			sqlQuery+=" AND mt.sph_id = (?)";
			dataArr.push(sph_id);
		}
		if(month){
			sqlQuery+=" AND mt.target_month = (?)";
			dataArr.push(month);
		}
		if(year){
			sqlQuery+=" AND mt.target_year = (?)";
			dataArr.push(year);
		}
		if(status){
			sqlQuery+=" AND mt.status = (?)";
			dataArr.push(status);
		}
		if(sph_mobile){
			sqlQuery+=" AND u.username = (?)";
			dataArr.push(sph_mobile);
		}
		sqlQuery+=" order by target_month, target_year, sph_id, target_label ";
		
		Monthlyactualtarget.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Monthlyactualtarget.remoteMethod('getMonthlyTarget',{
		http:{ path:"/getMonthlyTarget", verb:"get" },
		accepts:[
					{ arg:"sph_id", type:"number", source:{ http:"query"}},
					{ arg:"month", type:"number", source:{ http:"query"}},
					{ arg:"year", type:"number", source:{ http:"query"}},
					{ arg:"status", type:"string", source:{ http:"query"}},
					{ arg:"sph_mobile", type:"string", source:{ http:"query"}},
					{ arg:"user_id", type:"number", source:{ http:"query"}},
					{ arg:"rolename", type:"string", source:{ http:"query"}}
				],
		returns:{ arg:"result", type:"object" }
	});
	
	// to filter data and give the output
	Monthlyactualtarget.getMonthlyTargetHeaders = function(cb){
		var sqlQuery = "select distinct target_label  from monthly_actual_target order by target_label";
		var dataArr = [];
		
		Monthlyactualtarget.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Monthlyactualtarget.remoteMethod('getMonthlyTargetHeaders',{
		http:{ path:"/getMonthlyTargetHeaders", verb:"get" },
		accepts:[],
		returns:{ arg:"result", type:"object" }
	});
};