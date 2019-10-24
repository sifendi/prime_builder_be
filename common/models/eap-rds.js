'use strict';
var async = require('async');
module.exports = function(Eaprds) {


	Eaprds.getEapRdsCount = function(dataArrObj,cb){
		var rdsArr = [];
		var paramsArr = [];
		
		var sqlQuery = "select count(erd.id) as total from eap_retailer_distributor erd join [User] u on erd.created_by = u.id left join subdistrict sd on erd.rds_sub_district = sd.id left join municipality m on sd.municipality_id = m.id where erd.rds_status = 1" 
		for(var o in dataArrObj) {
			
			if(o == "created_date"){
				sqlQuery+=" AND erd."+o+" >= (?)";
				rdsArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND erd."+o+" > (?)";
				rdsArr.push(dataArrObj[o]);
			}
			else if(o =="rds_name"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND erd."+o+" Like (?)";
					rdsArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND erd."+o+" = (?)";
					rdsArr.push(dataArrObj[o]);
				}
			}
		}
		
		console.log(sqlQuery);
		Eaprds.app.dbConnection.execute(sqlQuery,rdsArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Eaprds.remoteMethod('getEapRdsCount',{
		http:{ path: '/getEapRdsCount', verb: 'post' },
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type:'object' }
	});

	Eaprds.getEapRds = function(dataArrObj,limit,cb){
		var rdsArr = [];
		var paramsArr = [];

		var sqlQuery = "select erd.*,u.realm as createdBy, sd.name as subdistrict,m.name as city from eap_retailer_distributor erd join [User] u on erd.created_by = u.id left join subdistrict sd on erd.rds_sub_district = sd.id left join municipality m on sd.municipality_id = m.id  where erd.rds_status = 1"; 
		for(var o in dataArrObj) {
			
			if(o == "created_date"){
				sqlQuery+=" AND erd."+o+" > (?)";
				rdsArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND erd."+o+" > (?)";
				rdsArr.push(dataArrObj[o]);
			}
			else if(o =="rds_name"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND erd."+o+" Like (?)";
					rdsArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o =="rds_mobile"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND erd."+o+" Like (?)";
					rdsArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND erd."+o+" = (?)";
					rdsArr.push(dataArrObj[o]);
				}
			}
		}
		
		if(dataArrObj['limit'] > 0){
			if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
			var offset = dataArrObj['page']*dataArrObj['limit'];
			
			sqlQuery+="  ORDER BY erd.id DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
			rdsArr.push(offset,dataArrObj['limit']);
		}

		Eaprds.app.dbConnection.execute(sqlQuery,rdsArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	
	}
	
	Eaprds.remoteMethod('getEapRds',{
		http:{ path:'/getEapRds', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'limit', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	// to add/edit rds
	Eaprds.addEditRds = function(dataArrObj,rds_id,cb){
		
		if(rds_id){
			Eaprds.findOne({ where:{id:rds_id}}, function(err,leadData){
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
					var sqlQuery = "update [eap_retailer_distributor] set "+paramsKey+" "+whereCond;
				
					Eaprds.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
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
			
			var selectQuery = "select * from [retailer_distributor_master] where rds_mobile = (?) or rds_phone = (?)";
			Eaprds.app.dbConnection.execute(selectQuery,[dataArrObj['rds_mobile'],dataArrObj['rds_mobile']],(err,resultObj)=>{
				if(resultObj && resultObj.length > 0){
					cb(err,"This RDS exists");
				}
				else{
					var selectQuery = "select * from [eap_retailer_distributor] where rds_mobile = (?)";
					Eaprds.app.dbConnection.execute(selectQuery,[dataArrObj['rds_mobile']],(err,resultObj)=>{
						if(resultObj && resultObj.length > 0){
							cb(err,"This RDS exists");
						}else{
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
							var sqlQuery = "insert into [eap_retailer_distributor] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

							Eaprds.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
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
					});
				}
			});
		}
	}

	Eaprds.remoteMethod('addEditRds',{
		http:{ path:'/addEditRds', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'rds_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});


Eaprds.getEapRdsGlobal = function(dataArrObj,serchKey,cb){

		var limit=500;
		var orderByName="rds_name";
		var limitAndOrderByQuery=` ORDER BY ${orderByName}  OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY `;
		var rdsWhere=`WHERE rds_name LIKE '%${serchKey}%'`;
		var rdsSubDisWhere = "";
		var eapSubDistWhere = "";
		
		if(dataArrObj['subDistrict']){
			rdsSubDisWhere = `AND rm.meta_key = 'subdistrict_id' AND rm.meta_value = '${dataArrObj['subDistrict']}'`;
			eapSubDistWhere = `AND rds_sub_district = '${dataArrObj['subDistrict']}'`;
		}

		//var sqlQuery = `SELECT *,'HPB' AS 'group_name' FROM retailer_distributor_master UNION SELECT *,'EAP' AS 'group_name' FROM eap_retailer_distributor  ${limitAndOrderByQuery} `;

		var sqlQuery =`SELECT rdm.*,'HPB' AS 'group_name' FROM retailer_distributor_master rdm left join retailer_distributor_mapping rm on  rm.rds_id = rdm.id WHERE 1=1 ${rdsSubDisWhere} UNION SELECT *,'EAP' AS 'group_name' FROM eap_retailer_distributor  WHERE 1=1 ${eapSubDistWhere}`;

	 	if(serchKey){
	 	  	if(isNaN(serchKey)){
	 	  		rdsWhere=`WHERE rds_name LIKE '%${serchKey}%'`;
	 	  	   	sqlQuery=`SELECT rdm.*,'HPB' AS 'group_name' FROM retailer_distributor_master rdm left join retailer_distributor_mapping rm on  rm.rds_id = rdm.id ${rdsWhere} ${rdsSubDisWhere} UNION SELECT *,'EAP' AS 'group_name' FROM eap_retailer_distributor ${rdsWhere} ${eapSubDistWhere} ${limitAndOrderByQuery}`;
		 	}else{
		 	  	rdsWhere=`WHERE rds_mobile LIKE '%${serchKey}%'`;
		 	  	sqlQuery=`SELECT rdm.*,'HPB' AS 'group_name' FROM retailer_distributor_master rdm left join retailer_distributor_mapping rm on  rm.rds_id = rdm.id ${rdsWhere} ${rdsSubDisWhere} UNION SELECT *,'EAP' AS 'group_name' FROM eap_retailer_distributor ${rdsWhere} ${eapSubDistWhere} ${limitAndOrderByQuery}`;	
		 	}
	    }else if(dataArrObj['id']>0){
	 		var id = dataArrObj['id'];
	 		var from_name = dataArrObj['from_name'];
	 		rdsWhere=`WHERE id=${dataArrObj['id']}`;
	 		if(from_name=='eap'){
	 			sqlQuery=` SELECT *,'EAP' AS 'group_name' FROM eap_retailer_distributor ${rdsWhere}  ${limitAndOrderByQuery} `;	
	 		}else{
	 			sqlQuery=` SELECT *,'HPB' AS 'group_name' FROM retailer_distributor_master ${rdsWhere}  ${limitAndOrderByQuery} `;	
	 		}
		}
				
		Eaprds.app.dbConnection.execute(sqlQuery,[],(err,resultObj)=>{

			// async.forEachOf(resultObj,(result,index,callback)=>{

			// 	if(result['group_name']=='HPB'){
			// 		var rdsId=result['id'];
			// 		var subCQuery=`select distinct sd.id, sd.name as 'sub_name',mu.name as 'city_name' from retailer_distributor_mapping rdm join subdistrict sd on rdm.meta_value=sd.id and rdm.meta_key='subdistrict_id' and rdm.rds_id=${rdsId}  join municipality mu on mu.id=sd.municipality_id`;
			// 		//console.log('subCQuery',subCQuery);
			// 		Eaprds.app.dbConnection.execute(subCQuery,[],(err,resultSuCArr)=>{
			// 		//	console.log('data ',resultSuCArr);
			// 			if(resultSuCArr){
			// 				if(resultSuCArr.length>0){
			// 				//	console.log('subCQuery in',resultSuCArr[0]);
			// 					resultObj[index]['rds_city']=resultSuCArr[0]['city_name'];
			// 					resultObj[index]['rds_sub_district']=resultSuCArr[0]['sub_name'];
			// 				}
			// 			}
			// 			callback();
			// 		});
					
			// 	}else{
			// 		callback();
			// 	}

			// },(endL)=>{
			// 	cb(err,resultObj);
			// });
			cb(err,resultObj);
			
		});
	
	}
	Eaprds.remoteMethod('getEapRdsGlobal',{
		http:{ path:'/getEapRdsGlobal', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'serchKey', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});



};
