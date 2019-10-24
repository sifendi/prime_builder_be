'use strict';
var async = require('async');

module.exports = function(Rewardpromos) {
	
	Rewardpromos.addEditPromos = function(jsonData,reward_id, created_by, cb){
		
		var data = [];
		var created_date = Math.floor(Date.now()); // to get server created date
		async.each(jsonData, function(json, callback) {
			
			if(json.promPts!=""){
				if(typeof(json.id)!="undefined" && json.id!=""){
					var updateQuery = "update [reward_promos] set promo_points = (?), start_date =(?), end_date = (?), status = (?), updated_date = (?), updated_by = (?) where id = (?)";
					var updateArr = [json.promPts, json.promFrm, json.promTo, json.status, created_date, created_by, json.id ];
					Rewardpromos.app.dbConnection.execute(updateQuery,updateArr,(err,target)=>{
						var result = { "status":"updated", "id": json.id };
						data.push(result);
						callback();
					});
				}else{
					var insertQuery = "insert into [reward_promos] (reward_id,promo_points,start_date,end_date,status,created_date,created_by,updated_date,updated_by) OUTPUT Inserted.id values ( (?),(?),(?),(?),(?),(?),(?),(?),(?))";
					var insertArr = [ reward_id, json.promPts, json.promFrm, json.promTo, json.status, created_date, created_by, created_date, created_by ];
					Rewardpromos.app.dbConnection.execute(insertQuery,insertArr,(err,target)=>{
						var result = {  "status":"inserted", "id": target.id };
						data.push(result);
						callback();
					});
				}
			}
			else{
				callback();
			}
			
		},
		(err)=>{
			cb(null,data);
		});
		
	};
	
	Rewardpromos.remoteMethod('addEditPromos',{
		http:{ path:'/addEditPromos', verb:'post' },
		accepts:[
					{ arg:"jsonData", type:"array" },
					{ arg:"reward_id", type:"number" },
					{ arg:"created_by", type:"number" }
				],
		returns:{ arg:"result", type:"object" }
	});
};