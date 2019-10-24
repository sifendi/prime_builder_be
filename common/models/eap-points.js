'use strict';
var async = require('async');

module.exports = function(Eappoints) {
	// to add/edit points
	Eappoints.addEditEapPoints = function(dataArrObj,point_id,cb){
		
		if(point_id){
			Eappoints.findOne({ where:{point_id:point_id}}, function(err,pointData){
				if(pointData){
					var updated_date = Math.floor(Date.now()); // to get server created date
					dataArrObj.updated_date = updated_date;
					
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where point_id = (?)';
					dataArr.push(point_id);
					var sqlQuery = "update [eap_employee_points] set "+paramsKey+" "+whereCond;
				
					Eappoints.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = point_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid points id",null);
				}
			});
		}
		else{
			var created_date = Math.floor(Date.now()); // to get server created date
			dataArrObj.created_date = created_date;
			dataArrObj.updated_date = created_date;
			
			var pointsArr = [];
			var paramsArr = [];
			
			for(var o in dataArrObj) {
				pointsArr.push(dataArrObj[o]);
				paramsArr.push("(?)");
			}
			var paramsKey = paramsArr.join(', ');
			var keyString = Object.keys(dataArrObj).join(', ');
			
			// add the user as points
			var sqlQuery = "insert into [eap_employee_points] ("+keyString+") OUTPUT Inserted.point_id values ("+paramsKey+")";
			
			Eappoints.app.dbConnection.execute(sqlQuery,pointsArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].point_id;
					result.updated_date = created_date;

				}
				cb(err,result);
			});
		}
	}
	
	Eappoints.remoteMethod('addEditEapPoints',{
		http:{ path:'/addEditEapPoints', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'point_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});
	
	Eappoints.getLeaderboard = function(dataArrObj,cb){
			
		var pointArr = [];
		//select u.id, sum(ep.points) as totalPoints, (select realm from [User] u2 where u2.id = u.id) as user_name from eap_employee_points ep join [User] u on ep.user_id = u.id join RoleMapping rm on rm.principalId = u.id join Role r on r.id = rm.roleId and r.name = '$eap' where 1=1
		var sqlQuery = "select tt.user_id,tt.total,therank,u.realm from (select t.user_id,sum(t.points) as 'total', rank() over (order by sum(t.points) desc, user_id asc) as therank from eap_employee_points t join [User] on [User].id = t.user_id where	[User].status = 1 group by t.user_id) tt  join [User] u  on tt.user_id = u.id join RoleMapping rm on rm.principalId = u.id join Role r on r.id = rm.roleId and r.name = '$eap' where 1=1 ";
		
		if(typeof(dataArrObj['realm']) != 'undefined' && dataArrObj['realm'] != ""){
			sqlQuery+=" AND u.realm like (?)";
			pointArr.push("%"+dataArrObj['realm']+"%")
		}
		if(typeof(dataArrObj['id']) != 'undefined' && dataArrObj['id'] != ""){
			sqlQuery+=" AND u.id = (?)";
			pointArr.push(dataArrObj['id'])
		}
		//sqlQuery+=" group by u.id order by totalPoints desc";
		sqlQuery+=" order by therank asc";
		if(dataArrObj['limit'] > 0){
			if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
			var offset = dataArrObj['page']*dataArrObj['limit'];
			
			sqlQuery+="  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
			pointArr.push(offset,dataArrObj['limit']);
		}
		var employeeMatch = false;
		Eappoints.app.dbConnection.execute(sqlQuery,pointArr,(err,resultObj)=>{
			
			if(dataArrObj['uid'] > 0){
				
				async.each(resultObj,(json,callback)=>{
					if(json.user_id == dataArrObj['uid']){
						employeeMatch  = true;
					}
					callback();
				},
				(err)=>{
					// the uid passed is not present in top 10
					//select u.id, sum(ep.points) as totalPoints, (select realm from [User] u2 where u2.id = u.id) as user_name from eap_employee_points ep join [User] u on ep.user_id = u.id where u.id = (?) group by u.id order by totalPoints desc;
					if(employeeMatch == false){
						var sqlQuery = "select tt.user_id,tt.total,therank,u.realm from (select t.user_id,sum(t.points) as 'total', rank() over (order by sum(t.points) desc, user_id asc) as therank from eap_employee_points t  group by t.user_id) tt  join [User] u  on tt.user_id = u.id join RoleMapping rm on rm.principalId = u.id join Role r on r.id = rm.roleId and r.name = '$eap' where tt.user_id = (?) and u.status = 1";
						Eappoints.app.dbConnection.execute(sqlQuery,[dataArrObj['uid']],(err,resultObj2)=>{
							if(resultObj2[0] && resultObj2.length>0){
								resultObj.push(resultObj2[0]);
								cb(err,resultObj);
							}else{
								cb(err,resultObj);
							}
							
						});
					}else{
						cb(err,resultObj);
					}
				});
				
			}else{
				cb(err,resultObj);
			}
			
		});
	
	}
	
	Eappoints.remoteMethod('getLeaderboard',{
		http:{ path:'/getLeaderboard', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
				],
		returns:{ arg: 'result', type: 'object'}
	});

	Eappoints.getLeaderboardCount = function(dataArrObj,cb){
			
		var pointArr = [];
		var sqlQuery = "select count(distinct ep.user_id) as total from eap_employee_points ep join [User] u on ep.user_id = u.id join RoleMapping rm on rm.principalId = u.id join Role r on r.id = rm.roleId and r.name = '$eap' where 1=1 and u.status = 1 ";
		
		if(typeof(dataArrObj['realm']) != 'undefined' && dataArrObj['realm'] != ""){
			sqlQuery+=" AND u.realm like (?)";
			pointArr.push("%"+dataArrObj['realm']+"%")
		}
		if(typeof(dataArrObj['id']) != 'undefined' && dataArrObj['id'] != ""){
			sqlQuery+=" AND u.id = (?)";
			pointArr.push(dataArrObj['id'])
		}
		
		Eappoints.app.dbConnection.execute(sqlQuery,pointArr,(err,resultObj)=>{
			cb(err,resultObj)
		});
	
	}
	
	Eappoints.remoteMethod('getLeaderboardCount',{
		http:{ path:'/getLeaderboardCount', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
				],
		returns:{ arg: 'result', type: 'object'}
	});

};