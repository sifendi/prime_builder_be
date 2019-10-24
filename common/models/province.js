'use strict';

module.exports = function(Province) {
	Province.getProvince = function(limit,page,reg_id,province_name,province_id,cb){
		var selectQuery = "select r.name as region, p.* from province p, region r where p.region_id = r.id ";
		var dataArr = [];
		
		if(reg_id){
			selectQuery+=" AND r.id = (?)";
			dataArr.push(reg_id);
		}
		
		if(province_id){
			selectQuery+=" AND p.id = (?)";
			dataArr.push(province_id);
		}
		
		if(province_name){
			selectQuery+=" AND p.name like (?)";
			province_name = "%"+province_name+"%";
			dataArr.push(province_name);
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		
		selectQuery+=" ORDER BY p.id DESC ";
		if(limit){
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		Province.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Province.remoteMethod('getProvince',{
		http:{ path: '/getProvince', verb: 'get' },
		accepts:[
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'reg_id', type: 'number', source: {http:'query' }},
					{ arg: 'province_name', type: 'string', source: {http:'query' }},
					{ arg: 'province_id', type: 'number', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
	
	Province.getProvinceCount = function(limit,page,reg_id,province_name,province_id,cb){
		var selectQuery = "select count(p.id) as total from province p join region r on p.region_id = r.id where 1=1 ";
		var dataArr = [];
		
		if(reg_id){
			selectQuery+=" AND r.id = (?)";
			dataArr.push(reg_id);
		}
		
		if(province_name){
			selectQuery+=" AND p.name like (?)";
			province_name = "%"+province_name+"%";
			dataArr.push(province_name);
		}
		if(province_id){
			selectQuery+=" AND p.id = (?)";
			dataArr.push(province_id);
		}
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		Province.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Province.remoteMethod('getProvinceCount',{
		http:{ path: '/getProvinceCount', verb: 'get' },
		accepts:[
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'reg_id', type: 'number', source: {http:'query' }},
					{ arg: 'province_name', type: 'string', source: {http:'query' }},
					{ arg: 'province_id', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
	
	// to add/edit province
	Province.addEditProvince = function(dataArrObj,province_id,cb){
		
		if(province_id){
			Province.findOne({ where:{id:province_id}}, function(err,provinceData){
				if(provinceData){
					
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
					dataArr.push(province_id);
					var sqlQuery = "update [province] set "+paramsKey+" "+whereCond;
				
					Province.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = province_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid province id",null);
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
			var sqlQuery = "insert into [province] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

			Province.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].id;
					result.updated_date = created_date;
				}
				cb(err,result);
			});
		}
	}
	
	Province.remoteMethod('addEditProvince',{
		http:{ path:'/addEditProvince', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'province_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	Province.provinceNamechek = function(province_name,cb){
		var selectQuery = "select id,province_code as code from province where 1=1";
		var dataArr = [];
		
		if(province_name){
			selectQuery+=" AND name = (?)";
			dataArr.push(province_name);
		}
		selectQuery+=" ORDER BY province_code DESC";
		Province.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Province.remoteMethod('provinceNamechek',{
		http:{ path: '/provinceNamechek', verb: 'get' },
		accepts:[
					{ arg: 'province_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
};