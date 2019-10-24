'use strict';

module.exports = function(Eapapproval) {


	Eapapproval.afterRemote('addEditEapapprovalDash', function(context, repsData,next) {
			var response_id = repsData['result']['id'];
			//console.log('response_id',response_id);
			//console.log('context.args',context.args); 
			if(response_id>0){
				var dataArrObj = context.args.dataArrObj;
				var NotificationCenterModal = Eapapproval.app.models.app_notification_center;
				var UserModal = Eapapproval.app.models.user;
				//console.log('dataArrObj',dataArrObj);
				if(context.args['lead_id']>0 && dataArrObj['approval_by']>0 && dataArrObj['approval_status']!=0){
					var currUid = context.args['eap_id'];
					var fromUserId = dataArrObj['approval_by'];
					var approval_type=dataArrObj['type'];
					var fromUserData={};
					fromUserData['uid']=fromUserId;
					var ntc_type_id = response_id;
					var ntc_type = "eap_lead_invoice_moment_approved_reject";
					var currDateTime =  Math.floor(Date.now());
					var toUserData = {};
					toUserData['uid']=currUid;
					var notificationArr=[];	
					UserModal.findOne({where: { id:currUid }}, function(err, userResData) {
						if(!err){
							toUserData['name']=userResData['realm'];
							toUserData['username']=userResData['username'];
							toUserData['email']=userResData['email'];

							if(dataArrObj['approval_status']==1){
								ntc_type = "eap_lead_"+approval_type+"_approved";
							}else if(dataArrObj['approval_status']==-1){
								ntc_type = "eap_lead_"+approval_type+"_reject";
							}

							var currNotificationsObject={
							"ntc_app_name": "EAP",
							"ntc_type": ntc_type,
							"ntc_type_id": ntc_type_id,
							"ntc_type_data": JSON.stringify(dataArrObj),
							"ntc_from_user_id": fromUserId,
							"ntc_from_user_data":JSON.stringify(fromUserData),
							"ntc_to_user_id": currUid,
							"ntc_to_user_data": JSON.stringify(toUserData),
							"ntc_user_read_flag": 0,
							"created_date": currDateTime,
							"updated_date": currDateTime,
							"status": 1
							};
							notificationArr.push(currNotificationsObject);  
							NotificationCenterModal.create(notificationArr,(err,models)=>{});
						}
					});


				}
			} 
			next();
	});

	
// to add/edit Eapapproval
// {approval_status: 1, approval_by: 19297, type: "moment", type_id: "28", is_closed: 0,…}
	Eapapproval.addEditEapapprovalDash = function(dataArrObj,type_id,eap_id,lead_id,cb){
		var UserModel = Eapapproval.app.models.user;
		if(type_id){
			Eapapproval.getApprovalData({type_id:type_id}, function(err,EapapprovalData){
				if(EapapprovalData){
					var updated_date = Math.floor(Date.now()); // to get server created date
					dataArrObj.updated_date = updated_date;
					
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where type_id = (?) and type = (?)';
					dataArr.push(type_id,dataArrObj['type']);
					var sqlQuery = "update [eap_approval] set "+paramsKey+" "+whereCond;
				
					Eapapproval.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = type_id;
						result.updated_date = dataArrObj.updated_date;
						//satus is approved add points 
						if(dataArrObj['approval_status']==1 && dataArrObj['type']!="add lead"){
							
							// if type of approval is invoice
							if(dataArrObj['type']=='invoice'){
								var invoice = Eapapproval.app.models.eap_lead_invoice;
								var dataObj = {
									"invoice_lead_id":lead_id,
									"approval_status":'1'
								}
								invoice.getInvoiceCount(dataObj, function(err,totalInvoice){
									
									if(totalInvoice[0]['total']<4){
										var status;
										var pt;
										var point_type = "";
										if(totalInvoice[0]['total']==1){
											status = "trial";
											point_type = "1_purchase";
										}else{//2nd or third invoice
											status = "regular";
											point_type = "2_or_3_purchase";
										}
										var eappoints = Eapapproval.app.models.eap_points;
										var eappointsmaster = Eapapproval.app.models.eap_master_points;
										
										eappointsmaster.getEapPoints({"point_type":point_type,"status":1}, function(err,pointMasterData){
											
											var pointId = 0;
											var pt = 0;
											if(pointMasterData){
												pointId = pointMasterData[0]['point_id'];
												pt = pointMasterData[0]['points'];
											}
											var dataObj = {
												"user_id":eap_id,
												"activity_type_id":type_id,
												"activity_type":dataArrObj['type'],
												"points":pt,
												"created_by":eap_id,
												"point_master_id":pointId,
												"status":1
											}
											
											eappoints.addEditEapPoints(dataObj,null, function(err,pointsData){
												if(pointsData!=null){
													var leads = Eapapproval.app.models.eap_lead;
													var sqlLeadQuery = "select lead_status from eap_lead where lead_id ='"+lead_id+"'";
													Eapapproval.app.dbConnection.execute(sqlLeadQuery,null,(err,resultObj)=>{
														var dataLeadObj = "";
														if(resultObj[0]['lead_status'] != status && resultObj[0]['lead_status'] != "recommended"){
															if(status == "trial"){
																dataLeadObj = {
																	"lead_status":status,
																	"aware_to_trial":Math.floor(Date.now()),
																	"updated_date":Math.floor(Date.now()),
																}
															}else if(status == "regular"){
																dataLeadObj = {
																	"lead_status":status,
																	"trial_to_regular":Math.floor(Date.now()),
																	"updated_date":Math.floor(Date.now()),
																}
															}
														}else{
															dataLeadObj = {
																"updated_date":Math.floor(Date.now()),
															}
														}
														leads.addEditLead(dataLeadObj, lead_id, function(err,leadsNewData){
															if(leadsNewData!=null){
																cb(err,result);
															}
														});
													});
												}
											});
										
										});
										
									}else{
										cb(err,result);
									}
								});
							}
							
							// if type of approval is share moment
							else{
								var eappoints = Eapapproval.app.models.eap_points;
								var eappointsmaster = Eapapproval.app.models.eap_master_points;
																
								// check if the lead has got points for this share moment already
								//var pointCheck = "select * from eap_employee_points where user_id = (?) and activity_type_id = (?) and activity_type = (?)";
								var pointCheck = "select * from eap_employee_points where user_id = "+eap_id+" and activity_type_id IN ( select type_id from eap_approval where created_by = "+eap_id+" and type = '"+dataArrObj['type']+"' and type_id IN (select moment_id from eap_share_moments where moment_lead_id = "+lead_id+")  and approval_status = 1) and activity_type = '"+dataArrObj['type']+"'";
								Eapapproval.app.dbConnection.execute(pointCheck,[],(err,resultObj)=>{
									
									if(resultObj.length == 0){
									
										eappointsmaster.getEapPoints({"point_type":"share_social_media","status":1}, function(err,pointMasterData){
											var pointId = 0;
											var pt = 0;
											if(pointMasterData){
												pointId = pointMasterData[0]['point_id'];
												pt = pointMasterData[0]['points'];
											}
											
											var dataObj = {
												"user_id":eap_id,
												"activity_type_id":type_id,
												"activity_type":dataArrObj['type'],
												"points":pt,
												"point_master_id":pointId,
												"created_by":eap_id,
												"status":1
											}

											eappoints.addEditEapPoints(dataObj,null, function(err,pointsData){
												if(pointsData!=null){
													var leads = Eapapproval.app.models.eap_lead;
													
													
													// check if this lead has refered a customer and his status is regular
													var checkIfRecommender = "select * from eap_refer_customer rc join eap_lead el on rc.refer_id = el.lead_refer_id where rc.refer_via = (?) and lead_status = 'regular'";
													Eapapproval.app.dbConnection.execute(checkIfRecommender,[lead_id],(err,resultObj)=>{
														
														// if has referred, convert him
														if(resultObj){
															
															var dataLeadObj = {
																"lead_status":"recommended",
																"regular_to_recommended":Math.floor(Date.now()),
																"updated_date":Math.floor(Date.now()),
															}
															leads.addEditLead(dataLeadObj, lead_id, function(err,leadsNewData){
																if(leadsNewData!=null){
																	cb(err,result);
																}
															});
															
														}
														
													});
												}
											});
										});
										
									}else{
										// since points already added
										cb(err,result);
									}
								});
								// check point already added loop ends here
							}
						}else{
							cb(err,result);
						}
					});
				}
				else{
					cb("Invalid type_id id",null);
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
			
			var sqlQuery = "insert into [eap_approval] ("+keyString+") OUTPUT Inserted.approval_id values ("+paramsKey+")";
			Eapapproval.app.dbConnection.execute(sqlQuery,approvalArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].approval_id;
					result.updated_date = created_date;
				}
				cb(err,result);
			});
		}
	}
	Eapapproval.remoteMethod('addEditEapapprovalDash',{
		http:{ path:'/addEditEapapprovalDash', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'type_id', type:'any', http:{ source:"query"} },
					{ arg: 'eap_id', type:'any', http:{ source:"query"} },
					{ arg: 'lead_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});
	
	// to add/edit Eapapproval
	Eapapproval.addEditEapapproval = function(dataArrObj,Eapapproval_id,cb){
		var Eapapprovalid = Eapapproval_id;
		if(Eapapprovalid>0){
			var updated_date = Math.floor(Date.now()); // to get server created date
			dataArrObj.updated_date = updated_date;
			
			var dataArr = [];
			var paramsArr = [];
			
			for(var o in dataArrObj) {
				dataArr.push(dataArrObj[o]);
				paramsArr.push(o+"=(?)");
			}
					
			let paramsKey= paramsArr.join(', ');
			var whereCond = 'where approval_id = (?)';
			dataArr.push(Eapapprovalid);
			var sqlQuery = "update [eap_approval] set "+paramsKey+" "+whereCond;
		
			Eapapproval.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
				var result = {};
				result.id = Eapapprovalid;
				result.updated_date = dataArrObj.updated_date;
				cb(err,result);
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
			var sqlQuery = "insert into [eap_approval] ("+keyString+") OUTPUT Inserted.approval_id values ("+paramsKey+")";

			Eapapproval.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].approval_id;
					result.updated_date = created_date;
				}
				cb(err,result);
			});
		}
	}
	Eapapproval.remoteMethod('addEditEapapproval',{
		http:{ path:'/addEditEapapproval', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'Eapapproval_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});


		// to add/edit 
	Eapapproval.getApprovalData = function(dataArrObj,cb){
		var leadArr = [];
		var paramsArr = [];
		var sqlQuery = "select aprvl.*,u.username from [eap_approval] aprvl join [User] u on aprvl.created_by = u.id where 1=1";
		//var sqlQuery = "select emsm.*, el.lead_name from eap_master_social_media emsm join eap_lead el on emsm.invoice_lead_id = el.lead_id where 1=1 ";
		
		for(var o in dataArrObj) {
			if(o == "created_date"){
				sqlQuery+=" AND "+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND "+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o != "limit" && o != "page"){
				sqlQuery+=" AND "+o+" = (?)";
				leadArr.push(dataArrObj[o]);
			}else{
				if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
				var offset = dataArrObj['page']*limit;
				
				sqlQuery+="  ORDER BY social_id DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
				leadArr.push(dataArrObj[o],offset);
			}		
		}
		Eapapproval.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}
	Eapapproval.remoteMethod('getApprovalData',{
		http:{ path:'/getApprovalData', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

};
