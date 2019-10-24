'use strict';

module.exports = function(Rdsvisit) {

	// add retailer distributor visit
	Rdsvisit.addEditRdsVisit = function(dataArrObj,rds_visit_id,cb){
		var error = false;
		
		var created_date = Math.floor(Date.now()); // to get server created date
		var updated_date = Math.floor(Date.now()); // to get server created date
		
		if(rds_visit_id){
			Rdsvisit.findOne({ where:{ rds_visit_id:rds_visit_id, rds_id:dataArrObj.rds_id }}, function(err,rd){
				if(rd){
					
					dataArrObj.updated_date = updated_date;
					
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where rds_visit_id = (?)';
					dataArr.push(rds_visit_id);
					var sqlQuery = "update [rds_visit] set "+paramsKey+" "+whereCond;
				
					Rdsvisit.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = rds_visit_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid rds visit id",null);
				}
			});
		}else{
			if(!dataArrObj.rds_id){
				error = true;
			}
			else if(!dataArrObj.visit_date){
				error = true;
			}
			
			if(error == false){
				// validate retailer/distributor
				var rdApp = Rdsvisit.app.models.app_rds;
				rdApp.findOne({ where:{ id:dataArrObj.rds_id}}, function(err,rd){
					
					// if found
					if(rd){
						dataArrObj.created_date = created_date;
						dataArrObj.updated_date = updated_date;
						
						var visitArr = [];
						var paramsArr = [];
						
						for(var o in dataArrObj) {
							visitArr.push(dataArrObj[o]);
							paramsArr.push("(?)");
						}
						
						var paramsKey = paramsArr.join(', ');
						var keyString = Object.keys(dataArrObj).join(', ');
						
						// add the product receipt
						var sqlQuery = "insert into [rds_visit] ("+keyString+") OUTPUT Inserted.rds_visit_id values ("+paramsKey+")";
						
						Rdsvisit.app.dbConnection.execute(sqlQuery,visitArr,(err,resultObj)=>{
							var result = {};
							if(resultObj.length > 0){
								result.id = resultObj[0].rds_visit_id;
								result.updated_date = created_date;
							}
							cb(err,result);
						});
					}else{
						cb("Invalid retailer/distributor id",null);
					}
					
				});
			}else{
				cb('Incomplete details',null);
			}
		}
		
	}
	
	Rdsvisit.remoteMethod('addEditRdsVisit',{
		http: { path: '/addEditRdsVisit', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'rds_visit_id', type:'number', http:{ source:"query"} }
				],
		returns: { arg: 'result', type: 'object'}
	});
	
	// filter visits
	Rdsvisit.getRdsVisit = function(rds_visit_id,rds_id,created_date,created_by,updated_date,updated_by,limit,page,user_id,rolename,rdsName,rdsType,visitDateFrom,visitDateTo,cb){
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		var sqlQuery = "select u.realm as sph_name, rv.*, r.rds_name as retailer, r.rds_type, CONVERT(VARCHAR(11),DATEADD(S, CONVERT(int,LEFT(rv.visit_date, 10)), '1970-01-01'),6) as visitdate  from rds_visit rv join retailer_distributor_master r on rv.rds_id = r.id join [User] u on u.id = rv.created_by where 1=1";
		var dataArr = [];
		
		if((rolename == "$tlh") && (user_id!="")){
			sqlQuery+= " and rv.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( select id from postal_code where subdistrict_id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'subdistrict_id' ) ) )";
			dataArr.push(user_id);
		}
		else if((rolename == "$ra") && (user_id!="")){
			sqlQuery+= " and rv.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
			dataArr.push(user_id);
		}
		
		if(rds_visit_id){
			sqlQuery+=" AND rv.rds_visit_id = (?)";
			dataArr.push(rds_visit_id);
		}
		if(rds_id){
			sqlQuery+=" AND rv.rds_id = (?)";
			dataArr.push(rds_id);
		}
		if(visitDateFrom){
			sqlQuery+=" AND rv.visit_date >= (?)";
			dataArr.push(visitDateFrom);
		}
		if(visitDateTo){
			sqlQuery+=" AND rv.visit_date <= (?)";
			dataArr.push(visitDateTo);
		}
		if(rdsName){
			sqlQuery+=" AND r.rds_name like (?)";
			rdsName = "%"+rdsName+"%";
			dataArr.push(rdsName);
		}
		if(rdsType){
			sqlQuery+=" AND r.rds_type = (?)";
			dataArr.push(rdsType);
		}
		if(created_date){
			sqlQuery+=" AND rv.created_date > (?)";
			dataArr.push(created_date);
		}
		if(created_by){
			sqlQuery+=" AND rv.created_by = (?)";
			dataArr.push(created_by);
		}
		if(updated_date){
			sqlQuery+=" AND rv.updated_date > (?)";
			dataArr.push(updated_date);
		}
		if(updated_by){
			sqlQuery+=" AND rv.updated_by = (?)";
			dataArr.push(updated_by);
		}
		sqlQuery+=" ORDER BY rv.rds_visit_id DESC ";
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		Rdsvisit.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}
	
	Rdsvisit.remoteMethod('getRdsVisit',{
		http:{ path: '/getRdsVisit', verb: 'get' },
		accepts: [
					{ arg: 'rds_visit_id', type: 'number', source:{http:'query'}},
					{ arg: 'rds_id', type: 'number', source:{http:'query'}},
					{ arg: 'created_date', type: 'number', source:{http:'query'}},
					{ arg: 'created_by', type: 'number', source:{http:'query'}},
					{ arg: 'updated_date', type: 'number', source:{http:'query'}},
					{ arg: 'updated_by', type: 'number', source:{http:'query'}},
					{ arg:'limit', type: 'number', source:{http:'query'}},
					{ arg:'page', type: 'number', source:{http:'query'}},
					{ arg: 'user_id', type: 'number', source: {http:'query' }},
					{ arg: 'rolename', type: 'string', source: {http:'query' }},
					{ arg: 'rdsName', type: 'string', source: {http:'query' }},
					{ arg: 'rdsType', type: 'string', source: {http:'query' }},
					{ arg: 'visitDateFrom', type: 'number', source: {http:'query' }},
					{ arg: 'visitDateTo', type: 'number', source: {http:'query' }}
				],
		returns:{ arg: 'result', type: 'object' }
	});
	
	Rdsvisit.getRdsVisitCount = function(rds_visit_id,rds_id,created_date,created_by,updated_date,updated_by,limit,page,user_id,rolename,rdsName,rdsType,visitDateFrom,visitDateTo,cb){
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		var sqlQuery = "select count(*) as total from rds_visit rv join retailer_distributor_master r on rv.rds_id = r.id join [User] u on u.id = rv.created_by where 1=1 ";
		var dataArr = [];
		
		if((rolename == "$tlh") && (user_id!="")){
			sqlQuery+= " and rv.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( select id from postal_code where subdistrict_id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'subdistrict_id' ) ) )";
			dataArr.push(user_id);
		}
		else if((rolename == "$ra") && (user_id!="")){
			sqlQuery+= " and rv.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
			dataArr.push(user_id);
		}
		
		if(rds_visit_id){
			sqlQuery+=" AND rv.rds_visit_id = (?)";
			dataArr.push(rds_visit_id);
		}
		if(visitDateFrom){
			sqlQuery+=" AND rv.visit_date >= (?)";
			dataArr.push(visitDateFrom);
		}
		if(visitDateTo){
			sqlQuery+=" AND rv.visit_date <= (?)";
			dataArr.push(visitDateTo);
		}
		if(rdsName){
			sqlQuery+=" AND r.rds_name like (?)";
			rdsName = "%"+rdsName+"%";
			dataArr.push(rdsName);
		}
		if(rdsType){
			sqlQuery+=" AND r.rds_type = (?)";
			dataArr.push(rdsType);
		}
		if(rds_id){
			sqlQuery+=" AND rv.rds_id = (?)";
			dataArr.push(rds_id);
		}
		if(created_date){
			sqlQuery+=" AND rv.created_date > (?)";
			dataArr.push(created_date);
		}
		if(created_by){
			sqlQuery+=" AND rv.created_by = (?)";
			dataArr.push(created_by);
		}
		if(updated_date){
			sqlQuery+=" AND rv.updated_date > (?)";
			dataArr.push(updated_date);
		}
		if(updated_by){
			sqlQuery+=" AND rv.updated_by = (?)";
			dataArr.push(updated_by);
		}
		
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Rdsvisit.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}
	
	Rdsvisit.remoteMethod('getRdsVisitCount',{
		http:{ path: '/getRdsVisitCount', verb: 'get' },
		accepts: [
					{ arg: 'rds_visit_id', type: 'number', source:{http:'query'}},
					{ arg: 'rds_id', type: 'number', source:{http:'query'}},
					{ arg: 'created_date', type: 'number', source:{http:'query'}},
					{ arg: 'created_by', type: 'number', source:{http:'query'}},
					{ arg: 'updated_date', type: 'number', source:{http:'query'}},
					{ arg: 'updated_by', type: 'number', source:{http:'query'}},
					{ arg:'limit', type: 'number', source:{http:'query'}},
					{ arg:'page', type: 'number', source:{http:'query'}},
					{ arg: 'user_id', type: 'number', source: {http:'query' }},
					{ arg: 'rolename', type: 'string', source: {http:'query' }},
					{ arg: 'rdsName', type: 'string', source: {http:'query' }},
					{ arg: 'rdsType', type: 'string', source: {http:'query' }},
					{ arg: 'visitDateFrom', type: 'number', source: {http:'query' }},
					{ arg: 'visitDateTo', type: 'number', source: {http:'query' }}
				],
		returns:{ arg: 'result', type: 'object' }
	});
	
	
	// filter visits
	Rdsvisit.getRdsVisitStock = function(rds_visit_id,rds_id,created_date,created_by,updated_date,updated_by,limit,page,cb){
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		var sqlQuery = "select p.*, rc.*, rv.*, r.rds_name as retailer, CONVERT(VARCHAR(11),DATEADD(S, CONVERT(int,LEFT(rv.visit_date, 10)), '1970-01-01'),6) as visitdate  from rds_visit rv, retailer_distributor_master r, retailer_current_stock_tbl rc , products_tbl p where rv.rds_id = r.id and rc.rds_visit_id = rv.rds_visit_id and p.id = rc.product_brand_id ";
		
		var dataArr = [];
		
		if(rds_visit_id){
			sqlQuery+=" AND rv.rds_visit_id = (?)";
			dataArr.push(rds_visit_id);
		}
		if(rds_id){
			sqlQuery+=" AND rds_id = (?)";
			dataArr.push(rds_id);
		}
		if(created_date){
			sqlQuery+=" AND created_date >= (?)";
			dataArr.push(created_date);
		}
		if(created_by){
			sqlQuery+=" AND created_by = (?)";
			dataArr.push(created_by);
		}
		if(updated_date){
			sqlQuery+=" AND updated_date >= (?)";
			dataArr.push(updated_date);
		}
		if(updated_by){
			sqlQuery+=" AND updated_by = (?)";
			dataArr.push(updated_by);
		}
		if(limit){
			sqlQuery+=" ORDER BY rc.stock_id OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Rdsvisit.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}
	
	Rdsvisit.remoteMethod('getRdsVisitStock',{
		http:{ path: '/getRdsVisitStock', verb: 'get' },
		accepts: [
					{ arg: 'rds_visit_id', type: 'number' },
					{ arg: 'rds_id', type: 'number' },
					{ arg: 'created_date', type: 'number' },
					{ arg: 'created_by', type: 'number' },
					{ arg: 'updated_date', type: 'number' },
					{ arg: 'updated_by', type: 'number' },
					{ arg:'limit', type: 'number', source:{http:'query'}},
					{ arg:'page', type: 'number', source:{http:'query'}}
				],
		returns:{ arg: 'result', type: 'object' }
	});
};