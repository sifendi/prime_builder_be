'use strict';
var async = require('async');

module.exports = function(Monthlyvisitingschedule) {

	// to insert monthly target
	Monthlyvisitingschedule.insertMonthlyVisitingTarget = function(jsonData,month,year,cb){
		var createdAt = Math.floor(Date.now() / 1000);
		var insertedData = [];
		var counter = 0;
		
		async.each(jsonData, function(json, callback) {
			
			var visitor_type = json.visitor_type.toLowerCase();
			
			var selectSPHQuery = "select distinct u.username, u.id, r.name from [User] u, Role r, RoleMapping rm where username = (?) and r.id = rm.roleId and u.id = rm.principalId and r.name = '$sph' ";
			var sphArr = [json.sph_mobile];
			for(var j = 0; j < sphArr.length; j++){
				sphArr[j] = '' + sphArr[j];
			}
			
			if((visitor_type == "mason") || (visitor_type == "contractor")){
				var selectQuery = "select distinct u.id , h.hpb_type as type , u.realm as name from hpb_info_tbl h, [User] u, Role r, RoleMapping rm where username = (?) and r.id = rm.roleId and u.id = rm.principalId and r.name = '$hpb' and h.uid = u.id ";
			}else{
				var selectQuery = "select id,rds_type as type, rds_name as name from retailer_distributor_master where rds_mobile = (?) or rds_phone = (?) ";
			}
			
			
			// convert numeric array to string
			var userArr = [json.visitor_id,json.visitor_id]; // twice because in rds we need to pass same value
			for(var j = 0; j < userArr.length; j++){
				userArr[j] = '' + userArr[j];
			}
			
			var sphMobileNo = json.sph_mobile;
			var hpbMobileNo = json.visitor_id;
					
			var visit_date = year+"-"+month+"-"+json.visit_date;
			
			var visit_status = json.status;
			var status = visit_status;
			
			if(status == "active"){ status = 1; }else{ status = 0; }
			
			Monthlyvisitingschedule.app.dbConnection.execute(selectSPHQuery,sphArr,function(err,data){
				if(data.length == 1){ // if sph is valid
					
					var sph_id = data[0]['id'];
					Monthlyvisitingschedule.app.dbConnection.execute(selectQuery,userArr,function(err,visitorData){
						console.log(visitorData);
						if(data.length == 1){ // if visitor is valid
							var visitor_id = visitorData[0]['id'];
							var visitortype = visitorData[0]['type'];
							var visitorname = visitorData[0]['name'];
							// check if this exists
							var checkIfExist = "select dv_id from [monthly_visiting_schedule] where sph_id = (?) and visitor_id = (?) and visit_date = (?) ";
							Monthlyvisitingschedule.app.dbConnection.execute(checkIfExist,[sph_id,visitor_id,visit_date],(err,targetData)=>{
								
								console.log(visitortype);
								
								// if does exist
								if(targetData.length > 0){
									var updateQuery = "update [monthly_visiting_schedule] set status = (?) where dv_id = (?)";
									var updateArr = [status,targetData[0].dv_id];
									
									Monthlyvisitingschedule.app.dbConnection.execute(updateQuery,updateArr,(err,target)=>{
										
										var updateArr = { "visit_date":visit_date,"sph_mobile":sphMobileNo,"visitor_mobile":hpbMobileNo, "status":"updated", "visit_status":visit_status, "class":"badge-warning" };
										insertedData.push(updateArr);
										
										counter++;
										if(counter == (jsonData.length)){
											cb(null,insertedData);
										}
									});
								}
								else{
									var insertQuery = "insert into [monthly_visiting_schedule] (sph_id,visitor_id,visit_date,visitor_type,visitor_name,status,created_by,created_date,updated_by,updated_date) OUTPUT Inserted.dv_id values ((?),(?),(?),(?),(?),(?),(?),(?),(?),(?))";
									var insertArr = [sph_id,visitor_id,visit_date,visitortype,visitorname,status,313,createdAt,313,createdAt];
									
									Monthlyvisitingschedule.app.dbConnection.execute(insertQuery,insertArr,(err,target)=>{
										
										var updateArr = { "visit_date":visit_date,"sph_mobile":sphMobileNo,"visitor_mobile":hpbMobileNo, "status":"inserted", "visit_status":visit_status, "class":"badge-success" };
										insertedData.push(updateArr);
										
										counter++;
										if(counter == (jsonData.length)){
											cb(null,insertedData);
										}
									});
								}
							});
							
						}
						else{ // if visitor is invalid
							counter++;
							var updateArr = { "visit_date":visit_date,"sph_mobile":sphMobileNo,"visitor_mobile":hpbMobileNo, "status":"failed", "visit_status":visit_status, "class":"badge-danger" };
							insertedData.push(updateArr);
							if(counter == (jsonData.length)){
								cb(null,insertedData);
							}
							console.log("Incorrect ids");
						}	
					
					});
				}
				else{ // if sph is invalid
					counter++;
					var updateArr = { "visit_date":visit_date,"sph_mobile":sphMobileNo,"visitor_mobile":hpbMobileNo, "status":"failed", "visit_status":visit_status, "class":"badge-danger" };
					insertedData.push(updateArr);
					
					if(counter == jsonData.length){
						cb(null,insertedData);
					}
				}
			});
		},
		function(err) {
			// if any of the file processing produced an error, err would equal that error
			if( err ) {
				// One of the iterations produced an error.
				// All processing will now stop.
				console.log('A file failed to process');
			} else {
				console.log('All files have been processed successfully');
			}
		});
	}
	
	Monthlyvisitingschedule.remoteMethod('insertMonthlyVisitingTarget',{
		http:{ path:'/insertMonthlyVisitingTarget', verb:'post' },
		accepts:[
					{ arg:"jsonData", type:"array" },
					{ arg:"month", type:"number" },
					{ arg:"year", type:"number" }
				],
		returns:{ arg:"result", type:"object" }
	});
	
	
	
	// to filter data and give the output
	Monthlyvisitingschedule.getMonthlyVisitingTarget = function(sph_id,cb){
		var sqlQuery = "select u.realm as sph_name, mt.* from [monthly_visiting_schedule] mt, [User] u where mt.sph_id = u.id ";
		var dataArr = [];
		
		if(sph_id){
			sqlQuery+=" AND mt.sph_id = (?)";
			dataArr.push(sph_id);
		}
		sqlQuery+=" ORDER BY mt.dv_id DESC";
		Monthlyvisitingschedule.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Monthlyvisitingschedule.remoteMethod('getMonthlyVisitingTarget',{
		http:{ path:"/getMonthlyVisitingTarget", verb:"get" },
		accepts:[
					{ arg:"sph_id", type:"number", source:{ http:"query"}}
				],
		returns:{ arg:"result", type:"object" }
	});
};