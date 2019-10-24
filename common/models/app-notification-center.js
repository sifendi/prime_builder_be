'use strict';

module.exports = function(AppNotificationCenter) { 
	 
	AppNotificationCenter.getNotifications = function(ntc_id,ntc_to_user_id,ntc_from_user_id,ntc_user_read_flag,status,limit,page,created_date,updated_date,cb){
			if(limit){
			if(!page){ page = 0; }
			var offset = page*limit; 
		}
		
		var dataArr = [];
		var sqlQuery = "select *  from  notification_center  where ntc_id>0  ";
		if(ntc_id){
			sqlQuery+=" AND ntc_id= (?) ";
			dataArr.push(ntc_id);
		}
		if(ntc_to_user_id){
			sqlQuery+=" AND ntc_to_user_id = (?) ";
			dataArr.push(ntc_to_user_id);
		}
		if(ntc_from_user_id){
			sqlQuery+=" AND ntc_from_user_id= (?) ";
			dataArr.push(ntc_from_user_id);
		}
		if(ntc_user_read_flag!=null && ntc_user_read_flag!='undefined'){
			sqlQuery+=" AND ntc_user_read_flag = (?) ";
			dataArr.push(ntc_user_read_flag);
		}
		if(status){
			sqlQuery+=" AND status = (?) ";
			dataArr.push(status);
		}else{
			sqlQuery+=" AND status = 1 ";
		}
		if(created_date){
			sqlQuery+=" AND created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			sqlQuery+=" AND updated_date > (?) ";
			dataArr.push(updated_date);
		}else{
			// 1 week befor date
			var d = new Date();
			d.setDate(d.getDate()-7);
			var rangeDateTime = d.getTime();
			sqlQuery+=" AND updated_date > "+rangeDateTime+" ";

		}
		
		sqlQuery+=" ORDER BY  updated_date DESC ";
		
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		console.log('sqlQuery',sqlQuery);
		console.log('dataArr',dataArr);
		AppNotificationCenter.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObject)=>{
			cb(err,resultObject);
		});
	}
	
	AppNotificationCenter.addEditNotifications = function(dataArrObj,ntc_id,cb){
					
		var created_date = Math.floor(Date.now());
		var updated_date = Math.floor(Date.now());
		
		if(ntc_id){
			AppNotificationCenter.findOne({ where:{ ntc_id:ntc_id }}, function(err,notifyData){
				if(notifyData){
					
					dataArrObj.updated_date = updated_date;
					
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where ntc_id = (?)';
					dataArr.push(ntc_id);
					var sqlQuery = "update [notification_center] set "+paramsKey+" "+whereCond;
				
					AppNotificationCenter.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = ntc_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid notifications id",null);
				}
			});
		}
		else{
			
					dataArrObj.created_date = created_date;
					dataArrObj.updated_date = updated_date;
					
					var notifyArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						notifyArr.push(dataArrObj[o]);
						paramsArr.push("(?)");
					}
					
					var paramsKey = paramsArr.join(', ');
					var keyString = Object.keys(dataArrObj).join(', ');
					
					
					var sqlQuery = "insert into [notification_center] ("+keyString+") OUTPUT Inserted.ntc_id values ("+paramsKey+")";
					
					AppNotificationCenter.app.dbConnection.execute(sqlQuery,notifyArr,(err,resultObj)=>{
						var result = {};
						if(resultObj){
							if(resultObj['length']>0){
								result.id = resultObj[0].ntc_id;
								result.updated_date = created_date;
							}
							
						}
						cb(err,result);
					});
					
			
		}
	}


	AppNotificationCenter.remoteMethod('getNotifications',{
		http:{ path: '/getNotifications', verb: 'get'},
		accepts:[
				{ arg: 'ntc_id', type: 'number', source:{http:'query'}},
				{ arg: 'ntc_to_user_id', type: 'number', source:{http:'query'}},
				{ arg: 'ntc_from_user_id', type: 'number', source:{http:'query'}},
				{ arg: 'ntc_user_read_flag', type: 'number', source:{http:'query'}},
				{ arg: 'status', type: 'number', source:{http:'query'}},
				{ arg: 'limit', type: 'number', source:{http:'query'}},
				{ arg: 'page', type: 'number', source:{http:'query'}},
				{ arg:'created_date', type: 'number', source:{http:'query'}},
				{ arg:'updated_date', type: 'number', source:{http:'query'}}
				],
		returns:{ arg: 'result', type: 'object'}
	});

	AppNotificationCenter.remoteMethod('addEditNotifications',{
		http:{ path: '/addEditNotifications', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'ntc_id', type:'number', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object' }
	});


};