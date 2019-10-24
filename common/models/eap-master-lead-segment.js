'use strict';

module.exports = function(Eapmasterleadsegment) {
	// to add/edit lead
	Eapmasterleadsegment.geteapleadsegment = function(dataArrObj,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var sqlQuery = "select * from eap_master_lead_segment where 1=1";
		//var sqlQuery = "select emsm.*, el.lead_name from eap_master_lead_segment emsm join eap_lead el on emsm.invoice_lead_id = el.lead_id where 1=1 ";
		
		for(var o in dataArrObj) {
			if(o == "created_date"){
				sqlQuery+=" AND "+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND "+o+" < (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o != "limit" && o != "page"){
				sqlQuery+=" AND "+o+" = (?)";
				leadArr.push(dataArrObj[o]);
			}else{
				if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
				var offset = dataArrObj['page']*limit;
				
				sqlQuery+="  ORDER BY segment_id DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
				leadArr.push(dataArrObj[o],offset);
			}		
		}
		Eapmasterleadsegment.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	
	}
	
	Eapmasterleadsegment.remoteMethod('geteapleadsegment',{
		http:{ path:'/geteapleadsegment', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});


	// to add/edit Eapmasterleadsegment
	Eapmasterleadsegment.addEditEapleadsegment = function(dataArrObj,Eapsegment_id,cb){
		var UserModel = Eapmasterleadsegment.app.models.user;
		// search the user
		//UserModel.findOne({where:{id:1}}, function(err, user) {
			//if(!user){
				if(Eapsegment_id){
					Eapmasterleadsegment.geteapleadsegment({segment_id:Eapsegment_id}, function(err,EapmasterleadsegmentData){
						if(EapmasterleadsegmentData){
							var updated_date = Math.floor(Date.now()); // to get server created date
							dataArrObj.updated_date = updated_date;
							
							var dataArr = [];
							var paramsArr = [];
							
							for(var o in dataArrObj) {
								dataArr.push(dataArrObj[o]);
								paramsArr.push(o+"=(?)");
							}
							
							let paramsKey= paramsArr.join(', ');
							var whereCond = 'where segment_id = (?)';
							dataArr.push(Eapsegment_id);
							var sqlQuery = "update [eap_master_lead_segment] set "+paramsKey+" "+whereCond;
						
							Eapmasterleadsegment.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
								var result = {};
								result.id = Eapsegment_id;
								result.updated_date = dataArrObj.updated_date;
								cb(err,result);
							});
						}
						else{
							cb("Invalid Eapmasterleadsegment id",null);
						}
					});
				}
				else{
					var created_date = Math.floor(Date.now()); // to get server created date
					dataArrObj.created_date = created_date;
					dataArrObj.updated_date = created_date;
					
					var approvalArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						approvalArr.push(dataArrObj[o]);
						paramsArr.push("(?)");
					}
					var paramsKey = paramsArr.join(', ');
					var keyString = Object.keys(dataArrObj).join(', ');
					
					
					var sqlQuery = "insert into [eap_master_lead_segment] ("+keyString+") OUTPUT Inserted.segment_id values ("+paramsKey+")";

					Eapmasterleadsegment.app.dbConnection.execute(sqlQuery,approvalArr,(err,resultObj)=>{
						var result = {};
						if(resultObj.length > 0){
							result.id = resultObj[0].segment_id;
							result.updated_date = created_date;
						}
						cb(err,result);
					});
				}
		// 	}else{
		// 		cb("Invalid User id",null);
		// 	}
		// });
	}
	Eapmasterleadsegment.remoteMethod('addEditEapleadsegment',{
		http:{ path:'/addEditEapleadsegment', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'Eapsegment_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});
};
