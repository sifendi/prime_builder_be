'use strict';

module.exports = function(Hpb) { 
	
	
	Hpb.afterRemote('addEditHpb', function(context, repsData,next) {
		Hpb.app.byz_hpb_reward_master_add(context.args.dataArrObj,repsData);
		next();
	});
	
	// to add/edit hpb
	Hpb.addEditHpb = function(dataArrObj,hpb_id,cb){
		
		if(hpb_id){
			var result = {};
			//check whether the updated Id card no. or primary mobile no. is present for other HPB
			Hpb.findOne({ where:{"and":[{"or":[{primary_mobile_no:dataArrObj['primary_mobile_no']},{id_card_number:dataArrObj['id_card_number']}]},{hpb_id:{neq:hpb_id}}]}}, function(err1,hpbMobileData){
				//console.log("hpbMobileData", hpbMobileData);
				if(!hpbMobileData){
					//check whether the updated Id card no. or primary mobile no. is present for other HPB in HPB approval table
					Hpb.app.models.hpb_update_approval.findOne({ where:{"and":[{"or":[{field_new_value:dataArrObj['primary_mobile_no']},{field_new_value:dataArrObj['id_card_number']}]},{hpb_id:{neq:dataArrObj['hpb_id']}}]}}, function(err2,hpbUpdateData){
						//console.log("hpbUpdateData", hpbUpdateData);
						if(!hpbUpdateData){
							//Get details of edited HPB
							Hpb.findOne({ where:{hpb_id:hpb_id}}, function(err,hpbData){
								if(hpbData){
									//console.log("Main Function");
									//if role index is not present in array 
									var updated_date = Math.floor(Date.now()); // to get server created date
									dataArrObj.updated_date = updated_date;
									var dataArr = [];
									var dataArrUser = [];
									var paramsArr = [];
									if(typeof dataArrObj['role'] == undefined) {
										dataArrObj['role'] = '';
									}
									if(typeof dataArrObj['app'] == undefined) {
										dataArrObj['app'] = false;
									}
									updateHpbMobileApproval(hpbData,dataArrObj).then((respFlag)=>{
										//console.log("Main Function Return");
										if(respFlag){
											//console.log("Main Function Return Response : ",respFlag );
											if(dataArrObj['role'] != '$ra'){
												dataArrObj['primary_mobile_no'] = hpbData['primary_mobile_no'];
												dataArrObj['id_card_number'] = hpbData['id_card_number'];
											}

											for(var o in dataArrObj) {
												//skip role index.
												if(o != 'role' && o != 'app'){
													if(o == 'hpb_status'){
														dataArrObj[o] = dataArrObj[o].toLowerCase();
													}
													dataArr.push(dataArrObj[o]);
													paramsArr.push(o+"=(?)");
												}
											}

											let paramsKey= paramsArr.join(', ');
											var whereCond = 'where hpb_id = (?)';
											dataArr.push(hpb_id);
											var sqlQuery = "update [hpb_info_tbl] set "+paramsKey+" "+whereCond;
											Hpb.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
												
												result.id = hpb_id;
												result.updated_date = dataArrObj.updated_date;
												result.status = "success";
												result.edit = true;

												//if hpb mobile number is not present in dataArrObj (HPB Update Approval)
												if(typeof dataArrObj['primary_mobile_no'] == 'undefined'){
													dataArrObj['primary_mobile_no'] = hpbData['primary_mobile_no'];
												}
												//if current mobile number is updated
												if(hpbData['primary_mobile_no'] != dataArrObj['primary_mobile_no']){
													var sqlQueryUser = "update [user] set username = (?) where id = (?)";
													dataArrUser.push(dataArrObj['primary_mobile_no']);
													dataArrUser.push(hpbData['uid']);
													var dataObj = {};
													Hpb.app.dbConnection.execute(sqlQueryUser,dataArrUser,(err,resultObjUser)=>{
														var sqlQueryAccess =` DELETE FROM AccessToken WHERE userId= ${hpbData['uid']}`;
														Hpb.app.dbConnection.execute(sqlQueryAccess,[],(err,resultObjAccess)=>{
															Hpb.app.models.user_map.userResetHistory(dataObj,hpbData['uid'],(err,resultObjHistory)=>{
																cb(err,result);
															});
														});
													});
												}else{
													cb(err,result);
												}
											});
										}else{
											result.status = "Something went wrong!";
											cb(err,result);
										}
									});
								}
								else{
									result.status = "Invalid id";
									cb(err,result);
								}
							});
						}else{
							result.status = "Mobile/ID card Number already exist";
							cb(err2,result);
						}
					});
				}else{
					result.status = "Mobile/ID card Number already exist";
					cb(err1,result);
				}
			});
		}
		else{
			var UserModel = Hpb.app.models.user;
			var RoleModel = Hpb.app.models.Role;
			var RoleModelMapping = Hpb.app.models.RoleMapping;
			
			// search the user
			UserModel.findOne({where: { username: dataArrObj.primary_mobile_no }}, function(err, user) {
				if(!user){
					// create the user
					var pass = Math.random().toString(36).slice(2); // random password generator
					UserModel.create([
						{ realm: dataArrObj.hpb_name, username:dataArrObj.primary_mobile_no, email: dataArrObj.hpb_email, password: pass},
					],function(err, users) {
						if (err){
							cb(err,null);
						}
						// map it to a role
						RoleModel.findOne({where: { name: '$hpb' }}, function(err, role) {
							RoleModelMapping.create({
								principalType: 'USER',
								principalId: users[0].id,
								roleId:role.id
							}, function(err, principal) {
								if (err){
									cb(err,null);
								}else{
									// insert the value in the user meta
									var selectPostal = "select id from postal_code where postal_code = (?)";
									Hpb.app.dbConnection.execute(selectPostal,[dataArrObj.id_card_pincode],(err,data)=>{
										var metaValue = data[0].id;
										var metaId = "postal_code";
										var dataArr = [users[0].id,metaId,metaValue,1];
										var insertMeta = "insert into [user_mapping] (uid,meta_key,meta_value,status) values ((?),(?),(?),(?))";
			
										Hpb.app.dbConnection.execute(insertMeta,dataArr,(err,resultObj)=>{
											
											var created_date = Math.floor(Date.now()); // to get server created date
											dataArrObj.created_date = created_date;
											dataArrObj.updated_date = created_date;
											dataArrObj.uid = users[0].id;
											
											var hpbArr = [];
											var paramsArr = [];
											
											for(var o in dataArrObj) {
												if(o == 'hpb_status'){
													dataArrObj[o] = dataArrObj[o].toLowerCase();
												}
												hpbArr.push(dataArrObj[o]);
												paramsArr.push("(?)");
											}
											var paramsKey = paramsArr.join(', ');
											var keyString = Object.keys(dataArrObj).join(', ');
											
											// add the user as hpb
											var sqlQuery = "insert into [hpb_info_tbl] ("+keyString+") OUTPUT Inserted.hpb_id values ("+paramsKey+")";

											Hpb.app.dbConnection.execute(sqlQuery,hpbArr,(err,resultObj)=>{
												var result = {};
												
												if(resultObj.length > 0){
													result.id = resultObj[0].hpb_id;
													result.updated_date = created_date;
													result.add = true;

													
												}
													cb(err,result);
												
												
											});
										});
									});
								}
							});
						});
					});
				}
				else{
					Hpb.findOne({ where:{uid:user.id}}, function(err,hpbData){
						if(!hpbData){
							var created_date = Math.floor(Date.now()); // to get server created date
							dataArrObj.created_date = created_date;
							dataArrObj.updated_date = created_date;
							dataArrObj.uid = user.id;
							
							var hpbArr = [];
							var paramsArr = [];
							
							for(var o in dataArrObj) {
								hpbArr.push(dataArrObj[o]);
								paramsArr.push("(?)");
							}
							var paramsKey = paramsArr.join(', ');
							var keyString = Object.keys(dataArrObj).join(', ');
							
							// add the user as hpb
							var sqlQuery = "insert into [hpb_info_tbl] ("+keyString+") OUTPUT Inserted.hpb_id values ("+paramsKey+")";

							Hpb.app.dbConnection.execute(sqlQuery,hpbArr,(err,resultObj)=>{
								var result = {};
								if(resultObj.length > 0){
									result.id = resultObj[0].hpb_id;
									result.updated_date = created_date;
								}
								cb(err,result);
							});
						}else{
							var resultObj = {};
							resultObj.id = hpbData.hpb_id;
							resultObj.updated_date = hpbData.updated_date;
							cb(null,resultObj);
						}
					})
				}
			});
		}
	}
	
	Hpb.remoteMethod('addEditHpb',{
		http:{ path:'/addEditHpb', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'hpb_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	function updateHpbMobileApproval(hpbData,dataArrObj){
		//console.log("updateHpbMobileApproval Function : ",hpbData, dataArrObj);
		return new Promise((resolve,reject)=>{
			if(hpbData && dataArrObj['role'] == '$ra' && dataArrObj['app'] != true){
				if(hpbData['primary_mobile_no'] != dataArrObj['primary_mobile_no']){
					var dataApprovalUser = [];
					var sqlApproval = "update hpb_update_approval set is_closed = 1, updated_date=(?) where hpb_id = (?) and field_name = 'Mobile'";
					dataApprovalUser.push(dataArrObj.updated_date);
					dataApprovalUser.push(hpbData.hpb_id);
					Hpb.app.dbConnection.execute(sqlApproval,dataApprovalUser,(err,resApproval)=>{
						updateHpbCardApproval(hpbData,dataArrObj).then((respFlag)=>{
							if(respFlag){
								//console.log("updateHpbCardApproval Call true : ",respFlag);
								resolve(true);
							}
						});
					});
				}else{
					updateHpbCardApproval(hpbData,dataArrObj).then((respFlag)=>{
						if(respFlag){
							//console.log("updateHpbCardApproval Call false : ",respFlag);
							resolve(true);
						}
					});
				}
			}else{
				resolve(true);
			}
		});
	}

	function updateHpbCardApproval(hpbData,dataArrObj){
		return new Promise((resolve,reject)=>{
			if(hpbData){
				//console.log("updateHpbCardApproval Function : ",hpbData,dataArrObj);
				if(hpbData['id_card_number'] != dataArrObj['id_card_number']){
					var dataApprovalUser = [];
					var sqlApproval = "update hpb_update_approval set is_closed = 1, updated_date=(?) where hpb_id = (?) and field_name = 'Card Number'";
					dataApprovalUser.push(dataArrObj.updated_date);
					dataApprovalUser.push(hpbData.hpb_id);
					Hpb.app.dbConnection.execute(sqlApproval,dataApprovalUser,(err,resApproval)=>{
						resolve(true);
					});
				}else{
					resolve(true);
				}
			}else{
				resolve(true);
			}
		});
	}

	// to get hp according to the filter
	Hpb.getHpb = function(hpb_id,created_date,updated_date,created_by,updated_by,assigned_to,user_id,rolename,primary_mobile_no,postalcode,hpb_email,hpb_type,limit,page,hpb_status,id_card_city_name, domicile_city_name,hpb_name,dataArrObj,cb){
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		var dataArr = [];
		if(rolename == "$tlh"){
			var sqlQuery =	`select u.realm as sph_name, h.* from [hpb_info_tbl] h, [User] u where h.created_by = u.id and h.assigned_to in ( 
									select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 
										select id from postal_code where 
										subdistrict_id in (
											select meta_value from user_mapping where uid = (?) and 
											meta_key = 'subdistrict_id'
										) 
									)
								)`;
			dataArr.push(user_id);
		}
		else if(rolename == "$ac"){
			var sqlQuery = 	`select u.realm as sph_name, h.* from [hpb_info_tbl] h, [User] u where h.created_by = u.id and h.assigned_to in ( 
									select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 
										select p.id from postal_code p, subdistrict sd, district d, municipality m 
										where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id
										and d.id in (
											select meta_value from user_mapping where uid = (?) and 
											meta_key = 'district_id'
										) 
									)
								)`;
			dataArr.push(user_id);
		}
		else if(rolename == "$ra"){
			var sqlQuery = 	`select u.realm as sph_name, h.* from [hpb_info_tbl] h, [User] u where h.created_by = u.id and h.assigned_to in ( 
								select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	
									select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr
									where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id
									and pr.region_id = r.id
									and r.id in (
										select meta_value from user_mapping where uid = (?) and 
										meta_key = 'region_id'
									) 
								)
							)`;
			dataArr.push(user_id);
		}
		else{
			var sqlQuery = "select u.realm as sph_name, h.* from [hpb_info_tbl] h, [User] u where h.created_by = u.id ";
		}
		
		if(hpb_id){
			sqlQuery+=" AND h.hpb_id = (?) ";
			dataArr.push(hpb_id);
		}
		if(hpb_name){
			sqlQuery+=" AND h.hpb_name like (?) ";
			hpb_name = "%"+hpb_name+"%";
			dataArr.push(hpb_name);
		}
		if(assigned_to){
			sqlQuery+=" AND h.assigned_to = (?) ";
			dataArr.push(assigned_to);
		}
		if(created_by){
			sqlQuery+=" AND h.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(updated_by){
			sqlQuery+=" AND h.updated_by = (?) ";
			dataArr.push(updated_by);
		}
		if(created_date){
			sqlQuery+=" AND h.created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			sqlQuery+=" AND h.updated_date > (?) ";
			dataArr.push(updated_date);
		}
		if(primary_mobile_no){
			sqlQuery+=" AND h.primary_mobile_no = (?) ";
			dataArr.push(primary_mobile_no);
		}
		if(postalcode){
			sqlQuery+=" AND h.id_card_pincode = (?) ";
			dataArr.push(postalcode);
		}
		if(hpb_type){
			sqlQuery+=" AND h.hpb_type = (?) ";
			dataArr.push(hpb_type);
		}
		if(hpb_status){
			sqlQuery+=" AND h.hpb_status = (?) ";
			dataArr.push(hpb_status);
		}
		if(id_card_city_name){
			sqlQuery+=" AND h.id_card_city = (?) ";
			dataArr.push(id_card_city_name);
		}
		if(domicile_city_name){
			sqlQuery+=" AND h.domicile_city = (?) ";
			dataArr.push(domicile_city_name);
		}
		if(hpb_email){
			sqlQuery+=" AND h.hpb_email = (?) ";
			dataArr.push(hpb_email);
		}
		if((typeof(dataArrObj)!='undefined') && (dataArrObj['searchFilter']!='')){
			dataArrObj['searchFilter'] = '%'+dataArrObj['searchFilter']+'%';
			sqlQuery+=" AND (h.hpb_name like (?) OR h.primary_mobile_no like (?) OR h.id_card_number like (?) )  ";
			dataArr.push(dataArrObj['searchFilter'],dataArrObj['searchFilter'],dataArrObj['searchFilter']);
		}
		
		sqlQuery+=" ORDER BY h.hpb_id DESC ";
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Hpb.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}
	
	Hpb.remoteMethod('getHpb',{
		http:{ path:'/getHpb', verb: 'get' },
		accepts:[
					{ arg:'hpb_id', type: 'any', source:{http:'query'}},
					{ arg:'created_date', type: 'any', source:{http:'query'}},
					{ arg:'updated_date', type: 'any', source:{http:'query'}},
					{ arg:'created_by', type: 'any', source:{http:'query'}},
					{ arg:'updated_by', type: 'any', source:{http:'query'}},
					{ arg:'assigned_to', type: 'any', source:{http:'query'}},
					{ arg:'user_id', type: 'any', source:{http:'query'}},
					{ arg:'rolename', type: 'any', source:{http:'query'}},
					{ arg:'primary_mobile_no', type: 'string', source:{http:'query'}},
					{ arg:'postalcode', type: 'any', source:{http:'query'}},
					{ arg:'hpb_email', type: 'any', source:{http:'query'}},
					{ arg:'hpb_type', type: 'any', source:{http:'query'}},
					{ arg:'limit', type: 'any', source:{http:'query'}},
					{ arg:'page', type: 'any', source:{http:'query'}},
					{ arg:'hpb_status', type: 'string', source:{http:'query'}},
					{ arg:'id_card_city_name', type: 'string', source:{http:'query'}},
					{ arg:'domicile_city_name', type: 'string', source:{http:'query'}},
					{ arg:'hpb_name', type: 'string', source:{http:'query'}},
					{ arg:'dataArrObj', type: 'object', source:{http:'query'}}
				],
		returns:{ arg:'result', type: 'object'}
	});
	
	
	// to get hp according to the filter
	Hpb.getHpbCount = function(hpb_id,created_date,updated_date,created_by,updated_by,assigned_to,user_id,rolename,primary_mobile_no,postalcode,hpb_email,hpb_type,limit,page,hpb_status,id_card_city_name, domicile_city_name,hpb_name,cb){
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		var dataArr = [];
		if(rolename == "$tlh"){
			var sqlQuery =	`select count(*) as total from hpb_info_tbl h where assigned_to in ( 
									select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 
										select id from postal_code where 
										subdistrict_id in (
											select meta_value from user_mapping where uid = (?) and 
											meta_key = 'subdistrict_id'
										) 
									)
								)`;
			dataArr.push(user_id);
		}
		else if(rolename == "$ac"){
			var sqlQuery = 	`select count(*) as total from hpb_info_tbl h where assigned_to in ( 
									select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 
										select p.id from postal_code p, subdistrict sd, district d, municipality m 
										where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id
										and d.id in (
											select meta_value from user_mapping where uid = (?) and 
											meta_key = 'district_id'
										) 
									)
								)`;
			dataArr.push(user_id);
		}
		else if(rolename == "$ra"){
			var sqlQuery = 	`select count(*) as total from hpb_info_tbl h where assigned_to in ( 
								select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	
									select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr
									where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id
									and pr.region_id = r.id
									and r.id in (
										select meta_value from user_mapping where uid = (?) and 
										meta_key = 'region_id'
									) 
								)
							)`;
			dataArr.push(user_id);
		}
		else{
			var sqlQuery = "select count(*) as total from [hpb_info_tbl] h, [User] u where h.created_by = u.id ";
		}
		
		if(hpb_id){
			sqlQuery+=" AND h.hpb_id = (?) ";
			dataArr.push(hpb_id);
		}
		if(hpb_name){
			sqlQuery+=" AND h.hpb_name like (?) ";
			hpb_name = "%"+hpb_name+"%";
			dataArr.push(hpb_name);
		}
		if(assigned_to){
			sqlQuery+=" AND h.assigned_to = (?) ";
			dataArr.push(assigned_to);
		}
		if(created_by){
			sqlQuery+=" AND h.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(updated_by){
			sqlQuery+=" AND h.updated_by = (?) ";
			dataArr.push(updated_by);
		}
		if(created_date){
			sqlQuery+=" AND h.created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			sqlQuery+=" AND h.updated_date > (?) ";
			dataArr.push(updated_date);
		}
		if(primary_mobile_no){
			sqlQuery+=" AND h.primary_mobile_no = (?) ";
			dataArr.push(primary_mobile_no);
		}
		if(postalcode){
			sqlQuery+=" AND h.id_card_pincode = (?) ";
			dataArr.push(postalcode);
		}
		if(hpb_type){
			sqlQuery+=" AND h.hpb_type = (?) ";
			dataArr.push(hpb_type);
		}
		if(hpb_status){
			sqlQuery+=" AND h.hpb_status = (?) ";
			dataArr.push(hpb_status);
		}
		if(id_card_city_name){
			sqlQuery+=" AND h.id_card_city = (?) ";
			dataArr.push(id_card_city_name);
		}
		if(domicile_city_name){
			sqlQuery+=" AND h.domicile_city = (?) ";
			dataArr.push(domicile_city_name);
		}
		if(hpb_email){
			sqlQuery+=" AND h.hpb_email = (?) ";
			dataArr.push(hpb_email);
		}
		
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		//console.log(sqlQuery);
		//console.log(dataArr);
		Hpb.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}

	Hpb.remoteMethod('getHpbCount',{
		http:{ path:'/getHpbCount', verb: 'get' },
		accepts:[
					{ arg:'hpb_id', type: 'any', source:{http:'query'}},
					{ arg:'created_date', type: 'any', source:{http:'query'}},
					{ arg:'updated_date', type: 'any', source:{http:'query'}},
					{ arg:'created_by', type: 'any', source:{http:'query'}},
					{ arg:'updated_by', type: 'any', source:{http:'query'}},
					{ arg:'assigned_to', type: 'any', source:{http:'query'}},
					{ arg:'user_id', type: 'any', source:{http:'query'}},
					{ arg:'rolename', type: 'any', source:{http:'query'}},
					{ arg:'primary_mobile_no', type: 'string', source:{http:'query'}},
					{ arg:'postalcode', type: 'any', source:{http:'query'}},
					{ arg:'hpb_email', type: 'any', source:{http:'query'}},
					{ arg:'hpb_type', type: 'any', source:{http:'query'}},
					{ arg:'limit', type: 'any', source:{http:'query'}},
					{ arg:'page', type: 'any', source:{http:'query'}},
					{ arg:'hpb_status', type: 'string', source:{http:'query'}},
					{ arg:'id_card_city_name', type: 'string', source:{http:'query'}},
					{ arg:'domicile_city_name', type: 'string', source:{http:'query'}},
					{ arg:'hpb_name', type: 'string', source:{http:'query'}}
				],
		returns:{ arg:'result', type: 'object'}
	});
	
	
	// to get hp according to the filter
	Hpb.getHpbPoints = function(hpb_id,cb){
		
		//var sqlQuery = "select sum(points) as points from [products_receipt_tbl] where hpb_id = (?) ";
		
		var sqlQuery = "select sum(points) as points, (select previous_points from hpb_info_tbl where hpb_id = (?)) as old_points,(select sum(mpt.points) from mason_point_tbl mpt join reward_claims_tbl rct on mpt.order_id = rct.id  where rct.hpb_id=(?)) as mason_point from  [products_receipt_tbl] where hpb_id = (?)";
		Hpb.app.dbConnection.execute(sqlQuery,[hpb_id,hpb_id,hpb_id],(err,resultObj)=>{
		
			if(resultObj.length > 0){
				var points = (resultObj[0].points + resultObj[0].old_points + parseInt(resultObj[0].mason_point?resultObj[0].mason_point:0));
				
				var pointsRedeemed = "select sum(points_redeemed) as redeemed from [reward_claims_tbl] where hpb_id = (?) and (status = 0 and status = 1)";
				Hpb.app.dbConnection.execute(pointsRedeemed,[hpb_id],(err,resultRedeemObj)=>{
					
					var redeemed = 0;
					if(resultRedeemObj.length > 0){
						redeemed = resultRedeemObj[0].redeemed?resultRedeemObj[0].redeemed:0;
					}
					var pointsLeft = points - redeemed;
					cb(null,pointsLeft);
				
				});
				
			}else{
				cb(null,0);
			}
		});
	}

	Hpb.remoteMethod('getHpbPoints',{
		http:{ path:'/getHpbPoints', verb: 'get' },
		accepts:[
					{ arg:'hpb_id', type: 'any', source:{http:'query'}}
				],
		returns:{ arg:'result', type: 'object'}
	});

	// to get hp according to the id
	
};