'use strict';
var async = require('async');

module.exports = function(Eapemployeepoints) {
	
	Eapemployeepoints.getLeaderboard = function(user_id, limit, page, cb){
		var sqlQuery = "select SUM(p.points) OVER () AS totalPoints, u.realm as employee_name, u.id from [User] u join RoleMapping rm on rm.principalId = u.id join  Role r on rm.roleId = r.id join eap_employee_points p on u.id = p.user_id where r.name = '$eap' ";
		var dataArr = [];
		
		sqlQuery+=" order by p.points ";
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		var currentEmployee = false;
		
		Eapemployeepoints.app.dbConnection.execute(sqlQuery,dataArr,(err,pointsData)=>{
			if(user_id!=""){
				console.log(currentEmployee);
				async.each(pointsData, function(json, callback) {
					if(json.id == user_id && currentEmployee == false){
						currentEmployee = true;
					}
					callback();
				},
				(err)=>{
					if(currentEmployee == false){
						var getCurrentEmployee = "select SUM(p.points) OVER () AS totalPoints, u.realm as employee_name, u.id from [User] u join RoleMapping rm on rm.principalId = u.id join  Role r on rm.roleId = r.id join eap_employee_points p on u.id = p.user_id where r.name = '$eap' and u.id = (?)  order by u.id offset 1 rows fetch next 1 rows only ";
						Eapemployeepoints.app.dbConnection.execute(getCurrentEmployee,[user_id],(err,curPointsData)=>{
							if(curPointsData){
								pointsData.push(curPointsData[0]);
							}
							cb(err,pointsData);
						});
					}else{
						cb(err,pointsData);
					}
				});
				
			}else{
				cb(err,pointsData);
			}
			
		})
		
	}
	
	Eapemployeepoints.remoteMethod('getLeaderboard',{
		http:{ path:'/getLeaderboard', verb:'GET' },
		accepts:[
					{ arg: 'user_id', type:'number', source:{ http: 'query'} },
					{ arg: 'limit', type:'number', source:{ http: 'query'} },
					{ arg: 'page', type:'number', source:{ http: 'query'} }
				],
		returns: { arg:'result', type: 'object' }
		
	});

};