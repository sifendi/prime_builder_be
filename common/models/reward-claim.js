'use strict';
var async = require('async');
module.exports = function(Rewardclaim) {

	Rewardclaim.getRedeemHistory = function(id,hpb_id,promo_id,status,created_by,created_date,limit,page,user_id,rolename,rc_id,hpb_name,reward_name,redeem_from,redeem_to,cb){
		var dataArr = [];
		var sqlQuery = "select u.realm as sph_name,h.hpb_name, rc.*, rm.name as reward_name, (select sum(rct.points_redeemed) as totalpoints from reward_claims_tbl rct where rct.hpb_id = h.hpb_id and rct.status != -1 group by hpb_id) as totalpoints  from [reward_claims_tbl] rc, reward_master rm , hpb_info_tbl h, [User] u where rm.id = rc.reward_id  and h.hpb_id = rc.hpb_id and u.id = rc.created_by ";
		
		if(rolename == "$ra"){
			sqlQuery+=" and rc.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
			dataArr.push(user_id);
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		
		if(rc_id!="" && typeof(rc_id)!="undefined"){
			id = rc_id;
		}
		
		if(reward_name){
			sqlQuery+=" AND rm.name like (?) ";
			reward_name = "%"+reward_name+"%";
			dataArr.push(reward_name);
		}
		
		if(id){
			sqlQuery+=" AND rc.id = (?) ";
			dataArr.push(id);
		}
		
		if(hpb_id){
			sqlQuery+=" AND rc.hpb_id = (?) ";
			dataArr.push(hpb_id);
		}
		
		if(hpb_name){
			sqlQuery+=" AND h.hpb_name like (?) ";
			hpb_name = "%"+hpb_name+"%";
			dataArr.push(hpb_name);
		}
		
		if(promo_id){
			sqlQuery+=" AND rc.promo_id = (?) ";
			dataArr.push(promo_id);
		}
		
		if(status){
			sqlQuery+=" AND rc.status = (?) ";
			dataArr.push(status);
		}
		
		if(created_by){
			sqlQuery+=" AND rc.created_by = (?) ";
			dataArr.push(created_by);
		}
		
		if(redeem_from){
			sqlQuery+=" AND rc.created_date >= (?) ";
			dataArr.push(redeem_from);
		}
		
		if(redeem_to){
			sqlQuery+=" AND rc.created_date <= (?) ";
			dataArr.push(redeem_to);
		}
		
		sqlQuery+=" ORDER BY rc.created_date DESC ";
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Rewardclaim.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}

	Rewardclaim.remoteMethod('getRedeemHistory',{
		http:{ path: '/getRedeemHistory', verb: 'get' },
		accepts:[
					{ arg: 'id', type: 'number', source: {http:'query' }},
					{ arg: 'hpb_id', type: 'number', source: {http:'query' }},
					{ arg: 'promo_id', type: 'number', source: {http:'query' }},
					{ arg: 'status', type: 'string', source: {http:'query' }},
					{ arg: 'created_by', type: 'number', source: {http:'query' }},
					{ arg: 'created_date', type: 'number', source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'user_id', type: 'number', source: {http:'query' }},
					{ arg: 'rolename', type: 'string', source: {http:'query' }},
					{ arg: 'rc_id', type: 'string', source: {http:'query' }},
					{ arg: 'hpb_name', type: 'string', source: {http:'query' }},
					{ arg: 'reward_name', type: 'string', source: {http:'query' }},
					{ arg: 'redeem_from', type: 'number', source: {http:'query' }},
					{ arg: 'redeem_to', type: 'number', source: {http:'query' }}
				],
		returns: { arg: 'result', type: 'object' }
	});
	
	Rewardclaim.getRedeemHistoryCount = function(id,hpb_id,promo_id,status,created_by,created_date,limit,page,user_id,rolename,hpb_name,reward_name,redeem_from,redeem_to,cb){
		var dataArr = [];
		// var sqlQuery = "select count(*) as total  from [reward_claims_tbl] rc join reward_master rm on  rm.id = rc.reward_id join hpb_info_tbl h on h.hpb_id = rc.hpb_id JOIN [User] u ON u.id = rc.created_by and rc.status!= -1 where 1=1 ";
		var sqlQuery = "select count(*) as total  from [reward_claims_tbl] rc join reward_master rm on  rm.id = rc.reward_id join hpb_info_tbl h on h.hpb_id = rc.hpb_id JOIN [User] u ON u.id = rc.created_by where 1=1 ";
		
		if(rolename == "$ra"){
			sqlQuery+=" and rc.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
			dataArr.push(user_id);
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		
		if(id){
			sqlQuery+=" AND rc.id = (?) ";
			dataArr.push(id);
		}
		
		if(reward_name){
			sqlQuery+=" AND rm.name like (?) ";
			reward_name = "%"+reward_name+"%";
			dataArr.push(reward_name);
		}
		
		if(hpb_id){
			sqlQuery+=" AND rc.hpb_id = (?) ";
			dataArr.push(hpb_id);
		}
		
		if(hpb_name){
			sqlQuery+=" AND h.hpb_name like (?) ";
			hpb_name = "%"+hpb_name+"%";
			dataArr.push(hpb_name);
		}
		
		if(promo_id){
			sqlQuery+=" AND rc.promo_id = (?) ";
			dataArr.push(promo_id);
		}
		
		if(status){
			sqlQuery+=" AND rc.status = (?) ";
			dataArr.push(status);
		}
		
		if(created_by){
			sqlQuery+=" AND rc.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(redeem_from){
			sqlQuery+=" AND rc.created_date >= (?) ";
			dataArr.push(redeem_from);
		}
		
		if(redeem_to){
			sqlQuery+=" AND rc.created_date <= (?) ";
			dataArr.push(redeem_to);
		}
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Rewardclaim.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}

	Rewardclaim.remoteMethod('getRedeemHistoryCount',{
		http:{ path: '/getRedeemHistoryCount', verb: 'get' },
		accepts:[
					{ arg: 'id', type: 'number', source: {http:'query' }},
					{ arg: 'hpb_id', type: 'number', source: {http:'query' }},
					{ arg: 'promo_id', type: 'number', source: {http:'query' }},
					{ arg: 'status', type: 'string', source: {http:'query' }},
					{ arg: 'created_by', type: 'number', source: {http:'query' }},
					{ arg: 'created_date', type: 'number', source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'user_id', type: 'number', source: {http:'query' }},
					{ arg: 'rolename', type: 'string', source: {http:'query' }},
					{ arg: 'hpb_name', type: 'string', source: {http:'query' }},
					{ arg: 'reward_name', type: 'string', source: {http:'query' }},
					{ arg: 'redeem_from', type: 'number', source: {http:'query' }},
					{ arg: 'redeem_to', type: 'number', source: {http:'query' }}
				],
		returns: { arg: 'result', type: 'object' }
	});
	
	
	Rewardclaim.afterRemote('redeemPoints', function(context, repsData,next) {
		
		//console.log('context.args',context.args);
		if(repsData['result']['id']>0){
				var HpbModal = Rewardclaim.app.models.app_hpb;
				var id = repsData['result']['id'];
				var hpb_id = context.args['dataArrObj']['hpb_id'];

 
				HpbModal.findOne({where: { hpb_id:hpb_id }}, function(err, hpbData) {
					if(!err){

				var currUid = hpbData['uid'];
				var sqlQuery=`exec relatedUserFetch ${currUid}`;
				var dataArr=[];
				var fromUserData={};
				fromUserData=hpbData;
				var dataArrObj = context.args['dataArrObj'];
				var ntc_type="hpb_claim_reward_added";
				var UserModal = Rewardclaim.app.models.user;
				var reward_c_id = repsData['result']['id'];
				Rewardclaim.findOne({where: { id:reward_c_id }}, function(err, redemDataObjN) {
						Rewardclaim.app.byz_hpb_redemption_data(redemDataObjN);
				});
				Rewardclaim.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObjArrs)=>{
						
					if(!err){

									     	var currDateTime =  Math.floor(Date.now());
											
												var notificationArr=[];
												var NotificationCenterModal = Rewardclaim.app.models.app_notification_center;
												async.each(resultObjArrs,(resultObj,callback)=>{
													
													if(resultObj['uid']>0 && (resultObj['rolename']=='$sph' || resultObj['rolename']=='$tlh')){
														
														
														var currNotificationsObject={
														"ntc_app_name": "HPB",
														"ntc_type": ntc_type,
														"ntc_type_id": id,
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
														console.log('notificationArr',notificationArr);
														
												 }
													callback();
												},(err)=>{
													
													NotificationCenterModal.create(notificationArr,(err,models)=>{
														console.log('notification created',models);
														
													});

												});

			
					}

				});									

					}
			});
		}

		next();
	});

	Rewardclaim.redeemPoints = function(dataArrObj,cb){
		
		// check if the reward id is valid
		var rewardApp = Rewardclaim.app.models.reward;
		rewardApp.findOne({ where:{ id:dataArrObj.reward_id }}, function(err,rewardData){
			
			if(rewardData){
				// check if hpb is valid
				var hpbApp = Rewardclaim.app.models.app_hpb;
				hpbApp.findOne({ where: { hpb_id:dataArrObj.hpb_id }}, function(err, hpbData){
					
					if(hpbData){
						
						var created_date = Math.floor(Date.now()); // to get server created date
						dataArrObj.created_date = created_date;
						
						var rewardArr = [];
						var paramsArr = [];
						
						for(var o in dataArrObj) {
							rewardArr.push(dataArrObj[o]);
							paramsArr.push("(?)");
						}
						var paramsKey = paramsArr.join(', ');
						var keyString = Object.keys(dataArrObj).join(', ');
						
						// add the user as hpb
						var sqlQuery = "insert into [reward_claims_tbl] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

						Rewardclaim.app.dbConnection.execute(sqlQuery,rewardArr,(err,resultObj)=>{
							var result = {};
							if(resultObj.length > 0){
								result.id = resultObj[0].id;
								result.updated_date = created_date;
							}
							cb(err,result);
						});
					}else{
						cb("Invalid hpb id",null);
					}
				});
			}else{
				cb("Invalid Reward id",null);
			}
			
		});
	}
	
	Rewardclaim.remoteMethod('redeemPoints',{
		http:{ path: '/redeemPoints', verb: 'post' },
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns: { arg: 'result', type: 'object' }
	})



	Rewardclaim.afterRemote('addEditRedemption', function(context, repsData,next) {
		
		//console.log('context.args',context.args);
		if(context.args['redeem_id']>0 && context.args['dataArrObj']['status']!=0 && context.args['dataArrObj']['approved_by']>0){
				
				var HpbModal = Rewardclaim.app.models.app_hpb;
				var id = context.args['redeem_id'];
				Rewardclaim.findOne({where: { id:id }}, function(err, redemDataObj) {
				var status = context.args['dataArrObj']['status'];
				var hpb_id = redemDataObj['hpb_id'];

				HpbModal.findOne({where: { hpb_id:hpb_id }}, function(err, hpbData) {
							
				if(!err){

				var currUid = hpbData['uid'];
				var sqlQuery=`exec relatedUserFetch ${currUid}`;
				var dataArr=[];
				var fromUserData={};
				fromUserData=hpbData;
				var dataArrObj = redemDataObj;
				var ntc_type="hpb_claim_reward_added";
				if(status==1){
				  ntc_type="hpb_claim_reward_approved";
				  // here byz_hpb_point_data call
				  Rewardclaim.app.byz_hpb_point_data(redemDataObj);
				}else if(status==-1){
				  ntc_type="hpb_claim_reward_reject";
				}
				
		        Rewardclaim.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObjArrs)=>{
					
					if(!err){
								    var currDateTime =  Math.floor(Date.now());
									var notificationArr=[];
									var NotificationCenterModal = Rewardclaim.app.models.app_notification_center;
									async.each(resultObjArrs,(resultObj,callback)=>{
										
										if(resultObj['uid']>0 && (resultObj['rolename']=='$sph')){
											
											
											var currNotificationsObject={
											"ntc_app_name": "HPB",
											"ntc_type": ntc_type,
											"ntc_type_id": id,
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
											console.log('notificationArr',notificationArr);
											
									 }
										callback();
									},(err)=>{
										
										NotificationCenterModal.create(notificationArr,(err,models)=>{
											console.log('notification created',models);
											
										});

									});

							}
							
						});		

					
						
							}
					});							

			});


		}else if(context.args['redeem_id']==0 && repsData['result']['id'] > 0){
			let reward_c_id = repsData['result']['id'];
			Rewardclaim.findOne({where: { id:reward_c_id }}, function(err, redemDataObjN) {
					Rewardclaim.app.byz_hpb_redemption_data(redemDataObjN);
			});
		}

		next();
	});

	Rewardclaim.addEditRedemption = function(dataArrObj,redeem_id,cb){
		
		var created_date = Math.floor(Date.now());
		var updated_date = Math.floor(Date.now());
		
		if(redeem_id){
			Rewardclaim.findOne({ where:{ id:redeem_id }}, function(err,redeemData){
				if(redeemData){
					dataArrObj.updated_date = updated_date;
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where id = (?)';
					dataArr.push(redeem_id);
					var sqlQuery = "update [reward_claims_tbl] set "+paramsKey+" "+whereCond;
				
					Rewardclaim.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = redeem_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid redeem id",null);
				}
			});
		}
		else{
			dataArrObj.created_date = created_date;
			dataArrObj.updated_date = created_date;
			
			var receiptArr = [];
			var paramsArr = [];
			
			for(var o in dataArrObj) {
				receiptArr.push(dataArrObj[o]);
				paramsArr.push("(?)");
			}
			
			var paramsKey = paramsArr.join(', ');
			var keyString = Object.keys(dataArrObj).join(', ');
			
			// add the product receipt
			var sqlQuery = "insert into [reward_claims_tbl] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";
			
			Rewardclaim.app.dbConnection.execute(sqlQuery,receiptArr,(err,resultObj)=>{
				var result = {};
				try{
					if(resultObj.length > 0){
							result.id = resultObj[0].id;
							result.updated_date = created_date;
					}
				}catch(ee){
						
				}
				
				cb(err,result);
			});
		}
		
	}
	
	Rewardclaim.remoteMethod('addEditRedemption',{
		http:{ path: '/addEditRedemption', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'redeem_id', type:'number', http:{ source:"query"} }
					
				],
		returns:{ arg: 'result', type: 'object' }
	});
};