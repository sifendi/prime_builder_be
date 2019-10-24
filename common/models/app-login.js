'use strict';
var async = require('async');
var speakeasy = require('speakeasy');
var generator = require('generate-password');
var request = require('request');
module.exports = function(Applogin) { 
 
    Applogin.requestCode = function(credentials, ctx, fn) {
	    var self = this,
	    now = (new Date()).getTime(),
	    defaultError = new Error('login failed');
	    var UserModel = Applogin.app.models.user;
	    defaultError.statusCode = 401;
	    defaultError.code = 'LOGIN_FAILED';
        
        if (!credentials.username) {
            return fn(defaultError); 
        }
        
		var resObj = {};
        UserModel.findOne({where: {and:[{ username: credentials.username}]},"include":["roles"]}, function(err, user) {
            if (err) {
                return fn(defaultError);
            } else if (user) {
               	
	           	  var code = speakeasy.totp({
	              secret: Applogin.app.APP_SECRET + credentials.username,
	              encoding: 'ascii',
	              algorithm: 'sha256',
	              step:60*5
	              });

				if(user['isSuper'] == 1){
					  Applogin.loginWithCode({username:credentials.username,twofactor:code},fn);
				}else{
				    
	                // [TODO] hook into your favorite SMS API and 
	                // send your user the code!
					
					resObj['otpcode']=code;
					var userRole = user.toJSON();
					if(userRole.roles){
						userRole = userRole.roles[0].name;
					}
					resObj['status']=true;
					resObj['userStatus']=user['status'];
					resObj['role']=userRole;
					
					var headers = ctx.req.headers;
					// if api hit is from eap but role is not that of eap, return false
					if(headers['x-requested-with'] && headers['x-requested-with'] == "com.holcim.eap" && userRole!="$eap"){
						resObj['smsSent']=false;
						fn(null, resObj);
					}else if(headers['x-requested-with'] && (headers['x-requested-with'].indexOf("com.holcim.hpb") >= 0) && userRole=="$eap"){
						resObj['smsSent']=false;
						fn(null, resObj);
					}else{
						resObj['smsSent']=true;
						var msisdn = credentials.username;
						if(msisdn.charAt(0) == '0'){
							msisdn = msisdn.slice(1);
						}
						msisdn = '62'+msisdn;
						var smsTextUrl=`https://sms-api.jatismobile.com/index.ashx?userid=holcimindo&password=holcimindo123&msisdn=${msisdn}&message=${code}+is+your+OTP&sender=HOLCIM&division=Marketing+OTP&channel=2`;
						//console.log('smsTextUrl',smsTextUrl);
						request(smsTextUrl, function (error, response, body) {
							console.log('error:', error); // Print the error if one occurred 
							console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received 
							console.log('body:', body); // Print the HTML for the Google homepage. 
							//fn(null, code);
						});
						
						fn(null, resObj);
					}
				}	
			
            } else {
                return fn(defaultError);
            }
        });
    };
    
    /**
     * A method for logging in a user using a time-based (quickly expiring)
     * verification code obtained using the `requestCode()` method.
     * 
     * @param  {object}   credentials A JSON object containing "email" and "twofactor" fields
     * @param  {Function} fn          The function to call in the Loopback for sending back data
     * @return {void}
     */
    Applogin.loginWithCode = function(credentials, fn) {
        var self = this,
            defaultError = new Error('login failed');
        
        defaultError.statusCode = 401;
        defaultError.code = 'LOGIN_FAILED';
        var UserModel = Applogin.app.models.user;
        if (!credentials.username || !credentials.twofactor) {
            return fn(defaultError);
        }
      //  console.log('1',credentials);
	  
      UserModel.findOne({ where:{"and":[{ username: credentials.username},{status:1 }]},"include":["roles","userinfohpb","userinfometa"]}, function(err, user) {
			//console.log('2',user);
			if (err) return fn(err);
			if (!user) return fn(defaultError);
			//console.log('3');
			var verified =   speakeasy.totp.verify({
				secret: Applogin.app.APP_SECRET + credentials.username,
				encoding: 'ascii',
				algorithm: 'sha256',
				window: 0,
				token: credentials.twofactor,
				step:60*5 
			});
			//console.log('verified',verified);
			if (!verified) {
				return fn(defaultError);
			}
       
			user.createAccessToken(1209600, function(err, token) {
                if (err) return fn(err);
				
				var userRole = user.toJSON();
				if(userRole.roles){
					userRole = userRole.roles[0].name;
				}
				
				if(userRole == "$tlh"){
					var label = "subdistrict_id";
					// get subdistrict id of the user
					var subdistrictId = [];
					var sqlQuery = "select pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, postal_code p where u.id = rm.principalId and  um.meta_key = (?) and um.meta_value = sd.id and u.id = um.uid and u.id = (?) and r.id = rm.roleId and r.name = (?) and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id";
				}else if(userRole == "$sph"){
					var label = "postal_code";
					// get subdistrict id of the user
					var subdistrictId = [];
					var sqlQuery = "select pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, postal_code p where u.id = rm.principalId and  um.meta_key = (?) and um.meta_value = p.id and u.id = um.uid and u.id = (?) and r.id = rm.roleId and r.name = (?) and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id";
				}else if(userRole == "$ac"){
					var label = "district_id";
					// get subdistrict id of the user
					var subdistrictId = [];
					var sqlQuery = "select pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, postal_code p where u.id = rm.principalId and  um.meta_key = (?) and um.meta_value = d.id and u.id = um.uid and u.id = (?) and r.id = rm.roleId and r.name = (?) and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id";
				}else{
					// get subdistrict id of the user
					var subdistrictId = [];
					var sqlQuery = "select pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, postal_code p where u.id = rm.principalId and  um.meta_key = (?) and um.meta_value = p.id and u.id = um.uid and u.id = (?) and r.id = rm.roleId and r.name = (?) and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id";
				}
				
				Applogin.app.dbConnection.execute(sqlQuery,[label,user.id,userRole],(err,userSubDis)=>{
					
					var postalCodeArr = [];
					var districtArr = [];
					var subDistrictArr = [];
					var municipalityArr = [];
					var provinceArr = [];
					
					if(userSubDis){
						var dataLength = userSubDis.length;
						
						user['postal_code'] = [];
						user['province'] = [];
						user['municipality'] = [];
						user['subdistrict'] = [];
						user['district'] = [];
						
						for(var i=0; i<dataLength; i++){
							if(postalCodeArr.indexOf(userSubDis[i]['postal_code']) < 0){
								postalCodeArr.push(userSubDis[i]['postal_code']);
								var arr = { "name":userSubDis[i]['postal_code'], "id":userSubDis[i]['postal_code_id'] };
								user['postal_code'].push(arr);
							}
							if(provinceArr.indexOf(userSubDis[i]['province_id']) < 0){
								provinceArr.push(userSubDis[i]['province_id']);
								var arr = { "name":userSubDis[i]['province_name'], "id":userSubDis[i]['province_id'] };
								user['province'].push(arr);
							}
							if(municipalityArr.indexOf(userSubDis[i]['municipality_id']) < 0){
								municipalityArr.push(userSubDis[i]['municipality_id']);
								var arr = { "name":userSubDis[i]['municipality_name'], "id":userSubDis[i]['municipality_id'] };
								user['municipality'].push(arr);
							}
							if(districtArr.indexOf(userSubDis[i]['district_id']) < 0){
								districtArr.push(userSubDis[i]['district_id']);
								var arr = { "name":userSubDis[i]['district_name'], "id":userSubDis[i]['district_id'] };
								user['district'].push(arr);
							}
							if(subDistrictArr.indexOf(userSubDis[i]['subdistrict_id']) < 0){
								subDistrictArr.push(userSubDis[i]['subdistrict_id']);
								var arr = { "name":userSubDis[i]['subdistrict_name'], "id":userSubDis[i]['subdistrict_id'] };
								user['subdistrict'].push(arr);
							}
						}
					}
					
					if(userRole == "$eap"){
						var sqlQuery = "select meta_key, meta_value from user_meta where status = 1 and uid = (?)";
						Applogin.app.dbConnection.execute(sqlQuery,[user.id],(err,userMeta)=>{
							token.__data.user = user.toJSON();
							var userRole = user.toJSON();
							if(userRole.roles){
								userRole = userRole.roles[0].name;
							}
							token['rememberMe'] = true;
							//token['userExtra'] = userMeta;
							token['isSuper'] = user['isSuper'];
							token['status'] = true;
							token.__data.user['userinfo'] = [];
							var userinfoObj = {name:user['realm']};
							token.__data.user['userinfo'].push(userinfoObj);
							token['role']=userRole;
							token["department"] = "";
							token["directorate"] = "";
							token["subarea"] = "";
							token["code"] = "";
							token["profilepic"] = "";

							async.forEachOf(userMeta, function(json, o, callback){
								token[json['meta_key']] = json['meta_value'];
								callback();
							},
							(err)=>{
								token["points"] = 0;
								var sqlPQuery = `SELECT SUM(points) as 'total_points' FROM eap_employee_points WHERE user_id=${user.id}`;
								Applogin.app.dbConnection.execute(sqlPQuery,[],(err,userEapPData)=>{
									var totalPTemp = 0;
									if(userEapPData.length>0){
										totalPTemp = userEapPData[0]['total_points'];
									}
									token["points"]=totalPTemp;
									token["eap_user_approval_data"]={};
									token["eap_user_approval_data"]['approval_status']=1;
									token["eap_user_approval_data"]['field_old_value']=userData["username"];
									token["eap_user_approval_data"]['field_new_value']=userData["username"];
									token["eap_user_approval_data"]['field_name']='mobile_username';
									var sqlPQueryApproval=`SELECT euup.* FROM eap_user_update_approval euup join [User] usr on usr.id=euup.uid and euup.is_closed=0 and usr.id=${currUId} `;
									Applogin.app.dbConnection.execute(sqlPQueryApproval,[],(err2,euupD)=>{
										if(euupD){
											if(euupD.length>0){
												for(var ii=0;ii<euupD.length;ii++){
													if(euupD[ii]['field_name']==userData["eap_user_approval_data"]['field_name']){
														token["eap_user_approval_data"]['approval_status']=euupD[ii]['approval_status'];
														token["eap_user_approval_data"]['field_old_value']=euupD[ii]['field_old_value'];
														token["eap_user_approval_data"]['field_new_value']=euupD[ii]['field_new_value'];
														token["eap_user_approval_data"]['field_name']=euupD[ii]['field_name'];
													}
												}
											}
										}
										fn(err2, token);
									});
									
								});
								
							});
						});
					}else{
						var userRole = user.toJSON();
						if(userRole.roles){
							userRole = userRole.roles[0].name;
						}
						token.__data.user = user.toJSON();
							
						token['rememberMe']=true;
						token['isSuper'] = user['isSuper'];
						token['userStatus'] = user['status'];
						token['status'] = true;
						token['role']=userRole;
						token.__data.user['userinfo'] = [];
						var userinfoObj = {name:user['realm']};
						token.__data.user['userinfo'].push(userinfoObj);
						fn(err, token);
					}
				});
				
            });
        });
    };


	Applogin.checkImei = function(imei,user_no,fn) {
		var selectQuery = "select um.uid, um.meta_value, u.isSuper from [user_meta] um join [User] u on um.uid = u.id where um.meta_key = 'imei' and u.username = (?) and um.status = 1 ";
		Applogin.app.dbConnection.execute(selectQuery,[user_no],(err,userData)=>{
			if(userData){
				var result = {};
				if(userData.length > 0 && userData[0]['meta_value'] == imei){
					userData[0]['match'] = true;
				}else if(userData.length > 0 && userData[0]['meta_value'] != imei){
					//userData[0]['match'] = false; // disabled for time being
					userData[0]['match'] = true;
				}else{
					userData[0] = {};
					userData[0]['match'] = true; // disabled for time being
				}
			}
			fn(err,userData);
		});

    };

	Applogin.checkImeiNew = function(dataObj,fn) {
		var user_no = dataObj['user_no'];
		var imei = dataObj['imei'];
		var selectQuery = "select um.uid, um.meta_value, u.isSuper from [user_meta] um join [User] u on um.uid = u.id where um.meta_key = 'imei' and u.username = (?) and um.status = 1 ";
		Applogin.app.dbConnection.execute(selectQuery,[user_no],(err,userData)=>{
			if(userData){
				var result = {};
				if(userData.length > 0 && userData[0]['meta_value'] == imei){
					userData[0]['match'] = true;
				}else if(userData.length > 0 && userData[0]['meta_value'] != imei){
					//userData[0]['match'] = false; // disabled for time being
					userData[0]['match'] = true;
				}else{
					userData[0] = {};
					userData[0]['match'] = true; // disabled for time being
				}
			}
			fn(err,userData);
		});

    };
	
    Applogin.appActivate = function(imei,uid,dataArrObj,fn) {
		var selectQuery = "select * from [user_meta] where uid = (?) and meta_key = 'imei' and status = 1 ";
		Applogin.app.dbConnection.execute(selectQuery,[uid,imei],(err,userData)=>{
			var result = [];
			var keyString = "meta_value,uid,meta_key,status";
			if(userData && userData.length > 0){
				if(userData[0].meta_value != imei){
					fn(null,"Invalid IMEI");
				//	fn(null,"valid Invalid IMEI"); 
				}
				else{
					var counter = 0;
					var totalData = Object.keys(dataArrObj).length;
					async.forEachOf(dataArrObj, function(json, o, callback){
						var selectMeta = "select * from [user_meta] where meta_key = (?) and meta_value = (?) and uid = (?) and status = 1 ";
						Applogin.app.dbConnection.execute(selectMeta,[o,json,uid],(err,data)=>{
							if(data && (data.length > 0)){
								var selectObjQuery = "update [user_meta] set meta_key = (?) and meta_value = (?) where id = (?)";
								Applogin.app.dbConnection.execute(selectObjQuery,[o,json,data[0].id],(err,updateddata)=>{
									counter++;
									var updateArr = { "meta_value":json, "meta_key":o, "id":data[0].id };
									result.push(updateArr);
									//console.log(counter);
									//console.log(totalData);
									if(counter == totalData){
										fn(null,result);
									}
								});
							}
							else{
								var created_date = Math.floor(Date.now()); // to get server created date
								var selectObjQuery = "insert into [user_meta] (meta_key, meta_value, uid,status,created_date,updated_date) OUTPUT Inserted.id values ((?),(?),(?),(?),(?),(?)) ";
								Applogin.app.dbConnection.execute(selectObjQuery,[o,json,uid,1,created_date,created_date],(err,updateddata)=>{
									counter++;
									var updateArr = { "meta_value":json, "meta_key":o, "id":updateddata[0].id };
									result.push(updateArr);
									if(counter == totalData){
										fn(null,result);
									}
								});
							}
						});
						callback();
					});
				}
			}
			else{
				var created_date = Math.floor(Date.now()); // to get server created date
				var sqlQuery = "insert into [user_meta] (uid,meta_key,meta_value,status,created_date,updated_date) OUTPUT Inserted.id values ((?),(?),(?),(?),(?),(?))";
				Applogin.app.dbConnection.execute(sqlQuery,[uid,"imei",imei,1,created_date,created_date],(err,userData)=>{
					var counter = 0;
					var totalData = Object.keys(dataArrObj).length;
					async.forEachOf(dataArrObj, function(json, o, callback){
						var selectMeta = "select * from [user_meta] where meta_key = (?) and meta_value = (?) and uid = (?) and status = 1 ";
						Applogin.app.dbConnection.execute(selectMeta,[o,json,uid],(err,data)=>{
							if(data && (data.length > 0)){
								var created_date = Math.floor(Date.now()); // to get server created date
								var selectObjQuery = "update [user_meta] set meta_key = (?) and meta_value = (?), updated_date = (?) where id = (?)";
								Applogin.app.dbConnection.execute(selectObjQuery,[o,json,data[0].id,created_date],(err,updateddata)=>{
									counter++;
									var updateArr = { "meta_value":json, "meta_key":o, "id":data[0].id };
									result.push(updateArr);
									if(counter == totalData){
										fn(null,result);
									}
								});
							}else{
								var created_date = Math.floor(Date.now()); // to get server created date
								var selectObjQuery = "insert into [user_meta] (meta_key, meta_value, uid,status,created_date,updated_date) OUTPUT Inserted.id values ((?),(?),(?),(?),(?),(?)) ";
								Applogin.app.dbConnection.execute(selectObjQuery,[o,json,uid,1,created_date,created_date],(err,updateddata)=>{
									counter++;
									var updateArr = { "meta_value":json, "meta_key":o, "id":updateddata[0].id };
									result.push(updateArr);
									if(counter == totalData){
										fn(null,result);
									}
								});
							}
						});
						callback();
					});
				});
			}
		});
    };

    Applogin.remoteMethod(
        'requestCode',
        {
            description: 'Request a two-factor code for a user with email and password',
            accepts: [
                {arg: 'credentials', type: 'object', required: true, http: {source: 'body'}},
				{ arg: 'ctx', type: 'object', http: { source: 'context' }}
            ],
            returns: {arg: 'response', type: 'object'},
            http: {verb: 'post'}
        }
    );

	/*
	 Applogin.remoteMethod(
        'checkImei',
        {
            http: { path:'/checkImei', verb: 'get' },
			accepts: [
				{ arg: 'imei', type: 'string', required: true, http: {source: 'query'}},
				{ arg: 'user_no', type: 'string', required: true, http: {source: 'query'}}
			],
			returns: {
				arg: 'result',
				type: 'object',
				root: true,
				description: 'Return Params'
			}
        }
    );
	*/

	Applogin.remoteMethod(
        'checkImei',
        {
            http: { path:'/checkImei', verb: 'get' },
			accepts: [
				{ arg: 'imei', type: 'string', required: false, http: {source: 'query'}},
				{ arg: 'user_no', type: 'string', required: false, http: {source: 'query'}}
			],
			returns: {
				arg: 'result',
				type: 'object',
				root: true,
				description: 'Return Params'
			}
        }
    );

	Applogin.remoteMethod(
        'checkImeiNew',
        {
            http: { path:'/checkImeiNew', verb: 'post' },
			accepts: [
				{ arg: 'dataObj', type: 'object', required: false, http: {source: 'body'}},
			],
			returns: {
				arg: 'result',
				type: 'object',
				root: true,
				description: 'Return Params'
			}
        }
    );

    Applogin.remoteMethod(
        'loginWithCode',
        {
            description: 'Login a user with email and two-factor code',
            accepts: [
                {arg: 'credentials', type: 'object', required: true, http: {source: 'body'}}
            ],
            returns: {
                arg: 'accessToken',
                type: 'object',
                root: true,
                description: 'The response body contains properties of the AccessToken created on login.\n'
            },
            http: {verb: 'post'}
        }
    );

    Applogin.remoteMethod(
        'appActivate',
        {
            description: 'appActivate',
            accepts: [
                {arg: 'imei', type: 'string', required: true, http: {source: 'query'}},
				{arg: 'uid', type: 'number', required: true, http: {source: 'query'}},
				{arg: 'dataArrObj', type: 'object', required: true, http: {source: 'body'}}
            ],
            returns: {
                arg: 'result',
                type: 'object',
                root: true,
                description: 'Return Params'
            },
            http: {verb: 'post'}
        }
    );
  

	Applogin.getUserDetails = function(credentials, fn) {
		var self = this, defaultError = new Error('login failed');
        defaultError.statusCode = 401;
        defaultError.code = 'LOGIN_FAILED';
        var UserModel = Applogin.app.models.user;
		// if username is missing
        if ((!credentials.username) && (!credentials.email)) {
		    return fn(defaultError);
        }
		var creds = {};
		
		if(credentials.email){
			var sqlQuery = "select * from [User] where email = (?)";
			Applogin.app.dbConnection.execute(sqlQuery,[credentials.email],(err,userData)=>{
				if(userData && userData.length > 0){
					console.log(userData);console.log(userData);
					UserModel.findOne({ where: { username: userData[0]['username']},"include":["roles"]}, function(err, user){
						if (err) return fn(err);
						if (!user) return fn(defaultError);
						console.log(user);
						user.createAccessToken(1209600, function(err, token) {
							if (err) return fn(err);
							
							var userRole = user.toJSON();
							if(userRole.roles){
								userRole = userRole.roles[0].name;
							}
							
							if(userRole == "$tlh"){
								var label = "subdistrict_id";
								// get subdistrict id of the user
								var subdistrictId = [];
								var sqlQuery = "select pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, postal_code p where u.id = rm.principalId and  um.meta_key = (?) and um.meta_value = sd.id and u.id = um.uid and u.id = (?) and r.id = rm.roleId and r.name = (?) and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id";
							}else if(userRole == "$sph"){
								var label = "postal_code";
								// get subdistrict id of the user
								var subdistrictId = [];
								var sqlQuery = "select pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, postal_code p where u.id = rm.principalId and  um.meta_key = (?) and um.meta_value = p.id and u.id = um.uid and u.id = (?) and r.id = rm.roleId and r.name = (?) and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id";
							}else if(userRole == "$ac"){
								var label = "district_id";
								// get subdistrict id of the user
								var subdistrictId = [];
								var sqlQuery = "select pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, postal_code p where u.id = rm.principalId and  um.meta_key = (?) and um.meta_value = d.id and u.id = um.uid and u.id = (?) and r.id = rm.roleId and r.name = (?) and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id";
							}else{
								// get subdistrict id of the user
								var subdistrictId = [];
								var sqlQuery = "select pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, postal_code p where u.id = rm.principalId and  um.meta_key = (?) and um.meta_value = p.id and u.id = um.uid and u.id = (?) and r.id = rm.roleId and r.name = (?) and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id";
							}
							
							Applogin.app.dbConnection.execute(sqlQuery,[label,user.id,userRole],(err,userSubDis)=>{
								var postalCodeArr = [];
								var districtArr = [];
								var subDistrictArr = [];
								var municipalityArr = [];
								var provinceArr = [];
								if(userSubDis){
									var dataLength = userSubDis.length;
									user['postal_code'] = [];
									user['province'] = [];
									user['municipality'] = [];
									user['subdistrict'] = [];
									user['district'] = [];
									//user['eapData'].push({ "name":"test", "id":"rest" },{ "name":"test2", "id":"rest2" });

									for(var i=0; i<dataLength; i++){
										if(postalCodeArr.indexOf(userSubDis[i]['postal_code']) < 0){
											postalCodeArr.push(userSubDis[i]['postal_code']);
											var arr = { "name":userSubDis[i]['postal_code'], "id":userSubDis[i]['postal_code_id'] };
											user['postal_code'].push(arr);
										}
										if(provinceArr.indexOf(userSubDis[i]['province_id']) < 0){
											provinceArr.push(userSubDis[i]['province_id']);
											var arr = { "name":userSubDis[i]['province_name'], "id":userSubDis[i]['province_id'] };
											user['province'].push(arr);
										}
										if(municipalityArr.indexOf(userSubDis[i]['municipality_id']) < 0){
											municipalityArr.push(userSubDis[i]['municipality_id']);
											var arr = { "name":userSubDis[i]['municipality_name'], "id":userSubDis[i]['municipality_id'] };
											user['municipality'].push(arr);
										}
										if(districtArr.indexOf(userSubDis[i]['district_id']) < 0){
											districtArr.push(userSubDis[i]['district_id']);
											var arr = { "name":userSubDis[i]['district_name'], "id":userSubDis[i]['district_id'] };
											user['district'].push(arr);
										}
										if(subDistrictArr.indexOf(userSubDis[i]['subdistrict_id']) < 0){
											subDistrictArr.push(userSubDis[i]['subdistrict_id']);
											var arr = { "name":userSubDis[i]['subdistrict_name'], "id":userSubDis[i]['subdistrict_id'] };
											user['subdistrict'].push(arr);
										}
									}
									
								}
								user['eapData'] = [];
								var eapDataArr = [];
								if(userRole=="$eap"){
									var query = "Select um.meta_key,um.meta_value from user_meta um ,[user] u  where u.id = um.uid and  um.uid = (?)";
									Applogin.app.dbConnection.execute(query,[user.id],(err,eapData)=>{
										dataLength = eapData.length;
										for(var i=0; i<dataLength; i++){
											user['eapData'].push(eapData[i]);
										}
										token.__data.user = user;
										token['rememberMe']=true;
										//console.log("user['eapData']=",user['eapData']);
										fn(err, token);
									});
								}else{
									token.__data.user = user;
									token['rememberMe']=true;
									fn(err, token);
								}
							});
						});
					});
				}
				else{
					return fn(defaultError);
				}
			});
			
		}
		else if(credentials.username){
			UserModel.findOne({ where: { username: credentials.username},"include":["roles"]}, function(err, user){
			if (err) return fn(err);
			if (!user) return fn(defaultError);
			user.createAccessToken(1209600, function(err, token) {
				if (err) return fn(err);
				var userRole = user.toJSON();
				if(userRole.roles){
					userRole = userRole.roles[0].name;
				}

				if(userRole == "$tlh"){
					var label = "subdistrict_id";
					// get subdistrict id of the user
					var subdistrictId = [];
					var sqlQuery = "select pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, postal_code p where u.id = rm.principalId and  um.meta_key = (?) and um.meta_value = sd.id and u.id = um.uid and u.id = (?) and r.id = rm.roleId and r.name = (?) and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id";
				}else if(userRole == "$sph"){
					var label = "postal_code";
					// get subdistrict id of the user
					var subdistrictId = [];
					var sqlQuery = "select pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, postal_code p where u.id = rm.principalId and  um.meta_key = (?) and um.meta_value = p.id and u.id = um.uid and u.id = (?) and r.id = rm.roleId and r.name = (?) and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id";
				}else if(userRole == "$ac"){
					var label = "district_id";
					// get subdistrict id of the user
					var subdistrictId = [];
					var sqlQuery = "select pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, postal_code p where u.id = rm.principalId and  um.meta_key = (?) and um.meta_value = d.id and u.id = um.uid and u.id = (?) and r.id = rm.roleId and r.name = (?) and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id";
				}else{
					// get subdistrict id of the user
					var subdistrictId = [];
					var sqlQuery = "select pro.name as province_name, pro.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code,  p.id as postal_code_id from [User] u, Role r, province pro, district d, subdistrict sd, municipality m, RoleMapping rm, user_mapping um, postal_code p where u.id = rm.principalId and  um.meta_key = (?) and um.meta_value = p.id and u.id = um.uid and u.id = (?) and r.id = rm.roleId and r.name = (?) and sd.id = p.subdistrict_id and m.district_id = d.id and m.id = sd.municipality_id and d.province_id = pro.id";
				}
				
				Applogin.app.dbConnection.execute(sqlQuery,[label,user.id,userRole],(err,userSubDis)=>{
					var postalCodeArr = [];
					var districtArr = [];
					var subDistrictArr = [];
					var municipalityArr = [];
					var provinceArr = [];
					if(userSubDis){
						var dataLength = userSubDis.length;
						user['postal_code'] = [];
						user['province'] = [];
						user['municipality'] = [];
						user['subdistrict'] = [];
						user['district'] = [];
						//user['eapData'].push({ "name":"test", "id":"rest" },{ "name":"test2", "id":"rest2" });

						for(var i=0; i<dataLength; i++){
							if(postalCodeArr.indexOf(userSubDis[i]['postal_code']) < 0){
								postalCodeArr.push(userSubDis[i]['postal_code']);
								var arr = { "name":userSubDis[i]['postal_code'], "id":userSubDis[i]['postal_code_id'] };
								user['postal_code'].push(arr);
							}
							if(provinceArr.indexOf(userSubDis[i]['province_id']) < 0){
								provinceArr.push(userSubDis[i]['province_id']);
								var arr = { "name":userSubDis[i]['province_name'], "id":userSubDis[i]['province_id'] };
								user['province'].push(arr);
							}
							if(municipalityArr.indexOf(userSubDis[i]['municipality_id']) < 0){
								municipalityArr.push(userSubDis[i]['municipality_id']);
								var arr = { "name":userSubDis[i]['municipality_name'], "id":userSubDis[i]['municipality_id'] };
								user['municipality'].push(arr);
							}
							if(districtArr.indexOf(userSubDis[i]['district_id']) < 0){
								districtArr.push(userSubDis[i]['district_id']);
								var arr = { "name":userSubDis[i]['district_name'], "id":userSubDis[i]['district_id'] };
								user['district'].push(arr);
							}
							if(subDistrictArr.indexOf(userSubDis[i]['subdistrict_id']) < 0){
								subDistrictArr.push(userSubDis[i]['subdistrict_id']);
								var arr = { "name":userSubDis[i]['subdistrict_name'], "id":userSubDis[i]['subdistrict_id'] };
								user['subdistrict'].push(arr);
							}
						}
						
					}
					user['eapData'] = [];
					var eapDataArr = [];
					if(userRole=="$eap"){
						var query = "Select um.meta_key,um.meta_value from user_meta um ,[user] u  where u.id = um.uid and  um.uid = (?)";
						Applogin.app.dbConnection.execute(query,[user.id],(err,eapData)=>{
							dataLength = eapData.length;
							for(var i=0; i<dataLength; i++){
								user['eapData'].push(eapData[i]);
							}
							token.__data.user = user;
							token['rememberMe']=true;
							//console.log("user['eapData']=",user['eapData']);
							fn(err, token);
						});
					}else{
						token.__data.user = user;
						token['rememberMe']=true;
						fn(err, token);
					}
				});
			});
		});
	
		}
		
	};

	Applogin.remoteMethod('getUserDetails', {
		http: { path:'/getUserDetails', verb: 'post' },
		accepts: [
			{ arg: 'credentials', type: 'object', required: true, http: {source: 'body'}}
		],
		returns: {
			arg: 'result',
			type: 'object',
			root: true,
			description: 'Return Params'
		}
	});

	Applogin.userResetOrForgotPassActionCheckReq = function(credentials, fn) {
		var UserModal = Applogin.app.models.user;
		if(credentials['type'] && credentials['type']!='' && credentials['type_data'] && credentials['type_data']!=''){
			if(credentials.type == 'mobile'){
				var config = require('../../server/config.json');
				var path = require('path');
				var selectQuery = "select u.id, u.realm,u.username,r.name as rolename from [User] u join RoleMapping rm on rm.principalid = u.id join Role r on rm.roleId = r.id where u.username = (?) and u.status = 1 ";
				Applogin.app.dbConnection.execute(selectQuery,[credentials.type_data],(err,userData)=>{
					if(credentials.role == 'EAP'){
						if(userData && userData.length > 0 && userData[0].rolename == '$eapsa'){
							UserModal.findOne({ where:{"and":[{ username: userData[0]['username']},{status:1 }]},"include":["roles"]}, function(err, user){
								if(user){
									user.createAccessToken(600, function(err, token) {
										var msisdn = credentials.type_data;
										//var msisdn = '081321529049';
										var name = userData[0]['realm'];
										if(msisdn.charAt(0) == '0'){
											msisdn = msisdn.slice(1);
										}
										msisdn = '62'+msisdn;
										var msgData = `Hello+${name}+,+Click+link+to+reset+password+${config.eapdashboardUrl}/password-reset/${token.id}`;
										var smsTextUrl="";//`http://mobilebroadcast.jatismobile.com/users?userid=holcimreport&password=holcimreport789&msisdn=${msisdn}&message=${msgData}&sender=HOLCIM&privilege=Staff+(Report Only)&channel=2`;
										console.log('smsTextUrl',msgData);
										request(smsTextUrl, function (error, response, body) {
											console.log('msisdn:', msisdn); // Print the error if one occurred
					  						console.log('error:', error); // Print the error if one occurred
					  						console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received 
					  						console.log('body:', body); // Print the HTML for the Google homepage. 
					  						fn(error,{status:true,message:"Verification link sent to your mobile no.",response:response});
					  					});

										
									});
								}else{
									fn(err,{status:false,message:'Invalid mobile no.'});
								}
							});
						}else{
							fn(err,{status:false,message:'Invalid mobile no.'});
						}
					}else{
						if(userData && userData.length > 0 && userData[0].rolename != '$sph' && userData[0].rolename != '$am'){
							UserModal.findOne({ where:{"and":[{ username: userData[0]['username']},{status:1 }]},"include":["roles","userinfohpb","userinfometa"]}, function(err, user){
								if(user){
									user.createAccessToken(600, function(err, token) {
										var msisdn = credentials.type_data;
										//var msisdn = '081321529049';
										var name = userData[0]['realm'];
										if(msisdn.charAt(0) == '0'){
											msisdn = msisdn.slice(1);
										}
										msisdn = '62'+msisdn;
										var msgData = `Hello+${name}+,+Click+link+to+reset+password+${config.dashboardUrl}/password-reset/${token.id}`;
										var smsTextUrl="";//`http://mobilebroadcast.jatismobile.com/users?userid=holcimreport&password=holcimreport789&msisdn=${msisdn}&message=${msgData}&sender=HOLCIM&division=Duta+Holcim&channel=2`;
										console.log('smsTextUrl',msgData);
										request(smsTextUrl, function (error, response, body) {
					  						console.log('error:', error); // Print the error if one occurred
					  						console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received 
					  						console.log('body:', body); // Print the HTML for the Google homepage. 
					  					});

										fn(err,{status:true,message:"Verification link sent to your mobile no."});
									});
								}else{
									fn(err,{status:false,message:'Invalid mobile no.'});
								}
							});
						}else{
							fn(err,{status:false,message:'Invalid mobile no.'});
						}
					}
				});
			}
			else if(credentials.type == 'email'){
				var config = require('../../server/config.json');
				var path = require('path');
				var selectQuery = "select u.id, u.realm,u.username,r.name as rolename from [User] u join RoleMapping rm on rm.principalid = u.id join Role r on rm.roleId = r.id where u.email = (?) and u.status = 1 ";
				Applogin.app.dbConnection.execute(selectQuery,[credentials.type_data],(err,userData)=>{
					//console.log("credentials",credentials);
					//console.log("credentialsRole",credentials.role);
					//Forget password for EAP Users
					if(credentials.role == 'EAP'){
						if(userData && userData.length > 0 && userData[0].rolename == '$eapsa'){
							UserModal.findOne({ where:{"and":[{ username: userData[0]['username']},{status:1 }]},"include":["roles"]}, function(err, user){
								//console.log(user);
								if(user){
									user.createAccessToken(600, function(err, token) {
									var fromEmail = 'support@primebuilder.id';
									var toEmail = credentials.type_data;
									// var url = config.dashboardUrl + '/password-reset';
									var html =` 
										=========== Indonesia Version =================
										<br />
										<p>Kepada Rekan-rekan,</p>
										<p>Ini adalah email otomatis, tidak perlu dibalas/reply</p>
										<p>PassCode akun anda sudah direset. Silahkan gunakan alamat link dibawah untuk merubah ulang password anda:</p>
										<a href="${config.eapdashboardUrl}/password-reset/${token.id}">Click Here</a><br />
										<p>Many thanks.</p>
										<br />
										=========== End Indonesia Version =================
										<br/>
										=========== English Version =================
										<br/>
										<p>Dear Employee,</p>
										<p>This is an auto generated email please do not reply,</p>
										<p>We have reset your account's password. Please use this link address bellow to reset your password:</p>
										<a href="${config.eapdashboardUrl}/password-reset/${token.id}">Click Here</a><br />
										<p>Many thanks.</p>
										`;

										//console.log(html);
										Applogin.app.models.Email.send({
											to: toEmail,
											from: fromEmail,
											subject: 'Duta Holcim Reset Passcode',
											text: '',
											html: html
										}, function(err, mail) {
											console.log('email sent!',err,mail);
										});
										
										fn(err,{status:true,message:"Verification link sent to your email id"});
									});
								}
								else{
									fn(err,{status:false,message:'Invalid email id'});
								}
							});
						}
						else{
							fn(err,{status:false,message:'Invalid email id'});
						}
					}
					else{
						//console.log("credentialsInside",credentials);
						//Forget password for HPB Users
						if(userData && userData.length > 0 && userData[0].rolename != '$sph' && userData[0].rolename != '$am'){
							UserModal.findOne({ where:{"and":[{ username: userData[0]['username']},{status:1 }]},"include":["roles","userinfohpb","userinfometa"]}, function(err, user){
								//console.log(user);
								if(user){
									user.createAccessToken(600, function(err, token) {
									var fromEmail = 'support@primebuilder.id';
									var toEmail = credentials.type_data;
									// var url = config.dashboardUrl + '/password-reset';
									var html = `
										=========== Indonesia Version =================
										<br />
										<p>Kepada Rekan-rekan,</p>
										<p>Ini adalah email otomatis, tidak perlu dibalas/reply</p>
										<p>PassCode akun anda sudah direset. Silahkan gunakan alamat link dibawah untuk merubah ulang password anda:</p>
										<a href="${config.dashboardUrl}/password-reset/${token.id}">Click Here</a><br />
										<p>Many thanks.</p>
										<br />
										=========== End Indonesia Version =================
										<br/>
										=========== English Version =================
										<br/>
										<p>Dear Employee,</p>
										<p>This is an auto generated email please do not reply,</p>
										<p>We have reset your account's password. Please use this link address bellow to reset your password:</p>
										<a href="${config.dashboardUrl}/password-reset/${token.id}">Click Here</a><br />
										<p>Many thanks.</p>

										`;
										//console.log(html);
										Applogin.app.models.Email.send({
											to: toEmail,
											from: fromEmail,
											subject: 'Duta Holcim Reset Passcode',
											text: '',
											html: html
										}, function(err, mail) {
											console.log('email sent!',err,mail);
										});
										
										fn(err,{status:true,message:"Verification link sent to your email id"});
									});
								}
								else{
									fn(err,{status:false,message:'Invalid email id'});
								}
							});
						}
						else{
							fn(err,{status:false,message:'Invalid email id'});
						}
					}
				});
			}else{
				fn(null,{status:false,message:'Invalid input..!!'});
			}
		}else{
			fn(null,{status:false,message:'Field is required'});
		}
	}

	Applogin.remoteMethod('userResetOrForgotPassActionCheckReq', {
		http: { path:'/userResetOrForgotPassActionCheckReq', verb: 'post' },
		accepts: [
			{ arg: 'credentials', type: 'object', required: true, http: {source: 'body'}}
		],
		returns: {
			arg: 'response',
			type: 'object',
			root: true,
			description: 'Return Params'
		}
	});

	Applogin.userResetOrForgotPassChange = function(credentials, fn) {
		if(credentials.password){
			var UserModal = Applogin.app.models.user;
			console.log("password",credentials.password);
			let new_password = UserModal.hashPassword(credentials.password);
			console.log("new_password",new_password);
			var sqlQuery = "delete from AccessToken where id = (?)";
			Applogin.app.dbConnection.execute(sqlQuery,[credentials.token],(err,result)=>{
				var sqlQuery = "UPDATE [User] SET password = (?) OUTPUT INSERTED.id WHERE id = (?)";
				Applogin.app.dbConnection.execute(sqlQuery,[new_password, credentials.id],(err,result)=>{
					fn(err,result);
				});
			});
		}else{
			fn(null,"Invalid input");
		}
		
	}

	Applogin.remoteMethod('userResetOrForgotPassChange', {
		http: { path:'/userResetOrForgotPassChange', verb: 'post' },
		accepts: [
			{ arg: 'credentials', type: 'object', required: true, http: {source: 'body'}}
		],
		returns: {
			arg: 'response',
			type: 'object',
			root: true,
			description: 'Return Params'
		}
	});

	Applogin.userResetOrForgotPassVerify = function(credentials, fn) {
		var selectQuery = " select r.*, u.realm, u.id as uId from [AccessToken] at join RoleMapping rm on at.userId = rm.principalId join Role r on r.id = rm.roleId join [User] u on u.id = rm.principalId WHERE 1=1  AND  at.id = (?) ORDER BY at.id DESC OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY ";
		var dataArr = [credentials.token];
		
		Applogin.app.dbConnection.execute(selectQuery,dataArr,(err,result)=>{
			fn(err,result);
		});
	}

	Applogin.remoteMethod('userResetOrForgotPassVerify', {
		http: { path:'/userResetOrForgotPassVerify', verb: 'post' },
		accepts: [
			{ arg: 'credentials', type: 'object', required: true, http: {source: 'body'}}
		],
		returns: {
			arg: 'response',
			type: 'object',
			root: true,
			description: 'Return Params'
		}
	});
};