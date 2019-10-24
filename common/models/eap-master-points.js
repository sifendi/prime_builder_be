'use strict';

module.exports = function(Eapmasterpoints) {
	
	// to add/edit lead
	Eapmasterpoints.getEapPoints = function(dataArrObj,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var sqlQuery = "select ep.*, u.realm as eap_user from eap_master_points ep join [User] u on u.id = ep.created_by where 1=1";
		
		for(var o in dataArrObj) {
			if(o == "created_date"){
				sqlQuery+=" AND ep."+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND ep."+o+" < (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o != "limit" && o != "page"){
				sqlQuery+=" AND ep."+o+" = (?)";
				leadArr.push(dataArrObj[o]);
			}	
		}
		
		if(dataArrObj['limit']){
			if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
			var offset = dataArrObj['page']*dataArrObj['limit'];
			
			sqlQuery+="  ORDER BY ep.point_id DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
			leadArr.push(offset,dataArrObj['limit']);
		}
		
		Eapmasterpoints.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}
	
	Eapmasterpoints.remoteMethod('getEapPoints',{
		http:{ path:'/getEapPoints', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});


	// to get Points Count
	Eapmasterpoints.getEapPointsCount = function(dataArrObj,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var sqlQuery = "select count(point_id) as total from eap_master_points where 1=1";
		
		for(var o in dataArrObj) {
			if(o == "created_date"){
				sqlQuery+=" AND "+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND "+o+" < (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o != "limit" && o != "page"){
				sqlQuery+=" AND "+o+" = (?)";
				leadArr.push(dataArrObj[o]);
			}		
		}
		Eapmasterpoints.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	
	}
	
	Eapmasterpoints.remoteMethod('getEapPointsCount',{
		http:{ path:'/getEapPointsCount', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	
	// to add/edit Eapmasterpoints
	Eapmasterpoints.addEditEapPoints = function(dataArrObj,point_id,cb){

		if(point_id){
			Eapmasterpoints.getEapPoints({point_id:point_id}, function(err,EapmasterpointsData){
				
				if(EapmasterpointsData){
					var updated_date = Math.floor(Date.now()); // to get server created date
					dataArrObj.updated_date = updated_date;
					
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					var paramsKey= paramsArr.join(', ');
					var whereCond = 'where point_id = (?)';
					dataArr.push(point_id);

					// check if the point entry exists for this point type with open status
					var sqlQuery1 = "select count(point_id) as points from eap_master_points where point_type = (?) AND status = 1 AND points != (?)  and point_id = (?)";
					Eapmasterpoints.app.dbConnection.execute(sqlQuery1,[dataArrObj['point_type'],dataArrObj['points'],point_id],(err,resultObj)=>{
						
						// if the entry exists, make a new entry and update current's status to 0
						if(resultObj[0].points > 0){
							
							// make a new entry with status open
							var created_date = Math.floor(Date.now()); // to get server created date
							dataArrObj.created_date = created_date;
							dataArrObj.updated_date = created_date;
							
							var approvalArr = [];
							var pointArr = [];
							
							for(var o in dataArrObj) {
								approvalArr.push(dataArrObj[o]);
								pointArr.push("(?)");
							}
							var pointKey = pointArr.join(', ');
							var keyString = Object.keys(dataArrObj).join(', ');
							
							var sqlQuery = "insert into [eap_master_points] ("+keyString+") OUTPUT Inserted.point_id values ("+pointKey+")";
							Eapmasterpoints.app.dbConnection.execute(sqlQuery,approvalArr,(err,resultObj)=>{
								
								var result = {};
								if(resultObj.length > 0){
									result.id = resultObj[0].point_id;
									result.updated_date = created_date;
								}
								
							});
							
							//update the status to 0 so that you can update it closed
							var sqlQuery = "update [eap_master_points] set status = 0 where point_id = (?)";
							Eapmasterpoints.app.dbConnection.execute(sqlQuery,[point_id],(err,resultObj)=>{
								var result = {};
								result.id = point_id;
								result.updated_date = dataArrObj.updated_date;
								cb(err,result);
							});
							
						}else{
							var sqlQuery = "update [eap_master_points] set "+paramsKey+" "+whereCond;
							Eapmasterpoints.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
								var result = {};
								result.id = point_id;
								result.updated_date = dataArrObj.updated_date;
								cb(err,result);
							});
						}
						
					});
				}
				else{
					cb("Invalid point id",null);
				}
			});
		}
		else{

			// make a new entry with status open
			var created_date = Math.floor(Date.now()); // to get server created date
			dataArrObj.created_date = created_date;
			dataArrObj.updated_date = created_date;
			
			var approvalArr = [];
			var paramsArr = [];
			
			for(var o in dataArrObj) {
				approvalArr.push(dataArrObj[o]);
				paramsArr.push("(?)");
			}
			var paramsKey = paramsArr.join(', ');
			var keyString = Object.keys(dataArrObj).join(', ');
			
			var sqlQuery = "insert into [eap_master_points] ("+keyString+") OUTPUT Inserted.point_id values ("+paramsKey+")";
			Eapmasterpoints.app.dbConnection.execute(sqlQuery,approvalArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].point_id;
					result.updated_date = created_date;
				}
				cb(err,result);
			});
			
		}
	}
	Eapmasterpoints.remoteMethod('addEditEapPoints',{
		http:{ path:'/addEditEapPoints', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'point_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

};