'use strict';

module.exports = function(Eapmasterdepartment) {
	// to add/edit lead
	Eapmasterdepartment.geteapdepartment = function(dataArrObj,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var sqlQuery = "select dept.*,drctv.directorate_name from eap_master_department dept join eap_master_directorate drctv on dept.department_directorate_id=drctv.directorate_id  where 1=1";
		
		for(var o in dataArrObj) {
			if(o == "created_date"){
				sqlQuery+=" AND dept."+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND dept."+o+" < (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "department_name"){
				sqlQuery+=" AND "+o+" like (?)";
				leadArr.push("%"+dataArrObj[o]+"%");
			}
			else if(o != "limit" && o != "page"){
				sqlQuery+=" AND dept."+o+" = (?)";
				leadArr.push(dataArrObj[o]);
			}else{
				if(o=='limit'){
					if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
					var offset = dataArrObj['page']*dataArrObj['limit'];
					
					sqlQuery+="  ORDER BY dept.department_id DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
					leadArr.push(offset,dataArrObj[o]);
				}
			}		
		}
		Eapmasterdepartment.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}
	
	Eapmasterdepartment.remoteMethod('geteapdepartment',{
		http:{ path:'/geteapdepartment', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});


	// to get Directorate Count
	Eapmasterdepartment.geteapdepartmentCount = function(dataArrObj,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var sqlQuery = "select count(dept.department_id) as total from eap_master_department dept join eap_master_directorate drctv on dept.department_directorate_id=drctv.directorate_id  where 1=1";
		
		for(var o in dataArrObj) {
			if(o == "created_date"){
				sqlQuery+=" AND dept."+o+" > (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND dept."+o+" < (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o != "limit" && o != "page"){
				sqlQuery+=" AND dept."+o+" = (?)";
				leadArr.push(dataArrObj[o]);
			}		
		}
		Eapmasterdepartment.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	
	}
	
	Eapmasterdepartment.remoteMethod('geteapdepartmentCount',{
		http:{ path:'/geteapdepartmentCount', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	
	// to add/edit Eapmasterdepartment
	Eapmasterdepartment.addEditEapdepartment = function(dataArrObj,department_id,cb){

		if(department_id){
			Eapmasterdepartment.geteapdepartment({department_id:department_id}, function(err,EapmasterdepartmentData){
				if(EapmasterdepartmentData){
					var updated_date = Math.floor(Date.now()); // to get server created date
					dataArrObj.updated_date = updated_date;
					
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where department_id = (?)';
					dataArr.push(department_id);

					var sqlQuery1 = "select count(department_id) as dept_id from eap_master_department where department_id != '"+department_id+"' AND department_name = '"+dataArrObj.department_name+"'";
					Eapmasterdepartment.app.dbConnection.execute(sqlQuery1,dataArr,(err,resultObj)=>{
						if(resultObj[0].dept_id > 0){
							cb(err,"Exist");
						}else{
							var sqlQuery = "update [eap_master_department] set "+paramsKey+" "+whereCond;
							Eapmasterdepartment.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
								var result = {};
								result.id = department_id;
								result.updated_date = dataArrObj.updated_date;
								cb(err,result);
							});
						}
					});
				}
				else{
					cb("Invalid department id",null);
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
			
			var sqlQuery1 = "select count(department_id) as dept_id from eap_master_department where department_name = '"+dataArrObj.department_name+"'";
			Eapmasterdepartment.app.dbConnection.execute(sqlQuery1,"",(err,resultObj)=>{

				if(resultObj[0].dept_id > 0){
					cb(err,"Exist");
				}else{
					var sqlQuery = "insert into [eap_master_department] ("+keyString+") OUTPUT Inserted.department_id values ("+paramsKey+")";
					Eapmasterdepartment.app.dbConnection.execute(sqlQuery,approvalArr,(err,resultObj)=>{
						var result = {};
						if(resultObj.length > 0){
							result.id = resultObj[0].department_id;
							result.updated_date = created_date;
						}
						cb(err,result);
					});
				}
			});
		}
	}
	Eapmasterdepartment.remoteMethod('addEditEapdepartment',{
		http:{ path:'/addEditEapdepartment', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'department_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});
};
