'use strict';
var objectValues = require('object-values');
var async = require('async');

module.exports = function(Monthlyforecasttarget) {

	// to insert monthly target
	Monthlyforecasttarget.insertMonthlyForecastTarget = function(jsonData,rows,cb){
		
		jsonData = objectValues(jsonData);
		
		var createdAt = Math.floor(Date.now() / 1000);
		var insertedData = [];
		var counter = 0;
		var totalData = jsonData.length*rows
		var totalRows = jsonData.length;
		var sphIdArr = [];
		
		
		async.each(jsonData, function(json, callback){
			// check mandatory fields are present or not
			if((json.sph_mobile==0) || (json.visitor_code==0) || (!json.target_date) || (json.target_date=="Invalid date") || (json.visitor_type==0) || (json.status==0)){
				
				totalRows = totalRows-1;
				totalData = totalRows*rows;
				var updateArr = { "target_date":json.target_date, "target_status":json.visit_status, "target_label":"","target_value":"","sph_mobile":json.sph_mobile, "visitor_mobile":json.visitor_mobile, "status":"Incomplete details", "class":"badge-danger" };
				insertedData.push(updateArr);
				callback();
			}
			else{
				
				var visitor_type = (json['visitor_type']).toLowerCase();
				if((visitor_type == "retailer") || (visitor_type == "distributor")){
					json['visit'] = 1;
				}
				
				//Object.keys(json).map(function(k){
				async.forEachOf(json, function(json2, k, callback2){	
					if(k!="target_date" && k!="sph_mobile" && k!="status" && k!="sph_code" && k!="sph_name" && k!="visitor_code" && k!="visitor_mobile" && k!="visitor_type" && k!="visitor_name"  && k!="user_id"  && k!="rolename"){
						
						// if target value is not set, make it 0
						if(json[k]){
							var target_value = json[k];
						}else{
							var target_value = 0;
						}
						
						var visit_date = json['target_date'] || '';
						var visit_status = json['status'] || '';
						var status = json['status'] || '';
						status = status.toLowerCase();
						
						var target_label = k || '';
						
						if(status == "active"){ status = 1; }
						else if(status == "inactive"){ status = 0; }
						
						// check for SPH
						var sphArr = [];
						if(json.rolename == "$ra"){
							var selectSPHQuery = "select distinct u.username, u.id, r.name from RoleMapping rm, Role r, user_mapping um, postal_code p, [User] u where rm.principalId = u.id and u.username = (?) and  r.id = rm.roleId and r.name = '$sph' and rm.principalId = um.uid  and p.id = um.meta_value and um.uid in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
							sphArr = [json.sph_mobile,json.user_id];
						}else if(json.rolename == "$tlh"){
							var selectSPHQuery = "select distinct u.username, u.id, r.name from RoleMapping rm, Role r, user_mapping um, postal_code p, [User] u where rm.principalId = u.id and u.username = (?) and  r.id = rm.roleId and r.name = '$sph' and rm.principalId = um.uid  and p.id = um.meta_value and um.uid in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in (	select p.id from postal_code p where p.subdistrict_id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'subdistrict_id')  )  )";
							sphArr = [json.sph_mobile,json.user_id];
						}else{
							var selectSPHQuery = "select distinct u.username, u.id, r.name from [User] u, Role r, RoleMapping rm where username = (?) and r.id = rm.roleId and u.id = rm.principalId and u.status = 1 and r.name = '$sph' ";
							sphArr = [json.sph_mobile];
						}
						
						for(var j = 0; j < sphArr.length; j++){
							sphArr[j] = '' + sphArr[j];
						}
						
						// check for visitor details
						if(json['visitor_type']){
							var visitor_type = (json['visitor_type']).toLowerCase();
						}else{
							var visitor_type = "";
						}
						if((visitor_type == "mason") || (visitor_type == "contractor")){
							var selectQuery = "select distinct h.hpb_id as id , h.hpb_type as type , u.realm as name from hpb_info_tbl h, [User] u, Role r, RoleMapping rm where username = (?) and r.id = rm.roleId and u.id = rm.principalId and r.name = '$hpb' and h.uid = u.id ";
							var userArr = [json['visitor_mobile']];
							var visitormobileNo = json['visitor_mobile'];
						}else{
							var selectQuery = "select id,rds_type as type, rds_name as name from retailer_distributor_master where holcim_id = (?)";
							var userArr = [json['visitor_code']];
							var visitormobileNo = json['visitor_code'];
						}

						// convert numeric array to string
						for(var j = 0; j < userArr.length; j++){
							userArr[j] = '' + userArr[j];
						}
						
						var sphmobileNo = json['sph_mobile'];
						
						// validate empty fields
						if(sphmobileNo!="" && visitormobileNo!="" && visit_date!=""){
							Monthlyforecasttarget.app.dbConnection.execute(selectSPHQuery,sphArr,function(err,data){
								
								if(data.length == 1){ // if sph is valid
									
									var sph_id = data[0]['id'];
									Monthlyforecasttarget.app.dbConnection.execute(selectQuery,userArr,function(err,visitorData){
									
									// validate visitor
									if((visitorData.length > 0) && (visitorData[0]['type']) && ((visitorData[0]['type'].toLowerCase()) == visitor_type)){
										
										var visitor_id = visitorData[0]['id'];
										var visitor_name = visitorData[0]['name'];
										
										// check if entry exists or not
										var checkIfExist = "select dt_id from [monthly_forecast_target] where sph_id = (?) and visitor_id = (?) and target_label = (?) and target_date = (?)";
										Monthlyforecasttarget.app.dbConnection.execute(checkIfExist,[sph_id,visitor_id,target_label,visit_date],(err,targetData)=>{
											
											if((targetData) && (targetData.length > 0)){
												
												var insertQuery = "update [monthly_forecast_target] set target_value = (?), visitor_name = (?), visitor_type = (?), status = (?), updated_date = (?), updated_by = (?) where dt_id = (?) ";
												var insertArr = [target_value,visitor_name,visitor_type,status,createdAt,json.user_id,targetData[0].dt_id];
												
												Monthlyforecasttarget.app.dbConnection.execute(insertQuery,insertArr,(err,target)=>{
													counter++;
													
													if(err){
														var updateArr = { "target_date":visit_date, "target_status":visit_status, "target_label":target_label,"target_value":target_value,"sph_mobile":sphmobileNo, "visitor_mobile":visitormobileNo, "status":"Invalid data", "class":"badge-danger" };
														insertedData.push(updateArr);
													}else{
														var updateArr = { "target_date":visit_date, "target_status":visit_status, "target_label":target_label,"target_value":target_value,"sph_mobile":sphmobileNo, "visitor_mobile":visitormobileNo, "status":"updated", "class":"badge-warning" };
														insertedData.push(updateArr);
														if(sphIdArr.indexOf(sph_id) < 0){
															sphIdArr.push(sph_id);
														}
													}
														
													callback2();
												});
											}
											else{
												var insertQuery = "insert into [monthly_forecast_target] (sph_id,visitor_id,visitor_type,visitor_name,target_date,target_label,target_value,status,created_date,created_by,updated_date,updated_by) OUTPUT Inserted.dt_id values ( (?),(?),(?),(?),(?),(?),(?),(?),(?),(?),(?),(?))";
												var insertArr = [sph_id,visitor_id,visitor_type,visitor_name,visit_date,target_label,target_value,status,createdAt,json.user_id,createdAt,json.user_id];
												Monthlyforecasttarget.app.dbConnection.execute(insertQuery,insertArr,(err,target)=>{
													counter++;
													if(err){
														var updateArr = { "target_date":visit_date, "target_status":visit_status, "target_label":target_label,"target_value":target_value,"sph_mobile":sphmobileNo, "visitor_mobile":visitormobileNo, "status":"Invalid data", "class":"badge-danger" };
														insertedData.push(updateArr);
													}else{
														var updateArr = { "target_date":visit_date, "target_status":visit_status, "target_label":target_label,"target_value":target_value,"sph_mobile":sphmobileNo, "visitor_mobile":visitormobileNo, "status":"inserted", "class":"badge-success" };
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
									// invalid visitor details
									else{
										counter++;
										var updateArr = { "target_date":visit_date, "target_status":visit_status, "target_label":target_label,"target_value":target_value,"sph_mobile":sphmobileNo, "visitor_mobile":visitormobileNo, "status":"Invalid visitor details", "class":"badge-danger" };
										insertedData.push(updateArr);
										
										callback2();
									}
									
									});
								}
								// if invalid sph mobile number
								else{
									counter++;
									var updateArr = { "target_date":visit_date, "target_status":visit_status, "target_label":target_label,"target_value":target_value,"sph_mobile":sphmobileNo, "visitor_mobile":visitormobileNo, "status":"Invalid sph details", "class":"badge-danger" };
									insertedData.push(updateArr);
									
									callback2();
								}
							});
						}
						// if empty fields
						else{
							var updateArr = { "target_date":visit_date, "target_status":visit_status, "target_label":target_label,"target_value":target_value,"sph_mobile":sphmobileNo, "visitor_mobile":visitormobileNo, "status":"Incomplete details", "class":"badge-danger" };
							insertedData.push(updateArr);
							callback2();
						}
					
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
				Monthlyforecasttarget.app.cronExecuteForStats(sphIdArr).then(()=>{
					cb(null,insertedData);
				},()=>{
					cb(null,insertedData);
				});
			}else{
				cb(null,insertedData);
			}
		});
		
		
	}
	
	Monthlyforecasttarget.remoteMethod('insertMonthlyForecastTarget',{
		http:{ path:'/insertMonthlyForecastTarget', verb:'post' },
		accepts:[
					{ arg:"jsonData", type:"any", http:{ source:"body"} },
					{ arg:"rows", type:"number" }
				],
		returns:{ arg:"result", type:"object" }
	});
	
	// to get all the visiting data
	Monthlyforecasttarget.getMonthlyForecastVisitingTarget = function(sph_id,visit_date,sph_mobile,visitortype,holcim_id,status,user_id,rolename,cb){
		var sqlQuery = "select u.realm as sph_name, u.username as sph_mobile, mt.* , rm.holcim_id from  [monthly_forecast_target] mt, [User] u , retailer_distributor_master rm where mt.target_label = 'visit' and mt.sph_id = u.id and rm.id = mt.visitor_id ";
		var dataArr = [];
		
		if(rolename=="$tlh" && user_id!=""){
			sqlQuery+=" and mt.sph_id in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( select id from postal_code where subdistrict_id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'subdistrict_id' ) ))";
			dataArr.push(user_id);
		}else if(rolename=="$ac" && user_id!=""){
			sqlQuery+=" and mt.sph_id in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'district_id' ) ) )";
			dataArr.push(user_id);
		}else if(rolename=="$ra" && user_id!=""){
			sqlQuery+=" and mt.sph_id in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
			dataArr.push(user_id);
		}
		
		if(sph_id){
			sqlQuery+=" AND mt.sph_id = (?)";
			dataArr.push(sph_id);
		}
		if(sph_mobile){
			sqlQuery+=" AND u.username = (?)";
			dataArr.push(sph_mobile);
		}
		if(visitortype){
			sqlQuery+=" AND mt.visitor_type = (?)";
			dataArr.push(visitortype);
		}
		if(visit_date){
			sqlQuery+=" AND mt.target_date = (?)";
			dataArr.push(visit_date);
		}
		if(holcim_id){
			sqlQuery+=" AND rm.holcim_id = (?)";
			dataArr.push(holcim_id);
		}
		if(status){
			sqlQuery+=" AND mt.status = (?)";
			dataArr.push(status);
		}
		
		sqlQuery+=" order by target_date desc ";
		Monthlyforecasttarget.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Monthlyforecasttarget.remoteMethod('getMonthlyForecastVisitingTarget',{
		http:{ path:"/getMonthlyForecastVisitingTarget", verb:"get" },
		accepts:[
					{ arg:"sph_id", type:"number", source:{ http:"query"}},
					{ arg:"visit_date", type:"string", source:{ http:"query"}},
					{ arg:"sph_mobile", type:"string", source:{ http:"query"}},
					{ arg:"visitortype", type:"string", source:{ http:"query"}},
					{ arg:"holcim_id", type:"string", source:{ http:"query"}},
					{ arg:"status", type:"string", source:{ http:"query"}},
					{ arg:"user_id", type:"number", source:{ http:"query"}},
					{ arg:"rolename", type:"string", source:{ http:"query"}}
				],
		returns:{ arg:"result", type:"object" }
	});
	
	// to get all the forecast data
	Monthlyforecasttarget.getMonthlyForecastTarget = function(sph_id,targetData,sph_mobile,visitortype,primary_mobile_no,status,user_id,rolename,cb){
		var sqlQuery = "select u.realm as sph_name, u.username as sph_mobile, mt.* , rm.primary_mobile_no from  [monthly_forecast_target] mt, [User] u , hpb_info_tbl rm where mt.target_label != 'visit' and mt.sph_id = u.id and rm.hpb_id = mt.visitor_id ";
		var dataArr = [];
		
		if(rolename=="$tlh" && user_id!=""){
			sqlQuery+=" and mt.sph_id in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( select id from postal_code where subdistrict_id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'subdistrict_id' ) ))";
			dataArr.push(user_id);
		}else if(rolename=="$ac" && user_id!=""){
			sqlQuery+=" and mt.sph_id in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'district_id' ) ) )";
			dataArr.push(user_id);
		}else if(rolename=="$ra" && user_id!=""){
			sqlQuery+=" and mt.sph_id in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
			dataArr.push(user_id);
		}
		if(sph_id){
			sqlQuery+=" AND mt.sph_id = (?)";
			dataArr.push(sph_id);
		}
		if(targetData){
			sqlQuery+=" AND mt.target_date = (?)";
			dataArr.push(targetData);
		}
		if(sph_mobile){
			sqlQuery+=" AND u.username = (?)";
			dataArr.push(sph_mobile);
		}
		if(visitortype){
			sqlQuery+=" AND mt.visitor_type = (?)";
			dataArr.push(visitortype);
		}
		if(primary_mobile_no){
			sqlQuery+=" AND rm.primary_mobile_no = (?)";
			dataArr.push(primary_mobile_no);
		}
		if(status){
			sqlQuery+=" AND mt.status = (?)";
			dataArr.push(status);
		}
		
		sqlQuery+=" order by target_date desc, target_label asc ";
		Monthlyforecasttarget.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Monthlyforecasttarget.remoteMethod('getMonthlyForecastTarget',{
		http:{ path:"/getMonthlyForecastTarget", verb:"get" },
		accepts:[
					{ arg:"sph_id", type:"number", source:{ http:"query"}},
					{ arg:"targetData", type:"string", source:{ http:"query"}},
					{ arg:"sph_mobile", type:"string", source:{ http:"query"}},
					{ arg:"visitortype", type:"string", source:{ http:"query"}},
					{ arg:"primary_mobile_no", type:"string", source:{ http:"query"}},
					{ arg:"status", type:"string", source:{ http:"query"}},
					{ arg:"user_id", type:"number", source:{ http:"query"}},
					{ arg:"rolename", type:"string", source:{ http:"query"}}
				],
		returns:{ arg:"result", type:"object" }
	});
	
	// to get all the headers for forecast uploads
	Monthlyforecasttarget.getMonthlyForecastTargetHeaders = function(cb){
		var sqlQuery = "select distinct target_label  from monthly_forecast_target where target_label != 'visit'  order by target_label ";
		var dataArr = [];
		
		Monthlyforecasttarget.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Monthlyforecasttarget.remoteMethod('getMonthlyForecastTargetHeaders',{
		http:{ path:"/getMonthlyForecastTargetHeaders", verb:"get" },
		accepts:[],
		returns:{ arg:"result", type:"object" }
	});
};