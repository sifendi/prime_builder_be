'use strict';
var async = require('async');
var generator = require('generate-password');
var request = require('request');
module.exports = function(Appusers) {
	
	Appusers.getUsers = function(uid,role,cb){
		var selectQuery = "select h.hpb_type,  r.name, r.description as role_name, u.username, u.realm, u.email, u.status from  RoleMapping rm, Role r , [User] u left join hpb_info_tbl h on u.id = h.uid  where u.id = rm.principalId and r.id = roleId and rm.roleId = r.id";
		var dataArr = [];
		
		if(role){
			dataArr.push(role);
			selectQuery+=" AND r.description = (?)";
		}
		if(uid){
			dataArr.push(uid);
			selectQuery+=" AND rm.principalId = (?)";
		}
		Appusers.app.dbConnection.execute(selectQuery,dataArr,(err,result)=>{
			cb(err,result);
		});
	}
	
	Appusers.remoteMethod('getUsers',{
		http:{ path: '/getUsers', verb:'get' },
		accepts:[
					{ arg: 'uid', type: 'number' },
					{ arg: 'role', type: 'string' }
				],
		returns:{ arg: 'result', type:'object' }
	});
	
	
	Appusers.getUsersDashboard = function(uid,role,name,limit,page,mobile,user_id,loggedin_id,loggedin_role,status,cb){
		
		var dataArr = [];
		if(user_id && role == "SPH"){
			var selectQuery = " select distinct u.*, (select sum(ep.points) from eap_employee_points ep where ep.user_id = u.id) as 'total_points', r.name,r.description as role_name from  [User] u join  RoleMapping rm on u.id=rm.principalId  join Role r ON rm.roleId=r.id join user_mapping um on um.uid = u.id and um.meta_value in ( select pc.id from postal_code pc join subdistrict sd on pc.subdistrict_id = sd.id join municipality m on m.id = sd.municipality_id and m.district_id in (select um1.meta_value from user_mapping um1 where um1.uid = (?) and um1.meta_key = 'district_id') ) and um.meta_key = 'postal_code' ";
			dataArr.push(user_id);
		}
		else if(role == "EAP"){
			var selectQuery = " select r.name, (select sum(ep.points) from eap_employee_points ep where ep.user_id = u.id) as 'total_points', r.description as role_name, u.* from  [User] u  join  RoleMapping rm on u.id=rm.principalId  join Role r ON rm.roleId=r.id WHERE 1=1 ";
		}
		else{
			// if we want to take users depending on region mapping
			if(loggedin_role == "$ra"){
				var selectQuery = " select distinct u.id as uId, r.name, r.description as role_name, u.* from  [User] u  join  RoleMapping rm on u.id=rm.principalId  join Role r ON rm.roleId=r.id join user_mapping um on um.uid = u.id WHERE 1=1 ";
			}else{
				var selectQuery = " select distinct u.id as uId, r.name, r.description as role_name, u.* from  [User] u  join  RoleMapping rm on u.id=rm.principalId  join Role r ON rm.roleId=r.id WHERE 1=1 ";
			}
		}
		
		if(loggedin_id>0 && loggedin_role == "$ra"){
			if(role == "SPH"){
				selectQuery+=" AND um.meta_value in ( select pc.id from region r join province p on p.region_id = r.id and  r.id in (select meta_value from user_mapping where uid = (?) and meta_key = 'region_id') join district d on d.province_id = p.id join municipality m on m.district_id = d.id join subdistrict sd on sd.municipality_id = m.id join postal_code pc on pc.subdistrict_id = sd.id )";
			}else if(role == "TLH"){
				selectQuery+=" AND um.meta_value in ( select sd.id from region r join province p on p.region_id = r.id and  r.id in (select meta_value from user_mapping where uid = (?) and meta_key = 'region_id') join district d on d.province_id = p.id join municipality m on m.district_id = d.id join subdistrict sd on sd.municipality_id = m.id )";
			}else if(role == "AC"){
				selectQuery+=" AND um.meta_value in ( select d.id from region r join province p on p.region_id = r.id and  r.id in (select meta_value from user_mapping where uid = (?) and meta_key = 'region_id') join district d on d.province_id = p.id join municipality m on m.district_id = d.id )";
			}else if(role == "AM"){
				selectQuery+=" AND um.meta_value in ( select r.id from region r join province p on p.region_id = r.id and  r.id in (select meta_value from user_mapping where uid = (?) and meta_key = 'region_id')  )";
			}else if(role == "RA"){
				selectQuery+=" AND um.meta_value in ( select r.id from region r join province p on p.region_id = r.id and  r.id in (select meta_value from user_mapping where uid = (?) and meta_key = 'region_id')  )";
			}
			dataArr.push(loggedin_id);
		}
		
		if(role){
			dataArr.push(role);
			selectQuery+=" AND r.description = (?)";
		}

		if(name){
			selectQuery+=" AND u.realm like (?)";
			name = "%"+name+"%";
			dataArr.push(name);
		}
		if(uid){
			dataArr.push(uid);
			selectQuery+=" AND rm.principalId = (?)";
		}
		if(status){
			dataArr.push(status);
			selectQuery+=" AND u.status = (?)";
		}
		if(mobile){
			selectQuery+=" AND u.username like (?)";
			mobile = "%"+mobile+"%";
			dataArr.push(mobile);
		}
		selectQuery+=" ORDER BY u.id DESC ";
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		// console.log(selectQuery);
		// console.log(dataArr);
		
		Appusers.app.dbConnection.execute(selectQuery,dataArr,(err,result)=>{
			var user = {};
			if(role=="EAP"&&uid!=''&&uid!=null){
				
				var query = "select um.meta_key,um.meta_value from user_meta um ,[user] u  where u.id = um.uid and  um.uid = (?)";
				Appusers.app.dbConnection.execute(query,[uid],(err,eapData)=>{
					
					var dataLength = eapData.length;
					
					for(var i=0; i<dataLength; i++){
						user[eapData[i]['meta_key']]=eapData[i]['meta_value'];
					}
					
					if(user.department){
						var query = "Select department_name from eap_master_department where department_id = (?)";
						Appusers.app.dbConnection.execute(query,[user.department],(err,deptData)=>{
							user['department_name']=deptData[0].department_name;
							if(user.directorate){
								var query = "Select directorate_name from eap_master_directorate where directorate_id = (?)";
								Appusers.app.dbConnection.execute(query,[user.directorate],(err,dirctData)=>{
									user['directorate_name']=dirctData[0].directorate_name;
									result.push(user);
									cb(err,result);
								});
							}
						});
					}else{
						cb(err,result);
					}
				});
			}else{
				cb(err,result);
			}
		});
	}
	
	Appusers.remoteMethod('getUsersDashboard',{
		http:{ path: '/getUsersDashboard', verb:'get' },
		accepts:[
					{ arg: 'uid', type: 'number' },
					{ arg: 'role', type: 'string' },
					{ arg: 'name', type: 'string' },
					{ arg: 'limit', type: 'number' },
					{ arg: 'page', type: 'number' },
					{ arg: 'mobile', type: 'string' },
					{ arg: 'user_id', type: 'number' },
					{ arg: 'loggedin_id', type: 'number' },
					{ arg: 'loggedin_role', type: 'string' },
					{ arg: 'status', type: 'string' }
				],
		returns:{ arg: 'result', type:'object' }
	});
	
	Appusers.getUserRole = function(accesstoken,cb){
		
		var selectQuery = " select r.*, u.realm, u.id as uId from [AccessToken] at join RoleMapping rm on at.userId = rm.principalId join Role r on r.id = rm.roleId join [User] u on u.id = rm.principalId WHERE 1=1  AND  at.id = (?) ORDER BY at.id DESC OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY";
		var dataArr = [accesstoken];
		
		Appusers.app.dbConnection.execute(selectQuery,dataArr,(err,result)=>{
			cb(err,result);
		});
		
	}
	
	Appusers.remoteMethod('getUserRole',{
		http:{ path: '/getUserRole', verb:'get' },
		accepts:[
					{ arg: 'accesstoken', type: 'string' }
				],
		returns:{ arg: 'result', type:'object' }
	});
	
	
	Appusers.getUsersDashboardCount = function(uid,role,name,limit,page,mobile,loggedin_id,loggedin_role,status,cb){
		
		// if we want to take users depending on region mapping
		if(loggedin_role == "$ra"){
			var selectQuery = " select count(distinct u.id) as total from  [User] u  join  RoleMapping rm on u.id=rm.principalId  join Role r ON rm.roleId=r.id join user_mapping um on um.uid = u.id WHERE 1=1 ";
		}else{
			var selectQuery = " select count(distinct u.id) as total from  [User] u  join  RoleMapping rm on u.id=rm.principalId  join Role r ON rm.roleId=r.id WHERE 1=1 ";
		}
		
		
		var dataArr = [];
		
		if(loggedin_id>0 && loggedin_role == "$ra"){
			if(role == "SPH"){
				selectQuery+=" AND um.meta_value in ( select pc.id from region r join province p on p.region_id = r.id and  r.id in (select meta_value from user_mapping where uid = (?) and meta_key = 'region_id') join district d on d.province_id = p.id join municipality m on m.district_id = d.id join subdistrict sd on sd.municipality_id = m.id join postal_code pc on pc.subdistrict_id = sd.id )";
			}else if(role == "TLH"){
				selectQuery+=" AND um.meta_value in ( select sd.id from region r join province p on p.region_id = r.id and  r.id in (select meta_value from user_mapping where uid = (?) and meta_key = 'region_id') join district d on d.province_id = p.id join municipality m on m.district_id = d.id join subdistrict sd on sd.municipality_id = m.id )";
			}else if(role == "AC"){
				selectQuery+=" AND um.meta_value in ( select d.id from region r join province p on p.region_id = r.id and  r.id in (select meta_value from user_mapping where uid = (?) and meta_key = 'region_id') join district d on d.province_id = p.id join municipality m on m.district_id = d.id )";
			}else if(role == "AM"){
				selectQuery+=" AND um.meta_value in ( select r.id from region r join province p on p.region_id = r.id and  r.id in (select meta_value from user_mapping where uid = (?) and meta_key = 'region_id')  )";
			}
			dataArr.push(loggedin_id);
		}
		
		if(role){
			dataArr.push(role);
			selectQuery+=" AND r.description = (?)";
		}
		if(name){
			selectQuery+=" AND u.realm like (?)";
			name = "%"+name+"%";
			dataArr.push(name);
		}
		if(uid){
			dataArr.push(uid);
			selectQuery+=" AND rm.principalId = (?)";
		}
		if(status){
			dataArr.push(status);
			selectQuery+=" AND u.status = (?)";
		}
		if(mobile){
			selectQuery+=" AND u.username like (?)";
			mobile = "%"+mobile+"%";
			dataArr.push(mobile);
		}
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Appusers.app.dbConnection.execute(selectQuery,dataArr,(err,result)=>{
			cb(err,result);
		});
	}
	
	Appusers.remoteMethod('getUsersDashboardCount',{
		http:{ path: '/getUsersDashboardCount', verb:'get' },
		accepts:[
					{ arg: 'uid', type: 'number' },
					{ arg: 'role', type: 'string' },
					{ arg: 'name', type: 'string' },
					{ arg: 'limit', type: 'number' },
					{ arg: 'page', type: 'number' },
					{ arg: 'mobile', type: 'string' },
					{ arg: 'loggedin_id', type: 'number' },
					{ arg: 'loggedin_role', type: 'string' },
					{ arg: 'status', type: 'string' }
				],
		returns:{ arg: 'result', type:'object' }
	});

	Appusers.getUsersDashboardDetail = function(role,uid,cb){
		
		if(role == "$sph"){
			var selectQuery="select um.uid,r.name as region_name,r.id as region_id, pr.name as province_name, pr.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code, p.id as postal_code_id, u.* from [User] u left join user_mapping um on u.id = um.uid left join postal_code p on um.meta_value = p.id and um.meta_key = 'postal_code' left join subdistrict sd on sd.id = p.subdistrict_id left join municipality m on m.id = sd.municipality_id left join district d on d.id = m.district_id left join province pr on pr.id = d.province_id left join region r on r.id = pr.region_id where 1=1 ";
		}else if(role == "$tlh"){
			var selectQuery = "select um.uid,r.name as region_name,r.id as region_id, pr.name as province_name, pr.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code, p.id as postal_code_id, u.* from [User] u left join user_mapping um on u.id = um.uid left join subdistrict sd on sd.id = um.meta_value and um.meta_key = 'subdistrict_id' left join postal_code p on sd.id= p.subdistrict_id  left join municipality m on m.id = sd.municipality_id left join district d on d.id = m.district_id left join province pr on pr.id = d.province_id left join region r on r.id = pr.region_id where 1=1 ";
		}else if(role == "$ac"){
			var selectQuery = "select um.uid,r.name as region_name,r.id as region_id, pr.name as province_name, pr.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code, p.id as postal_code_id, u.* from [User] u left join user_mapping um on u.id = um.uid left join district d on d.id = um.meta_value and um.meta_key = 'district_id' left join municipality m on m.district_id = d.id left join subdistrict sd on sd.municipality_id = m.id left join postal_code p on sd.id = p.subdistrict_id left join province pr on pr.id = d.province_id left join region r on r.id = pr.region_id where 1=1 ";
		}else if(role == "$am"){
			var selectQuery = "select um.uid,r.name as region_name,r.id as region_id, pr.name as province_name, pr.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code, p.id as postal_code_id, u.* from [User] u left join user_mapping um on u.id = um.uid left join region r on r.id = um.meta_value and um.meta_key = 'region_id' left join province pr on pr.region_id = r.id left join district d on d.province_id = pr.id left join municipality m on m.district_id = d.id left join subdistrict sd on sd.municipality_id = m.id left join postal_code p on sd.id = p.subdistrict_id where 1=1 ";
		}else if(role == "$sa"){
			var selectQuery = "select um.uid, u.* from [User] u left join user_mapping um on u.id = um.uid where 1=1 ";
		}else if(role == "$ra"){
			var selectQuery = "select um.uid,r.name as region_name,r.id as region_id, pr.name as province_name, pr.id as province_id, d.name as district_name, d.id as district_id, sd.name as subdistrict_name, sd.id as subdistrict_id, m.name as municipality_name, m.id as municipality_id, p.postal_code, p.id as postal_code_id, u.* from [User] u left join user_mapping um on u.id = um.uid left join region r on r.id = um.meta_value and um.meta_key = 'region_id' left join province pr on pr.region_id = r.id left join district d on d.province_id = pr.id left join municipality m on m.district_id = d.id left join subdistrict sd on sd.municipality_id = m.id left join postal_code p on sd.id = p.subdistrict_id where 1=1 ";
		}
		
		var dataArr = [];
		
		if(uid){
			selectQuery+=" AND u.id = (?)";
			dataArr.push(uid);
		}
		
		var user = {};
		var result = [];
		var actualData = {};
		var postalCodeArr = [];
		var regionArr = [];
		var districtArr = [];
		var subDistrictArr = [];
		var municipalityArr = [];
		var provinceArr = [];
		var userId = "";
		
		Appusers.app.dbConnection.execute(selectQuery,dataArr,(err,resultObject)=>{
			if(resultObject){
				async.each(resultObject, function(json, callback) {
					
					if(userId!=json.uid){
						
						if(Object.keys(user).length){
							result.push(user);
						}
						
						userId = json.uid;

						postalCodeArr = [];
						districtArr = [];
						regionArr = [];
						subDistrictArr = [];
						municipalityArr = [];
						provinceArr = [];

						user = {};
						user['uid'] = "";
						user['user_name'] = "";
						user['email'] = "";
						user['mobile'] = "";
						user['region'] = [];
						user['postal_code'] = [];
						user['province'] = [];
						user['municipality'] = [];
						user['subdistrict'] = [];
						user['district'] = [];
					}
					
					user['uid'] = json.id;
					user['user_name'] = json.realm;
					user['email'] = json.email;
					user['mobile'] = json.username;
					user['status'] = json.status;
					if(postalCodeArr.indexOf(json.postal_code) < 0){
						if(json.postal_code_id){
							postalCodeArr.push(json.postal_code);
							var arr = { "name":json.postal_code, "id":json.postal_code_id };
							user['postal_code'].push(arr);
						}
						
					}
					if(regionArr.indexOf(json.region_id) < 0){
						if(json.region_id){
							regionArr.push(json.region_id);
							var arr = { "name":json.region_name, "id":json.region_id };
							user['region'].push(arr);
				    	}
					}
					if(provinceArr.indexOf(json.province_id) < 0){
						if(json.province_id){
							provinceArr.push(json.province_id);
							var arr = { "name":json.province_name, "id":json.province_id };
							user['province'].push(arr);
						}
						
					}
					if(municipalityArr.indexOf(json.municipality_id) < 0){
						if(json.municipality_id){
							municipalityArr.push(json.municipality_id);
							var arr = { "name":json.municipality_name, "id":json.municipality_id };
							user['municipality'].push(arr);
						}
						
					}
					if(districtArr.indexOf(json.district_id) < 0){
						if(json.district_id){
							districtArr.push(json.district_id);
							var arr = { "name":json.district_name, "id":json.district_id };
							user['district'].push(arr);
						}
						
					}
					if(subDistrictArr.indexOf(json.subdistrict_id) < 0){
						if(json.subdistrict_id){
							subDistrictArr.push(json.subdistrict_id);
							var arr = { "name":json.subdistrict_name, "id":json.subdistrict_id };
							user['subdistrict'].push(arr);
						}
						
					}
					callback();
				},
				(err)=>{
					result.push(user);
					cb(null, result);
				});
			}else{
				cb(null, result);
			}
		});
	}
	
	Appusers.remoteMethod('getUsersDashboardDetail',{
		http:{ path: '/getUsersDashboardDetail', verb:'get' },
		accepts:[
					{ arg: 'role', type: 'string' },
					{ arg: 'uid', type: 'number' }
				],
		returns:{ arg: 'result', type:'object' }
	});
	
	// to add/edit Appusers
	Appusers.addEditUsers = function(dataArrObj,role_id,user_id,cb){
		var created_date = Math.floor(Date.now()); // to get server created date
		var updated_date = Math.floor(Date.now()); //
		if(user_id){
			var usercheck = "";
			var addDataArr = [];
			if(dataArrObj['email'] != ''){
				usercheck = "select * from [User] where id != (?) AND (username = (?) OR email = (?))";
				addDataArr.push(user_id,dataArrObj['username'],dataArrObj['email']);
			}else{
				usercheck = "select * from [User] where id != (?) AND username = (?)";
				addDataArr.push(user_id,dataArrObj['username']);
			}
			console.log("usercheck",usercheck);
			console.log("addDataArr",addDataArr);
			Appusers.app.dbConnection.execute(usercheck,addDataArr,(err,resultObj)=>{
				// console.log("resultObj : ",resultObj);
				if(resultObj && resultObj.length > 0){
					var result = [{"message":"User mobile/email is already exist"}];
					cb(null,result);
					return false;
				}
				else{
					//dataArrObj.updated_date = updated_date;
					var dataArr = [];
					var paramsArr = [];
					var metaData = dataArrObj['metadata'];
					dataArrObj['metadata']=[];

					for(var o in dataArrObj) {
						if(o!="metadata"){
							dataArr.push(dataArrObj[o]);
							paramsArr.push(o+"=(?)");
						}
					}

					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where id = (?)';
					dataArr.push(user_id);
					var sqlQuery = "update [User] set "+paramsKey+" "+whereCond;
					Appusers.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = user_id;
						result.updated_date = dataArrObj.updated_date;
						if(role_id!=""|| role_id!=undefined){
							var roleQry = "update RoleMapping set roleId = (?) where principalId = (?)";
							var UserroleArr = [];
							UserroleArr.push(role_id);
							UserroleArr.push(result.id);
							Appusers.app.dbConnection.execute(roleQry,UserroleArr,(err,resultroleObj)=>{
								//console.log("resultObj",resultroleObj);
							});
						}
						if(metaData!=''|| metaData!=undefined){
							async.forEachOf(metaData, function(json, j, callback){
							//for(var j in metaData){
								//console.log('j',metaData[j]);
								var chkmetadataArr = [];
								var chkmetaQry = "select id from user_meta where uid=(?) and meta_key=(?)";
								chkmetadataArr.push(user_id);
								chkmetadataArr.push(json['meta_key']);

								Appusers.app.dbConnection.execute(chkmetaQry,chkmetadataArr,(err,resultchkmetaObj)=>{
									var metadataArr = [];
									var metaparamsArr = [];
									if(resultchkmetaObj!=''){
										for(var o in json) {
											if(o!="metadata"){
												metadataArr.push(json[o]);
												metaparamsArr.push(o+"=(?)");
											}
										}
										let metaparamsKey= metaparamsArr.join(', ');
										var metawhereCond = 'where uid = (?) and meta_key=(?)';
										metadataArr.push(user_id,json['meta_key']);
										var metaQry = "update user_meta set "+metaparamsKey+" "+metawhereCond;
										//console.log(metaQry,metadataArr);
										Appusers.app.dbConnection.execute(metaQry,metadataArr,(err,resultmetaObj)=>{
											console.log("done meta update");
										});
									}else{
										var UsermetaArr = [];
										var metaQry = "insert into user_meta (meta_key,meta_value,uid,status,created_date,updated_date) OUTPUT Inserted.id values ((?),(?),(?),(?),(?),(?))";
							
										UsermetaArr.push(json.meta_key);
										UsermetaArr.push(json.meta_value);
										UsermetaArr.push(result.id);
										UsermetaArr.push(1);
										UsermetaArr.push(created_date);
										UsermetaArr.push(created_date);
										Appusers.app.dbConnection.execute(metaQry,UsermetaArr,(err,resultmetaObj)=>{
											//console.log("inserted",resultmetaObj);
										});
									}
								});
							});
						}
						cb(err,result);
					});
				}
			});
		}
		else{
			// check if this user exists
			//var usercheck = "select * from [User] where username = (?) OR email = (?)";
			var usercheck = "";
			var addDataArr = [];
			if(dataArrObj['email'] != ''){
				usercheck = "select * from [User] where username = (?) OR email = (?)";
				addDataArr.push(dataArrObj['username'],dataArrObj['email']);
			}else{
				usercheck = "select * from [User] where username = (?)";
				addDataArr.push(dataArrObj['username']);
			}

			Appusers.app.dbConnection.execute(usercheck,addDataArr,(err,resultObj)=>{
				if(resultObj && resultObj.length > 0){
					var result = [{"message":"User mobile/email is already exist"}];
					cb(null,result);
					return false;
				}
				else{
					if(role_id == 26){ // EAP user
						// check if the employee code exists
						var usercheck = "select * from user_meta where meta_key = 'code' and meta_value = (?)";
						// console.log(dataArrObj['metadata'][0]['meta_value']);
						Appusers.app.dbConnection.execute(usercheck,[dataArrObj['metadata'][0]['meta_value']],(err,resultObj)=>{
							if(resultObj && resultObj.length > 0){
								var result = [{"message":"Employee Code Exists"}];
								cb(null,result);
								return false;
							}else{
								var UserArr = [];
								var paramsArr = []; 
								var metaData = dataArrObj['metadata'];
								dataArrObj['metadata']=[];
								var keyString ;
								var count = 0;
								
								var UserModel = Appusers.app.models.user;
								if(dataArrObj['password']){
									dataArrObj['password'] = UserModel.hashPassword(dataArrObj['password']);
								}
					
								for(var o in dataArrObj) {
									if(o!="metadata"){
										UserArr.push(dataArrObj[o]);
										paramsArr.push("(?)");
										if(count==0){
											keyString = o;
										}else{
											keyString = keyString+", "+o;
										}
										count++;
									}
								}
					
								if(!dataArrObj['password']){
									var password = generator.generate({
										length: 10,
										numbers: true
									});
									//adding password
									keyString = keyString+", password";
									UserArr.push(password);
									paramsArr.push("(?)");
								}
								
								var paramsKey = paramsArr.join(', ');
								var sqlQuery = "insert into [User] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";
								// console.log(UserArr);
								Appusers.app.dbConnection.execute(sqlQuery,UserArr,(err,resultObj)=>{
									var result = {};
									if(resultObj && (!err)){
										result.id = resultObj[0].id;
										var status = 1 ;
										var UserroleArr = [];
										var UsermetaArr = [];
										if(metaData!=''|| metaData!=undefined){
											async.forEachOf(metaData, function(json, j, callback){
												var UsermetaArr = [];
												var metaQry = "insert into user_meta (meta_key,meta_value,uid,status,created_date,updated_date) OUTPUT Inserted.id values ((?),(?),(?),(?),(?),(?))";
									
												UsermetaArr.push(json.meta_key);
												UsermetaArr.push(json.meta_value);
												UsermetaArr.push(result.id);
												UsermetaArr.push(1);
												UsermetaArr.push(created_date);
												UsermetaArr.push(created_date);
												Appusers.app.dbConnection.execute(metaQry,UsermetaArr,(err,resultmetaObj)=>{
													//console.log("inserted",resultmetaObj);
												});
											});
										}

										if(role_id!=""|| role_id!=undefined){
											var roleQry = "insert into RoleMapping (roleId,principalType,principalId) OUTPUT Inserted.id values ((?),(?),(?))";
											UserroleArr.push(role_id);
											UserroleArr.push("USER");
											UserroleArr.push(result.id);
											//console.log(UserroleArr);
											Appusers.app.dbConnection.execute(roleQry,UserroleArr,(err,resultroleObj)=>{
												//console.log("resultObj",resultroleObj);
											});
										}

										//Confirmation SMS to user that added..
										var msisdn = dataArrObj.username;
										var name = dataArrObj.realm;
										if(msisdn.charAt(0) == '0'){
											msisdn = msisdn.slice(1);
										}
										msisdn = '62'+msisdn;
										var html = `Welcome+to+the+Employee+Ambassador+Program.+Please+download+the+app+from+https://goo.gl/eBV3w1`;
					  					var smsTextUrl=`https://sms-api.jatismobile.com/index.ashx?userid=Holcimin&password=Holcimin456&msisdn=${msisdn}&message=${html}&sender=HOLCIM&division=Duta+holcim&batchname=Testing&uploadby=Testing&channel=0`;
					  					console.log('smsTextUrl',smsTextUrl);
					  					request(smsTextUrl, function (error, response, body) {
					  						console.log('error:', error); // Print the error if one occurred 
					  						console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received 
					  						console.log('body:', body); // Print the HTML for the Google homepage. 
					  						cb(err,result);
					  					});
									}
									else{
										// if no output
										cb(err,result);
									}
								});
							}
						});
					}
					else{
						var UserArr = [];
						var paramsArr = []; 
						var metaData = dataArrObj['metadata'];
						dataArrObj['metadata']=[];
						var keyString ;
						var count = 0;
						
						var UserModel = Appusers.app.models.user;
						if(dataArrObj['password']){
							dataArrObj['password'] = UserModel.hashPassword(dataArrObj['password']);
						}
						
						for(var o in dataArrObj) {
							if(o!="metadata"){
								UserArr.push(dataArrObj[o]);
								paramsArr.push("(?)");
								if(count==0){
									keyString = o;
								}else{
									keyString = keyString+", "+o;
								}
								count++;
							}
						}

						if(!dataArrObj['password']){
							var password = generator.generate({
								length: 10,
								numbers: true
							});
							//adding password
							keyString = keyString+", password";
							UserArr.push(password);
							paramsArr.push("(?)");
						}

						var paramsKey = paramsArr.join(', ');
						var sqlQuery = "insert into [User] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";
						// console.log(UserArr);
						Appusers.app.dbConnection.execute(sqlQuery,UserArr,(err,resultObj)=>{
							var result = {};
							if(resultObj && (!err)){
								result.id = resultObj[0].id;
								var status = 1 ;
								var UserroleArr = [];
								var UsermetaArr = [];
								if(metaData!=''|| metaData!=undefined){
									async.forEachOf(metaData, function(json, j, callback){
										var UsermetaArr = [];
										var metaQry = "insert into user_meta (meta_key,meta_value,uid,status,created_date,updated_date) OUTPUT Inserted.id values ((?),(?),(?),(?),(?),(?))";
										UsermetaArr.push(json.meta_key);
										UsermetaArr.push(json.meta_value);
										UsermetaArr.push(result.id);
										UsermetaArr.push(1);
										UsermetaArr.push(created_date);
										UsermetaArr.push(created_date);
										Appusers.app.dbConnection.execute(metaQry,UsermetaArr,(err,resultmetaObj)=>{
											//console.log("inserted",resultmetaObj);
										});
									});
								}
								if(role_id!=""|| role_id!=undefined){
									var roleQry = "insert into RoleMapping (roleId,principalType,principalId) OUTPUT Inserted.id values ((?),(?),(?))";
									UserroleArr.push(role_id);
									UserroleArr.push("USER");
									UserroleArr.push(result.id);
									//console.log(UserroleArr);
									Appusers.app.dbConnection.execute(roleQry,UserroleArr,(err,resultroleObj)=>{
										//console.log("resultObj",resultroleObj);
									});
								}

								// //Confirmation SMS to user that added..
								// var msisdn = dataArrObj.username;
								// var name = dataArrObj.realm;
								// if(msisdn.charAt(0) == '0'){
								// 	msisdn = msisdn.slice(1);
								// }
								// msisdn = '62'+msisdn;
					  			// 		var html = `Welcome+to+the+Employee+Ambassador+Program.+Please+download+the+app+from+https://goo.gl/eBV3w1`;
							  	// 		var smsTextUrl="";//`https://sms-api.jatismobile.com/index.ashx?userid=Holcimin&password=Holcimin456&msisdn=${msisdn}&message=${html}&sender=HOLCIM&division=Duta+holcim&batchname=Testing&uploadby=Testing&channel=0`;
					  			// 		console.log('smsTextUrl',smsTextUrl);
					  			// 		request(smsTextUrl, function (error, response, body) {
					  			// 			console.log('error:', error); // Print the error if one occurred 
					  			// 			console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received 
					  			// 			console.log('body:', body); // Print the HTML for the Google homepage. 
					  			// 			
					  			// 		});

			  					cb(err,result);

							}else{
								cb(err,result);
							}
						});
					}
				}
			});
		}
	}

	Appusers.remoteMethod('addEditUsers',{
		http:{ path:'/addEditUsers', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'any', http:{ source:"body"} },
					{ arg: 'role', type:'any', http:{ source:"query"} },
					{ arg: 'user_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'any'}
	});

	Appusers.getEAPUserDetails = function(dataObj, fn) {
		var currUId=dataObj['user_id'];
		if(currUId>0){
			//console.log("greater than 0");
			var userData={};
			userData["department"] = "";
			userData["directorate"] = "";
			userData["subarea"] = "";
			userData["code"] = "";
			userData["profilepic"] = "";
			userData["points"] =0;
			userData["email"] ='';
			userData["username"] ='';
			userData["realm"] ='';
			var sqlQuery = `select meta_key, meta_value from user_meta where status = 1 and uid = ${currUId}`;
			Appusers.app.dbConnection.execute(sqlQuery,[],(err,userMeta)=>{
				if(!err){
					//console.log("greater than 0 != ERR");
					async.forEachOf(userMeta, function(json, o, callback){
							userData[json['meta_key']] = json['meta_value'];
							callback();
						},
						(err)=>{
							
							userData["points"] = 0;
							var sqlPQuery = `SELECT usr.id, usr.email,usr.username,usr.realm,SUM(eep.points) as 'total_points' FROM [User] usr LEFT JOIN  eap_employee_points eep  on eep.user_id=usr.id WHERE usr.id=${currUId} group by usr.id,usr.email,usr.username,usr.realm`;
							//console.log('sqlPQuery',sqlPQuery);
							Appusers.app.dbConnection.execute(sqlPQuery,[],(err1,userEapPData)=>{
								if(!err1){	
									//console.log("greater than 0 != ERR",userEapPData);
									var totalPTemp = 0;
									if(userEapPData.length>0){
										totalPTemp = userEapPData[0]['total_points'];
										userData["email"] =userEapPData[0]['email'];
										userData["username"] =userEapPData[0]['username'];
										userData["realm"] =userEapPData[0]['realm'];
									}
									userData["points"]=totalPTemp;
									userData["eap_user_approval_data"]={};
									userData["eap_user_approval_data"]['approval_status']=1;
									userData["eap_user_approval_data"]['field_old_value']=userData["username"];
									userData["eap_user_approval_data"]['field_new_value']=userData["username"];
									userData["eap_user_approval_data"]['field_name']='mobile_username';
									var sqlPQueryApproval=`SELECT euup.* FROM eap_user_update_approval euup join [User] usr on usr.id=euup.uid and euup.is_closed=0 and usr.id=${currUId} `;
									Appusers.app.dbConnection.execute(sqlPQueryApproval,[],(err2,euupD)=>{
										if(euupD){
											if(euupD.length>0){
												for(var ii=0;ii<euupD.length;ii++){
													if(euupD[ii]['field_name']==userData["eap_user_approval_data"]['field_name']){
														userData["eap_user_approval_data"]['approval_status']=euupD[ii]['approval_status'];
														userData["eap_user_approval_data"]['field_old_value']=euupD[ii]['field_old_value'];
														userData["eap_user_approval_data"]['field_new_value']=euupD[ii]['field_new_value'];
														userData["eap_user_approval_data"]['field_name']=euupD[ii]['field_name'];
													}
												}
											}
										}
										fn(err2, userData);
									});
							   }else{
							   		fn(err1, null);
							   }
							});
						});
				}else{
					//console.log("greater than 0 == ERR");
					fn(err, null);
				}
			})
		}else{
			//console.log("less than 0");
			var defaultError = new Error('login failed');
			defaultError.statusCode = 401;
			defaultError.code = 'LOGIN_FAILED';
			fn(defaultError,null); 
		}
	}

	Appusers.remoteMethod('getEAPUserDetails', {
		http: { path:'/getEAPUserDetails', verb: 'post' },
		accepts: [
			{ arg: 'dataObj', type: 'object', required: true, http: {source: 'body'}}
		],
		returns: {
			arg: 'result',
			type: 'object',
			root: true,
			description: 'Return Params'
		}
	});
};