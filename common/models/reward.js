'use strict';
var async = require('async');

module.exports = function(Reward) {

	Reward.getRewards = function(id,name,description,image,points,status,created_by,created_date,limit,page,rc_id,cb){
		var dataArr = [];
		var sqlQuery = "select rc.rew_category_name, rm.*, rp.start_date, rp.end_date, rp.promo_points, rp.id as promo_id  from reward_master rm left join reward_promos rp on rm.id = rp.reward_id and rp.start_date < = CONVERT (date, SYSDATETIME()) and rp.end_date >= CONVERT (date, SYSDATETIME()) and rp.status = 1 left join reward_category rc on rm.reward_cat_id = rc.rew_category_id where rm.status = 1 ";
		
		if(typeof(rc_id)!="undefined" && rc_id!=""){
			id = rc_id;
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		if(name){
			sqlQuery+=" AND rm.name like (?) ";
			name = "%"+name+"%";
			dataArr.push(name);
		}
		if(id){
			sqlQuery+=" AND rm.id = (?) ";
			dataArr.push(id);
		}
		if(description){
			sqlQuery+=" AND rm.description = (?) ";
			dataArr.push(description);
		}
		if(status){
			sqlQuery+=" AND rm.status = (?) ";
			dataArr.push(status);
		}
		if(created_by){
			sqlQuery+=" AND rm.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(limit){
			sqlQuery+=" ORDER BY rm.id DESC OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}

		Reward.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		});
	}

	Reward.remoteMethod('getRewards',{
		http:{ path: '/getRewards', verb: 'get' },
		accepts:[
					{ arg: 'id', type: 'number', source: {http:'query' }},
					{ arg: 'name', type: 'string', source: {http:'query' }},
					{ arg: 'description', type: 'string', source: {http:'query' }},
					{ arg: 'image', type: 'string', source: {http:'query' }},
					{ arg: 'points', type: 'number', source: {http:'query' }},
					{ arg: 'status', type: 'number', source: {http:'query' }},
					{ arg: 'created_by', type: 'number', source: {http:'query' }},
					{ arg: 'created_date', type: 'number', source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'rc_id', type: 'number', source: {http:'query' }}
					
				],
		returns: { arg: 'result', type: 'object' }
	})
	
	Reward.getRewardsDashboard = function(id,name,description,image,points,status,created_by,created_date,limit,page,rc_id,cb){
		var dataArr = [];
		var sqlQuery = "select rc.rew_category_name, rm.* from reward_master rm left join reward_category rc on rm.reward_cat_id = rc.rew_category_id  where 1=1 ";
		
		if(typeof(rc_id)!="undefined" && rc_id!=""){
			id = rc_id;
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		if(name){
			sqlQuery+=" AND rm.name = (?) ";
			dataArr.push(name);
		}
		if(id){
			sqlQuery+=" AND rm.id = (?) ";
			dataArr.push(id);
		}
		if(description){
			sqlQuery+=" AND rm.description = (?) ";
			dataArr.push(description);
		}
		if(status){
			sqlQuery+=" AND rm.status = (?) ";
			dataArr.push(status);
		}
		if(created_by){
			sqlQuery+=" AND rm.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(limit){
			sqlQuery+=" ORDER BY rm.id DESC OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}

		Reward.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObject)=>{
			var dataLength = resultObject.length;
			var key = 0;
			if((resultObject) && (resultObject.length > 0)){
				async.each(resultObject, function(json, callback) {
					var selectAppQuery = "select * from [reward_promos] where status = 1 and reward_id = "+json.id;
					Reward.app.dbConnection.execute(selectAppQuery,null,(err,rewardPromo)=>{
						json.promo = rewardPromo;
						callback();
					});
				},
				err=>{
					cb(err,resultObject);
				});
			}else{
				cb(err,resultObject);
			}
		});
	}

	Reward.remoteMethod('getRewardsDashboard',{
		http:{ path: '/getRewardsDashboard', verb: 'get' },
		accepts:[
					{ arg: 'id', type: 'number', source: {http:'query' }},
					{ arg: 'name', type: 'string', source: {http:'query' }},
					{ arg: 'description', type: 'string', source: {http:'query' }},
					{ arg: 'image', type: 'string', source: {http:'query' }},
					{ arg: 'points', type: 'number', source: {http:'query' }},
					{ arg: 'status', type: 'number', source: {http:'query' }},
					{ arg: 'created_by', type: 'number', source: {http:'query' }},
					{ arg: 'created_date', type: 'number', source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'rc_id', type: 'number', source: {http:'query' }}
					
				],
		returns: { arg: 'result', type: 'object' }
	})	

	// to add/edit district
	Reward.addEditReward = function(dataArrObj,reward_id,cb){
		
		if(reward_id){
			Reward.findOne({ where:{id:reward_id}}, function(err,rewardData){
				if(rewardData){
					
					var updated_date = Math.floor(Date.now()); // to get server created date
					dataArrObj.updated_date = updated_date;
					dataArrObj.created_date = rewardData.created_date;
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
							
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where id = (?)';
					dataArr.push(reward_id);
					var sqlQuery = "update [reward_master] set "+paramsKey+" "+whereCond;
				    console.log("Update Query",sqlQuery);
					Reward.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = reward_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid Reward id",null);
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
			var sqlQuery = "insert into [reward_master] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

			Reward.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].id;
					result.updated_date = created_date;
				}
				cb(err,result);
			});
		}
	}
	
	Reward.remoteMethod('addEditReward',{
		http:{ path:'/addEditReward', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'reward_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	Reward.afterRemote('addEditReward',function(context, repsData,next){
	   var outgoingObj = {};	
	   
	   var response_id = repsData['result']['id'];
	   var dataObj = context.args.dataArrObj;
	   
	   dataObj.reward_id = response_id;
	   dataObj.image = 'https://hpb-id.hssanet.com/api/container/reward/download/'+dataObj.image;
       var selectCategoryQuery = "select rew_category_name from [reward_category] where rew_category_id = "+dataObj.reward_cat_id;
	   Reward.app.dbConnection.execute(selectCategoryQuery,null,(err,rewardCatName)=>{

						dataObj.category = rewardCatName[0].rew_category_name; 
						delete dataObj.reward_cat_id;
						delete dataObj.created_by;
						Reward.app.byz_reward_master_data(dataObj);
		
		});

	


    next();
	});

};