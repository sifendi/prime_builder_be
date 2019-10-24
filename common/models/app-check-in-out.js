'use strict';

module.exports = function(Appcheckin) {
	
	// to check out
	Appcheckin.addEditCheckInOut = function(dataArrObj,check_in_out_id,cb){
		
		if(check_in_out_id){
			// validate if this user has checked in
			Appcheckin.findOne({ where:{ check_in_out_id: check_in_out_id}}, function(err,checkIn){


				// if yes, update check out details
				if(checkIn){
					var updated_date = Math.floor(Date.now()); // to get server created date
					dataArrObj.updated_date = updated_date;
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where check_in_out_id = (?)';
					dataArr.push(check_in_out_id);
					var sqlQuery = "update [check_in_out_tbl] set "+paramsKey+" "+whereCond;
				
					Appcheckin.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = check_in_out_id;
						result.updated_date=updated_date;
						cb(err,result);
					});
				}else{
					cb("Invalid check in id ",null); // if no, throw an error
				}
			});
		}
		else{
			//check user id if valid
			var userModel = Appcheckin.app.models.user;
			userModel.findOne({where: { id:dataArrObj.check_in_out_user_id }}, function(err,user){
				
				// if valid, check if type id is valid, ie. it should belong to project or retailer/distributor
				if(user){
					
					var table = "";
					var whereCond = "";
					if(dataArrObj.check_in_out_type == "project"){
						table = "projects_tbl";
						whereCond = " project_id = (?)";
					}else{
						table = "rds_visit";
						whereCond = " rds_visit_id = (?)";
					}
					
					var sqlQuery = "select * from "+table+" where "+whereCond;
					Appcheckin.app.dbConnection.execute(sqlQuery,[dataArrObj.check_in_out_type_id],(err,typeData)=>{
					
						var created_date = Math.floor(Date.now()); // to get server created date
						dataArrObj.created_date = created_date;
						dataArrObj.updated_date = created_date;
						
						if(typeData){
							var appArr = [];
							var paramsArr = [];
							
							for(var o in dataArrObj) {
								appArr.push(dataArrObj[o]);
								paramsArr.push("(?)");
							}
							
							var paramsKey = paramsArr.join(', ');
							var keyString = Object.keys(dataArrObj).join(', ');
							
							// add the product receipt
							var sqlQuery = "insert into [check_in_out_tbl] ("+keyString+") OUTPUT Inserted.check_in_out_id values ("+paramsKey+")";
							
							Appcheckin.app.dbConnection.execute(sqlQuery,appArr,(err,resultObj)=>{
								var result = {};
								try{
									if(resultObj.length > 0){
										result.id = resultObj[0].check_in_out_id;
										result.updated_date=created_date;
									}
								}catch(e){

								}
								
								cb(err,result);
							});
						}else{
							cb('Invalid type id',null);
						}
					
					});
				}else{
					cb('Invalid user',null);
				}
			
			});
		}
		
	}
	
	Appcheckin.remoteMethod('addEditCheckInOut',{
		http:{ path: '/addEditCheckInOut', verb: 'post' },
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'check_in_out_id', type:'number', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object' }
	});
	
	// to get stock
	Appcheckin.getCheckInOut = function(check_in_out_id,check_in_out_user_id,check_in_out_type,check_in_out_type_id,limit,page,check_in_datetime,check_out_datetime,created_date,updated_date,cb){
		var sqlQuery = "select * from [check_in_out_tbl] where 1=1 ";
		var dataArr = [];
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		
		if(check_in_out_id){
			sqlQuery+=" AND check_in_out_id = (?)";
			dataArr.push(check_in_out_id);
		}
		if(check_in_out_user_id){
			sqlQuery+=" AND check_in_out_user_id = (?)";
			dataArr.push(check_in_out_user_id);
		}
		if(check_in_out_type){
			sqlQuery+=" AND check_in_out_type = (?) ";
			dataArr.push(check_in_out_type);
		}
		if(check_in_out_type_id){
			sqlQuery+=" AND check_in_out_type_id = (?) ";
			dataArr.push(check_in_out_type_id);
		}
		if(check_in_datetime){
			sqlQuery+=" AND check_in_datetime = (?) ";
			dataArr.push(check_in_datetime);
		}
		if(check_out_datetime){
			sqlQuery+=" AND check_out_datetime = (?) ";
			dataArr.push(check_out_datetime);
		}
		if(created_date){
			sqlQuery+=" AND created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			sqlQuery+=" AND updated_date > (?) ";
			dataArr.push(updated_date);
		}
		sqlQuery+=" ORDER BY check_in_out_id DESC ";
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Appcheckin.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObject)=>{
			if(!err){
				cb(err,resultObject);
			}
		});
	}
	
	Appcheckin.remoteMethod('getCheckInOut',{
		http:{ path: '/getCheckInOut', verb: 'get' },
		accepts:[
					{arg:'check_in_out_id', type:'number', source:{ http: "query"}},
					{arg:'check_in_out_user_id', type:'number', source:{ http: "query"}},
					{arg:'check_in_out_type', type:'string', source:{ http: "query"}},
					{arg:'check_in_out_type_id', type:'number', source:{ http: "query"}},
					{arg:'limit', type:'number', source:{ http: "query"}},
					{arg:'page', type:'number', source:{ http: "query"}},
					{arg:'check_in_datetime', type:'number', source:{ http: "query"}},
					{arg:'check_out_datetime', type:'number', source:{ http: "query"}},
					{arg:'created_date', type:'number', source:{ http: "query"}},
					{arg:'updated_date', type:'number', source:{ http: "query"}}
				],
		returns:{ arg: 'result', type: 'object' }
	})
	
};