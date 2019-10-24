'use strict';

module.exports = function(Eapsharemoments) {
	
	// to add/edit lead
	Eapsharemoments.addEditMoments = function(dataArrObj,moment_id,cb){
		
		if(moment_id){
			//Eapsharemoments.findOne({ where:{moment_id:moment_id}}, function(err,momentData){
				
				//if(momentData){
					var leadApi = Eapsharemoments.app.models.eap_lead;
					leadApi.findOne({ where:{lead_id:dataArrObj.moment_lead_id}}, function(err,leadData){
						if(leadData!=null){
							var updated_date = Math.floor(Date.now()); // to get server created date
							dataArrObj.updated_date = updated_date;
							
							var dataArr = [];
							var paramsArr = [];
							
							for(var o in dataArrObj) {
								dataArr.push(dataArrObj[o]);
								paramsArr.push(o+"=(?)");
							}
							
							let paramsKey= paramsArr.join(', ');
							var whereCond = 'where moment_id = (?)';
							dataArr.push(moment_id);
							var sqlQuery = "update [eap_share_moments] set "+paramsKey+" "+whereCond;
						
							Eapsharemoments.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
								var result = {};
								result.id = moment_id;
								result.updated_date = dataArrObj.updated_date;
								cb(err,result);
							});
						}
						else{
							cb(null,"Invalid Moment");
						}
					});
				//}
			// 	else{
			// 		cb("Invalid Moment Id",null);
			// 	}
			// });
		}
		else{
			var leadApi = Eapsharemoments.app.models.eap_lead;
			leadApi.findOne({ where:{lead_id:dataArrObj.moment_lead_id}}, function(err,leadData){
				if(leadData!=null){
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
					var sqlQuery = "insert into [eap_share_moments] ("+keyString+") OUTPUT Inserted.moment_id values ("+paramsKey+")";

					Eapsharemoments.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
						var result = {};
						if(resultObj.length > 0){
							result.id = resultObj[0].moment_id;
							result.updated_date = created_date;
						}
						cb(err,result);
					});
				}
				else{
					cb(null,"Invalid Lead");
				}
			});
		}
	}
	
	Eapsharemoments.remoteMethod('addEditMoments',{
		http:{ path:'/addEditMoments', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'moment_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	
	// to add/edit lead
	Eapsharemoments.getMoments = function(dataArrObj,limit,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var DateFilCount = 0 ;
		var sqlQuery = "select u.realm as createdBy, ec.*, el.lead_name, ea.approval_status, ea.rejection_reason from eap_share_moments ec join eap_lead el on ec.moment_lead_id = el.lead_id join eap_approval ea on ea.type_id=ec.moment_id and ea.type='moment' and ea.approval_id = (select max(approval_id) from eap_approval where type_id=ec.moment_id and type='moment' ) join [User] u on u.id = ec.created_by where 1=1 ";
		//var sqlQuery = "select ec.*, el.lead_name,soc.social_name from eap_share_moments ec join eap_lead el on ec.moment_lead_id = el.lead_id join eap_master_social_media soc on soc.social_id = ec.moment_social_media_type where 1=1 ";
		
		for(var o in dataArrObj) {
			
			if(o == "created_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" >= (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND ec."+o+" < (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o =="moment_social_media_type"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}

			else if(o =="approval_status"){
				if(dataArrObj[o]!=''||dataArrObj[o]===0){
					sqlQuery+=" AND ea.approval_status = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			// else if(o =="shareDateFrom" || o =="shareDateTo"){
			// 	if(dataArrObj[o]!='' && DateFilCount==0){
			// 		sqlQuery+=" AND ec.moment_share_date BETWEEN (?) AND (?)"
			// 		leadArr.push(dataArrObj['shareDateFrom']);
			// 		leadArr.push(dataArrObj['shareDateTo']);
			// 		DateFilCount = 1;
			// 	}
			// }

			else if(o =="shareDateFrom"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec.moment_share_date >= (?)"
					leadArr.push(dataArrObj['shareDateFrom']);
				
				}
			}
			else if(o =="shareDateTo"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec.moment_share_date <= (?)"
					leadArr.push(dataArrObj['shareDateTo']);
				
				}
			}

			
			else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}else{
				if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
				var offset = dataArrObj['page']*limit;
				
				sqlQuery+="  ORDER BY ec.moment_id DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
				leadArr.push(offset,limit);
			}
			
		}
		
		Eapsharemoments.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{	
			cb(err,resultObj);
		});
	}
	
	Eapsharemoments.remoteMethod('getMoments',{
		http:{ path:'/getMoments', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'limit', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});
 

	// to add/edit lead
	Eapsharemoments.getMomentsCount = function(dataArrObj,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var DateFilCount = 0 ;
		var sqlQuery = "select count(ec.moment_id) as total from eap_share_moments ec join eap_lead el on ec.moment_lead_id = el.lead_id join eap_approval ea on ea.type_id=ec.moment_id and ea.type='moment' and ea.approval_id = (select max(approval_id) from eap_approval where type_id=ec.moment_id and type='moment' ) join [User] u on u.id = ec.created_by where 1=1";
		//var sqlQuery = "select count(ec.moment_id) as total from eap_share_moments ec join eap_lead el on ec.moment_lead_id = el.lead_id join eap_approval ea on ea.type_id=ec.moment_id and ea.type='moment' where 1=1 ";
		
		for(var o in dataArrObj) {
			
			if(o == "created_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" >= (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND ec."+o+" < (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o =="moment_social_media_type"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o =="approval_status"){
				if(dataArrObj[o]!=''||dataArrObj[o]===0){
					sqlQuery+=" AND ea.approval_status = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			else if(o =="shareDateFrom"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec.moment_share_date >= (?)"
					leadArr.push(dataArrObj['shareDateFrom']);
				
				}
			}
			else if(o =="shareDateTo"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec.moment_share_date <= (?)"
					leadArr.push(dataArrObj['shareDateTo']);
				
				}
			}

			else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			
		}
		Eapsharemoments.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	
	}
	
	Eapsharemoments.remoteMethod('getMomentsCount',{
		http:{ path:'/getMomentsCount', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});
	
};