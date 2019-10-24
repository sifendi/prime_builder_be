'use strict';

module.exports = function(Eaprefercustomer) {
	
	// to add/edit lead
	Eaprefercustomer.addEditReference = function(dataArrObj,refer_id,cb){
		
		if(refer_id){
			Eaprefercustomer.findOne({ where:{refer_id:refer_id}}, function(err,referData){
				if(referData){
					
					var leadApi = Eaprefercustomer.app.models.eap_lead;
					leadApi.findOne({ where:{lead_id:dataArrObj.refer_via}}, function(err,leadData){
						if(leadData!=null){
							var updated_date = Math.floor(Date.now()); // to get server created date
							dataArrObj.updated_date = updated_date;
							
							var dataArr = [];
							var paramsArr = [];
							
							for(var o in dataArrObj) {
								dataArr.push(dataArrObj[o]);
								paramsArr.push(o+"=(?)");
							}
							
							let paramsKey= paramsArr.join(', ');
							var whereCond = 'where refer_id = (?)';
							dataArr.push(refer_id);
							var sqlQuery = "update [eap_refer_customer] set "+paramsKey+" "+whereCond;
						
							Eaprefercustomer.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
								var result = {};
								result.id = refer_id;
								result.updated_date = dataArrObj.updated_date;
								cb(err,result);
							});
						}
						else{
							cb(null,"Invalid Lead");
						}
					});
				}
				else{
					cb("Invalid Refer Id",null);
				}
			});
		}
		else{
			
			var selectIfMobile = "select * from [eap_refer_customer] where refer_mobile = (?) ";
			Eaprefercustomer.app.dbConnection.execute(selectIfMobile,[dataArrObj.refer_mobile],(err,data)=>{
				if(data == ""){
					var leadApi = Eaprefercustomer.app.models.eap_lead;
					leadApi.findOne({ where:{lead_id:dataArrObj.refer_via}}, function(err,leadData){
						if(leadData!=null){
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
							var sqlQuery = "insert into [eap_refer_customer] ("+keyString+") OUTPUT Inserted.refer_id values ("+paramsKey+")";

							Eaprefercustomer.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
								var result = {};
								if(resultObj.length > 0){
									result.id = resultObj[0].refer_id;
									result.updated_date = created_date;
								}
								cb(err,result);
							});
						}
						else{
							cb(null,"Invalid Lead");
						}
					});
				}
				else{
					var result = {};
					if(data.length > 0){
						result.id = data[0].refer_id;
						result.updated_date = data[0].created_date;
					}
					cb(null,result);
				}
			});
		}
	}
	
	Eaprefercustomer.remoteMethod('addEditReference',{
		http:{ path:'/addEditReference', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'refer_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	
	// to add/edit lead
	Eaprefercustomer.getReference = function(dataArrObj,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var sqlQuery = "select el1.lead_id as convertedId, el1.lead_name as convertedName, ec.*, el.lead_name, u1.realm from eap_refer_customer ec join eap_lead el on ec.refer_via = el.lead_id join [User] u1 on el.created_by = u1.id left join eap_lead el1 on el1.lead_refer_id = ec.refer_id where 1=1 ";
		
		for(var o in dataArrObj) {
			
			if(o == "created_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" > (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			else if(o == "converted_to_lead"){
				if(dataArrObj[o]=='0'){
					sqlQuery+=" AND el1.lead_id is null";
				}else if(dataArrObj[o]=='1'){
					sqlQuery+=" AND el1.lead_id > 0";
				}
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND ec."+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o =="refer_name"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o =="refer_mobile"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o =="reqDateFrom"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec.created_date >= (?)"
					leadArr.push(dataArrObj['reqDateFrom']);
				}
			}
			else if(o =="reqDateTo"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec.created_date <= (?)"
					leadArr.push(dataArrObj['reqDateTo']);
				}
			}
			else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}else if(o == "page"){
				if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
				var offset = dataArrObj['page']*dataArrObj['limit'];

				sqlQuery+=" ORDER BY ec.refer_id DESC OFFSET (?)";
				leadArr.push(offset);
			}else{
				sqlQuery+=" ROWS FETCH NEXT (?) ROWS ONLY";
				leadArr.push(dataArrObj['limit']);
			}
		}
		Eaprefercustomer.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	
	}
	
	Eaprefercustomer.remoteMethod('getReference',{
		http:{ path:'/getReference', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});



	// to add/edit lead
	Eaprefercustomer.getReferenceCount = function(dataArrObj,cb){
		var leadArr = [];
		var paramsArr = [];
		var sqlQuery = "select count(ec.refer_id) as total from eap_refer_customer ec join eap_lead el on ec.refer_via = el.lead_id join [User] u1 on el.created_by = u1.id left join eap_lead el1 on el1.lead_refer_id = ec.refer_id where 1=1 ";
		for(var o in dataArrObj) {
			if(o == "created_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" > (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			else if(o == "converted_to_lead"){
				if(dataArrObj[o]=='0'){
					sqlQuery+=" AND el1.lead_id is null";
				}else if(dataArrObj[o]=='1'){
					sqlQuery+=" AND el1.lead_id > 0";
				}
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND ec."+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o =="refer_name"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o =="refer_mobile"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" Like (?)";
					leadArr.push('%'+dataArrObj[o]+'%');
				}
			}
			else if(o =="reqDateFrom"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec.created_date >= (?)"
					leadArr.push(dataArrObj['reqDateFrom']);
				}
			}
			else if(o =="reqDateTo"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec.created_date <= (?)"
					leadArr.push(dataArrObj['reqDateTo']);
				}
			}
			else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
		}
		Eaprefercustomer.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}
	
	Eaprefercustomer.remoteMethod('getReferenceCount',{
		http:{ path:'/getReferenceCount', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});
};