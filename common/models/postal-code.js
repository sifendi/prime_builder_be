'use strict';

module.exports = function(Postalcode) {
	Postalcode.getPostalCode = function(limit,page,postal_id,postalcode,postalcode_code,subdistrict_id,cb){
		
		var selectQuery = "select r.id as region_id, r.name as region_name, d.id as district_id, d.name as district_name, m.id as municipality_id, m.name as municipality_name, p.id as province_id, p.name as province_name, sd.name as subdistrict, sd.name as subdistrict_name, ps.* from region r join province p on r.id = p.region_id join district d on p.id = d.province_id join municipality m on d.id = m.district_id join subdistrict sd on m.id = sd.municipality_id join postal_code ps on sd.id = ps.subdistrict_id where 1=1 ";
		
		var dataArr = [];
		if(postalcode){
			selectQuery+=" AND ps.postal_code like (?)";
			postalcode = "%"+postalcode+"%";
			dataArr.push(postalcode);
		}
		if(postalcode_code){
			selectQuery+=" AND ps.postalcode_code like (?)";
			postalcode_code = "%"+postalcode_code+"%";
			dataArr.push(postalcode_code);
		}
		if(postal_id){
			selectQuery+=" AND ps.id = (?)";
			dataArr.push(postal_id);
		}
		if(subdistrict_id){
			selectQuery+=" AND ps.subdistrict_id = (?)";
			dataArr.push(subdistrict_id);
		}
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		
		selectQuery+=" ORDER BY ps.id DESC ";
		if(limit){
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		Postalcode.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Postalcode.remoteMethod('getPostalCode',{
		http:{ path: '/getPostalCode', verb: 'get' },
		accepts:[
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'postal_id', type: 'number', source: {http:'query' }},
					{ arg: 'postalcode', type: 'number', source: {http:'query' }},
					{ arg: 'postalcode_code', type: 'string', source: {http:'query' }},
					{ arg: 'subdistrict_id', type: 'number', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});

	Postalcode.getPostalCodeCount = function(postalcode,postal_id,postalcode_code,subdistrict_id,cb){
		
		var selectQuery = "select count(distinct ps.id) as total from region r join province p on r.id = p.region_id join district d on p.id = d.province_id join municipality m on d.id = m.district_id join subdistrict sd on m.id = sd.municipality_id join postal_code ps on sd.id = ps.subdistrict_id where 1=1 ";
		
		var dataArr = [];

		if(postalcode){
			selectQuery+=" AND ps.postal_code like (?)";
			postalcode = "%"+postalcode+"%";
			dataArr.push(postalcode);
		}
		if(postalcode_code){
			selectQuery+=" AND ps.postalcode_code like (?)";
			postalcode_code = "%"+postalcode_code+"%";
			dataArr.push(postalcode_code);
		}
		if(postal_id){
			selectQuery+=" AND ps.id = (?)";
			dataArr.push(postal_id);
		}
		if(subdistrict_id){
			selectQuery+=" AND ps.subdistrict_id = (?)";
			dataArr.push(subdistrict_id);
		}
		Postalcode.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Postalcode.remoteMethod('getPostalCodeCount',{
		http:{ path: '/getPostalCodeCount', verb: 'get' },
		accepts:[
					{ arg: 'postalcode', type: 'number', source: {http:'query' }},
					{ arg: 'postal_id', type: 'number', source: {http:'query' }},
					{ arg: 'postalcode_code', type: 'string', source: {http:'query' }},
					{ arg: 'subdistrict_id', type: 'number', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
	// to add/edit Postalcode
	Postalcode.addEditPostalcode = function(dataArrObj,postalcode_id,cb){
		
		if(postalcode_id){
			Postalcode.findOne({ where:{id:postalcode_id}}, function(err,pData){
				if(pData){
					
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
					dataArr.push(postalcode_id);
					var sqlQuery = "update [postal_code] set "+paramsKey+" "+whereCond;
				
					Postalcode.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = postalcode_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid postalcode id",null);
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
			var sqlQuery = "insert into [postal_code] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

			Postalcode.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].id;
					result.updated_date = created_date;
				}
				cb(err,result);
			});
		}
	}
	
	Postalcode.remoteMethod('addEditPostalcode',{
		http:{ path:'/addEditPostalcode', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'postalcode_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	Postalcode.postalcodeNamechek = function(postalcode,cb){
		var selectQuery = "select id,postalcode_code as code from postal_code where 1=1";
		var dataArr = [];
		
		if(postalcode){
			selectQuery+=" AND postal_code = (?)";
			dataArr.push(postalcode);
		}
		selectQuery+=" ORDER BY postalcode_code DESC";
		Postalcode.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Postalcode.remoteMethod('postalcodeNamechek',{
		http:{ path: '/postalcodeNamechek', verb: 'get' },
		accepts:[
					{ arg: 'postalcode', type: 'any', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
};