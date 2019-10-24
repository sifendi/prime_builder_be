'use strict';

module.exports = function(District) {
	District.getDistrict = function(limit,page,dis_id,province_id,dis_name,cb){
		var selectQuery = "select p.name as province, p.region_id, r.name as region_name, d.*  from province p join district d on p.id = d.province_id  join region r on r.id = p.region_id ";
		var dataArr = [];
		
		if(dis_id){
			selectQuery+=" AND d.id = (?)";
			dataArr.push(dis_id);
		}
		
		if(dis_name){
			selectQuery+=" AND d.name like (?)";
			dis_name = "%"+dis_name+"%";
			dataArr.push(dis_name);
		}
		
		if(province_id){
			selectQuery+=" AND p.id = (?)";
			dataArr.push(province_id);
		}
		
		selectQuery+=" ORDER BY d.id DESC ";
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		District.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	District.remoteMethod('getDistrict',{
		http:{ path: '/getDistrict', verb: 'get' },
		accepts:[
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'dis_id', type: 'number', source: {http:'query' }},
					{ arg: 'province_id', type: 'number', source: {http:'query' }},
					{ arg: 'dis_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
	
	District.getDistrictCount = function(limit,page,dis_id,province_id,dis_name,cb){
		var selectQuery = "select count(d.id) as total from province p join district d on p.id = d.province_id join region r on r.id = p.region_id where 1=1 ";
		var dataArr = [];
		
		if(dis_id){
			selectQuery+=" AND d.id = (?)";
			dataArr.push(dis_id);
		}
		
		if(dis_name){
			selectQuery+=" AND d.name like (?)";
			dis_name = "%"+dis_name+"%";
			dataArr.push(dis_name);
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
		
		District.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	District.remoteMethod('getDistrictCount',{
		http:{ path: '/getDistrictCount', verb: 'get' },
		accepts:[
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'dis_id', type: 'number', source: {http:'query' }},
					{ arg: 'province_id', type: 'number', source: {http:'query' }},
					{ arg: 'dis_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});

	// to add/edit district
	District.addEditDistrict = function(dataArrObj,district_id,cb){
		
		if(district_id){
			District.findOne({ where:{id:district_id}}, function(err,districtData){
				if(districtData){
					
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
					dataArr.push(district_id);
					var sqlQuery = "update [district] set "+paramsKey+" "+whereCond;
				
					District.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = district_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid district id",null);
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
			var sqlQuery = "insert into [district] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

			District.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].id;
					result.updated_date = created_date;
				}
				cb(err,result);
			});
		}
	}
	
	District.remoteMethod('addEditDistrict',{
		http:{ path:'/addEditDistrict', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'district_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	District.districtNamechek = function(dis_name,cb){
		var selectQuery = "select id,district_code from district where 1=1";
		var dataArr = [];
		
		if(dis_name){
			selectQuery+=" AND name = (?)";
			dataArr.push(dis_name);
		}
		selectQuery+=" ORDER BY district_code DESC";
		District.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	District.remoteMethod('districtNamechek',{
		http:{ path: '/districtNamechek', verb: 'get' },
		accepts:[
					{ arg: 'dis_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});

};