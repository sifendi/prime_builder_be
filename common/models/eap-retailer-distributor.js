'use strict';
var objectValues = require('object-values');
var async = require('async');

module.exports = function(Eapretailerdistributor) {
	Eapretailerdistributor.getEapRds = function(dataArrObj,cb){
		
		var sqlQuery = "select * from eap_retailer_distributor where rds_status = 1";
		var rdsArr = [];
		var paramsArr = [];
		
		for(var o in dataArrObj) {
			
			if(o == "created_date"){
				sqlQuery+=" AND "+o+" > (?)";
				rdsArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND "+o+" > (?)";
				rdsArr.push(dataArrObj[o]);
			}
			else if(o != "limit" && o != "page"){
				sqlQuery+=" AND "+o+" = (?)";
				rdsArr.push(dataArrObj[o]);
			}else{
				if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
				var offset = dataArrObj['page']*limit;
				
				sqlQuery+="  ORDER BY id DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
				rdsArr.push(dataArrObj[o],offset);
			}
			
		}
		
		Eapretailerdistributor.app.dbConnection.execute(sqlQuery,rdsArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Eapretailerdistributor.remoteMethod('getEapRds',{
		http:{ path: '/getEapRds', verb: 'get' },
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type:'object' }
	});

	Eapretailerdistributor.getRdsCount = function(rds_id,sub_district,limit,page,user_id,rolename,city,rds_type,rds_name,cb){
		
		var selectQuery = "select count(distinct rm.id) as total from eap_retailer_distributor rm join retailer_distributor_mapping rdm on rm.id = rdm.rds_id join subdistrict sd on rdm.meta_value = sd.id join municipality m on sd.municipality_id = m.id join district d on m.district_id = d.id join province p on p.id = d.province_id where rm.rds_status = 1 ";
		
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
		
		Eapretailerdistributor.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(null, resultObj);
		});
	}
	
	Eapretailerdistributor.remoteMethod('getRdsCount',{
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
					{ arg: 'rds_name', type: 'string', source: {http:'query' }}
				],
		returns:{ arg: 'result', type:'object' }
	});

	Eapretailerdistributor.insertEditRdsSubDistrict = function(rds_id,subDist_ids,cb){
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
	
	Eapretailerdistributor.remoteMethod('insertEditRdsSubDistrict',{
		http:{ path:'/insertEditRdsSubDistrict', verb:'post' },
		accepts:[
					{ arg:"rds_id", type:"number" },
					{ arg:"subDist_ids", type:"array" }
				],
		returns:{ arg:"result", type:"object" }
	});

	Eapretailerdistributor.getRdsOnHolcimId = function(holcim_id,cb){
		
		var selectQuery = "select * from [eap_retailer_distributor] where holcim_id = (?)";
		
		var dataArr = [holcim_id];
		
		console.log(selectQuery);
		Eapretailerdistributor.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(null, resultObj);
		});
	}
	
	Eapretailerdistributor.remoteMethod('getRdsOnHolcimId',{
		http:{ path: '/getRdsOnHolcimId', verb: 'get' },
		accepts:[
					{ arg: 'holcim_id', type: 'string', source: {http:'query' }}
				],
		returns:{ arg: 'result', type:'object' }
	});
};
