'use strict';
module.exports = function(Hpbupdateapproval) {
	Hpbupdateapproval.getUpdateHpb = function(dataArrObj,user_id,cb){
		var userArr = [];
		var paramsArr = [];
		var DateFilCount = 0;
		var sqlQuery = '';
		if(user_id){
			sqlQuery =`select hpb.hpb_name, hua.* from hpb_update_approval hua join hpb_info_tbl hpb on hua.hpb_id = hpb.hpb_id where hua.hpb_id in (
				select h.hpb_id from [hpb_info_tbl] h where h.assigned_to in ( 
					select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	
						select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr
							where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in (
								select meta_value from user_mapping where uid = ${user_id} and 
									meta_key = 'region_id') ) ) ) `;
		}else{
			sqlQuery =`select hpb.hpb_name, hua.* from hpb_update_approval hua join hpb_info_tbl hpb on hua.hpb_id = hpb.hpb_id where 1=1 `;
		}

		for(var o in dataArrObj) {
			if(o =="hpb_name"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND hpb."+o+" Like (?)";
					userArr.push('%'+dataArrObj[o]+'%');
				}
			}else if(o =="field_old_value"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND hua."+o+" Like (?)";
					userArr.push('%'+dataArrObj[o]+'%');
				}
			}else if(o =="field_new_value"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND hua."+o+" Like (?)";
					userArr.push('%'+dataArrObj[o]+'%');
				}
			}else if(o =="created_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND hua."+o+" >= (?)";
					userArr.push(dataArrObj[o]);
				}
			}else if(o =="updated_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND hua."+o+" >= (?)";
					userArr.push(dataArrObj[o]);
				}
			}else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND hua."+o+" = (?)";
					userArr.push(dataArrObj[o]);
				}
			}else{
				if(o=='limit'){
					if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
					var offset = dataArrObj['page']*dataArrObj['limit'];
					sqlQuery+="  ORDER BY hua.created_date DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
					userArr.push(offset,dataArrObj[o]);
				}
			}

			//console.log("sqlQuery : ",sqlQuery);
		}

		Hpbupdateapproval.app.dbConnection.execute(sqlQuery,userArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}

	Hpbupdateapproval.remoteMethod('getUpdateHpb',{
		http:{ path:'/getUpdateHpb', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'user_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	Hpbupdateapproval.getUpdateHpbCount = function(dataArrObj,user_id,cb){
		var userArr = [];
		var paramsArr = [];
		var DateFilCount = 0 ;
		var sqlQuery = '';
		if(user_id){
			var sqlQuery = `select count(hua.id) as total from hpb_update_approval hua join hpb_info_tbl hpb on hua.hpb_id = hpb.hpb_id where hua.hpb_id in (
			select h.hpb_id from [hpb_info_tbl] h where h.assigned_to in ( 
				select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	
					select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr
						where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in (
							select meta_value from user_mapping where uid = ${user_id} and 
								meta_key = 'region_id') ) ) )`;
		}else{
			sqlQuery =`select count(hua.id) as total from hpb_update_approval hua join hpb_info_tbl hpb on hua.hpb_id = hpb.hpb_id where 1=1 `;
		}

		for(var o in dataArrObj) {
			if(o =="hpb_name"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND hpb."+o+" Like (?)";
					userArr.push('%'+dataArrObj[o]+'%');
				}
			}else if(o =="field_old_value"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND hua."+o+" Like (?)";
					userArr.push('%'+dataArrObj[o]+'%');
				}
			}else if(o =="field_new_value"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND hua."+o+" Like (?)";
					userArr.push('%'+dataArrObj[o]+'%');
				}
			}else if(o =="created_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND hua."+o+" >= (?)";
					userArr.push(dataArrObj[o]);
				}
			}else if(o =="updated_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND hua."+o+" >= (?)";
					userArr.push(dataArrObj[o]);
				}
			}else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND hua."+o+" = (?)";
					userArr.push(dataArrObj[o]);
				}
			}
		}

		Hpbupdateapproval.app.dbConnection.execute(sqlQuery,userArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}

	Hpbupdateapproval.remoteMethod('getUpdateHpbCount',{
		http:{ path:'/getUpdateHpbCount', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'user_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	Hpbupdateapproval.addEditHpbUpadteApproval = function(dataArrObj,huaId,cb){
		//var UserModel = Hpbupdateapproval.app.models.user;
		if(huaId){
			Hpbupdateapproval.findOne({where: { id:huaId }}, function(err,huaData){
				if(huaData){
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
					dataArr.push(huaId);
					var sqlQuery = "update [hpb_update_approval] set "+paramsKey+" "+whereCond;
					Hpbupdateapproval.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						if(!err){
							if(dataArrObj['approval_status']==1){
								var dataObj = [];
								dataObj.role = '$ra';
								dataObj.app = true;
								if(huaData.field_name == 'Mobile'){
									dataObj.primary_mobile_no = huaData['field_new_value'];
								}else{
									dataObj.id_card_number = huaData['field_new_value'];
								}
								Hpbupdateapproval.app.models.app_hpb.addEditHpb(dataObj,huaData['hpb_id'],(err2,resultObjHistory)=>{
									var result = {};
									result.id = huaId;
									result.updated_date = dataArrObj.updated_date;
									Hpbupdateapproval.app.byz_hpb_reward_master_edit(huaData['hpb_id']);
									cb(err2,result);
								});
							}else{
								var result = {};
								result.id = huaId;
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
			Hpbupdateapproval.findOne({where: {"and":[{ hpb_id:dataArrObj['hpb_id']},{is_closed:0},{field_name:dataArrObj['field_name']}]}}, function(err,huaData){
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
				var sqlQuery = "insert into [hpb_update_approval] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

				if(huaData){
					var sqlUpdateQuery = "update [hpb_update_approval] set is_closed = '1',updated_date = (?) where id=(?) ";
					Hpbupdateapproval.app.dbConnection.execute(sqlUpdateQuery,[created_date,huaData.id],(err1,resultObj1)=>{
						Hpbupdateapproval.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
							var result = {};
							if(resultObj){
								if(resultObj.length > 0){
									result.id = resultObj[0].id;
									result.updated_date = created_date;
								}
							}
							cb(err,result);
						});
					});
				}else{
					Hpbupdateapproval.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
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
			});
		}
	}

	Hpbupdateapproval.remoteMethod('addEditHpbUpadteApproval',{
		http:{ path:'/addEditHpbUpadteApproval', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'huaId', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	Hpbupdateapproval.afterRemote('addEditHpbUpadteApproval', function(context, repsData,next) {
		var response_id = repsData['result']['id'];
		var huaId = context.args['huaId'];

		if(response_id>0 && context.args['huaId']>0){
			var dataArrObj = context.args.dataArrObj;
			var NotificationCenterModal = Hpbupdateapproval.app.models.app_notification_center;
			var UserModal = Hpbupdateapproval.app.models.user;
			var HpbApi = Hpbupdateapproval.app.models.app_hpb;
			var notificationArr=[];	
			if(dataArrObj['approval_status']!=0){
				var ntc_type='hpb_mobile_username_approved_reject';
				var ntc_type_id = huaId;
				var currDateTime =  Math.floor(Date.now());

				Hpbupdateapproval.findOne({where: { id:huaId }}, function(err,huaData){
					//console.log('huaDataOld',huaData,err);
					if(!err){
						HpbApi.findOne({where: { hpb_id:huaData.hpb_id}}, function(err,hpbData){
							huaData.hpb_name = hpbData.hpb_name;
							if(dataArrObj['approval_status']=='1'){
								if(huaData['field_name']== 'Mobile'){
									ntc_type='hpb_mobile_username_approved';
								}else{
									ntc_type='hpb_card_number_approved';
								}
							}else if(dataArrObj['approval_status']=='-1'){
								if(huaData['field_name']== 'Mobile'){
									ntc_type='hpb_mobile_username_reject';
								}else{
									ntc_type='hpb_card_number_reject';
								}
							}
							//console.log("hpbData.hpb_name",hpbData.hpb_name);
							if(huaData['is_closed']==0){
								var currNotificationsObject={
								"ntc_app_name": "HPB",
								"ntc_type": ntc_type,
								"ntc_type_id": ntc_type_id,
								"ntc_type_data": JSON.stringify(huaData),
								"ntc_from_user_id": huaData['approved_by'],
								"ntc_from_user_data":JSON.stringify(huaData),
								"ntc_to_user_id": huaData['created_by'],
								"ntc_to_user_data": JSON.stringify(huaData),
								"ntc_user_read_flag": 0,
								"created_date": currDateTime,
								"updated_date": currDateTime,
								"status": 1
								}; 
								//console.log('huaData 1',huaData);
								notificationArr.push(currNotificationsObject);  
								NotificationCenterModal.create(notificationArr,(err,models)=>{
									console.log('err',err);
								});
							}
						});
					}
				});
			}
		}
		next();
	});
};