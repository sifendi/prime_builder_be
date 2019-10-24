'use strict';

module.exports = function(Region) {
	// to add/edit region
	Region.addEditRegion = function(dataArrObj,region_id,cb){
		
		if(region_id){
			Region.findOne({ where:{id:region_id}}, function(err,regionData){
				if(regionData){
					
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
					dataArr.push(region_id);
					var sqlQuery = "update [region] set "+paramsKey+" "+whereCond;
				
					Region.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = region_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid region id",null);
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
			var sqlQuery = "insert into [region] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

			Region.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].id;
					result.updated_date = created_date;
				}
				cb(err,result);
			});
		}
	}
	
	Region.remoteMethod('addEditRegion',{
		http:{ path:'/addEditRegion', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'region_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});


	Region.getRegionCount = function(limit,page,reg_name,reg_id,cb){
		var selectQuery = "select count(*) as total from region where 1=1 ";
		var dataArr = [];
		
		if(reg_name){
			selectQuery+=" AND name like (?)";
			reg_name = "%"+reg_name+"%";
			dataArr.push(reg_name);
		}
		if(reg_id){
			selectQuery+=" AND id = (?)";
			dataArr.push(reg_id);
		}

		Region.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Region.remoteMethod('getRegionCount',{
		http:{ path: '/getRegionCount', verb: 'get' },
		accepts:[
			{ arg: 'limit', type: 'number', source: {http:'query' }},
			{ arg: 'page', type: 'number', source: {http:'query' }},
			{ arg: 'reg_name', type: 'string', source: {http:'query' }},
			{ arg: 'reg_id', type: 'number', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});


	Region.getRegion = function(limit,page,reg_name,reg_id,cb){
		var selectQuery = "select * from region where 1=1 ";
		var dataArr = [];
		
		if(reg_name){
			selectQuery+=" AND name like (?)";
			reg_name = "%"+reg_name+"%";
			dataArr.push(reg_name);
		}
		if(reg_id){
			selectQuery+=" AND id = (?)";
			dataArr.push(reg_id);
		}
		
		selectQuery+=" ORDER BY updated_date DESC ";
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}

		Region.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Region.remoteMethod('getRegion',{
		http:{ path: '/getRegion', verb: 'get' },
		accepts:[
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'reg_name', type: 'string', source: {http:'query' }},
					{ arg: 'reg_id', type: 'number', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
	
	Region.regionNamechek = function(region_name,cb){
		var selectQuery = "select id,region_code as code from region where 1=1";
		var dataArr = [];
		
		if(region_name){
			selectQuery+=" AND name = (?)";
			dataArr.push(region_name);
		}
		selectQuery+=" ORDER BY region_code DESC";
		Region.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Region.remoteMethod('regionNamechek',{
		http:{ path: '/regionNamechek', verb: 'get' },
		accepts:[
					{ arg: 'region_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
};