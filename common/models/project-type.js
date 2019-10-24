'use strict';

module.exports = function(Projecttype) {
	// to add/edit Type
	Projecttype.addEditProjecttype = function(dataArrObj,type_id,cb){
		
		if(type_id){
			Projecttype.findOne({ where:{id:type_id}}, function(err,TypeData){
				if(TypeData){
					
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
					dataArr.push(type_id);
					var sqlQuery = "update [project_type_tbl] set "+paramsKey+" "+whereCond;
				
					Projecttype.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = type_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid Projecttype id",null);
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
			var sqlQuery = "insert into [project_type_tbl] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

			Projecttype.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].id;
					result.updated_date = created_date;
				}
				cb(err,result);
			});
		}
	}
	
	Projecttype.remoteMethod('addEditProjecttype',{
		http:{ path:'/addEditProjecttype', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'type_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});
	
	Projecttype.getProjecttype = function(limit,page,type_id,type_name,cb){
		var selectQuery = "select * from project_type_tbl WHERE 1=1";
		var dataArr = [];
		
		if(type_id){
			selectQuery+=" AND id = (?)";
			dataArr.push(type_id);
		}
		
		if(type_name){
			selectQuery+=" AND project_type like (?)";
			type_name = "%"+type_name+"%";
			dataArr.push(type_name);
		}
		
		selectQuery+=" ORDER BY updated_date DESC ";
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		Projecttype.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Projecttype.remoteMethod('getProjecttype',{
		http:{ path: '/getProjecttype', verb: 'get' },
		accepts:[
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'type_id', type: 'number', source: {http:'query' }},
					{ arg: 'type_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
	
	Projecttype.getProjecttypeCount = function(limit,page,type_id,type_name,cb){
		var selectQuery = "select count(id) as total from project_type_tbl WHERE 1=1";
		var dataArr = [];
		
		if(type_id){
			selectQuery+=" AND id = (?)";
			dataArr.push(type_id);
		}
		
		if(type_name){
			selectQuery+=" AND project_type like (?)";
			type_name = "%"+type_name+"%";
			dataArr.push(type_name);
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		Projecttype.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Projecttype.remoteMethod('getProjecttypeCount',{
		http:{ path: '/getProjecttypeCount', verb: 'get' },
		accepts:[
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'type_id', type: 'number', source: {http:'query' }},
					{ arg: 'type_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
	
};