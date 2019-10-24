'use strict';
var objectValues = require('object-values');
var async = require('async');

module.exports = function(Eapsupportcontacts) {
	
	// to insert support contacts
	Eapsupportcontacts.insertEapSupportContact = function(jsonData,cb){
		
		var createdAt = Math.floor(Date.now() / 1000);
		var insertedData = [];
		
		var counter = 0;
		var totalData = jsonData.length*9; // 9 rows
		var totalRows = jsonData.length;
		var sphIdArr = [];
		
		async.each(jsonData, function(json, callback) {
			
			if((!json.name) || (!json.region) || (!json.province) || (!json.district) || (!json.city) || (!json.email) || (!json.support_type)){
				totalRows = totalRows-1;
				totalData = totalRows*9;
				
				var updateArr = { "title":json.title, "name":json.name,"region":json.region, "province":json.province, "district":json.district, "city":json.city, "email":json.email, "support_type":json.support_type, "mobile":json.mobile, "status":"Incomplete details", "class":"badge-danger" };
				insertedData.push(updateArr);
				callback();
			}
			else{		
				
				var status = json.status;
				status = status.toLowerCase();
				if(status == "active"){ status = 1; }
				else if(status == "inactive"){ status = 0; }
				
				var selectCity = "select m.id from region r join province p on r.id = p.region_id and r.name = (?) and p.name = (?) join district d on p.id = d.province_id and d.name = (?) join municipality m on d.id = m.district_id and m.name = (?) ";
				var arr = [json.region,json.province,json.district,json.city];
				Eapsupportcontacts.app.dbConnection.execute(selectCity,arr,function(err,data){
					
					if(data.length > 0){
						
						var city_id = data[0]['id'];
						if(city_id > 0){
							// check if entry exists or not
							var checkIfExist = "select * from eap_support_contacts where email = (?) and support_type = (?) and city_id = (?)";
							Eapsupportcontacts.app.dbConnection.execute(checkIfExist,[json.email,json.support_type,city_id],(err,contact)=>{
								
								if(contact.length > 0){
									
									var insertQuery = "update [eap_support_contacts] set title = (?), name = (?), mobile = (?), status = (?), updated_date = (?), updated_by = (?) where id = (?) ";
									var insertArr = [json.title,json.name,json.mobile,status,createdAt,json.user_id,contact[0].id];
									
									Eapsupportcontacts.app.dbConnection.execute(insertQuery,insertArr,(err,target)=>{
										var updateArr = { "title":json.title, "name":json.name,"region":json.region, "province":json.province, "district":json.district, "city":json.city, "email":json.email, "support_type":json.support_type, "mobile":json.mobile, "status":"updated", "class":"badge-warning" };
										insertedData.push(updateArr);
										callback();
									});
								}
								else{
									var insertQuery = "insert into [eap_support_contacts] (title,name,city_id,email,mobile,support_type,status,created_date,created_by,updated_date,updated_by) OUTPUT Inserted.id values ( (?),(?),(?),(?),(?),(?),(?),(?),(?),(?),(?))";
									var insertArr = [json.title,json.name,city_id,json.email,json.mobile,json.support_type,status,createdAt,json.user_id,createdAt,json.user_id];
									
									Eapsupportcontacts.app.dbConnection.execute(insertQuery,insertArr,(err,target)=>{
										
										var updateArr = { "title":json.title, "name":json.name,"region":json.region, "province":json.province, "district":json.district, "city":json.city, "email":json.email, "support_type":json.support_type, "mobile":json.mobile, "status":"inserted", "class":"badge-success" };
										insertedData.push(updateArr);
										callback();
									});
								}
							});
						}
						else{
								var updateArr = { "title":json.title, "name":json.name,"region":json.region, "province":json.province, "district":json.district, "city":json.city, "email":json.email, "support_type":json.support_type, "mobile":json.mobile, "status":"Invalid city", "class":"badge-danger" };
								insertedData.push(updateArr);
								callback();
							}
					}else{
						var updateArr = { "title":json.title, "name":json.name,"region":json.region, "province":json.province, "district":json.district, "city":json.city, "email":json.email, "support_type":json.support_type, "mobile":json.mobile, "status":"Invalid city", "class":"badge-danger" };
						insertedData.push(updateArr);
						callback();
					}
				});
			}
		},
		(err)=>{
			cb(null,insertedData);
		});
		
	}
	
	Eapsupportcontacts.remoteMethod('insertEapSupportContact',{
		http:{ path:'/insertEapSupportContact', verb:'post' },
		accepts:[
					{ arg:"jsonData", type:"array", http:{ source:"body"} }
				],
		returns:{ arg:"result", type:"object" }
	});

	
	// to filter data and give the output
	Eapsupportcontacts.getEapSupportContact = function(dataArrObj,cb){
		var sqlQuery = "select ec.*, r.name as region, p.name as province, d.name as district, m.name as city from region r join province p on r.id = p.region_id join district d on p.id = d.province_id join municipality m on d.id = m.district_id join eap_support_contacts ec on ec.city_id = m.id where 1=1 ";
		var dataArr = [];
		
		for(var o in dataArrObj) {
			
			if(o == "created_date" || o == "updated_date"){
				sqlQuery+=" AND ec."+o+" > (?)";
				dataArr.push(dataArrObj[o]);
			}
			else if(o =="name"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" Like (?)";
					dataArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" = (?)";
					dataArr.push(dataArrObj[o]);
				}
			}else{
				if(o=='limit'){
					if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
					var offset = dataArrObj['page']*dataArrObj['limit'];
					
					sqlQuery+="  ORDER BY ec.id DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
					dataArr.push(offset,dataArrObj['limit']);
				}
			}
		}
		
		Eapsupportcontacts.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Eapsupportcontacts.remoteMethod('getEapSupportContact',{
		http:{ path:"/getEapSupportContact", verb:"post" },
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
				],
		returns:{ arg:"result", type:"object" }
	});
	
	// to filter data and give the output
	Eapsupportcontacts.getEapSupportContactCount = function(dataArrObj,cb){
		var sqlQuery = "select count(ec.id) as total from region r join province p on r.id = p.region_id join district d on p.id = d.province_id join municipality m on d.id = m.district_id join eap_support_contacts ec on ec.city_id = m.id where 1=1 ";
		var dataArr = [];
		
		for(var o in dataArrObj) {
			
			if(o == "created_date" || o == "updated_date"){
				sqlQuery+=" AND ec."+o+" > (?)";
				dataArr.push(dataArrObj[o]);
			}
			else if(o =="name"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" Like (?)";
					dataArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" = (?)";
					dataArr.push(dataArrObj[o]);
				}
			}
		}
		
		Eapsupportcontacts.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Eapsupportcontacts.remoteMethod('getEapSupportContactCount',{
		http:{ path:"/getEapSupportContactCount", verb:"post" },
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
				],
		returns:{ arg:"result", type:"object" }
	});
};