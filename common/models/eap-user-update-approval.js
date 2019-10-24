'use strict';

module.exports = function(Eapuserupdateapproval) {
	// to add/edit lead
	Eapuserupdateapproval.getUpdateUser = function(dataArrObj,limit,cb){
		
		var userArr = [];
		var paramsArr = [];
		var DateFilCount = 0 ;
		var sqlQuery ="select u.realm, eua.* from eap_user_update_approval eua join [User] u on eua.uid = u.id where 1=1";
		for(var o in dataArrObj) {
			if(o =="realm"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND u."+o+" Like (?)";
					userArr.push('%'+dataArrObj[o]+'%');
				}
			}else if(o =="field_old_value"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND eua."+o+" Like (?)";
					userArr.push('%'+dataArrObj[o]+'%');
				}
			}else if(o =="field_new_value"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND eua."+o+" Like (?)";
					userArr.push('%'+dataArrObj[o]+'%');
				}
			}else if(o =="created_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND eua."+o+" >= (?)";
					userArr.push(dataArrObj[o]);
				}
			}else if(o =="updated_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND eua."+o+" >= (?)";
					userArr.push(dataArrObj[o]);
				}
			}else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND eua."+o+" = (?)";
					userArr.push(dataArrObj[o]);
				}
			}else{
				if(o=='limit'){
					if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
					var offset = dataArrObj['page']*dataArrObj['limit'];
					
					sqlQuery+="  ORDER BY eua.created_date DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
					userArr.push(offset,dataArrObj[o]);
				}
			}
		}

		// console.log("Query",sqlQuery);
		// console.log("userArr",userArr);

		Eapuserupdateapproval.app.dbConnection.execute(sqlQuery,userArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}

	Eapuserupdateapproval.remoteMethod('getUpdateUser',{
		http:{ path:'/getUpdateUser', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'limit', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});


	Eapuserupdateapproval.getUpdateUserCount = function(dataArrObj,limit,cb){
		var userArr = [];
		var paramsArr = [];
		var DateFilCount = 0 ;
		var sqlQuery ="select count(eua.id) as total from eap_user_update_approval eua join [User] u on eua.uid = u.id where 1=1 ";
		for(var o in dataArrObj) {
			if(o =="realm"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND u."+o+" Like (?)";
					userArr.push('%'+dataArrObj[o]+'%');
				}
			}else if(o =="field_old_value"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND eua."+o+" Like (?)";
					userArr.push('%'+dataArrObj[o]+'%');
				}
			}else if(o =="field_new_value"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND eua."+o+" Like (?)";
					userArr.push('%'+dataArrObj[o]+'%');
				}
			}else if(o =="created_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND eua."+o+" >= (?)";
					userArr.push(dataArrObj[o]);
				}
			}else if(o =="updated_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND eua."+o+" >= (?)";
					userArr.push(dataArrObj[o]);
				}
			}else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND eua."+o+" = (?)";
					userArr.push(dataArrObj[o]);
				}
			}
		}

		Eapuserupdateapproval.app.dbConnection.execute(sqlQuery,userArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}

	Eapuserupdateapproval.remoteMethod('getUpdateUserCount',{
		http:{ path:'/getUpdateUserCount', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'limit', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	Eapuserupdateapproval.afterRemote('addEditEapUserUpadteApproval', function(context, repsData,next) {
		var response_id = repsData['result']['id'];
		var euupId = context.args['euupId'];
		if(response_id>0 && context.args['euupId']>0){
			var dataArrObj = context.args.dataArrObj;
			var NotificationCenterModal = Eapuserupdateapproval.app.models.app_notification_center;
			var UserModal = Eapuserupdateapproval.app.models.user;
			var notificationArr=[];	
			if(dataArrObj['approval_status']!=0){
				var ntc_type='eap_mobile_username_approved_reject';
				var ntc_type_id = euupId;
				var currDateTime =  Math.floor(Date.now());

				if(dataArrObj['approval_status']==1){
						ntc_type='eap_mobile_username_approved';
				}else if(dataArrObj['approval_status']==-1){
						ntc_type='eap_mobile_username_reject';
				}
				Eapuserupdateapproval.findOne({where: { id:euupId }}, function(err,euupData){
					//console.log('euupData',euupData,err);
					if(!err){
						if(euupData['is_closed']==0){
					
							var currNotificationsObject={
							"ntc_app_name": "EAP",
							"ntc_type": ntc_type,
							"ntc_type_id": ntc_type_id,
							"ntc_type_data": JSON.stringify(euupData),
							"ntc_from_user_id": euupData['uid'],
							"ntc_from_user_data":JSON.stringify(euupData),
							"ntc_to_user_id": euupData['uid'],
							"ntc_to_user_data": JSON.stringify(euupData),
							"ntc_user_read_flag": 0,
							"created_date": currDateTime,
							"updated_date": currDateTime,
							"status": 1
							}; 
							console.log('euupData 1',euupData);
							notificationArr.push(currNotificationsObject);  
							NotificationCenterModal.create(notificationArr,(err,models)=>{
								console.log('err',err);
							});
						}
					}
				});
			}
		}
		next();
	});


	Eapuserupdateapproval.addEditEapUserUpadteApproval = function(dataArrObj,euupId,cb){
				var UserModel = Eapuserupdateapproval.app.models.user;
		
				if(euupId){
					Eapuserupdateapproval.findOne({where: { id:euupId }}, function(err,euupData){
						if(euupData){

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
						dataArr.push(euupId);
						var sqlQuery = "update [eap_user_update_approval] set "+paramsKey+" "+whereCond;
					
							Eapuserupdateapproval.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
								
									if(!err){
										if(dataArrObj['approval_status']==1){
												var userUpQuery = `UPDATE [User] set username='${euupData['field_new_value']}' WHERE id=${euupData['uid']}`;
												Eapuserupdateapproval.app.dbConnection.execute(userUpQuery,[],(err1,resultObj)=>{
													var result = {};
													result.id = euupId;
													result.updated_date = dataArrObj.updated_date;
													cb(err,result);
												});
										}else{
												var result = {};
												result.id = euupId;
												result.updated_date = dataArrObj.updated_date;
												cb(err,result);
										}
										
									}else{
										cb(err,null);
									}
									

							});
						}else{
							cb("Invalid  id",null);
						}
				   });
					
				}
				else{
					var created_date = Math.floor(Date.now()); // to get server created date
					dataArrObj.created_date = created_date;
					dataArrObj.updated_date = created_date;
					
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push("(?)");
					}
					var paramsKey = paramsArr.join(', ');
					var keyString = Object.keys(dataArrObj).join(', ');
					
					
					var sqlQuery = "insert into [eap_user_update_approval] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

					Eapuserupdateapproval.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						if(resultObj){
							if(resultObj.length > 0){
								result.id = resultObj[0].id;
								result.updated_date = created_date;
							}
						}
						
						cb(err,result);
					});
				}
		
	}
	
	Eapuserupdateapproval.remoteMethod('addEditEapUserUpadteApproval',{
		http:{ path:'/addEditEapUserUpadteApproval', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'euupId', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

};