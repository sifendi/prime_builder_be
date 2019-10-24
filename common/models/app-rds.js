'use strict';
var objectValues = require('object-values');
var async = require('async');

module.exports = function(Rds) {
	Rds.getRds = function(rds_id,sub_district,limit,page,user_id,rolename,city,rds_type,rds_name,holcim_id,cb){
		
		var selectQuery = "select rm.id from retailer_distributor_master rm join retailer_distributor_mapping rdm on rm.id = rdm.rds_id join subdistrict sd on rdm.meta_value = sd.id join municipality m on sd.municipality_id = m.id join district d on m.district_id = d.id join province p on p.id = d.province_id where rm.rds_status = 1 ";
		
		var dataArr = [];
		
		// if sub district id is present, change the query with join params
		if(sub_district){
			
			// delete unique objects
			var sub_district = sub_district['subDistrict'];
			sub_district = sub_district.toString().split(",");
			
			// iterate through array
			var subDistrict="";
			var subDisParams=[];
			for(var i=0; i<sub_district.length; i++){
				if(sub_district.length == i+1){
					subDistrict+="(?)";
				}else{
					subDistrict+="(?),";
				}
				subDisParams.push(parseInt(sub_district[''+i+'']));
			}
			if(sub_district.length>0){
				selectQuery+=" AND sd.id IN ("+subDistrict+")";
			}
			dataArr = sub_district;
		}
		if(city){
			selectQuery+=" AND m.id  = (?)";
			dataArr.push(city);
		}
		if(holcim_id){
			selectQuery+=" AND rm.holcim_id like (?)";
			dataArr.push("%"+holcim_id+"%");
		}
		
		if(rolename == "$tlh" && user_id!=""){
			selectQuery+=" AND sd.id in (select meta_value from user_mapping where uid = (?) and meta_key = 'subdistrict_id') ";
			dataArr.push(user_id);
		}else if(rolename == "$ac" && user_id!=""){
			selectQuery+=" AND d.id in ( select meta_value from user_mapping where uid = (?) and  meta_key = 'district_id' ) ";
			dataArr.push(user_id);
		}else if(user_id>0 && user_id!=""){
			selectQuery+=" AND sd.id IN ( select distinct subdistrict_id from postal_code where id in (select meta_value from user_mapping where uid = (?) and  meta_key = 'postal_code' ) ) ";
			dataArr.push(user_id);
		}
		
		if(rds_id){
			selectQuery+=" AND rm.id = (?)";
			dataArr.push(rds_id);
		}
		if(rds_type){
			selectQuery+=" AND rm.rds_type = (?)";
			dataArr.push(rds_type);
		}
		if(rds_name){
			selectQuery+=" AND rm.rds_name like (?)";
			rds_name = "%"+rds_name+"%";
			dataArr.push(rds_name);
		}
		
		selectQuery+= "  GROUP BY rm.id ORDER BY rm.id DESC ";
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		var rdsId = "";
		var result = [];
		var rdsArr = {};
		var postalCodeArr = [];
		var districtArr = [];
		var subDistrictArr = [];
		var municipalityArr = [];
		var provinceArr = [];
		console.log(selectQuery);
		console.log(dataArr);
		Rds.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
						
			var rds_id = [];
			var rds_no = [];
			async.each(resultObj, function(json, callback) {
				rds_id.push(json.id);
				rds_no.push("(?)");
				callback();
			},
			(err)=>{
				rds_no = rds_no.join(",");
				var joinedQuery = "select rdm.id as mapping_id,p.name as province_name, p.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, m.name as city_name ,sd.name as sub_district_name, rm.* from retailer_distributor_master rm join retailer_distributor_mapping rdm on rm.id = rdm.rds_id join subdistrict sd on rdm.meta_value = sd.id join municipality m on sd.municipality_id = m.id join district d on m.district_id = d.id join province p on p.id = d.province_id where  rm.rds_status = 1 AND rdm.status = 1 AND rm.id in ("+rds_no+") order by rm.id DESC";
				Rds.app.dbConnection.execute(joinedQuery,rds_id,(err,resultObj2)=>{
					async.each(resultObj2, function(json, callback) {				
						if(rdsId!=json.id){
							
							rdsId = json.id;
							
							if(Object.keys(rdsArr).length>0){
								result.push(rdsArr);
							}
							
							postalCodeArr = [];
							districtArr = [];
							subDistrictArr = [];
							municipalityArr = [];
							provinceArr = [];
							rdsArr = {};
							rdsArr['id'] = json.id;
							rdsArr['holcim_id'] = json.holcim_id;
							rdsArr['rds_name'] = json.rds_name;
							rdsArr['rds_mobile'] = json.rds_mobile;
							rdsArr['rds_phone'] = json.rds_phone;
							rdsArr['rds_email'] = json.rds_email;
							rdsArr['rds_gender'] = json.rds_gender;
							rdsArr['rds_type'] = json.rds_type;
							rdsArr['rds_address'] = json.rds_address;
							rdsArr['rds_status'] = json.rds_status;
							rdsArr['postal_code'] = [];
							rdsArr['province'] = [];
							rdsArr['municipality'] = [];
							rdsArr['subdistrict'] = [];
							rdsArr['district'] = [];
						}
						
						if(provinceArr.indexOf(json.province_id) < 0){
							provinceArr.push(json.province_id);
							var arr = { "name":json.province_name, "id":json.province_id };
							rdsArr['province'].push(arr);
						}
						if(municipalityArr.indexOf(json.municipality_id) < 0){
							municipalityArr.push(json.municipality_id);
							var arr = { "name":json.municipality_name, "id":json.municipality_id };
							rdsArr['municipality'].push(arr);
						}
						if(districtArr.indexOf(json.district_id) < 0){
							districtArr.push(json.district_id);
							var arr = { "name":json.district_name, "id":json.district_id };
							rdsArr['district'].push(arr);
						}
						if(subDistrictArr.indexOf(json.subdistrict_id) < 0){
							subDistrictArr.push(json.subdistrict_id);
							var arr = { "name":json.subdistrict_name, "id":json.subdistrict_id, "mapping_id":json.mapping_id };
							rdsArr['subdistrict'].push(arr);
						}
						callback();
					},
					(err)=>{
						
						if(Object.keys(rdsArr).length>0){
							result.push(rdsArr);
						}

						cb(null, result);
					});
				
				});
			});
		});
	}
	
	Rds.remoteMethod('getRds',{
		http:{ path: '/getRds', verb: 'get' },
		accepts:[
					{ arg:"rds_id", type:"number", source: {http:'query' }},
					{ arg:"sub_district", type:"object", source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'user_id', type: 'number', source: {http:'query' }},
					{ arg: 'rolename', type: 'string', source: {http:'query' }},
					{ arg: 'city', type: 'number', source: {http:'query' }},
					{ arg: 'rds_type', type: 'string', source: {http:'query' }},
					{ arg: 'rds_name', type: 'string', source: {http:'query' }},
					{ arg: 'holcim_id', type: 'string', source: {http:'query' }}
				],
		returns:{ arg: 'result', type:'object' }
	});

	Rds.getRdsExport = function(rds_id,sub_district,limit,page,user_id,rolename,city,rds_type,rds_name,holcim_id,cb){
		
		var selectQuery = "select rdm.id as mapping_id,p.name as province_name, p.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, m.name as city_name ,sd.name as sub_district_name, rm.* from retailer_distributor_master rm join retailer_distributor_mapping rdm on rm.id = rdm.rds_id join subdistrict sd on rdm.meta_value = sd.id join municipality m on sd.municipality_id = m.id join district d on m.district_id = d.id join province p on p.id = d.province_id where  rm.rds_status = 1 AND rdm.status = 1 ";
		
		var dataArr = [];
		
		// if sub district id is present, change the query with join params
		if(sub_district){
			
			// delete unique objects
			var sub_district = sub_district['subDistrict'];
			sub_district = sub_district.toString().split(",");
			
			// iterate through array
			var subDistrict="";
			var subDisParams=[];
			for(var i=0; i<sub_district.length; i++){
				if(sub_district.length == i+1){
					subDistrict+="(?)";
				}else{
					subDistrict+="(?),";
				}
				subDisParams.push(parseInt(sub_district[''+i+'']));
			}
			if(sub_district.length>0){
				selectQuery+=" AND sd.id IN ("+subDistrict+")";
			}
			dataArr = sub_district;
		}
		if(city){
			selectQuery+=" AND m.id  = (?)";
			dataArr.push(city);
		}
		if(holcim_id){
			selectQuery+=" AND rm.holcim_id like (?)";
			dataArr.push("%"+holcim_id+"%");
		}
		
		if(rolename == "$tlh" && user_id!=""){
			selectQuery+=" AND sd.id in (select meta_value from user_mapping where uid = (?) and meta_key = 'subdistrict_id') ";
			dataArr.push(user_id);
		}else if(rolename == "$ac" && user_id!=""){
			selectQuery+=" AND d.id in ( select meta_value from user_mapping where uid = (?) and  meta_key = 'district_id' ) ";
			dataArr.push(user_id);
		}else if(user_id>0 && user_id!=""){
			selectQuery+=" AND sd.id IN ( select distinct subdistrict_id from postal_code where id in (select meta_value from user_mapping where uid = (?) and  meta_key = 'postal_code' ) ) ";
			dataArr.push(user_id);
		}
		
		if(rds_id){
			selectQuery+=" AND rm.id = (?)";
			dataArr.push(rds_id);
		}
		if(rds_type){
			selectQuery+=" AND rm.rds_type = (?)";
			dataArr.push(rds_type);
		}
		if(rds_name){
			selectQuery+=" AND rm.rds_name like (?)";
			rds_name = "%"+rds_name+"%";
			dataArr.push(rds_name);
		}
		selectQuery+= " ORDER BY rm.id DESC ";
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Rds.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj)
		});
	}
	
	Rds.remoteMethod('getRdsExport',{
		http:{ path: '/getRdsExport', verb: 'get' },
		accepts:[
					{ arg:"rds_id", type:"number", source: {http:'query' }},
					{ arg:"sub_district", type:"object", source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'user_id', type: 'number', source: {http:'query' }},
					{ arg: 'rolename', type: 'string', source: {http:'query' }},
					{ arg: 'city', type: 'number', source: {http:'query' }},
					{ arg: 'rds_type', type: 'string', source: {http:'query' }},
					{ arg: 'rds_name', type: 'string', source: {http:'query' }},
					{ arg: 'holcim_id', type: 'string', source: {http:'query' }}
				],
		returns:{ arg: 'result', type:'object' }
	});

	Rds.getRdsCount = function(rds_id,sub_district,limit,page,user_id,rolename,city,rds_type,rds_name,holcim_id,cb){
		
		var selectQuery = "select count(distinct rm.id) as total from retailer_distributor_master rm join retailer_distributor_mapping rdm on rm.id = rdm.rds_id join subdistrict sd on rdm.meta_value = sd.id join municipality m on sd.municipality_id = m.id join district d on m.district_id = d.id join province p on p.id = d.province_id where rm.rds_status = 1 ";
		
		var dataArr = [];
		
		// if sub district id is present, change the query with join params
		if(sub_district){
			
			// delete unique objects
			var sub_district = sub_district['subDistrict'];
			sub_district = sub_district.toString().split(",");
			
			// iterate through array
			var subDistrict="";
			var subDisParams=[];
			for(var i=0; i<sub_district.length; i++){
				if(sub_district.length == i+1){
					subDistrict+="(?)";
				}else{
					subDistrict+="(?),";
				}
				subDisParams.push(parseInt(sub_district[''+i+'']));
			}
			if(sub_district.length>0){
				selectQuery+=" AND sd.id IN ("+subDistrict+")";
			}
			dataArr = sub_district;
		}
		if(city){
			selectQuery+=" AND m.id  = (?)";
			dataArr.push(city);
		}
		if(holcim_id){
			selectQuery+=" AND rm.holcim_id like (?)";
			dataArr.push("%"+holcim_id+"%");
		}
		
		if(rolename == "$tlh" && user_id!=""){
			selectQuery+=" AND sd.id in (select meta_value from user_mapping where uid = (?) and meta_key = 'subdistrict_id') ";
			dataArr.push(user_id);
		}else if(rolename == "$ac" && user_id!=""){
			selectQuery+=" AND d.id in ( select meta_value from user_mapping where uid = (?) and  meta_key = 'district_id' ) ";
			dataArr.push(user_id);
		}
		
		if(rds_id){
			selectQuery+=" AND rm.id = (?)";
			dataArr.push(rds_id);
		}
		if(rds_type){
			selectQuery+=" AND rm.rds_type = (?)";
			dataArr.push(rds_type);
		}
		if(rds_name){
			selectQuery+=" AND rm.rds_name like (?)";
			rds_name = "%"+rds_name+"%";
			dataArr.push(rds_name);
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Rds.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(null, resultObj);
		});
	}
	
	Rds.remoteMethod('getRdsCount',{
		http:{ path: '/getRdsCount', verb: 'get' },
		accepts:[
					{ arg:"rds_id", type:"number", source: {http:'query' }},
					{ arg:"sub_district", type:"object", source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'user_id', type: 'number', source: {http:'query' }},
					{ arg: 'rolename', type: 'string', source: {http:'query' }},
					{ arg: 'city', type: 'number', source: {http:'query' }},
					{ arg: 'rds_type', type: 'string', source: {http:'query' }},
					{ arg: 'rds_name', type: 'string', source: {http:'query' }},
					{ arg: 'holcim_id', type: 'string', source: {http:'query' }}
				],
		returns:{ arg: 'result', type:'object' }
	});

	Rds.insertEditRdsSubDistrict = function(rds_id,subDist_ids,cb){
		//console.log(subDist_ids);
		var data = [];
		var created_date = Math.floor(Date.now()); // to get server created date
		async.each(subDist_ids, function(json, callback) {
			if(json.sdid!=""){
				if((json.mapping_id==null) || (json.mapping_id=='null') || (json.mapping_id=='')){
					//console.log("here2");
					var insertQuery = "insert into [retailer_distributor_mapping] (rds_id,meta_key,meta_value,status,updated_date) OUTPUT Inserted.id values ( (?),(?),(?),(?),(?))";
					var insertArr = [ rds_id ,'subdistrict_id',json.sdid, json.status,created_date ];
					Rds.app.dbConnection.execute(insertQuery,insertArr,(err,target)=>{
						var result = {  "status":"inserted", "id": target.id };
						data.push(result);
						callback();
					});
				}else{
					if(json.status==0){
						var updateQuery = "update [retailer_distributor_mapping] set rds_id = (?), status = (?), updated_date = (?) where id = (?)";
						var updateArr = [rds_id, json.status, created_date ,json.mapping_id ];
					}else{
						var updateQuery = "update [retailer_distributor_mapping] set rds_id = (?), meta_key=(?), meta_value =(?), status = (?), updated_date = (?) where id = (?)";
						var updateArr = [rds_id, 'subdistrict_id' , json.sdid, json.status, created_date ,json.mapping_id ];
					}
					
					//console.log(updateQuery,updateArr);
					Rds.app.dbConnection.execute(updateQuery,updateArr,(err,target)=>{
						var result = { "status":"updated", "id": json.id };
						data.push(result);
						callback();
					});
				}
			}
			else{
				callback();
			}
			
		},
		(err)=>{
			cb(null,data);
		});
	}
	
	Rds.remoteMethod('insertEditRdsSubDistrict',{
		http:{ path:'/insertEditRdsSubDistrict', verb:'post' },
		accepts:[
					{ arg:"rds_id", type:"number", http:{ source:"query"} },
					{ arg:"subDist_ids", type:"array", http:{ source:"body"} }
				],
		returns:{ arg:"result", type:"object" }
	});

	Rds.getRdsOnHolcimId = function(holcim_id,cb){
		
		var selectQuery = "select * from [retailer_distributor_master] where holcim_id = (?)";
		
		var dataArr = [holcim_id];
		
		console.log("query",selectQuery);
		Rds.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(null, resultObj);
		});
	}
	
	Rds.remoteMethod('getRdsOnHolcimId',{
		http:{ path: '/getRdsOnHolcimId', verb: 'get' },
		accepts:[
					{ arg: 'holcim_id', type: 'string', source: {http:'query' }}
				],
		returns:{ arg: 'result', type:'object' }
	});

	// to add/edit lead
	Rds.addEditRds = function(dataArrObj,rds_id,cb){
		console.log(rds_id);
		if(rds_id){
			Rds.findOne({ where:{id:rds_id}}, function(err,leadData){
				if(leadData){
					var updated_date = Math.floor(Date.now()); // to get server created date
					dataArrObj.updated_date = updated_date;
					
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where id = (?)';
					dataArr.push(rds_id);
					var sqlQuery = "update [retailer_distributor_master] set "+paramsKey+" "+whereCond;
				console.log(sqlQuery);
					Rds.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = rds_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid lead id",null);
				}
			});
		}
		else{
			
			var created_date = Math.floor(Date.now()); // to get server created date
			dataArrObj.created_date = created_date;
			dataArrObj.updated_date = created_date;
			
			var leadArr = [];
			var paramsArr = [];
			
			for(var o in dataArrObj) {
				leadArr.push(dataArrObj[o]);
				paramsArr.push("(?)");
			}
			var paramsKey = paramsArr.join(', ');
			var keyString = Object.keys(dataArrObj).join(', ');
			
			// add the user as lead
			var sqlQuery = "insert into [retailer_distributor_master] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

			Rds.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
				console.log(resultObj);
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].id;
					result.updated_date = created_date;
					cb(err,result);
				}else{
					cb(err,result);
				}
				
			});
		}
	}
	
	Rds.remoteMethod('addEditRds',{
		http:{ path:'/addEditRds', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'rds_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	Rds.getRdsSubDistData = function(rds_id,cb){
		
		var selectQuery = "select p.id as province_id,d.id as dist_id,m.id as mun_id,rdm.meta_value as subdist_id, rdm.id as mapping_id from retailer_distributor_master rm join retailer_distributor_mapping rdm on rm.id = rdm.rds_id join subdistrict sd on rdm.meta_value = sd.id join municipality m on sd.municipality_id = m.id join district d on m.district_id = d.id join province p on p.id = d.province_id where rm.rds_status = 1 and rdm.status = 1 and  rm.id = (?)";
		var dataArr = [rds_id];
		Rds.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(null, resultObj);
		});
	}
	
	Rds.remoteMethod('getRdsSubDistData',{
		http:{ path: '/getRdsSubDistData', verb: 'get' },
		accepts:[
					{ arg: 'rds_id', type: 'any', source: {http:'query' }}
				],
		returns:{ arg: 'result', type:'object' }
	});

	Rds.getRdsSubDistData2 = function(province_id,district_id,mun_id,subdistrict_id,cb){
		
		var selectQuery = "select distinct municipality_id, m.name as municipality_name, district_id, d.name as district_name,sd.id as subdistrict_id, sd.name as subdistrict_name from subdistrict sd join municipality m on sd.municipality_id = m.id join district d on d.id = m.district_id join province p on p.id = d.province_id and  p.id = (?)";
		var dataArr = [province_id];
		Rds.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			//console.log(resultObj[0]);
			var rdsArr = {};
			rdsArr['municipality'] = [];
			rdsArr['subdistrict'] = [];
			rdsArr['district'] = [];
			var districtArr = [];
			var subDistrictArr = [];
			var municipalityArr = [];
			async.each(resultObj, function(json, callback) {
				if(json.municipality_id==mun_id){
					if(subDistrictArr.indexOf(json.subdistrict_id) < 0){
						subDistrictArr.push(json.subdistrict_id);
						var arr = { "name":json.subdistrict_name, "id":json.subdistrict_id };
						rdsArr['subdistrict'].push(arr);
					}
				}
				
				if(json.district_id==district_id){
					if(municipalityArr.indexOf(json.municipality_id) < 0){
						municipalityArr.push(json.municipality_id);
						var arr = { "name":json.municipality_name, "id":json.municipality_id };
						rdsArr['municipality'].push(arr);
					}	
				}
				if(districtArr.indexOf(json.district_id) < 0){
					districtArr.push(json.district_id);
					var arr = { "name":json.district_name, "id":json.district_id };
					rdsArr['district'].push(arr);
				}
				callback();
			});
			cb(null, rdsArr);
		});
	}
	
	Rds.remoteMethod('getRdsSubDistData2',{
		http:{ path: '/getRdsSubDistData2', verb: 'get' },
		accepts:[
					{ arg: 'province_id', type: 'any', source: {http:'query' }},
					{ arg: 'district_id', type: 'any', source: {http:'query' }},
					{ arg: 'mun_id', type: 'any', source: {http:'query' }},
					{ arg: 'subdistrict_id', type: 'any', source: {http:'query' }}

				],
		returns:{ arg: 'result', type:'object' }
	});
};