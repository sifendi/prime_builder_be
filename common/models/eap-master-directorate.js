'use strict';

module.exports = function(Eapmasterdirectorate) {
	
	// to get Directorate
	Eapmasterdirectorate.geteapdirectorate = function(dataArrObj,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var sqlQuery = "select * from eap_master_directorate where 1=1";
		//var sqlQuery = "select emsm.*, el.lead_name from eap_master_directorate emsm join eap_lead el on emsm.invoice_lead_id = el.lead_id where 1=1 ";
		
		for(var o in dataArrObj) {
			if(o == "created_date"){
				sqlQuery+=" AND "+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND "+o+" < (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "directorate_name"){
				sqlQuery+=" AND "+o+" like (?)";
				leadArr.push("%"+dataArrObj[o]+"%");
			}
			else if(o != "limit" && o != "page"){
				sqlQuery+=" AND "+o+" = (?)";
				leadArr.push(dataArrObj[o]);
			}else{
				if(o=='limit'){
					if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
					var offset = dataArrObj['page']*dataArrObj['limit'];
					
					sqlQuery+="  ORDER BY directorate_id DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
					leadArr.push(offset,dataArrObj['limit']);
				}
			}		
		}
		Eapmasterdirectorate.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	
	}
	
	Eapmasterdirectorate.remoteMethod('geteapdirectorate',{
		http:{ path:'/geteapdirectorate', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	// to get Directorate Count
	Eapmasterdirectorate.geteapdirectorateCount = function(dataArrObj,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var sqlQuery = "select count(directorate_id) as total from eap_master_directorate where 1=1";
		
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
			}	
		}
		Eapmasterdirectorate.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	
	}
	
	Eapmasterdirectorate.remoteMethod('geteapdirectorateCount',{
		http:{ path:'/geteapdirectorateCount', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});


	// to add/edit Eapmasterdirectorate
	Eapmasterdirectorate.addEditEapdirectorate = function(dataArrObj,Eapsocialmedia_id,cb){
		var UserModel = Eapmasterdirectorate.app.models.user;
		if(Eapsocialmedia_id){
			Eapmasterdirectorate.geteapdirectorate({directorate_id:Eapsocialmedia_id}, function(err,EapmasterdirectorateData){
				if(EapmasterdirectorateData){
					var updated_date = Math.floor(Date.now()); // to get server created date
					dataArrObj.updated_date = updated_date;
					
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where directorate_id = (?)';
					dataArr.push(Eapsocialmedia_id);
					var sqlQuery = "update [eap_master_directorate] set "+paramsKey+" "+whereCond;
				
					Eapmasterdirectorate.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = Eapsocialmedia_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid Eapmasterdirectorate id",null);
				}
			});
		}
		else{
			var created_date = Math.floor(Date.now()); // to get server created date
			dataArrObj.created_date = created_date;
			dataArrObj.updated_date = created_date;
			
			var approvalArr = [];
			var paramsArr = [];
			var name = dataArrObj['directorate_name'];
			for(var o in dataArrObj) {
				approvalArr.push(dataArrObj[o]);
				paramsArr.push("(?)");
			}
			var paramsKey = paramsArr.join(', ');
			var keyString = Object.keys(dataArrObj).join(', ');
			
			var checkIfPresent = "select * from eap_master_directorate where directorate_name = (?)";
			Eapmasterdirectorate.app.dbConnection.execute(checkIfPresent,[name],(err,resultObj)=>{
				if(resultObj && resultObj.length > 0){
					cb(err,"Exist");
				}else{
					var sqlQuery = "insert into [eap_master_directorate] ("+keyString+") OUTPUT Inserted.directorate_id values ("+paramsKey+")";
					Eapmasterdirectorate.app.dbConnection.execute(sqlQuery,approvalArr,(err,resultObj)=>{
						var result = {};
						if(resultObj.length > 0){
							result.id = resultObj[0].directorate_id;
							result.updated_date = created_date;
						}
						cb(err,result);
					});
					
				}
			});
		}
	}
	Eapmasterdirectorate.remoteMethod('addEditEapdirectorate',{
		http:{ path:'/addEditEapdirectorate', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'Eapsocialmedia_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});
};
