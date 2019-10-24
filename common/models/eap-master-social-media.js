'use strict';

module.exports = function(Eapmastersocialmedia) {
	
	Eapmastersocialmedia.getmastersSocialDataCount = function(dataArrObj,cb){
		var leadArr = [];
		var paramsArr = [];
		
		var sqlQuery = "select count(social_id) as total from eap_master_social_media where 1=1";
		for(var o in dataArrObj) {
			if(o == "created_date"){
				sqlQuery+=" AND "+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND "+o+" < (?)";
				leadArr.push(dataArrObj[o]);
			}else if(o == "status"){
				if(dataArrObj[o]!=2){
					sqlQuery+=" AND "+o+" = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}else if(o != "limit" && o != "page"){
				sqlQuery+=" AND "+o+" = (?)";
				leadArr.push(dataArrObj[o]);
			}
			else{
				
			}		
		}
		Eapmastersocialmedia.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			console.log("sqlQuery=>",sqlQuery);
			cb(err,resultObj);
		})
	}
	
	Eapmastersocialmedia.remoteMethod('getmastersSocialDataCount',{
		http:{ path: '/getmastersSocialDataCount', verb: 'post' },
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type:'object' }
	});


	Eapmastersocialmedia.getmastersSocialData = function(dataArrObj,cb){
		
		var leadArr = [];
		var paramsArr = [];
		if(!dataArrObj){
			var sqlQuery = "select sm.*,u.realm from eap_master_social_media as sm join [User] as u on sm.created_by = u.id where 1=1";
		}else{
			var sqlQuery = "select sm.*,u.realm from eap_master_social_media as sm join [User] as u on sm.created_by = u.id  where 1=1";
		}
		
		//var sqlQuery = "select emsm.*, el.lead_name from eap_master_social_media emsm join eap_lead el on emsm.invoice_lead_id = el.lead_id where 1=1 ";
		
		for(var o in dataArrObj) {
			if(o == "created_date"){
				sqlQuery+=" AND sm."+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND sm."+o+" < (?)";
				leadArr.push(dataArrObj[o]);
			}else if(o == "status"){
				if(dataArrObj[o]!=2){
					sqlQuery+=" AND sm."+o+" = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			else if(o != "limit" && o != "page"){
				sqlQuery+=" AND sm."+o+" = (?)";
				leadArr.push(dataArrObj[o]);
			}else{
				
			}	
			
		}

		if(dataArrObj['limit'] > 0){
			if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
			var offset = dataArrObj['page']*dataArrObj['limit'];
			
			sqlQuery+="  ORDER BY sm.updated_date DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
			leadArr.push(offset,dataArrObj['limit']);
		}

		Eapmastersocialmedia.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			console.log("sqlQuery=>",sqlQuery);
			cb(err,resultObj);
		})
	
	}
	
	Eapmastersocialmedia.remoteMethod('getmastersSocialData',{
		http:{ path:'/getmastersSocialData', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});


	// to add/edit Eapmastersocialmedia
	Eapmastersocialmedia.addEditEapmastersocialmedia = function(dataArrObj,Eapsocialmedia_id,cb){
		var UserModel = Eapmastersocialmedia.app.models.user;
		// search the user
		//UserModel.findOne({where:{id:1}}, function(err, user) {
			//if(!user){
				if(Eapsocialmedia_id){
					Eapmastersocialmedia.getmastersSocialData({social_id:Eapsocialmedia_id}, function(err,EapmastersocialmediaData){
						if(EapmastersocialmediaData){
							var updated_date = Math.floor(Date.now()); // to get server created date
							dataArrObj.updated_date = updated_date;
							
							var dataArr = [];
							var paramsArr = [];
														
							for(var o in dataArrObj) {
								dataArr.push(dataArrObj[o]);
								paramsArr.push(o+"=(?)");
							}
							
							let paramsKey= paramsArr.join(', ');
							var whereCond = 'where social_id = (?)';
							dataArr.push(Eapsocialmedia_id);

							var sqlQuery = "update [eap_master_social_media] set "+paramsKey+" "+whereCond;
							console.log("dataArrObj=>",dataArrObj);

							if(dataArrObj.hasOwnProperty("social_name")){

								var social_name = dataArrObj['social_name'].toLowerCase();
								var checkIfPresent = "select LOWER(social_name) from eap_master_social_media where social_name = (?)";
								Eapmastersocialmedia.app.dbConnection.execute(checkIfPresent,[social_name],(err,resultObj)=>{
									if(resultObj && resultObj.length > 0){
										cb(err,"Exist");
									}else{
										Eapmastersocialmedia.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
											var result = {};
											result.id = Eapsocialmedia_id;
											result.updated_date = dataArrObj.updated_date;
											cb(err,result);
										});
										
									}
								});
								
							}else if(dataArrObj.hasOwnProperty("status")){
								Eapmastersocialmedia.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
									var result = {};
									result.id = Eapsocialmedia_id;
									result.updated_date = dataArrObj.updated_date;
									cb(err,result);
								});
							}
										
						}
						else{
							cb("Invalid Eapmastersocialmedia id",null);
						}
					});
				}
				else{
					var created_date = Math.floor(Date.now()); // to get server created date
					dataArrObj.created_date = created_date;
					dataArrObj.updated_date = created_date;
					
					var approvalArr = [];
					var paramsArr = [];
					var social_name = dataArrObj['social_name'].toLowerCase();
					
					for(var o in dataArrObj) {
						approvalArr.push(dataArrObj[o]);
						paramsArr.push("(?)");
					}
					var paramsKey = paramsArr.join(', ');
					var keyString = Object.keys(dataArrObj).join(', ');
					
					
					var checkIfPresent = "select LOWER(social_name) from eap_master_social_media where social_name = (?)";
					Eapmastersocialmedia.app.dbConnection.execute(checkIfPresent,[social_name],(err,resultObj)=>{
						if(resultObj && resultObj.length > 0){
							cb(err,"Exist");
						}else{
							var sqlQuery = "insert into [eap_master_social_media] ("+keyString+") OUTPUT Inserted.social_id values ("+paramsKey+")";
							Eapmastersocialmedia.app.dbConnection.execute(sqlQuery,approvalArr,(err,resultObj1)=>{
								var result = {};
								if(resultObj1.length > 0){
									result.id = resultObj1[0].social_id;
									result.updated_date = created_date;
								}
								cb(err,result);
							});
							
						}
					});
				}
		// 	}else{
		// 		cb("Invalid User id",null);
		// 	}
		// });
	}
	Eapmastersocialmedia.remoteMethod('addEditEapmastersocialmedia',{
		http:{ path:'/addEditEapmastersocialmedia', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'Eapsocialmedia_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});
};
