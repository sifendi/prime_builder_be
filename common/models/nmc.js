'use strict';

module.exports = function(Nmc) {
	// to add/edit nmc
	Nmc.addEditNmc = function(dataArrObj,nmc_id,cb){
		
		if(nmc_id){
			Nmc.findOne({ where:{id:nmc_id}}, function(err,NmcData){
				if(NmcData){
					
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
					dataArr.push(nmc_id);
					var sqlQuery = "update [nmc_tbl] set "+paramsKey+" "+whereCond;
				
					Nmc.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = nmc_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid Nmc id",null);
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
			var sqlQuery = "insert into [nmc_tbl] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

			Nmc.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].id;
					result.updated_date = created_date;
				}
				cb(err,result);
			});
		}
	}
	
	Nmc.remoteMethod('addEditNmc',{
		http:{ path:'/addEditNmc', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'nmc_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	Nmc.getNmc = function(limit,page,nmc_id,nmc_name,cb){
		var selectQuery = "select * from nmc_tbl WHERE 1=1";
		var dataArr = [];
		
		if(nmc_id){
			selectQuery+=" AND id = (?)";
			dataArr.push(nmc_id);
		}
		
		if(nmc_name){
			selectQuery+=" AND nmc_type like (?)";
			nmc_name = "%"+nmc_name+"%";
			dataArr.push(nmc_name);
		}
		
		selectQuery+=" ORDER BY updated_date DESC ";
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		Nmc.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Nmc.remoteMethod('getNmc',{
		http:{ path: '/getNmc', verb: 'get' },
		accepts:[
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'nmc_id', type: 'number', source: {http:'query' }},
					{ arg: 'nmc_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
	
	Nmc.getNmcCount = function(limit,page,nmc_id,nmc_name,cb){
		var selectQuery = "select count(id) as total from nmc_tbl WHERE 1=1";
		var dataArr = [];
		
		if(nmc_id){
			selectQuery+=" AND id = (?)";
			dataArr.push(nmc_id);
		}
		
		if(nmc_name){
			selectQuery+=" AND nmc_type like (?)";
			nmc_name = "%"+nmc_name+"%";
			dataArr.push(nmc_name);
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Nmc.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Nmc.remoteMethod('getNmcCount',{
		http:{ path: '/getNmcCount', verb: 'get' },
		accepts:[
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'nmc_id', type: 'number', source: {http:'query' }},
					{ arg: 'nmc_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});

};