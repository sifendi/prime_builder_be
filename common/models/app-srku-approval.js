'use strict';
var async = require('async');
module.exports = function(Appsrkuapproval) {
	
	// to add project approval

	Appsrkuapproval.afterRemote('addEditSrkuApproval', function(context, repsData,next) {
		var ProjectModal = Appsrkuapproval.app.models.app_projects;
		if(context.args.dataArrObj['is_closed']==0 && context.args.dataArrObj['srku_approval_status']==0){
				
			  var project_id = context.args.dataArrObj['project_id']; 
			  ProjectModal.findOne({where: { project_id:project_id }}, function(err, projectData) {
				  //	console.log('created_by',projectData['created_by']);
				  //	console.log('updated_by',projectData['updated_by']);
					  	var project_created_by = projectData['created_by'];
					  	var project_updated_by = projectData['updated_by'];
					  	var uid= project_created_by;
					  	//var sqlQuery=`select distinct um.uid, u.realm as user_name, r.name as rolename from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, user_mapping um2, postal_code p where u.id = rm.principalId and um2.meta_value = p.subdistrict_id and um.meta_value = p.id and u.id = um.uid and r.id = rm.roleId and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id and um.meta_key = 'subdistrict_id' and um.meta_value in ( select subdistrict_id from postal_code where id in ( select meta_value from user_mapping where uid = ${uid} and meta_key = 'postal_code' ) )`;
			 			var sqlQuery=`exec relatedUserFetch ${uid}`;
			 			var dataArr = [];
				 		Appsrkuapproval.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObjArrs)=>{
							//	console.log('sqlQuery',sqlQuery);
								console.log('resultObjArrs',resultObjArrs); 
								if(!err){
									var NotificationCenterModal = Appsrkuapproval.app.models.app_notification_center;
									async.each(resultObjArrs,(resultObj,callback)=>{

										if(resultObj['uid']>0 && resultObj['rolename']=='$tlh'){

											Appsrkuapproval.find({where: { project_id:project_id }}, function(err, srkuResAppData) {

											console.log('srkuResAppData length',srkuResAppData.length);
				 							var srkuResAppDataTotal = srkuResAppData['length']?srkuResAppData['length']:0;
											var dataObjArr=[];
											var fromUserData={};
											fromUserData['created_by']=project_created_by;
											fromUserData['updated_by']=project_updated_by;
											var created_date = Math.floor(Date.now()); // to get server created date
											var updated_date = Math.floor(Date.now()); // to get server created date
											
											var ntc_type="";
											if(srkuResAppDataTotal>1){
												ntc_type="srku_project_updated";
											}else{
												ntc_type="srku_project_added";
											}

											var UserModal = Appsrkuapproval.app.models.user;

										   UserModal.findOne({where: { id:project_created_by }}, function(err, userResData) {
											
											fromUserData['name']=userResData['realm'];
											fromUserData['username']=userResData['username'];
											fromUserData['email']=userResData['email'];
											var currNotificationsObject={
											"ntc_app_name": "HPB",
											"ntc_type": ntc_type,
											"ntc_type_id": project_id,
											"ntc_type_data": JSON.stringify(projectData),
											"ntc_from_user_id": project_created_by,
											"ntc_from_user_data":JSON.stringify(fromUserData),
											"ntc_to_user_id": resultObj['uid'],
											"ntc_to_user_data": JSON.stringify(resultObj),
											"ntc_user_read_flag": 0,
											"created_date": created_date,
											"updated_date": updated_date,
											"status": 1
											};
											dataObjArr.push(currNotificationsObject);
											NotificationCenterModal.create(dataObjArr,(err,models)=>{
												console.log('notification created',models);
												callback();
											});

										   });

										
										});


										}else{
												callback();
										}

									},(endEachD)=>{
												
									});

								}
						});
			  });

		}else if(context.args['srku_approval_id']>0 && context.args.dataArrObj['approved_by']>0 && context.args.dataArrObj['srku_approval_status']!=0){
			 	   console.log('addEditSrkuApproval Update Approval',context.args['srku_approval_id']);
				   
			  var project_id = context.args.dataArrObj['project_id']; 
			  var srku_approval_id = context.args['srku_approval_id'];
			  
			  Appsrkuapproval.findOne({where: { srku_approval_id:srku_approval_id }}, function(err, srkuResAppData) {
			  	console.log('srkuResAppData',srkuResAppData);
			   if(srkuResAppData['is_closed']==0){

			 

			   ProjectModal.findOne({where: { project_id:project_id }}, function(err, projectData) {

									  	var approved_by = context.args.dataArrObj['approved_by'];
									  	var project_created_by = projectData['created_by'];
									  	var project_updated_by = projectData['updated_by'];
									  	var uid= approved_by;
									  	
										var NotificationCenterModal = Appsrkuapproval.app.models.app_notification_center;
									

											var dataObjArr=[];
											var fromUserData={};
											fromUserData['approved_by']=approved_by;
											fromUserData['updated_by']=project_updated_by;
											var toUserData={};
											toUserData['project_created_by']=project_created_by;
											var created_date = Math.floor(Date.now()); // to get server created date
											var updated_date = Math.floor(Date.now()); // to get server created date
											var ntc_type = "";
											if(context.args.dataArrObj['srku_approval_status']==1){
												ntc_type="srku_project_approved";
											}else if(context.args.dataArrObj['srku_approval_status']==-1){
												ntc_type="srku_project_reject";
											}	




											var currNotificationsObject={
											"ntc_app_name": "HPB",
											"ntc_type": ntc_type,
											"ntc_type_id": project_id,
											"ntc_type_data": JSON.stringify(projectData),
											"ntc_from_user_id": approved_by,
											"ntc_from_user_data":JSON.stringify(fromUserData),
											"ntc_to_user_id": project_created_by,
											"ntc_to_user_data": JSON.stringify(toUserData),
											"ntc_user_read_flag": 0,
											"created_date": created_date,
											"updated_date": updated_date,
											"status": 1
											};
											dataObjArr.push(currNotificationsObject);
											NotificationCenterModal.create(dataObjArr,(err,models)=>{
												console.log('notification created',models);
											});

			  });

			}

			});

		}	


		next();
	}); 

	Appsrkuapproval.addEditSrkuApproval = function(dataArrObj,srku_approval_id,cb){
		
		var created_date = Math.floor(Date.now());
		var updated_date = Math.floor(Date.now());
		
		if(srku_approval_id){
			Appsrkuapproval.findOne({ where:{ srku_approval_id:srku_approval_id }}, function(err,projectData){
				if(projectData){
					
					dataArrObj.updated_date = updated_date;
					
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where srku_approval_id = (?)';
					dataArr.push(srku_approval_id);
					var sqlQuery = "update [srku_approval_status_tbl] set "+paramsKey+" "+whereCond;
				
					Appsrkuapproval.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = srku_approval_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid srku approval id",null);
				}
			});
		}
		else{
			// validate the project id, if valid, insert the records
			var projectApp = Appsrkuapproval.app.models.app_projects;
			projectApp.findOne({ where:{ project_id:dataArrObj.project_id }}, (err,projectData)=>{
				if(projectData){
					
					// check if there is an entry against this approval
					var checkIfApprovalExist = "select * from srku_approval_status_tbl where project_id = (?) and is_closed = 0 and srku_approval_status = 1";
					Appsrkuapproval.app.dbConnection.execute(checkIfApprovalExist,[dataArrObj['project_id']],(err,resultObj)=>{
						
						if(resultObj && resultObj.length > 0){
							// return false
							cb(null,null);
						}
						else{
							dataArrObj.created_date = created_date;
							dataArrObj.updated_date = updated_date;
							
							var srkuArr = [];
							var paramsArr = [];
							
							for(var o in dataArrObj) {
								srkuArr.push(dataArrObj[o]);
								paramsArr.push("(?)");
							}
							
							var paramsKey = paramsArr.join(', ');
							var keyString = Object.keys(dataArrObj).join(', ');
							
							// add the product receipt
							var sqlQuery = "insert into [srku_approval_status_tbl] ("+keyString+") OUTPUT Inserted.srku_approval_id values ("+paramsKey+")";
							
							Appsrkuapproval.app.dbConnection.execute(sqlQuery,srkuArr,(err,resultObj)=>{
								var result = {};
								if(resultObj.length > 0){
									result.id = resultObj[0].srku_approval_id;
									result.updated_date = created_date;
								}
								cb(err,result);
							});
						}
						
					});
					
					
				}else{
					cb("Invalid project id",null);
				}
			});
		}
	}
	
	Appsrkuapproval.remoteMethod('addEditSrkuApproval',{
		http:{ path: '/addEditSrkuApproval', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'srku_approval_id', type:'number', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object' }
	});
	
	// to get project receipt approval status
	Appsrkuapproval.getSrkuApproval = function(srku_approval_id, project_id, approved_by, limit, page, created_date, updated_date, cb){
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		
		var dataArr = [];
		var sqlQuery = "select sk.* from projects_tbl p, srku_approval_status_tbl sk where p.project_id = sk.project_id ";
		
		if(srku_approval_id){
			sqlQuery+=" AND sk.srku_approval_id = (?) ";
			dataArr.push(srku_approval_id);
		}
		if(project_id){
			sqlQuery+=" AND p.project_id = (?) ";
			dataArr.push(project_id);
		}
		if(approved_by){
			sqlQuery+=" AND sk.approved_by = (?) ";
			dataArr.push(approved_by);
		}
		if(created_date){
			sqlQuery+=" AND sk.created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			sqlQuery+=" AND sk.updated_date > (?) ";
			dataArr.push(updated_date);
		}
		if(limit){
			sqlQuery+=" ORDER BY sk.srku_approval_id OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Appsrkuapproval.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObject)=>{
			cb(null,resultObject);
		});
	}
	
	Appsrkuapproval.remoteMethod('getSrkuApproval',{
		http:{ path: '/getSrkuApproval', verb: 'get'},
		accepts:[
					{ arg: 'srku_approval_id', type: 'number', source:{http:'query'}},
					{ arg: 'project_id', type: 'number', source:{http:'query'}},
					{ arg: 'approved_by', type: 'number', source:{http:'query'}},
					{ arg: 'limit', type: 'number', source:{http:'query'}},
					{ arg: 'page', type: 'number', source:{http:'query'}},
					{ arg:'created_date', type: 'number', source:{http:'query'}},
					{ arg:'updated_date', type: 'number', source:{http:'query'}}
				],
		returns:{ arg: 'result', type: 'object'}
	});

};