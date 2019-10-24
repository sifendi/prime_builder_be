'use strict';
var async = require('async');
module.exports = function(Eapsupportchat) {
	
	Eapsupportchat.afterRemote('addEditSupportChat', function(context, repsData,next) {
			var response_id = repsData['result']['id'];
			if(response_id>0 && !context.args['Eapchat_id']){
				var dataArrObj = context.args.dataArrObj;
				var NotificationCenterModal = Eapsupportchat.app.models.app_notification_center;
				var UserModal = Eapsupportchat.app.models.user;
				var LeadModal = Eapsupportchat.app.models.eap_lead;
				var LeadSupportModal = Eapsupportchat.app.models.eap_support_assignment;

				var ntc_type_id = response_id;
				var ntc_type = "eap_lead_chat_added";
				var currDateTime =  Math.floor(Date.now());
				var notificationArr=[];	
				var chat_lead_id=dataArrObj['chat_lead_id'];
				var chat_from_id=dataArrObj['chat_from_id'];
				LeadModal.findOne({where: { lead_id:chat_lead_id }}, function(err, leadResData) {
					if(!err){
						var lead_created_by=leadResData['created_by'];
						LeadSupportModal.findOne({where: {"and":[{ lead_id:chat_lead_id },{ status:1 }]}}, function(err1, leadSResData) {
							if(!err1){
								var lead_sph_id=leadSResData['sph_id'];
								UserModal.findOne({where: { id:lead_created_by }}, function(err2, userResDataEAP) {
									if(!err2){
										UserModal.findOne({where: { id:lead_sph_id }}, function(err3, userResDataSPH) {
											if(!err3){

												var fromUserId = 0;
												var fromUserData={};
												var toUserId = 0;
												var toUserData={};
											   if(chat_from_id==lead_created_by){
													// from EAP to All
													fromUserId = lead_created_by;
													fromUserData['uid']=fromUserId;
													fromUserData['name']=userResDataEAP['realm'];
													fromUserData['username']=userResDataEAP['username'];
													fromUserData['email']=userResDataEAP['email'];

													toUserId = lead_sph_id;
													toUserData['uid']=toUserId;
													toUserData['name']=userResDataSPH['realm'];
													toUserData['username']=userResDataSPH['username'];
													toUserData['email']=userResDataSPH['email'];

													ntc_type=ntc_type+"_eap";
												}else if(chat_from_id==lead_sph_id){
													// From SPH to All
													fromUserId = lead_sph_id;
													fromUserData['uid']=fromUserId;
													fromUserData['name']=userResDataSPH['realm'];
													fromUserData['username']=userResDataSPH['username'];
													fromUserData['email']=userResDataSPH['email'];

													toUserId = lead_created_by;
													toUserData['uid']=toUserId;
													toUserData['name']=userResDataEAP['realm'];
													toUserData['username']=userResDataEAP['username'];
													toUserData['email']=userResDataEAP['email'];
													ntc_type=ntc_type+"_sph";
												}

												var currNotificationsObject={
												"ntc_app_name": "EAP",
												"ntc_type": ntc_type,
												"ntc_type_id": ntc_type_id,
												"ntc_type_data": JSON.stringify(dataArrObj),
												"ntc_from_user_id": fromUserId,
												"ntc_from_user_data":JSON.stringify(fromUserData),
												"ntc_to_user_id": toUserId,
												"ntc_to_user_data": JSON.stringify(toUserData),
												"ntc_user_read_flag": 0,
												"created_date": currDateTime,
												"updated_date": currDateTime,
												"status": 1
												};
												notificationArr.push(currNotificationsObject); 


												var sqlQuery=`exec relatedUserFetch ${lead_sph_id}`;
			 									var dataArr = [];

			 									Eapsupportchat.app.dbConnection.execute(sqlQuery,dataArr,(err4,resultObjArrs)=>{
			 										if(!err4){
		 												async.each(resultObjArrs,(resultObj,callback)=>{
		 													if(resultObj['uid']>0 && (resultObj['rolename']=='$tlh' || resultObj['rolename']=='$ac')){
																var toUserIdN=resultObj['uid'];
																var toUserDataN={};
																toUserDataN['uid']=toUserIdN;
																toUserDataN['ext_data']=toUserData;
																var currNotificationsObjectN={
																"ntc_app_name": "EAP",
																"ntc_type": ntc_type,
																"ntc_type_id": ntc_type_id,
																"ntc_type_data": JSON.stringify(dataArrObj),
																"ntc_from_user_id": fromUserId,
																"ntc_from_user_data":JSON.stringify(fromUserData),
																"ntc_to_user_id": toUserIdN,
																"ntc_to_user_data": JSON.stringify(toUserDataN),
																"ntc_user_read_flag": 0,
																"created_date": currDateTime,
																"updated_date": currDateTime,
																"status": 1
																};
																notificationArr.push(currNotificationsObjectN); 

		 													}
		 													callback();
		 												},(endEachD)=>{
																NotificationCenterModal.create(notificationArr,(err,models)=>{});	
														});
			 										}
			 									});
											}
										});
									}
							   });

							}
						});
					}
				});
			} 
			next();
	});

	
	// to add/edit Eapsupportchat
	Eapsupportchat.addEditSupportChat = function(dataArrObj,Eapchat_id,cb){
		var UserModel = Eapsupportchat.app.models.user;
		// search the user
		//UserModel.findOne({where:{id:1}}, function(err, user) {
			//if(!user){
				if(Eapchat_id){
					Eapsupportchat.geteapSupportChat({chat_id:Eapchat_id}, function(err,EapsupportchatData){
						if(EapsupportchatData){
							var updated_date = Math.floor(Date.now()); // to get server created date
							dataArrObj.updated_date = updated_date;
							
							var dataArr = [];
							var paramsArr = [];
							
							for(var o in dataArrObj) {
								dataArr.push(dataArrObj[o]);
								paramsArr.push(o+"=(?)");
							}
							
							let paramsKey= paramsArr.join(', ');
							var whereCond = 'where chat_id = (?)';
							dataArr.push(Eapchat_id);
							var sqlQuery = "update [eap_support_chat] set "+paramsKey+" "+whereCond;
						
							Eapsupportchat.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
								var result = {};
								result.id = Eapchat_id;
								result.updated_date = dataArrObj.updated_date;
								cb(err,result);
							});
						}
						else{
							cb("Invalid Eapsupportchat id",null);
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
					
					
					var sqlQuery = "insert into [eap_support_chat] ("+keyString+") OUTPUT Inserted.chat_id values ("+paramsKey+")";

					Eapsupportchat.app.dbConnection.execute(sqlQuery,approvalArr,(err,resultObj)=>{
						var result = {};
						if(resultObj.length > 0){
							result.id = resultObj[0].chat_id;
							result.updated_date = created_date;
						}
						cb(err,result);
					});
				}
		// 	}else{
		// 		cb("Invalid User id",null);
		// 	}
		// });
	}
	
	Eapsupportchat.remoteMethod('addEditSupportChat',{
		http:{ path:'/addEditSupportChat', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'Eapchat_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	// to get chat
	Eapsupportchat.geteapSupportChat = function(dataArrObj,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var alisTblName="chat";
		var sqlQuery = "select chat.*,u.realm,ld.lead_name from eap_support_chat chat join [User] u on chat.chat_from_id=u.id join eap_lead ld on ld.lead_id=chat.chat_lead_id where 1=1";
		for(var o in dataArrObj) {
			if(o == 'created_date'){
				sqlQuery+=" AND "+alisTblName+".created_date > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND "+alisTblName+".updated_date > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o != 'limit'){
				sqlQuery+=" AND "+alisTblName+"."+o+" = (?)";
				leadArr.push(dataArrObj[o]);
			}
		}
		
		if(dataArrObj['limit']){
			if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
			var offset = dataArrObj['page']*dataArrObj['limit'];
			sqlQuery+="  ORDER BY chat_id ASC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY "; 
			leadArr.push(dataArrObj['limit'],offset);
		}
		else{
			sqlQuery+="  ORDER BY chat_id ASC ";
		}
		console.log('sqlQuery',sqlQuery);
		console.log('leadArr',leadArr);
		Eapsupportchat.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}
	
	Eapsupportchat.remoteMethod('geteapSupportChat',{
		http:{ path:'/geteapSupportChat', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	// to get chat for dashboard
	Eapsupportchat.geteapSupportChatDashboard = function(dataArrObj,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var sqlQuery = "select distinct ld.lead_name, chat.chat_lead_id from eap_support_chat chat join [User] u on chat.chat_from_id=u.id join eap_lead ld on ld.lead_id=chat.chat_lead_id  where 1=1";
		
		for(var o in dataArrObj) {
			if(o == "created_date"){
				sqlQuery+=" AND "+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND "+o+" < (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o =="lead_name"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ld."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o =="chat_mesage"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND chat."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o =="realm"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND u."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o =="reqDateFrom"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND chat.created_date >= (?)";
					leadArr.push(dataArrObj['reqDateFrom']);
				}
			}
			else if(o =="reqDateTo"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND chat.created_date <= (?)";
					leadArr.push(dataArrObj['reqDateTo']);
				}
			}
			else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND chat."+o+" = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}else if(o == "page"){
				if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
				var offset = dataArrObj['page']*dataArrObj['limit'];

				sqlQuery+=" ORDER BY chat.chat_lead_id DESC OFFSET (?)";
				leadArr.push(offset);
			}else{
				sqlQuery+=" ROWS FETCH NEXT (?) ROWS ONLY";
				leadArr.push(dataArrObj['limit']);
			}
		}

		Eapsupportchat.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Eapsupportchat.remoteMethod('geteapSupportChatDashboard',{
		http:{ path:'/geteapSupportChatDashboard', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});


	// to get message from data
	Eapsupportchat.geteapSupportChatFrom = function(dataArrObj,cb){
		var leadArr = [];
		var paramsArr = [];
		var sqlQuery = "select distinct u.realm, chat.chat_from_id from eap_support_chat chat join [User] u on chat.chat_from_id=u.id join eap_lead ld on ld.lead_id=chat.chat_lead_id  where 1=1";

		for(var o in dataArrObj) {
			
			if(o =="realm"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND u."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}

			sqlQuery+=" ORDER BY chat.chat_from_id DESC";
		}

		Eapsupportchat.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}

	Eapsupportchat.remoteMethod('geteapSupportChatFrom',{
		http:{ path:'/geteapSupportChatFrom', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});


	//new function
	Eapsupportchat.geteapSupportChatDashCount = function(dataArrObj,cb){
		var leadArr = [];

		var sqlQuery = "select count(distinct chat.chat_lead_id) as total from eap_support_chat chat join [User] u on chat.chat_from_id=u.id join eap_lead ld on ld.lead_id=chat.chat_lead_id  where 1=1";

		for(var o in dataArrObj) {
			if(o == "created_date"){
				sqlQuery+=" AND "+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND "+o+" < (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o =="lead_name"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ld."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o =="chat_mesage"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND chat."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o =="realm"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND u."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o =="reqDateFrom"){
				if(dataArrObj[o]!=''){
				sqlQuery+=" AND chat.created_date >= (?)"
				leadArr.push(dataArrObj['reqDateFrom']);

				}
			}
			else if(o =="reqDateTo"){
				if(dataArrObj[o]!=''){
				sqlQuery+=" AND chat.created_date <= (?)"
				leadArr.push(dataArrObj['reqDateTo']);

				}
			}
			else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND "+o+" = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
		}

		Eapsupportchat.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}

	Eapsupportchat.remoteMethod('geteapSupportChatDashCount',{
		http:{ path:'/geteapSupportChatDashCount', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
				],
		returns:{ arg: 'result', type: 'object'}
	});



};