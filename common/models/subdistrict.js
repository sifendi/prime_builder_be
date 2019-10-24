'use strict';

module.exports = function(Subdistrict) {
	Subdistrict.getSubDistrict = function(limit,page,municipality_id,name,sub_id,cb){
		var selectQuery = "select  r.id as region_id, r.name as region_name, p.id as province_id, p.name as province_name, d.id as district_id, d.name as district_name, m.name as municipality,sd.* from region r join province p on r.id = p.region_id join district d on p.id = d.province_id join municipality m on d.id = m.district_id join subdistrict sd on m.id = sd.municipality_id";
		var dataArr = [];
		
		if(municipality_id){
			selectQuery+=" AND m.id = (?)";
			dataArr.push(municipality_id);
		}
		if(sub_id){
			selectQuery+=" AND sd.id = (?)";
			dataArr.push(sub_id);
		}
		if(name){
			selectQuery+=" AND sd.name like (?)";
			name = "%"+name+"%";
			dataArr.push(name);
		}
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		
		selectQuery+=" ORDER BY sd.id DESC ";
		if(limit){
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		console.log("selectQuery",selectQuery);
		console.log("dataArr",dataArr);
		Subdistrict.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Subdistrict.remoteMethod('getSubDistrict',{
		http:{ path: '/getSubDistrict', verb: 'get' },
		accepts:[
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'municipality_id', type: 'number', source: {http:'query' }},
					{ arg: 'name', type: 'string', source: {http:'query' }},
					{ arg: 'sub_id', type: 'number', source: {http:'query' }},
		],
		returns:{ arg: 'result', type:'object' }
	});

	Subdistrict.getSubDistrictCount = function(limit,page,municipality_id,name,sub_id,cb){
		var selectQuery = "select count(sd.id) as total from region r join province p on r.id = p.region_id join district d on p.id = d.province_id join municipality m on d.id = m.district_id join subdistrict sd on m.id = sd.municipality_id where 1=1 ";
		var dataArr = [];
		
		if(municipality_id){
			selectQuery+=" AND m.id = (?)";
			dataArr.push(municipality_id);
		}
		if(name){
			selectQuery+=" AND sd.name like (?)";
			name = "%"+name+"%";
			dataArr.push(name);
		}
		if(sub_id){
			selectQuery+=" AND sd.id = (?)";
			dataArr.push(sub_id);
		}
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		console.log("selectQuery",selectQuery);
		console.log("dataArr",dataArr);
		Subdistrict.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Subdistrict.remoteMethod('getSubDistrictCount',{
		http:{ path: '/getSubDistrictCount', verb: 'get' },
		accepts:[
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'municipality_id', type: 'number', source: {http:'query' }},
					{ arg: 'name', type: 'string', source: {http:'query' }},
					{ arg: 'sub_id', type: 'number', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});

	// to add/edit subdistrict
	Subdistrict.addEditSubdistrict = function(dataArrObj,subdistrict_id,cb){
		
		if(subdistrict_id){
			Subdistrict.findOne({ where:{id:subdistrict_id}}, function(err,SubdistrictData){
				if(SubdistrictData){
					
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
					dataArr.push(subdistrict_id);
					var sqlQuery = "update [subdistrict] set "+paramsKey+" "+whereCond;
				
					Subdistrict.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = subdistrict_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid subdistrict id",null);
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
			var sqlQuery = "insert into [subdistrict] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

			Subdistrict.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].id;
					result.updated_date = created_date;
				}
				cb(err,result);
			});
		}
	}
	
	Subdistrict.remoteMethod('addEditSubdistrict',{
		http:{ path:'/addEditSubdistrict', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'subdistrict_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	Subdistrict.subDistrictNamechek = function(subDist_name,cb){
		var selectQuery = "select id,subdistrict_code as code from subdistrict where 1=1";
		var dataArr = [];
		
		if(subDist_name){
			selectQuery+=" AND name = (?)";
			dataArr.push(subDist_name);
		}
		selectQuery+=" ORDER BY subdistrict_code DESC";
		Subdistrict.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Subdistrict.remoteMethod('subDistrictNamechek',{
		http:{ path: '/subDistrictNamechek', verb: 'get' },
		accepts:[
					{ arg: 'subDist_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
};