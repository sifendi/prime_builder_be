'use strict';
var async = require('async');

module.exports = function(Eaplead) {
	
	Eaplead.afterRemote('addEditLead', function(context, repsData, next) {
        
        var response_id = repsData['result']['id'];
        var dataArrObj = context.args.dataArrObj;
        var NotificationCenterModal = Eaplead.app.models.app_notification_center;
        var UserModal = Eaplead.app.models.user;
        var allSuportUserListEmails = [];
        
        console.log("response_id",dataArrObj['lead_id']);
        
        if(response_id>0 && !(context.args['lead_id']>0)){
            
            var currUid = dataArrObj['created_by'];
            var ntc_type_id = response_id;
            var ntc_type = "eap_lead_added";
            var currDateTime =  Math.floor(Date.now());
            var fromUserData = {};
            fromUserData['uid']=currUid;
            var notificationArr=[];
            
            UserModal.findOne({where: { id:currUid }}, function(err, userResData) {
                if(!err){
                    fromUserData['name']=userResData['realm'];
                    fromUserData['username']=userResData['username'];
                    fromUserData['email']=userResData['email'];
                    fromUserData['mobile']=userResData['username'];
                    
                    // get all the SPH
                    var getSph = "select um.uid,u.realm,u.username, u.email from user_mapping um join [User] u on um.uid = u.id join RoleMapping rm on um.uid = rm.principalId and um.meta_key = 'postal_code' and um.meta_value = (?) join Role r on r.id = rm.roleId and r.name = '$sph'";
                    Eaplead.app.dbConnection.execute(getSph,[dataArrObj['lead_postal_code_id']],(err,resultObjArrs)=>{
                        
                        async.each(resultObjArrs,(resultObj,callback)=>{
                            var currNotificationsObject={
                                "ntc_app_name": "EAP",
                                "ntc_type": ntc_type,
                                "ntc_type_id": ntc_type_id,
                                "ntc_type_data": JSON.stringify(dataArrObj),
                                "ntc_from_user_id": currUid,
                                "ntc_from_user_data":JSON.stringify(fromUserData),
                                "ntc_to_user_id": resultObj['uid'],
                                "ntc_to_user_data": JSON.stringify(resultObj),
                                "ntc_user_read_flag": 0,
                                "created_date": currDateTime,
                                "updated_date": currDateTime,
                                "status": 1
                            };
                            notificationArr.push(currNotificationsObject);    
                            callback();
                        },
                        (endAysnc)=>{
                            
                            // get all the TLH for this lead
                            var getTLH = "select um.uid,u.realm,u.username, u.email from user_mapping um join [User] u on um.uid = u.id join RoleMapping rm on um.uid = rm.principalId and um.meta_key = 'subdistrict_id' and um.meta_value = (?) join Role r on r.id = rm.roleId and r.name = '$tlh'";
                            Eaplead.app.dbConnection.execute(getTLH,[dataArrObj['lead_sub_district_id']],(err,resultObjArrs)=>{
                                
                                async.each(resultObjArrs,(resultObj,callback)=>{
                                    var currNotificationsObject={
                                        "ntc_app_name": "EAP",
                                        "ntc_type": ntc_type,
                                        "ntc_type_id": ntc_type_id,
                                        "ntc_type_data": JSON.stringify(dataArrObj),
                                        "ntc_from_user_id": currUid,
                                        "ntc_from_user_data":JSON.stringify(fromUserData),
                                        "ntc_to_user_id": resultObj['uid'],
                                        "ntc_to_user_data": JSON.stringify(resultObj),
                                        "ntc_user_read_flag": 0,
                                        "created_date": currDateTime,
                                        "updated_date": currDateTime,
                                        "status": 1
                                    };
                                    notificationArr.push(currNotificationsObject);    
                                    callback();
                                },
                                (endAysnc)=>{
                                    
                                    // get all the AC for this lead
                                    var getAC = "select um.uid,u.realm,u.username, u.email from user_mapping um join [User] u on um.uid = u.id join RoleMapping rm on um.uid = rm.principalId and um.meta_key = 'district_id' and um.meta_value IN (select distinct d.id from district d join municipality m on d.id = m.district_id join subdistrict sd on sd.municipality_id = m.id and sd.id = (?)) join Role r on r.id = rm.roleId and r.name = '$ac'";
                                    Eaplead.app.dbConnection.execute(getAC,[dataArrObj['lead_sub_district_id']],(err,resultObjArrs)=>{
                                        
                                        async.each(resultObjArrs,(resultObj,callback)=>{
                                        	allSuportUserListEmails.push({
                                        		name:resultObj['realm'],
                                        		email:resultObj['email'],
                                        		type:'AC'
                                        	});
                                            var currNotificationsObject={
                                                "ntc_app_name": "EAP",
                                                "ntc_type": ntc_type,
                                                "ntc_type_id": ntc_type_id,
                                                "ntc_type_data": JSON.stringify(dataArrObj),
                                                "ntc_from_user_id": currUid,
                                                "ntc_from_user_data":JSON.stringify(fromUserData),
                                                "ntc_to_user_id": resultObj['uid'],
                                                "ntc_to_user_data": JSON.stringify(resultObj),
                                                "ntc_user_read_flag": 0,
                                                "created_date": currDateTime,
                                                "updated_date": currDateTime,
                                                "status": 1
                                            };
                                            notificationArr.push(currNotificationsObject);    
                                            callback();
                                        },
                                        (endAysnc)=>{
                                            NotificationCenterModal.create(notificationArr,(err,models)=>{
												console.log('dataArrObj',dataArrObj);
												if(dataArrObj['lead_support_ac']==1 || dataArrObj['lead_support_telesales']==1){
													
													var cityId = dataArrObj['lead_city_id'];
													var querySup = `SELECT * FROM eap_support_contacts WHERE city_id >0 and city_id=${cityId} and status=1`;
													Eaplead.app.dbConnection.execute(querySup,[],(err,resultObjDatas)=>{
														async.each(resultObjDatas,(resultObjData,callback1)=>{
															allSuportUserListEmails.push({
															name:resultObjData['name'],
															email:resultObjData['email'],
															type:resultObjData['support_type']
															});
															callback1();
														},(endAysnc1)=>{
															
															emailNotifyLeadsSupport(fromUserData,dataArrObj,allSuportUserListEmails);
															
														});
													});
												
												}
												

                                            });

                                            
                                        });
                                        
                                    });
                                    // End of AC Loop
                                    
                                });
                                // End of TLH Loop
                                
                            });
                            // End of TLH Query
                        });
                        // End of SPH Loop
                        
                    });
                    // End of SPH Query
                }
                
            });
            // end of user data loop



        }
        next();
});

function emailNotifyLeadsSupport(fromUserData,dataObj,userEmailList){
	console.log('emailNotifyLeadsSupport');
	console.log('fromUserData',fromUserData);
	console.log('dataObj',dataObj);
	console.log('userEmailList',userEmailList);
	var htmlTemplet = "";
	var sqlSegment = "select distinct emls.segment_name from eap_lead el join eap_master_lead_segment emls on emls.segment_id = el.lead_segment where el.lead_segment = (?)";
	Eaplead.app.dbConnection.execute(sqlSegment,[dataObj['lead_segment']],(err,resultSegment)=>{
		htmlTemplet=`

			Dear <ASM/KA/TeleSales Name> (Mobile Number), <br />

			Please follow up customer with detail as describe bellow: <br />

			Name : ${dataObj['lead_name']},<br />
			Address : ${dataObj['lead_address']},<br />
			City : ${dataObj['lead_city']},<br />
			Mobile : ${dataObj['lead_mobile']},<br />
			Segment : ${resultSegment[0].segment_name}, <br />
			Visit Date : ${dataObj['lead_visit_date']}, <br />
			Interview/Discussion Result : <br />${dataObj['lead_interview_result']}. <br /><br />
			Best Regards, <br />${fromUserData['name']} <br />
			<hr /><hr />

			Dear <ASM/KA/TeleSales Name> (Mobile Number),

			Mohon tindak lanjut pelanggan dengan detail sebagai berikut: 
			Nama : ${dataObj['lead_name']},<br />
			Alamat : ${dataObj['lead_address']},<br />
			Kota : ${dataObj['lead_city']},<br />
			No. HP : ${dataObj['lead_mobile']},<br />
			Segment : ${resultSegment[0].segment_name}, <br />
			Tanggal Kunjungan : ${dataObj['lead_visit_date']}, <br />
			Hasil Interview : <br />${dataObj['lead_interview_result']}. <br /><br />
			Salam, <br />${fromUserData['name']} <br />`;
	});

	var fromEmail = 'lhiprimebuilder@gmail.com';
	var toEmail='shubham.bhoyar@experiencecommerce.com';
	async.each(userEmailList,(userEmailD,callback1)=>{
		var sendFlag=false;
		if(dataObj['lead_support_ac']==1 && (userEmailD['type']=="AC" || userEmailD['type']=="ASM" || userEmailD['type']=="KA")){
			sendFlag=true;
		}else if(dataObj['lead_support_telesales']==1 && userEmailD['type']=="TeleSalesBeton"){
			sendFlag=true;
		}else{
			sendFlag=false;
		}

		if(sendFlag && userEmailD['email'] && userEmailD['email']!=''){
			var testingSub = userEmailD['email']+' -- '+userEmailD['type'];
			Eaplead.app.models.Email.send({
			//  to: userEmailD['email'],
			   to: toEmail,
			 //from: 'lhiprimebuilder@gmail.com',
			  from: fromEmail,
			  subject: 'Follow Up Duta Holcim Program for Customer '+ dataObj['lead_name'],
			  text: '',
			  html: htmlTemplet
			}, function(err, mail) {
			  console.log('email sent!',err,mail);
			  callback1();
			});
		}else{
			callback1();
		}
	},(endL)=>{
		console.log('endL');
	});
}

	// to add/edit lead
	Eaplead.addEditLead = function(dataArrObj,lead_id,cb){
		
		if(lead_id){
			Eaplead.findOne({ where:{lead_id:lead_id}}, function(err,leadData){
				if(leadData){
					var leadSegment = Eaplead.app.models.eap_master_lead_segment;
					leadSegment.findOne({ where:{segment_id:dataArrObj.lead_segment}}, function(err,segmentData){
						
						if(segmentData!=null){
								if(dataArrObj['lead_refer_id']!=''){
									var refer = Eaplead.app.models.eap_refer_customer;
									refer.findOne({ where:{refer_id:dataArrObj.lead_refer_id}}, function(err,referData){
										if(referData!=null){
											var updated_date = Math.floor(Date.now()); // to get server created date
											dataArrObj.updated_date = updated_date;
											
											var dataArr = [];
											var paramsArr = [];
											
											for(var o in dataArrObj) {
												dataArr.push(dataArrObj[o]);
												paramsArr.push(o+"=(?)");
											}
											
											let paramsKey= paramsArr.join(', ');
											var whereCond = 'where lead_id = (?)';
											dataArr.push(lead_id);
											var sqlQuery = "update [eap_lead] set "+paramsKey+" "+whereCond;
										
											Eaplead.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
												var result = {};
												result.id = lead_id;
												result.updated_date = dataArrObj.updated_date;
												cb(err,result);
											});
										}else{
											cb(null,"Invalid refer id");
										}
									});
								}
								else{
									var updated_date = Math.floor(Date.now()); // to get server created date
									dataArrObj.updated_date = updated_date;
									
									var dataArr = [];
									var paramsArr = [];
									
									for(var o in dataArrObj) {
										dataArr.push(dataArrObj[o]);
										paramsArr.push(o+"=(?)");
									}
									
									let paramsKey= paramsArr.join(', ');
									var whereCond = 'where lead_id = (?)';
									dataArr.push(lead_id);
									var sqlQuery = "update [eap_lead] set "+paramsKey+" "+whereCond;
								
									Eaplead.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
										var result = {};
										result.id = lead_id;
										result.updated_date = dataArrObj.updated_date;
										cb(err,result);
									});
								}
							}
						else{
								cb(null,"Invalid segment");
							}
					});
				}
				else{
					cb("Invalid lead id",null);
				}
			});
		}
		else{
				// to avoid duplicate leads
				var selectIfMobile = "select * from [eap_lead] where lead_mobile = (?) ";
				Eaplead.app.dbConnection.execute(selectIfMobile,[dataArrObj.lead_mobile],(err,data)=>{
					if(data == "" || data==null){
						
						// validate segment
						var leadSegment = Eaplead.app.models.eap_master_lead_segment;
						leadSegment.findOne({ where:{segment_id:dataArrObj.lead_segment}}, function(err,segmentData){
							if(segmentData!=null){
								var created_date = Math.floor(Date.now()); // to get server created date
								dataArrObj.created_date = created_date;
								dataArrObj.updated_date = created_date;
								var eap_id=dataArrObj.created_by;
								var leadArr = [];
								var paramsArr = [];
								
								for(var o in dataArrObj) {
									leadArr.push(dataArrObj[o]);
									paramsArr.push("(?)");
								}
								var paramsKey = paramsArr.join(', ');
								var keyString = Object.keys(dataArrObj).join(', ');
								
								// add the user as lead
								var sqlQuery = "insert into [eap_lead] ("+keyString+") OUTPUT Inserted.lead_id values ("+paramsKey+")";

								Eaplead.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
									var result = {};
									if(resultObj.length > 0){
										result.id = resultObj[0].lead_id;
										result.updated_date = created_date-1;
										
										// get points for new customer
										var eappoints = Eaplead.app.models.eap_points;
										var eappointsmaster = Eaplead.app.models.eap_master_points;
										eappointsmaster.getEapPoints({"point_type":"new_customer","status":1}, function(err,pointMasterData){
											
											// add points for new lead
											var pointId = 0;
											var pt = 0;
											if(pointMasterData){
												pointId = pointMasterData[0]['point_id'];
												pt = pointMasterData[0]['points'];
											}
											
											var dataObj = {
												"user_id":eap_id,
												"activity_type_id":result.id,
												"activity_type":"lead",
												"points":pt,
												"point_master_id":pointId,
												"created_by":eap_id,
												"status":1
											}
											
											// add points for adding new lead
											eappoints.addEditEapPoints(dataObj,null, function(err,pointsData){
												if(pointsData!=null){
													if(dataArrObj['lead_refer_id']!='' && dataArrObj['lead_refer_id']!=null){
														var eappointsrfr = Eaplead.app.models.eap_points;
														
														// get points for referring a customer
														eappointsmaster.getEapPoints({"point_type":"potential_customer","status":1}, function(err,pointMasterData){
															var pointId = 0;
															var pt = 0;
															if(pointMasterData){
																pointId = pointMasterData[0]['point_id'];
																pt = pointMasterData[0]['points'];
															}
														
															var dataObj = {
																"user_id":eap_id,
																"activity_type_id":dataArrObj['lead_refer_id'],
																"activity_type":"refer",
																"points":pt,
																"point_master_id":pointId,
																"created_by":eap_id,
																"status":1
															}
															eappointsrfr.addEditEapPoints(dataObj,null, function(err,rfrpointsData){
																if(rfrpointsData!=null){
																	var leads = Eaplead.app.models.eap_lead;
																	
																	var sqlLeadQuery = "select el.lead_status as lead_status, el.lead_id as lead_id from eap_lead el join eap_refer_customer erc on erc.refer_id = '"+dataArrObj['lead_refer_id']+"' where el.lead_id = erc.refer_via";
																	
																	Eaplead.app.dbConnection.execute(sqlLeadQuery,null,(err,resultObj)=>{
																		var dataLeadObj ="";
																		if(resultObj[0]['lead_status'] != "recommended"){
																			dataLeadObj = {
																				"lead_status":"recommended",
																				"regular_to_recommended":Math.floor(Date.now()),
																				"updated_date":Math.floor(Date.now()),
																			}
																		}else{
																			dataLeadObj = {
																				"updated_date":Math.floor(Date.now()),
																			}
																		}

																		leads.addEditLead(dataLeadObj, resultObj[0]['lead_id'], function(err,leadsNewData){
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
												}
											});
											
										});
										
										
									}
								});
							}
							else{
								cb(null,"Invalid segment");
							}
						});
					}
					else{
						var result = {};
						if(data.length > 0){
							result.id = data[0].lead_id;
							result.updated_date = data[0].updated_date;
						}
						//cb(null,result);
						cb(null,"Mobile Exist");
					}
				});
		}
	}
	
	Eaplead.remoteMethod('addEditLead',{
		http:{ path:'/addEditLead', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'lead_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	
	// to add/edit lead
	Eaplead.getLead = function(dataArrObj,limit,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var DateFilCount = 0 ;
	//	var sqlQuery ="select esa.sph_id as assigned_sph, el.*, (select sum(ep.points) from eap_employee_points ep join eap_refer_customer erc on ep.activity_type_id=erc.refer_id and ep.activity_type='refer' where erc.refer_via=el.lead_id) as 'referTotal',(select sum(ep.points) from eap_employee_points ep join eap_lead_invoice ei on ep.activity_type_id=ei.invoice_id and ep.activity_type='invoice' where  ei.invoice_lead_id=el.lead_id) as 'invoiceTotal',(select sum(ep.points) from eap_employee_points ep where ep.activity_type_id=el.lead_id and ep.activity_type='lead') as 'leadTotal', (select sum(ep.points) from eap_employee_points ep join eap_share_moments esm on ep.activity_type_id=esm.moment_id and ep.activity_type='moment' where  esm.moment_lead_id=el.lead_id) as 'momentTotal', es.segment_name ,u1.realm as createdBy,SecEl.lead_name as referName from eap_lead el join eap_master_lead_segment es on el.lead_segment = es.segment_id join [User] u1 on el.created_by = u1.id  left join eap_refer_customer rc on el.lead_refer_id=rc.refer_id and el.lead_refer_id > 0 left join  eap_lead SecEl on rc.refer_via = SecEl.lead_id left join eap_support_assignment esa on esa.lead_id = el.lead_id left join [User] us on us.id = esa.sph_id where 1=1 ";
	var sqlQuery ="select esa.sph_id as assigned_sph, el.*, (select sum(ep.points) from eap_employee_points ep join eap_refer_customer erc on ep.activity_type_id=erc.refer_id and ep.activity_type='refer' where erc.refer_via=el.lead_id) as 'referTotal',(select sum(ep.points) from eap_employee_points ep join eap_lead_invoice ei on ep.activity_type_id=ei.invoice_id and ep.activity_type='invoice' where  ei.invoice_lead_id=el.lead_id) as 'invoiceTotal',(select sum(ep.points) from eap_employee_points ep where ep.activity_type_id=el.lead_id and ep.activity_type='lead') as 'leadTotal', (select sum(ep.points) from eap_employee_points ep join eap_share_moments esm on ep.activity_type_id=esm.moment_id and ep.activity_type='moment' where  esm.moment_lead_id=el.lead_id) as 'momentTotal', es.segment_name ,u1.realm as createdBy,SecEl.lead_name as referName from eap_lead el join eap_master_lead_segment es on el.lead_segment = es.segment_id join [User] u1 on el.created_by = u1.id  left join eap_refer_customer rc on el.lead_refer_id=rc.refer_id and el.lead_refer_id > 0 left join  eap_lead SecEl on rc.refer_via = SecEl.lead_id left join eap_support_assignment esa on esa.lead_id = el.lead_id and esa.status=1 left join [User] us on us.id = esa.sph_id where 1=1 ";
	
		for(var o in dataArrObj) {
			if(o == "created_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND el."+o+" >= (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND el."+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o =="lead_name"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND el."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o =="reqDateFrom"){
				if(dataArrObj[o]!=''){
				sqlQuery+=" AND el.lead_visit_date >= (?)"
				leadArr.push(dataArrObj['reqDateFrom']);

				}
			}
			else if(o =="reqDateTo"){
				if(dataArrObj[o]!=''){
				sqlQuery+=" AND el.lead_visit_date <= (?)"
				leadArr.push(dataArrObj['reqDateTo']);

				}
			}
			else if((o =="lead_sub_district_id") || (o =="lead_postal_code_id") || (o =="lead_province_id") || (o =="lead_city_id")){
				// delete unique objects
				var masterId = dataArrObj[o];
				var masterIdArr = masterId.toString().split(",");
				masterId = masterId.toString().split(",");
				
				// iterate through array
				var masterData="";
				for(var i=0; i<masterId.length; i++){
					if(masterId.length == i+1){
						masterData+="(?)";
					}else{
						masterData+="(?),";
					}
					leadArr.push(masterIdArr[i]);
				}
				if(masterId.length>0){
					sqlQuery+=" AND el."+o+" IN ("+masterData+")";
				}
			}
			else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND el."+o+" = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}else{
				if(o=='limit'){
					if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
					var offset = dataArrObj['page']*dataArrObj['limit'];
					
					sqlQuery+="  ORDER BY el.updated_date DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
					leadArr.push(offset,dataArrObj[o]);
				}
			}
		}
		Eaplead.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			
			async.each(resultObj, function(json, callback) {
				
				// get segment data of each lead
				var segmentDetail = "select * from [eap_master_lead_segment] where segment_id = (?) ";
				Eaplead.app.dbConnection.execute(segmentDetail,[json.lead_segment],(err,segmentObj)=>{
					
					json.segmentDetail = segmentObj;
					
					// get sph data of each lead
					if(json.assigned_sph > 0){
						
						var sphDetail = "select id,realm,username,email,status from [User] where id = (?) ";
						Eaplead.app.dbConnection.execute(sphDetail,[json.assigned_sph],(err,sphObj)=>{
							json.sphDetail = sphObj;
							
							// get refer data of each lead
							if(json.lead_refer_id > 0){
								var referDetail = "select * from [eap_refer_customer] where refer_id = (?) ";
								Eaplead.app.dbConnection.execute(referDetail,[json.lead_refer_id],(err,referObj)=>{
									json.referDetail = referObj;
									callback();
								});
							}else{
								callback();
							}
							
						});
					}else{
						// get refer data of each lead
						if(json.lead_refer_id > 0){
							var referDetail = "select * from [eap_refer_customer] where refer_id = (?) ";
							Eaplead.app.dbConnection.execute(referDetail,[json.lead_refer_id],(err,referObj)=>{
								json.referDetail = referObj;
								callback();
							});
						}else{
							callback();
						}
					}
				});
			},
			(err)=>{
				cb(err,resultObj);
			});
			
		});
	
	}
	
	Eaplead.remoteMethod('getLead',{
		http:{ path:'/getLead', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'limit', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	Eaplead.getLeadCount = function(dataArrObj,cb){
		var leadArr = [];
		var paramsArr = [];
		var DateFilCount = 0 ;
		var sqlQuery = "select count(el.lead_segment) as total from eap_lead el join eap_master_lead_segment es on el.lead_segment = es.segment_id left join eap_refer_customer rc on el.lead_refer_id=rc.refer_via and el.lead_refer_id > 0 left join [User] u on rc.refer_via = u.id where 1=1" 
		for(var o in dataArrObj) {
			
			if(o == "created_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND el."+o+" >= (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND el."+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o =="lead_name"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND el."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}
			// else if(o =="reqDateFrom" || o =="reqDateTo"){
			// 	if(dataArrObj[o]!='' && DateFilCount==0){
			// 		sqlQuery+=" AND el.lead_visit_date BETWEEN (?) AND (?)"
			// 		leadArr.push(dataArrObj['reqDateFrom']);
			// 		leadArr.push(dataArrObj['reqDateTo']);
			// 		DateFilCount = 1;
			// 	}
			// }
			else if(o =="reqDateFrom"){
				if(dataArrObj[o]!=''){
				sqlQuery+=" AND el.lead_visit_date >= (?)"
				leadArr.push(dataArrObj['reqDateFrom']);

				}
			}
			else if(o =="reqDateTo"){
				if(dataArrObj[o]!=''){
				sqlQuery+=" AND el.lead_visit_date <= (?)"
				leadArr.push(dataArrObj['reqDateTo']);

				}
			}
			else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
				sqlQuery+=" AND el."+o+" = (?)";
				leadArr.push(dataArrObj[o]);
				}
			}
		}
		Eaplead.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	
	}
	
	Eaplead.remoteMethod('getLeadCount',{
		http:{ path:'/getLeadCount', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
				],
		returns:{ arg: 'result', type: 'object'}
	});
};