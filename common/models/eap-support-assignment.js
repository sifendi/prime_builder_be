'use strict';

module.exports = function(Eapsupportassignment) {
	
	// function getData(){
	// 	return new Promise(function(resolve,reject){
	// 		resolve(true);
	// 	});
	// }

	Eapsupportassignment.afterRemote('addEditSupportAssignment', function(context, repsData,next) {
			var response_id = repsData['result']['id'];
			if(response_id>0){
				var dataArrObj = context.args.dataArrObj;
				var NotificationCenterModal = Eapsupportassignment.app.models.app_notification_center;
				var UserModal = Eapsupportassignment.app.models.user;
				var LeadModal = Eapsupportassignment.app.models.eap_lead;
				if(dataArrObj['lead_id']>0 && dataArrObj['sph_id']>0 && dataArrObj['status']==1){
					var lead_id = dataArrObj['lead_id'];
					var sph_id = dataArrObj['sph_id'];
					var ntc_type_id = response_id;
					var ntc_type = "eap_lead_support_assignment_added";
					var currDateTime =  Math.floor(Date.now());
					var notificationArr=[];	

					
					
					if(context.args['Eapsupport_id']>0){
						ntc_type = "eap_lead_support_assignment_updated";
					}else{
						ntc_type = "eap_lead_support_assignment_added";
					}


					LeadModal.findOne({where: { lead_id:lead_id }}, function(err, leadResData) {
						if(!err){
							var lead_created_by = leadResData['created_by'];
							var leadDataObj = leadResData;

							var toSPHUserId=sph_id;
							var toSPHUserData = {};

							var fromEAPUserId = lead_created_by;
							var fromEAPUserData={};
							
					

							UserModal.findOne({where: { id:lead_created_by }}, function(err2, userResData) {
								if(!err2){
										fromEAPUserData['uid']=userResData['id'];
										fromEAPUserData['name']=userResData['realm'];
										fromEAPUserData['username']=userResData['username'];
										fromEAPUserData['email']=userResData['email'];
										UserModal.findOne({where: { id:sph_id }}, function(err1, userResData1) {
										if(!err1){
											toSPHUserData['uid']=userResData1['id'];
											toSPHUserData['name']=userResData1['realm'];
											toSPHUserData['username']=userResData1['username'];
											toSPHUserData['email']=userResData1['email'];
											var currNotificationsObject={
											"ntc_app_name": "EAP",
											"ntc_type": ntc_type,
											"ntc_type_id": ntc_type_id,
											"ntc_type_data": JSON.stringify(leadDataObj),
											"ntc_from_user_id": fromEAPUserId,
											"ntc_from_user_data":JSON.stringify(fromEAPUserData),
											"ntc_to_user_id": toSPHUserId,
											"ntc_to_user_data": JSON.stringify(toSPHUserData),
											"ntc_user_read_flag": 0,
											"created_date": currDateTime,
											"updated_date": currDateTime,
											"status": 1
											};
											notificationArr.push(currNotificationsObject); 

											

											var currNotificationsObjectN={
											"ntc_app_name": "EAP",
											"ntc_type": ntc_type,
											"ntc_type_id": ntc_type_id,
											"ntc_type_data": JSON.stringify(leadDataObj),
											"ntc_from_user_id": toSPHUserId,
											"ntc_from_user_data":JSON.stringify(toSPHUserData),
											"ntc_to_user_id": fromEAPUserId,
											"ntc_to_user_data": JSON.stringify(fromEAPUserData),
											"ntc_user_read_flag": 0,
											"created_date": currDateTime,
											"updated_date": currDateTime,
											"status": 1
											};
											notificationArr.push(currNotificationsObjectN); 
											NotificationCenterModal.create(notificationArr,(err,models)=>{});

										}
									});

								}
							});
						

						}	
					});



				}
					
			} 
			next();
	});

	// to add/edit Eap Support Assignment
	Eapsupportassignment.addEditSupportAssignment = function(dataArrObj,Eapsupport_id,cb){
		if(Eapsupport_id){
			Eapsupportassignment.getEapsupportassignment({id:Eapsupport_id}, function(err,EapsupportassignmentData){
				if(EapsupportassignmentData){
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
					dataArr.push(Eapsupport_id);
					var sqlQuery = "update [eap_support_assignment] set "+paramsKey+" "+whereCond;
					
					
				
					Eapsupportassignment.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = Eapsupport_id;
						result.updated_date = dataArrObj.updated_date;
						
						var sqlQueryUU = `update [eap_lead] set updated_date=${dataArrObj.updated_date} WHERE lead_id=${dataArrObj.lead_id}`;
						Eapsupportassignment.app.dbConnection.execute(sqlQueryUU,[],(err1,resultObj1)=>{
						});
						
						cb(err,result);
					});
				}
				else{
					cb("Invalid id",null);
				}
			});
		}
		else{
			var created_date = Math.floor(Date.now()); // to get server created date
			dataArrObj.created_date = created_date;
			dataArrObj.updated_date = created_date;
			
			var approvalArr = [];
			var paramsArr = [];
			
			for(var o in dataArrObj) {
				approvalArr.push(dataArrObj[o]);
				paramsArr.push("(?)");
			}
			var paramsKey = paramsArr.join(', ');
			var keyString = Object.keys(dataArrObj).join(', ');
			
			
			var sqlQuery = "insert into [eap_support_assignment] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

			Eapsupportassignment.app.dbConnection.execute(sqlQuery,approvalArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].id;
					result.updated_date = created_date;
					var sqlQueryUU = `update [eap_lead] set updated_date=${dataArrObj.updated_date} WHERE lead_id=${dataArrObj.lead_id}`;
						Eapsupportassignment.app.dbConnection.execute(sqlQueryUU,[],(err1,resultObj1)=>{
					});
				}
				cb(err,result);
			});
		}
	}
	
	Eapsupportassignment.remoteMethod('addEditSupportAssignment',{
		http:{ path:'/addEditSupportAssignment', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'Eapsupport_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});
	
	
	// to get support assigned
	Eapsupportassignment.getEapsupportassignment = function(dataArrObj,user_id,rolename,cb){
		
		var supportArr = [];
		var paramsArr = [];
		
		if(user_id > 0 && rolename == "$ac"){
			var sqlQuery = "select segment_name, es.*, el.*, u.realm, eu.realm as eap_name, el.lead_id as leadId, el.created_date as lead_date from eap_lead el join [User] eu on eu.id = el.created_by and el.lead_sub_district_id in (select distinct sd.id from user_mapping um join municipality m on um.meta_value = m.district_id join subdistrict sd on sd.municipality_id = m.id where um.uid = (?) and  meta_key = 'district_id') join eap_master_lead_segment els on el.lead_segment = els.segment_id  left join eap_support_assignment es on es.lead_id = el.lead_id and es.status = 1 left join [User] u on u.id = es.sph_id where lead_support_ac = 1 ";
			supportArr.push(user_id);
		}else{
			var sqlQuery = "select segment_name, es.*, el.*, u.realm, eu.realm as eap_name, el.lead_id as leadId, el.created_date as lead_date from eap_lead el join [User] eu on eu.id = el.created_by join eap_master_lead_segment els on el.lead_segment = els.segment_id  left join eap_support_assignment es on es.lead_id = el.lead_id and es.status = 1 left join [User] u on u.id = es.sph_id where lead_support_ac = 1 ";
		}	
		
		for(var o in dataArrObj) {
			if(dataArrObj[o]!=""){
				if(o == "created_date"){
					sqlQuery+=" AND es."+o+" > (?)";
					supportArr.push(dataArrObj[o]);
				}
				else if(o == "updated_date"){
					sqlQuery+=" AND es."+o+" < (?)";
					supportArr.push(dataArrObj[o]);
				}
				else if(o == "lead_id"){
					sqlQuery+=" AND el.lead_id = (?)";
					supportArr.push(dataArrObj[o]);
				}
				else if(o == "lead_name"){
					sqlQuery+=" AND el.lead_name like (?)";
					supportArr.push("%"+dataArrObj[o]+"%");
				}
				else if(o != "limit" && o != "page"){
					sqlQuery+=" AND es."+o+" = (?)";
					supportArr.push(dataArrObj[o]);
				}else{
					if(o=='limit'){
						if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
						var offset = dataArrObj['page']*dataArrObj['limit'];
						
						sqlQuery+="  ORDER BY es.id DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
						supportArr.push(offset,dataArrObj[o]);
					}
				}
			}
		}
		
		Eapsupportassignment.app.dbConnection.execute(sqlQuery,supportArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}
	
	Eapsupportassignment.remoteMethod('getEapsupportassignment',{
		http:{ path:'/getEapsupportassignment', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'user_id', type:'number'},
					{ arg: 'rolename', type:'string'}
				],
		returns:{ arg: 'result', type: 'object'}
	});

	// to get support assigned
	Eapsupportassignment.getEapsupportassignmentCount = function(dataArrObj,user_id,rolename,cb){
		
		var supportArr = [];
		var paramsArr = [];
		
		if(user_id > 0 && rolename == "$ac"){
			//var sqlQuery = "select count(el.lead_id) as total from eap_lead el join [User] eu on eu.id = el.created_by and el.lead_sub_district_id in (select um.meta_value from user_mapping um where um.uid = (?) and meta_key = 'district_id') join eap_master_lead_segment els on el.lead_segment = els.segment_id  left join eap_support_assignment es on es.lead_id = el.lead_id and es.status = 1 left join [User] u on u.id = es.sph_id where lead_support_ac = 1 ";
			var sqlQuery = "select count(el.lead_id) as total from eap_lead el join [User] eu on eu.id = el.created_by and el.lead_sub_district_id in (select distinct sd.id from user_mapping um join municipality m on um.meta_value = m.district_id join subdistrict sd on sd.municipality_id = m.id where um.uid = (?) and  meta_key = 'district_id') join eap_master_lead_segment els on el.lead_segment = els.segment_id left join eap_support_assignment es on es.lead_id = el.lead_id and es.status = 1 left join [User] u on u.id = es.sph_id where lead_support_ac = 1";
			supportArr.push(user_id);
		}else{
			var sqlQuery = "select count(el.lead_id) as total from eap_lead el join [User] eu on eu.id = el.created_by left join eap_support_assignment es on es.lead_id = el.lead_id  and es.status = 1 left join [User] u on u.id = es.sph_id where lead_support_ac = 1 ";
		}
		
		for(var o in dataArrObj) {
			if(o == "created_date"){
				sqlQuery+=" AND es."+o+" > (?)";
				supportArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND es."+o+" < (?)";
				supportArr.push(dataArrObj[o]);
			}
			else if(o == "lead_id" && dataArrObj[o] != ""){
				sqlQuery+=" AND el.lead_id = (?)";
				supportArr.push(dataArrObj[o]);
			}
			else if(o != "limit" && o != "page" && dataArrObj[o] != ""){
				sqlQuery+=" AND es."+o+" = (?)";
				supportArr.push(dataArrObj[o]);
			}else{

				// if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
				// var offset = dataArrObj['page']*limit;
				
				// sqlQuery+="  ORDER BY es.id DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
				// supportArr.push(dataArrObj[o],offset);
			}
		}
		Eapsupportassignment.app.dbConnection.execute(sqlQuery,supportArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}
	
	Eapsupportassignment.remoteMethod('getEapsupportassignmentCount',{
		http:{ path:'/getEapsupportassignmentCount', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'user_id', type:'number'},
					{ arg: 'rolename', type:'string'}
				],
		returns:{ arg: 'result', type: 'object'}
	});

};