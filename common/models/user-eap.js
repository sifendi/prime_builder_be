'use strict';
var async = require('async');
var generator = require('generate-password');
module.exports = function(Usereap) {
	// to add/edit Usereap
	Usereap.addEditEapUsers = function(dataArrObj,role_id,user_id,cb){
		var created_date = Math.floor(Date.now()); // to get server created date
		var updated_date = Math.floor(Date.now()); //
		if(user_id){
			//Usereap.getUsers(user_id, function(err,UsereapData){
				//if(UsereapData){
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
					Usereap.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = user_id;
						result.updated_date = dataArrObj.updated_date;

						console.log(result.id);
						if(role_id!=""|| role_id!=undefined){
							var roleQry = "update RoleMapping set roleId = (?) where principalId = (?)";
							var UserroleArr = [];
							UserroleArr.push(role_id);
							UserroleArr.push(result.id);
							Usereap.app.dbConnection.execute(roleQry,UserroleArr,(err,resultroleObj)=>{
								console.log("resultObj",resultroleObj);
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

								Usereap.app.dbConnection.execute(chkmetaQry,chkmetadataArr,(err,resultchkmetaObj)=>{
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
										console.log(metaQry,metadataArr);
										Usereap.app.dbConnection.execute(metaQry,metadataArr,(err,resultmetaObj)=>{
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
										Usereap.app.dbConnection.execute(metaQry,UsermetaArr,(err,resultmetaObj)=>{
											console.log("inserted",resultmetaObj);
										});
									}
								});
							});
						}
						cb(err,result);
					});
				//}
				//else{
					//cb("Invalid Usereap id",null);
				//}
			//});
		}
		else{
			var UserArr = [];
			var paramsArr = []; 
			var metaData = dataArrObj['metadata'];
			dataArrObj['metadata']=[];
			var keyString ;
			var count = 0;
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
			var paramsKey = paramsArr.join(', ');
			//var keyString = Object.keys(dataArrObj).join(', ');
			var sqlQuery = "insert into [User] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";
			//console.log(sqlQuery,UserArr);
			Usereap.app.dbConnection.execute(sqlQuery,UserArr,(err,resultObj)=>{
				var result = {};
				console.log(err);
				if(resultObj){
					result.id = resultObj[0].id;
					//console.log("id",result.id);
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
							Usereap.app.dbConnection.execute(metaQry,UsermetaArr,(err,resultmetaObj)=>{
								console.log("inserted",resultmetaObj);
							});
						});
					}
					if(role_id!=""|| role_id!=undefined){
						var roleQry = "insert into RoleMapping (roleId,principalType,principalId) OUTPUT Inserted.id values ((?),(?),(?))";
						UserroleArr.push(role_id);
						UserroleArr.push("USER");
						UserroleArr.push(result.id);
						//console.log(UserroleArr);
						Usereap.app.dbConnection.execute(roleQry,UserroleArr,(err,resultroleObj)=>{
							//console.log("resultObj",resultroleObj);
						});
					}
				}
				cb(err,result);
			});
		}
	}
	Usereap.remoteMethod('addEditEapUsers',{
		http:{ path:'/addEditEapUsers', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'any', http:{ source:"body"} },
					{ arg: 'role', type:'any', http:{ source:"query"} },
					{ arg: 'user_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'any'}
	});
};
