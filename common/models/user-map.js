'use strict';
var async = require('async');
var generator = require('generate-password');
const nn = require('nevernull');
var request = require('request');
module.exports = function(Usermap) {
	 
	Usermap.getAreaMapping = function(dataObj,areaName,areaValue,cb){
  		if(!areaValue){
  			areaValue=""; 
  		}
  		var regionIds="";
  		var provinceIds="";
  		var districtIds="";
  		var municipalityIds="";
  		var subdistrictIds="";
  		var postalcodeIds="";
  		if(dataObj['region']['length']>0){
			regionIds=dataObj['region'].map(function(elem){
			return elem.id;
			}).join(",");
  		}	
  		if(dataObj['province']['length']>0){
			provinceIds=dataObj['province'].map(function(elem){
			return elem.id;
			}).join(",");
  		}
  		if(dataObj['district']['length']>0){
  			districtIds=dataObj['district'].map(function(elem){
			return elem.id;
			}).join(",");
  		}
  		if(dataObj['municipality']['length']>0){
  			municipalityIds=dataObj['municipality'].map(function(elem){
			return elem.id;
			}).join(",");
  		}
  		if(dataObj['subdistrict']['length']>0){
  			subdistrictIds=dataObj['subdistrict'].map(function(elem){
			return elem.id;
			}).join(",");
  		}
  		if(dataObj['postalcode']['length']>0){
  			postalcodeIds=dataObj['postalcode'].map(function(elem){
			return elem.id;
			}).join(",");
  		}
		
		var newQuerySelect=" * ";
		var newQueryWhere=" 1=1 ";
		var newOrderBy=" rg.id ";
  		if(areaName=="region"){
  			newQuerySelect=" rg.id as 'id',rg.name as 'name' ";
  			newQueryWhere=" rg.name like '%"+areaValue+"%'";
  			newOrderBy=" rg.name  ";
  		}else if(areaName=="province"){
  			newQuerySelect=" pr.id as 'id',pr.name as 'name' ";
  			newQueryWhere=" pr.name like '%"+areaValue+"%'";
  			newOrderBy=" pr.name  ";
  		}else if(areaName=="district"){
  			newQuerySelect=" dt.id as 'id',dt.name as 'name' ";
  			newQueryWhere=" dt.name like '%"+areaValue+"%'";
  			newOrderBy=" dt.name  ";
  		}else if(areaName=="municipality"){
  			newQuerySelect=" mc.id as 'id',mc.name as 'name' ";
  			newQueryWhere=" mc.name like '%"+areaValue+"%'";
  			newOrderBy=" mc.name ";
  		}else if(areaName=="subdistrict"){
  			newQuerySelect=" sd.id as 'id',sd.name as 'name' ";
  			newQueryWhere=" sd.name like '%"+areaValue+"%'";
  			newOrderBy=" sd.name ";
  		}else if(areaName=="postalcode"){
  			newQuerySelect=" pc.id as 'id',pc.postal_code as 'name' ";
  			newQueryWhere=" pc.postal_code like '%"+areaValue+"%'";
  			newOrderBy=" pc.postal_code ";
  		}

		if(regionIds!=""){
			if(areaName=="region"){
				newQueryWhere+=" AND rg.id NOT IN ("+regionIds+") ";
			}else{
				newQueryWhere+=" AND rg.id IN ("+regionIds+") ";
			}
			
		}
		if(provinceIds!=""){
			if(areaName=="province"){
				newQueryWhere+=" AND pr.id NOT IN ("+provinceIds+") ";
			}else{
				newQueryWhere+=" AND pr.id IN ("+provinceIds+") ";
			}
			
		}
		if(districtIds!=""){
			if(areaName=="district"){
				newQueryWhere+=" AND dt.id NOT IN ("+districtIds+") ";
			}else{
				newQueryWhere+=" AND dt.id IN ("+districtIds+") ";
			}
			
		}
		if(municipalityIds!=""){
			if(areaName=="municipality"){
				newQueryWhere+=" AND mc.id NOT IN ("+municipalityIds+") ";
			}else{
				newQueryWhere+=" AND mc.id IN ("+municipalityIds+") ";
			}
			
		}
		if(subdistrictIds!=""){
			if(areaName=="subdistrict"){
				newQueryWhere+=" AND sd.id NOT IN ("+subdistrictIds+") ";
			}else{
				newQueryWhere+=" AND sd.id IN ("+subdistrictIds+") ";
			}
		}

		if(postalcodeIds!=""){
			if(areaName=="postalcode"){
				newQueryWhere+=" AND pc.id NOT IN ("+postalcodeIds+") ";
			}else{
				newQueryWhere+=" AND pc.id IN ("+postalcodeIds+") ";
			}
			
		}
  		
  		var query=` SELECT
			DISTINCT ${newQuerySelect}
		FROM  postal_code pc 
		LEFT JOIN subdistrict sd  ON pc.subdistrict_id=sd.id
		LEFT JOIN municipality mc ON sd.municipality_id=mc.id
		LEFT JOIN district dt ON mc.district_id=dt.id
		LEFT JOIN province pr ON dt.province_id=pr.id
		LEFT JOIN region rg ON pr.region_id=rg.id WHERE ${newQueryWhere} ORDER BY ${newOrderBy} ASC `;

	    //  OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY `;
		//console.log('query',query);

		// var sql = require("mssql");
		// try{
		// 	sql.close();
		// }catch(exx){
		// 	console.log('sql close exx',exx);
		// }
		
		// sql.connect(Usermap.app.dbConnectionString, function (err) {
		// 	if(!err){
		// 		var request = new sql.Request();
		// 		request.query(query,(err1,resultObj)=>{
		// 			if(!err1){
		// 				cb(err1,resultObj.recordset);
		// 			}else{
		// 				cb(err,null);
		// 			}
					
		// 		});
		// 	}else{
		// 		cb(err,null);
		// 	}
		// });

		Usermap.app.dbConnection.execute(query,[],(err,resultObj)=>{
				cb(err,resultObj); 
		});
  				
  	}

	Usermap.remoteMethod('getAreaMapping',{
	http:{ path:'/getAreaMapping', verb: 'post'},
	accepts:[
			{ arg: 'dataObj', type:'object', http:{ source:"body"} },
			{ arg: 'areaName', type:'any', http:{ source:"query"} },
			{ arg: 'areaValue', type:'any', http:{ source:"query"} },
		],
	returns:{ arg: 'result', type: 'object'}
	});

	Usermap.getRelatedUser = function(dataObj,uid,cb){
		var currUid=uid;
		var query=`exec relatedUserFetchTest ${currUid}`;
		Usermap.app.dbConnection.execute(query,[],(err,resultObj)=>{
			cb(err,resultObj);
		});
	}

	Usermap.remoteMethod('getRelatedUser',{
	http:{ path:'/getRelatedUser', verb: 'post'},
	accepts:[
			{ arg: 'dataObj', type:'object', http:{ source:"body"} },
			{ arg: 'uid', type:'any', http:{ source:"query"} },
		],
	returns:{ arg: 'result', type: 'object'}
	});


	Usermap.userMapAddEdit = function(dataObj,uid,cb){
		var userId = uid;
		var roleName = dataObj['role'];
		var username = dataObj['mobile'];
		var password = dataObj['password'];
		if(password == ''){
			password = generator.generate({
				length: 10,
				numbers: true
			});
		}
		//console.log("dataObj : ", dataObj);
		if(username && username!=''){
			var UserModel = Usermap.app.models.User;
			var RoleModel = Usermap.app.models.Role;
			var RoleModelMapping = Usermap.app.models.RoleMapping;
			var name = dataObj['name'];
			var email = dataObj['email'];

			var dataArr = [];
			if(dataObj['email'] && dataObj['email'] != ""){
				dataArr = {email:email};
			}else{
				dataArr = {email:'0'};
			}

			var currMapingDatas=[];
			var metaKeyName="_none";
			if(roleName=='$sph'){
				currMapingDatas=dataObj['postalCode'];
				metaKeyName="postal_code";
			}else if(roleName=='$tlh'){
				currMapingDatas=dataObj['subdistrict'];
				metaKeyName="subdistrict_id";
			}else if(roleName=='$ac'){
				currMapingDatas=dataObj['district'];
				metaKeyName="district_id";
			}else if(roleName=='$am'){
				currMapingDatas=dataObj['region'];
				metaKeyName="region_id";
			}else if(roleName=='$ra'){
				currMapingDatas=dataObj['region'];
				metaKeyName="region_id";
			}

			console.log("dataArr", dataArr);

		UserModel.findOne({where: { username: username }}, function(err0, userObj) { //Check for existing mobile no
			if(!err0){
				UserModel.findOne({where: dataArr}, function(errE, userEmailObj) { //Check for existing email id
					if(!errE){
						// Start
						if(userId>0){
							//if Mobile no is Exist return false..
							if(userObj && userObj != ""){
								if(nn(userObj).id()!=userId && nn(userObj).id()>0){
									cb(null,{status:false,message:'User mobile/email already exists.'});
									return false;
								}
							}
							//if Email id is Exist return false..
							if(userEmailObj && userEmailObj != ""){
								if(nn(userEmailObj).id()!=userId && nn(userEmailObj).id()>0){
									cb(null,{status:false,message:'User mobile/email already exists.'});
									return false;
								}
							}
							var userIdN=nn(userObj).id();
							var queryUserUpdate=` UPDATE [User] SET `;
							if(email && email!=''){
									queryUserUpdate += ` email='${email}',  `;
							}else{
									queryUserUpdate += ` email=NULL,  `;
							}
							if(name && name!=''){
								queryUserUpdate += ` realm='${name}', `;
							}else{
								queryUserUpdate += ` realm=NULL, `;
							}
							if(username && username!=''){
								queryUserUpdate += ` username='${username}' `;
							}

							queryUserUpdate +=` WHERE id=${userId} `;
							checkUserReportingValid(roleName,currMapingDatas,userId).then((respMp)=>{
						    Usermap.app.dbConnection.execute(queryUserUpdate,[],(err,resultObj)=>{
								//console.log('err',queryUserUpdate,err);
								if(!err){
									var newQueryMappingDel=`DELETE FROM user_mapping WHERE uid=${userId}`;
									Usermap.app.dbConnection.execute(newQueryMappingDel,[],(err1,resultObj1)=>{
										if(!err1){
												async.each(currMapingDatas,(currMapingData,callback)=>{
													var created_date_update_date = Math.floor(Date.now());
													var meta_value=currMapingData['id'];
													var status=1;
													var newQueryinsert=`INSERT INTO user_mapping(uid,meta_key,meta_value,status,created_date,updated_date) VALUES(${userId},'${metaKeyName}','${meta_value}',${status},${created_date_update_date},${created_date_update_date})`;
													Usermap.app.dbConnection.execute(newQueryinsert,[],(err3,resultObj3)=>{
														//console.log('err3',newQueryinsert,err3);
														callback();
													});
												},(endLoop)=>{
													var respData={};
													respData['status']=true;
													respData['message']='Ok';
													cb(null,respData);
												});
										}else{
											cb(err1,null);
										}
									});
								}else{
									cb(err,null);
								}
							});

						   },(responMsg)=>{
					   			cb(null,{status:false,message:responMsg});
								return false;
						   });
					   	}else{
					   		//if mobile no is Exist return false..
							if(nn(userObj).id()>0){
								cb(null,{status:false,message:'User mobile/email already exists.'});
								return false;
							}
							//if email id is Exist return false..
							if(nn(userEmailObj).id()!=userId && nn(userEmailObj).id()>0){
								cb(null,{status:false,message:'User mobile/email already exists.'});
								return false;
							}

							//console.log("password : ", password);
							checkUserReportingValid(roleName,currMapingDatas,userId).then((respMp)=>{
							UserModel.create({email: email,realm:name,username:username,password:password}, function(err, userInstance) {
								if(!err){
									RoleModel.findOne({where: { name: roleName }}, function(err1, role) {
										if(!err1){
											//console.log('role',role);
											RoleModelMapping.create({
											principalType: 'USER',
											principalId: userInstance.id,
											roleId:role.id
											}, function(err2, principal) {
												if(!err2){

													var userIdN = userInstance.id;
													var newQueryMappingDel=`DELETE FROM user_mapping WHERE uid=${userIdN}`;
													Usermap.app.dbConnection.execute(newQueryMappingDel,[],(err3,resultObj1)=>{
														
														if(!err3){
																//console.log('currMapingDatas',currMapingDatas);
																async.each(currMapingDatas,(currMapingData,callback)=>{
																	var created_date_update_date = Math.floor(Date.now());
																	var meta_value=currMapingData['id'];
																	var status=1;
																	var newQueryinsert=`INSERT INTO user_mapping(uid,meta_key,meta_value,status,created_date,updated_date) VALUES(${userIdN},'${metaKeyName}','${meta_value}',${status},${created_date_update_date},${created_date_update_date})`;
																	Usermap.app.dbConnection.execute(newQueryinsert,[],(err4,resultObj3)=>{
																		//console.log('resultObj3',resultObj3);
																		callback();

																	});
																},(endLoop)=>{
																	var respData={};
																	respData['status']=true;
																	respData['message']='Ok';
																	respData['uid']=userIdN;
																	respData['rolename']=roleName;

																	//Confirmation SMS to user that added..
																	var msisdn = "";
																	if(username.charAt(0) == '0'){
																		msisdn = username.slice(1);
																	}
																	//console.log('msisdn:', msisdn);
																	msisdn = '62'+msisdn;
												  					var smsTextUrl="";//`https://sms-api.jatismobile.com/index.ashx?userid=holcimindo&password=holcimindo123&msisdn=${msisdn}&message=Hello+${name}+,+Welcome+aboard&sender=HOLCIM&division=Customer+Marketing&channel=2`;
												  					//console.log('smsTextUrl',smsTextUrl);
												  					request(smsTextUrl, function (error, response, body) {
												  						console.log('error:', error); // Print the error if one occurred 
												  						console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received 
												  						console.log('body:', body); // Print the HTML for the Google homepage. 
												  						//fn(null, code);
												  					});

																	cb(null,respData);
																});
														}else{
															cb(err3,null);
															//cb(null,{status:false,message:'Somthing went Wrong. Please try again later'});
														}
													});


												}else{
													cb(err2,null);
													//cb(null,{status:false,message:'Somthing went Wrong. Please try again later'});
												}
											});
										}else{
											cb(err1,null);
										}
									});

								}else{
									cb(err,null);
								}
							});

							},(responMsg)=>{
								cb(null,{status:false,message:responMsg});
								return false;
							});
						}

				 	}else{
						cb(errE,null);
					}
				});
			}else{
				cb(err0,null);
			}
		});
	}

	
	function checkUserReportingValid(roleName,currMapingDatas,userId){
	     return new Promise(function(resolve,reject) {
	     	var retrunFlag=false;
	     	var pRoleName="";
			var checkMappingUserQuery=` SELECT DISTINCT  usr.id,usmp.uid,usr.realm, 
			usr.username,usr.email, rl.name AS 'rolename' FROM [User] usr 
			JOIN RoleMapping rm ON usr.id=rm.principalId 
			JOIN Role rl ON rm.roleId=rl.id 
			JOIN user_mapping usmp ON usr.id=usmp.uid 
			JOIN postal_code pcd ON usmp.meta_value = pcd.id
			JOIN subdistrict sud ON pcd.subdistrict_id=sud.id
			JOIN municipality mup ON sud.municipality_id=mup.id
			JOIN district dist ON mup.district_id=dist.id
			JOIN province prov ON dist.province_id=prov.id
			JOIN region reg ON prov.region_id=reg.id `;

			var mIds=currMapingDatas.map(function(elem){
			return elem.id;
			}).join(",");
			if(roleName=='$sph'){
				checkMappingUserQuery+=` WHERE 
				((usmp.meta_key = 'subdistrict_id' and usmp.meta_value in ( select subdistrict_id from postal_code where id in (${mIds}) ) )
				AND ( rl.name='$tlh')) `;
				pRoleName='$tlh';
			}else if(roleName=='$tlh'){
				checkMappingUserQuery+=` WHERE ( ( ( usmp.meta_key = 'district_id' and usmp.meta_value in 
				( select district_id from municipality where id  in  
				( select municipality_id from subdistrict where id in 
				(${mIds}) ) ) ) OR (usmp.meta_key = 'subdistrict_id' and usmp.meta_value in (${mIds}))) AND ( rl.name='$ac' OR rl.name='$tlh')) `;
				pRoleName='$ac';
			}else if(roleName=='$ac'){
				checkMappingUserQuery+=` WHERE
					(((usmp.meta_key = 'region_id' and usmp.meta_value  in  
					( select region_id from province where id in 
					(select province_id from district where id in  
					(${mIds}) ) ) ) OR  (usmp.meta_key = 'district_id' and usmp.meta_value  in (${mIds})))
					AND  ( rl.name='$am' OR rl.name='$ac'))
				`;
				pRoleName='$am';
			}else if(roleName=='$am'){
				checkMappingUserQuery+=` WHERE
					(((usmp.meta_key = 'region_id' and usmp.meta_value  in (${mIds})))
					AND  (rl.name='$am'))
				`;
				pRoleName='$ra';
			}else if(roleName=='$ra'){
				checkMappingUserQuery+=` WHERE
					(((usmp.meta_key = 'region_id' and usmp.meta_value  in (${mIds})))
					AND  (rl.name='$ra'))
				`;
				pRoleName='$ra';
			}else{
				retrunFlag=true;
			}

			if(userId>0){
				checkMappingUserQuery+=` AND usmp.uid!=${userId} AND usr.status=1`;
			}

			if(currMapingDatas.length==0){
				retrunFlag=true;
			}

			if(retrunFlag){
				resolve(true);
			}else{
				// console.log('checkMappingUserQuery',checkMappingUserQuery);
				//console.log('mIds',mIds);
				//console.log('currMapingDatas',currMapingDatas);
				Usermap.app.dbConnection.execute(checkMappingUserQuery,[],(err,resultQDatas)=>{
						//console.log('err',err);
						if(!err){

							var sUserLen = getCountKeyArrFun(roleName,'rolename',resultQDatas);
							var pUserLen = nn(resultQDatas).length()-sUserLen ;
							console.log("sUserLen",sUserLen);
							//console.log('sUserLen',sUserLen);
							//console.log('pUserLen',pUserLen);
							if( (pUserLen==1 && sUserLen==0 && (roleName=='$tlh' || roleName=='$ac')) || (pUserLen==1 && roleName=='$sph') || (sUserLen==0 && roleName=='$am') || (roleName=='$ra')){ //removed the sUserLen==0 condition from $ra
								resolve(true);
							}else if(pUserLen==0 && (roleName=='$sph' || roleName=='$tlh' || roleName=='$ac')){
								reject('Please add a parent user for this user type');
							}else if(sUserLen>0 && (roleName=='$tlh' || roleName=='$ac' || roleName=='$am')){
								reject('Region/district/subdistrict should have only one AM/AC/TLH');
							}else if(pUserLen>1 && (roleName=='$sph' || roleName=='$tlh' || roleName=='$ac')){
								reject('This user have multiple parent users. please check');
							}else{
								reject('Somthing went Wrong. Please try again later');
							}

						}else{
							  reject('Somthing went Wrong. Please try again later');
						}
				});
			}
		     	
	     });
	}

}

function getCountKeyArrFun(keyName,valueKeyName,arrData){
		var returnCtn=0;
		for(var i=0;i<nn(arrData).length();i++){
				if(arrData[i][''+valueKeyName+'']==keyName){
					returnCtn=returnCtn+1;
				}
		}
		return returnCtn;
}

Usermap.remoteMethod('userMapAddEdit',{
	http:{ path:'/userMapAddEdit', verb: 'post'},
	accepts:[
			{ arg: 'dataObj', type:'object', http:{ source:"body"} },
			{ arg: 'uid', type:'any', http:{ source:"query"} },
		],
	returns:{ arg: 'result', type: 'object'}
});


Usermap.userSwapTransfer =  function(dataObj,uid,tuid,cb){	
	// console.log('dataObj',dataObj);
	// console.log('uid',uid);
	// console.log('tuid',tuid);
	var typeAct=dataObj['action_type'];
	var currUid=uid;
	var tsUid=tuid;

	if(currUid>0 && tsUid>0){
	
			var currUserObj = null;
			var tsUserObj =  null;
			var cUTuRoleName='none';

			getUserMappingDetailById(currUid).then((respCObj)=>{
					currUserObj = respCObj;
					getUserMappingDetailById(tsUid).then((respCtsObj)=>{
						 tsUserObj = respCtsObj;
						 //console.log('currUserObj',currUserObj);
						 //console.log('tsUserObj',tsUserObj);
						if(currUserObj['rolename']==tsUserObj['rolename'] && currUserObj['uid']!=tsUserObj['uid']){
							cUTuRoleName=currUserObj['rolename'];
							if(typeAct=="swap_transfer"){

								var cuid=currUserObj['uid'];
								var tuid=tsUserObj['uid'];
								var queryF=`DELETE FROM user_mapping WHERE uid=${cuid} OR uid=${tuid}`;

								Usermap.app.dbConnection.execute(queryF,[],(err,resultQDatas)=>{
									if(!err){

										userMappingSaveByArrId(currUserObj['userData'],tsUserObj['uid']).then(()=>{
											userMappingSaveByArrId(tsUserObj['userData'],currUserObj['uid']).then(()=>{
												transferDataAltUsers(cuid,tuid,true).then(()=>{
													cb(null,{status:true,message:'Success...'});
												});
											 });
										});
										//cb(null,true);
									}else{
										cb(null,{status:false,message:err});
									}
								});
								
							}else if(typeAct=="inactive_transfer_data"){

								var cuid=currUserObj['uid'];
								var tuid=tsUserObj['uid'];


								inactiveTransferValidParents(cuid,tuid,cUTuRoleName).then((respVFlag)=>{
									if(respVFlag){


										var queryF=`UPDATE [user] SET status=0 WHERE id=${cuid}`;

										Usermap.app.dbConnection.execute(queryF,[],(err,resultQDatas)=>{
											if(!err){
												var queryFF=` DELETE FROM AccessToken WHERE userId=${cuid}`;
												Usermap.app.dbConnection.execute(queryFF,[],(err1,resultQDatas1)=>{
													if(!err1){
														userMappingSaveByArrId(currUserObj['userData'],tuid).then(()=>{
															transferDataAltUsers(cuid,tuid,false).then(()=>{
																cb(null,{status:true,message:'Success...'});
															});
														});
													}else{
														cb(null,{status:false,message:err});
													}	
												});
											}else{
												cb(null,{status:false,message:err});
											}
										});


									}else{
										cb(null,{status:false,message:'This user mapping have multiple parent users. Please check'});
									}
							  });


								//cb(null,true);
							}

							//cb(null,true);
						}else{
							cb(null,{status:false,message:'User same not role error'});
						}

					});
			});

			
	}else{
		cb(null,{status:false,message:'User params error'});
	}
	
}


Usermap.remoteMethod('userSwapTransfer',{
	http:{ path:'/userSwapTransfer', verb: 'post'},
	accepts:[
			{ arg: 'dataObj', type:'object', http:{ source:"body"} },
			{ arg: 'uid', type:'any', http:{ source:"query"} },
			{ arg: 'tuid', type:'any', http:{ source:"query"} }
		],
	returns:{ arg: 'result', type: 'object'}
});

function inactiveTransferValidParents(cuid,tuid,roleName){
	return new Promise((resolve,reject)=>{

		var query=`exec relatedUserFetch ${cuid}`;
		Usermap.app.dbConnection.execute(query,[],(err,resultObj)=>{
			if(!err){
				var currUserRelDatas=resultObj;
				var query1=`exec relatedUserFetch ${tuid}`;
				Usermap.app.dbConnection.execute(query1,[],(err1,resultObj1)=>{
					if(!err){
						var tranUserRelDatas=resultObj1; 

						var finalUserRetDatas= currUserRelDatas.concat(tranUserRelDatas);
						//console.log('finalUserRetDatas',finalUserRetDatas);

						var ffinalUserRetDatas = [];
						var unique = {};
						 
						finalUserRetDatas.forEach(function(item) {
						    if (!unique[item.uid]) {
						        ffinalUserRetDatas.push(item);
						        unique[item.uid] = item;
						    }
						});

						var ctnRole=0;
						for(var i=0;i<ffinalUserRetDatas.length;i++){
							var currObjRel = ffinalUserRetDatas[i];
							if(roleName=="$sph"){
								if(currObjRel['rolename']=="$tlh"){
									ctnRole++;
								}
							}else if(roleName=="$tlh"){
								if(currObjRel['rolename']=="$ac"){
									ctnRole++;
								}
							}else if(roleName=="$ac"){
								if(currObjRel['rolename']=="$am"){
									ctnRole++;
								}
							}else if(roleName=="$am"){
								// if(currObjRel['rolename']=="$ra"){
								// 	ctnRole++;
								// }
							}
						}

						if(ctnRole<2){
							resolve(true);
						}else{
							resolve(false);
						}

					}else{
						resolve(false);
					}
				});
			}else{
				resolve(false);
			}
		});

		//	resolve(true);
	});
}

function transferDataAltUsers(cUser,tUser,mFlag){
	return new Promise((resolve,reject)=>{

		var tableLists=['projects_tbl','hpb_info_tbl'];

		async.each(tableLists,(tableName,callback)=>{
			var created_date_update_date = Math.floor(Date.now());
			var newQueryAssign=`UPDATE ${tableName} SET 
			assigned_to = CASE   
			WHEN assigned_to=${cUser} THEN  ${tUser}
			WHEN assigned_to=${tUser} THEN  ${cUser}
			END,
			updated_date=${created_date_update_date}
			WHERE assigned_to IN (${cUser},${tUser})
			`;

			if(mFlag==false){
				newQueryAssign=`UPDATE ${tableName} SET 
				assigned_to = CASE   
				WHEN assigned_to=${cUser} THEN  ${tUser}
				END,
				updated_date=${created_date_update_date}
				WHERE assigned_to IN (${cUser})
				`;
			}

			//console.log('newQueryAssign',newQueryAssign);
			Usermap.app.dbConnection.execute(newQueryAssign,[],(err,resultQDatas)=>{
				callback();
			});

		},(EndEach)=>{


			if(mFlag){
				var queryF=` DELETE FROM AccessToken WHERE userId=${cUser}`;
				Usermap.app.dbConnection.execute(queryF,[],(err1,resultQDatas1)=>{
					var queryFF=` DELETE FROM AccessToken WHERE userId=${tUser}`;
					Usermap.app.dbConnection.execute(queryFF,[],(err11,resultQDatas11)=>{
						resolve(true);
					});
				});
			}else{
				resolve(true);
			}
			
		 });

	
	})
}

function userMappingSaveByArrId(dataArrs,uid){
	return new Promise((resolve,reject)=>{
		async.each(dataArrs,(dataObj,callback)=>{

			
			var created_date_update_date = Math.floor(Date.now());
			var meta_value=dataObj['meta_value'];
			var meta_key=dataObj['meta_key'];
			var status=1;
			var userId=uid;
			var queryCheck=`SELECT uid FROM user_mapping WHERE uid=${userId} and meta_key='${meta_key}' and meta_value='${meta_value}'`;
			Usermap.app.dbConnection.execute(queryCheck,[],(err0,resultQDatas0)=>{
				//console.log('err0 userMappingSaveByArrId',err0,resultQDatas0);
				if(!err0){
					if(nn(resultQDatas0).length()==0){
						var newQueryinsert=`INSERT INTO user_mapping(uid,meta_key,meta_value,status,created_date,updated_date) VALUES(${userId},'${meta_key}','${meta_value}',${status},${created_date_update_date},${created_date_update_date})`;
						Usermap.app.dbConnection.execute(newQueryinsert,[],(err,resultQDatas)=>{
							callback();
						});
					}else{
						callback();
					}
					
				}else{
					callback();
				}
			});

		},(endEach)=>{
			resolve(true);
		});
	});
}

function getUserMappingDetailById(uid){
	return new Promise((resolve,reject)=>{
		var returnObjArr={uid:uid,rolename:'none',userData:[]};

		var query=` SELECT u.id,r.name as 'rolename',usm.meta_key,usm.meta_value FROM [User] u JOIN RoleMapping  rm on u.id=rm.principalId JOIN Role r on rm.roleId=r.id LEFT JOIN user_mapping usm on u.id=usm.uid WHERE u.id=${uid} `;
		Usermap.app.dbConnection.execute(query,[],(err,resultQDatas)=>{
			if(!err){
				 var sameRoleAndUid=true;
				 var fRoleName='none';
				 var fuid=0;
				 for(var i=0;i<resultQDatas.length;i++){
				 	var currobj=resultQDatas[i];
				 	//console.log('currobj',currobj);
				 	if(uid==currobj['id']){

				 		if(i==0){
				 			fRoleName=currobj['rolename'];
				 			fuid=currobj['id'];
				 			returnObjArr['rolename']=fRoleName;
				 			var metaObj={meta_key:currobj['meta_key'],meta_value:currobj['meta_value']};
				 			if(currobj['meta_key'] && currobj['meta_key']!='null' && currobj['meta_value'] && currobj['meta_value']!='null'){
				 				returnObjArr['userData'].push(metaObj);
				 			}
				 			
				 		}else{
				 			if(currobj['rolename']==fRoleName && fuid==currobj['id']){
				 				var metaObj={meta_key:currobj['meta_key'],meta_value:currobj['meta_value']};
				 				if(currobj['meta_key'] && currobj['meta_key']!='null' && currobj['meta_value'] && currobj['meta_value']!='null'){
				 				 returnObjArr['userData'].push(metaObj);
				 				}
				 			}else{
				 				break;
				 			}
				 		}


				 	}
				 }

				 resolve(returnObjArr);

			}else{
				resolve(false);
			}
		});
	});
	
}

Usermap.userResetHistory = function(dataObj,uid,cb){
	//console.log('userResetHistory');
	

	var userId = uid;
	if(userId>0){
		var queryUserUpdate=` UPDATE user_meta SET status=0 WHERE status=1 AND meta_key in ('imei','appVersion','deviceInfo','uuid') AND uid=${userId}`;
		Usermap.app.dbConnection.execute(queryUserUpdate,[],(err,resultObj)=>{
			if(!err){
				cb(null,{status:true})
			}else{
				cb(err,null)
			}
		});
											
	}else{
			cb(null,{status:false})
	}

}

Usermap.remoteMethod('userResetHistory',{
	http:{ path:'/userResetHistory', verb: 'post'},
	accepts:[
			{ arg: 'dataObj', type:'object', http:{ source:"body"} },
			{ arg: 'uid', type:'any', http:{ source:"query"} },
		],
	returns:{ arg: 'result', type: 'object'}
});

Usermap.userStatusChange = function(dataObj,uid,cb){
	var userId = uid;
	var status = dataObj['status'];
	if(userId>0){

		var queryUserUpdate=` UPDATE [user] SET status=${status} WHERE id=${userId}`;
		Usermap.app.dbConnection.execute(queryUserUpdate,[],(err,resultObj)=>{
			if(!err){
				//cb(null,{status:true})
				var queryUserUpdateT=` DELETE FROM AccessToken WHERE userId=${userId}`;
				//console.log(queryUserUpdateT);
				Usermap.app.dbConnection.execute(queryUserUpdateT,[],(err1,resultObj1)=>{
						if(!err1){
								cb(null,{status:true})
								// var queryUserUpdateMP=` DELETE FROM user_mapping WHERE uid=${userId} `;
								// Usermap.app.dbConnection.execute(queryUserUpdateMP,[],(err2,resultObj2)=>{
								// 		if(!err2){
								// 			cb(null,{status:true})
								// 		}else{
								// 			cb(err2,{status:false})
								// 		}
								// });
						}else{
								cb(err1,{status:false})
						}
				});
			}else{
				cb(err,{status:false})
			}
		});
											
	}else{
			cb(null,{status:false})
	}
}

Usermap.remoteMethod('userStatusChange',{
	http:{ path:'/userStatusChange', verb: 'post'},
	accepts:[
			{ arg: 'dataObj', type:'object', http:{ source:"body"} },
			{ arg: 'uid', type:'any', http:{ source:"query"} },
		],
	returns:{ arg: 'result', type: 'object'}
});


	Usermap.getMappingForMaster = function(dataObj,areaName,areaValue,cb){

  		if(!areaValue){
  			areaValue="";
  		}
  		var regionIds="";
  		var provinceIds="";
  		var districtIds="";
  		var municipalityIds="";
  		var subdistrictIds="";
  		var postalcodeIds="";
  		if(dataObj['region']['length']>0){
			regionIds=dataObj['region'].map(function(elem){
			return elem.id;
			}).join(",");
  		}	
  		if(dataObj['province']['length']>0){
			provinceIds=dataObj['province'].map(function(elem){
			return elem.id;
			}).join(",");
  		}
  		if(dataObj['district']['length']>0){
  			districtIds=dataObj['district'].map(function(elem){
			return elem.id;
			}).join(",");
  		}
  		if(dataObj['municipality']['length']>0){
  			municipalityIds=dataObj['municipality'].map(function(elem){
			return elem.id;
			}).join(",");
  		}
  		if(dataObj['subdistrict']['length']>0){
  			subdistrictIds=dataObj['subdistrict'].map(function(elem){
			return elem.id;
			}).join(",");
  		}
  		if(dataObj['postalcode']['length']>0){
  			postalcodeIds=dataObj['postalcode'].map(function(elem){
			return elem.id;
			}).join(",");
  		}
		
		var newQuerySelect=" * ";
		var newQueryWhere=" 1=1 ";
		var newOrderBy=" rg.id ";
  		if(areaName=="region"){
  			newQuerySelect=" rg.id as 'id',rg.name as 'name' ";
  			newQueryWhere=" rg.name like '%"+areaValue+"%'";
  			newOrderBy=" rg.name  ";
  		}else if(areaName=="province"){
  			newQuerySelect=" pr.id as 'id',pr.name as 'name' ";
  			newQueryWhere=" pr.name like '%"+areaValue+"%'";
  			newOrderBy=" pr.name  ";
  		}else if(areaName=="district"){
  			newQuerySelect=" dt.id as 'id',dt.name as 'name' ";
  			newQueryWhere=" dt.name like '%"+areaValue+"%'";
  			newOrderBy=" dt.name  ";
  		}else if(areaName=="municipality"){
  			newQuerySelect=" mc.id as 'id',mc.name as 'name' ";
  			newQueryWhere=" mc.name like '%"+areaValue+"%'";
  			newOrderBy=" mc.name ";
  		}else if(areaName=="subdistrict"){
  			newQuerySelect=" sd.id as 'id',sd.name as 'name' ";
  			newQueryWhere=" sd.name like '%"+areaValue+"%'";
  			newOrderBy=" sd.name ";
  		}else if(areaName=="postalcode"){
  			newQuerySelect=" pc.id as 'id',pc.postal_code as 'name' ";
  			newQueryWhere=" pc.postal_code like '%"+areaValue+"%'";
  			newOrderBy=" pc.postal_code ";
  		}

		if(regionIds!=""){
			if(areaName=="region"){
				newQueryWhere+=" AND rg.id NOT IN ("+regionIds+") ";
			}else{
				newQueryWhere+=" AND rg.id IN ("+regionIds+") ";
			}
			
		}
		if(provinceIds!=""){
			if(areaName=="province"){
				newQueryWhere+=" AND pr.id NOT IN ("+provinceIds+") ";
			}else{
				newQueryWhere+=" AND pr.id IN ("+provinceIds+") ";
			}
			
		}
		if(districtIds!=""){
			if(areaName=="district"){
				newQueryWhere+=" AND dt.id NOT IN ("+districtIds+") ";
			}else{
				newQueryWhere+=" AND dt.id IN ("+districtIds+") ";
			}
			
		}
		if(municipalityIds!=""){
			if(areaName=="municipality"){
				newQueryWhere+=" AND mc.id NOT IN ("+municipalityIds+") ";
			}else{
				newQueryWhere+=" AND mc.id IN ("+municipalityIds+") ";
			}
			
		}
		if(subdistrictIds!=""){
			if(areaName=="subdistrict"){
				newQueryWhere+=" AND sd.id NOT IN ("+subdistrictIds+") ";
			}else{
				newQueryWhere+=" AND sd.id IN ("+subdistrictIds+") ";
			}
		}

		if(postalcodeIds!=""){
			if(areaName=="postalcode"){
				newQueryWhere+=" AND pc.id NOT IN ("+postalcodeIds+") ";
			}else{
				newQueryWhere+=" AND pc.id IN ("+postalcodeIds+") ";
			}
			
		}
  		
		var query = `SELECT DISTINCT ${newQuerySelect} FROM `;
		
		if(dataObj['regionTagged'] == "yes"){
			query+= `province pr JOIN region rg ON pr.region_id=rg.id`;
		}else{
			query+= `region rg `;
		}
		
		if(dataObj['provinceTagged'] == "yes"){
			query+=` JOIN district dt ON dt.province_id=pr.id`;
		}
		
		if(dataObj['districtTagged'] == "yes"){
			query+=` JOIN municipality mc on mc.district_id = dt.id `;
		}
		
		if(dataObj['municipalityTagged'] == "yes"){
			query+=` JOIN subdistrict sd on sd.municipality_id = mc.id `;
		}
		
		query+=` WHERE ${newQueryWhere} ORDER BY ${newOrderBy} ASC`;
	    
		Usermap.app.dbConnection.execute(query,[],(err,resultObj)=>{
				cb(err,resultObj);
		});
  				
  	}

	Usermap.remoteMethod('getMappingForMaster',{
	http:{ path:'/getMappingForMaster', verb: 'post'},
	accepts:[
			{ arg: 'dataObj', type:'object', http:{ source:"body"} },
			{ arg: 'areaName', type:'any', http:{ source:"query"} },
			{ arg: 'areaValue', type:'any', http:{ source:"query"} },
		],
	returns:{ arg: 'result', type: 'object'}
	});

}; 
