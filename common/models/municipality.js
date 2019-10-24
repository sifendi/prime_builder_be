'use strict';

module.exports = function(Municipality) {
	Municipality.getMunicipality = function(dis_id,limit,page,municipality_name,mun_id,cb){
		var selectQuery = "select r.id as region_id, r.name as region_name, p.id as province_id, p.name as province_name, d.name as district, m.* from region r join province p on r.id = p.region_id join district d on p.id = d.province_id join municipality m on d.id = m.district_id";
		var dataArr = [];
		
		if(municipality_name){
			selectQuery+=" AND m.name like (?)";
			municipality_name = "%"+municipality_name+"%";
			dataArr.push(municipality_name);
		}
		if(dis_id){
			selectQuery+=" AND d.id = (?)";
			dataArr.push(dis_id);
		}
		if(mun_id){
			selectQuery+=" AND m.id = (?)";
			dataArr.push(mun_id);
		}
		selectQuery+=" order by m.id DESC ";
			
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		//console.log(selectQuery);
		Municipality.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Municipality.remoteMethod('getMunicipality',{
		http:{ path: '/getMunicipality', verb: 'get' },
		accepts:[
				{ arg: 'dis_id', type: 'number', source: {http:'query' }},
				{ arg: 'limit', type: 'number', source: {http:'query' }},
				{ arg: 'page', type: 'number', source: {http:'query' }},
				{ arg: 'municipality_name', type: 'string', source: {http:'query' }},
				{ arg: 'mun_id', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});

	Municipality.getMunicipalityByProvince = function(province_id,limit,page,municipality_name,mun_id,cb){
		var selectQuery ="";
		if(province_id){
			selectQuery = "select * from municipality where district_id in (select id from district where province_id = "+province_id+") ";
		}else{
			selectQuery = "select * from municipality where 1=1 ";
		}

		var dataArr = [];
		
		if(municipality_name){
			selectQuery+=" AND name like (?)";
			municipality_name = "%"+municipality_name+"%";
			dataArr.push(municipality_name);
		}
		if(mun_id){
			selectQuery+=" AND id = (?)";
			dataArr.push(mun_id);
		}
		selectQuery+=" order by id DESC ";
			
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}

		console.log("selectQuery : ", selectQuery);

		//console.log(selectQuery);
		Municipality.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Municipality.remoteMethod('getMunicipalityByProvince',{
		http:{ path: '/getMunicipalityByProvince', verb: 'get' },
		accepts:[
				{ arg: 'province_id', type: 'number', source: {http:'query' }},
				{ arg: 'limit', type: 'number', source: {http:'query' }},
				{ arg: 'page', type: 'number', source: {http:'query' }},
				{ arg: 'municipality_name', type: 'string', source: {http:'query' }},
				{ arg: 'mun_id', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});

	
	Municipality.getMunicipalityCount = function(dis_id,limit,page,municipality_name,mun_id,cb){
		var selectQuery = "select count(m.id) as total from municipality m join district d on m.district_id = d.id where 1=1 ";
		var dataArr = [];
		
		if(municipality_name){
			selectQuery+=" AND m.name like (?)";
			municipality_name = "%"+municipality_name+"%";
			dataArr.push(municipality_name);
		}
		if(dis_id){
			selectQuery+=" AND d.id = (?)";
			dataArr.push(dis_id);
		}
		if(mun_id){
			selectQuery+=" AND m.id = (?)";
			dataArr.push(mun_id);
		}
		
		Municipality.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Municipality.remoteMethod('getMunicipalityCount',{
		http:{ path: '/getMunicipalityCount', verb: 'get' },
		accepts:[
				{ arg: 'dis_id', type: 'number', source: {http:'query' }},
				{ arg: 'limit', type: 'number', source: {http:'query' }},
				{ arg: 'page', type: 'number', source: {http:'query' }},
				{ arg: 'municipality_name', type: 'string', source: {http:'query' }},
				{ arg: 'mun_id', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});

	// to add/edit Municipality
	Municipality.addEditMunicipality = function(dataArrObj,municipality_id,cb){
		
		if(municipality_id){
			Municipality.findOne({ where:{id:municipality_id}}, function(err,MunicipalityData){
				if(MunicipalityData){
					
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
					dataArr.push(municipality_id);
					var sqlQuery = "update [municipality] set "+paramsKey+" "+whereCond;
				
					Municipality.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = municipality_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid municipality id",null);
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
			var sqlQuery = "insert into [municipality] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

			Municipality.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].id;
					result.updated_date = created_date;
				}
				cb(err,result);
			});
		}
	}
	
	Municipality.remoteMethod('addEditMunicipality',{
		http:{ path:'/addEditMunicipality', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'municipality_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	Municipality.munNamechek = function(mun_name,cb){
		var selectQuery = "select id,municipality_code as code from municipality where 1=1";
		var dataArr = [];
		
		if(mun_name){
			selectQuery+=" AND name = (?)";
			dataArr.push(mun_name);
		}
		selectQuery+=" ORDER BY municipality_code DESC";
		Municipality.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Municipality.remoteMethod('munNamechek',{
		http:{ path: '/munNamechek', verb: 'get' },
		accepts:[
					{ arg: 'mun_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
};