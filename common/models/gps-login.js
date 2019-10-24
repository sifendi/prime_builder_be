'use strict';

module.exports = function(Gpslogin) {
	// to add/edit
	Gpslogin.addEditGpslogin = function(dataArrObj,id,cb){
		if(Object.keys(dataArrObj).length > 0 && dataArrObj){
			if(id){
				Gpslogin.findOne({ where:{id:id}}, function(err,data){
					if(data){
						
						var updated_date = Math.floor(Date.now()); // to get server created date
						dataArrObj.updated_date = updated_date;
						
						var dataArr = [];
						var paramsArr = [];
						
						for(var o in dataArrObj) {
							dataArr.push(dataArrObj[o]);
							paramsArr.push(o+"=(?)");
						}
								
						let paramsKey= paramsArr.join(', ');
						var whereCond = 'where id = (?)';
						dataArr.push(id);
						var sqlQuery = "update [gps_login] set "+paramsKey+" "+whereCond;
					
						Gpslogin.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
							var result = {};
							result.id = id;
							result.updated_date = dataArrObj.updated_date;
							cb(err,result);
						});
					}
					else{
						cb("Invalid id",null);
					}
				});
			}
			else{
				
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
				var sqlQuery = "insert into [gps_login] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

				Gpslogin.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
					var result = {};
					if(resultObj.length > 0){
						result.id = resultObj[0].id;
						result.updated_date = created_date;
					}
					cb(err,result);
				});
			}
		}else{
			cb('Invalid data',null);
		}
	}
	
	Gpslogin.remoteMethod('addEditGpslogin',{
		http:{ path:'/addEditGpslogin', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});
};