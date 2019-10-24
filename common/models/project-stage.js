'use strict';

module.exports = function(Projectstage) {
	// to add/edit stage
	Projectstage.addEditStage = function(dataArrObj,stage_id,cb){
		
		if(stage_id){
			Projectstage.findOne({ where:{id:stage_id}}, function(err,stageData){
				if(stageData){
					
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
					dataArr.push(stage_id);
					var sqlQuery = "update [project_stage_tbl] set "+paramsKey+" "+whereCond;
				
					Projectstage.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = stage_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid stage id",null);
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
			var sqlQuery = "insert into [project_stage_tbl] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

			Projectstage.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].id;
					result.updated_date = created_date;
				}
				cb(err,result);
			});
		}
	}
	
	Projectstage.remoteMethod('addEditStage',{
		http:{ path:'/addEditStage', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'stage_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});
	
	Projectstage.getProjectstage = function(limit,page,stage_id,stage_name,cb){
		var selectQuery = "select * from project_stage_tbl WHERE 1=1";
		var dataArr = [];
		
		if(stage_id){
			selectQuery+=" AND id = (?)";
			dataArr.push(stage_id);
		}
		
		if(stage_name){
			selectQuery+=" AND project_stage like (?)";
			stage_name = "%"+stage_name+"%";
			dataArr.push(stage_name);
		}
		
		selectQuery+=" ORDER BY updated_date DESC ";
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		Projectstage.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Projectstage.remoteMethod('getProjectstage',{
		http:{ path: '/getProjectstage', verb: 'get' },
		accepts:[
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'stage_id', type: 'number', source: {http:'query' }},
					{ arg: 'stage_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
	
	Projectstage.getProjectstageCount = function(limit,page,stage_id,stage_name,cb){
		var selectQuery = "select count(id) as total from project_type_tbl WHERE 1=1";
		var dataArr = [];
		
		if(stage_id){
			selectQuery+=" AND id = (?)";
			dataArr.push(stage_id);
		}
		
		if(stage_name){
			selectQuery+=" AND project_stage like (?)";
			stage_name = "%"+stage_name+"%";
			dataArr.push(stage_name);
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		Projectstage.app.dbConnection.execute(selectQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}
	
	Projectstage.remoteMethod('getProjectstageCount',{
		http:{ path: '/getProjectstageCount', verb: 'get' },
		accepts:[
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'stage_id', type: 'number', source: {http:'query' }},
					{ arg: 'stage_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type:'object' }
	});
};