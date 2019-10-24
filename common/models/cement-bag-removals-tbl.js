'use strict';

module.exports = function(Cementbagremovalstbl) {
	
	Cementbagremovalstbl.addEditCementBagRemoval = function(dataArrObj,removal_id,cb){
		
		var created_date = Math.floor(Date.now()); // to get server created date
		var updated_date = Math.floor(Date.now()); // to get server created date
		
		if(removal_id){
			Cementbagremovalstbl.findOne({ where:{ id:removal_id }}, function(err,rd){
				if(rd){
					
					dataArrObj.updated_date = updated_date;
					
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where id = (?)';
					dataArr.push(removal_id);
					var sqlQuery = "update [cement_bag_removals_tbl] set "+paramsKey+" "+whereCond;
				
					Cementbagremovalstbl.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						if(err){
							cb(err,"Failed");
						}else{
							var result = {};
							result.id = removal_id;
							result.updated_date = dataArrObj.updated_date;
							cb(err,result);
						}
					});
				}
				else{
					cb("Invalid removal id",null);
				}
			});
		}
		else{
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
			var sqlQuery = "insert into [cement_bag_removals_tbl] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";
			
			Cementbagremovalstbl.app.dbConnection.execute(sqlQuery,visitArr,(err,resultObj)=>{
				if(err){
					cb(null,"Failed");
				}else{
					var result = {};
					if(resultObj.length > 0){
						result.id = resultObj[0].id;
						result.updated_date = created_date;
					}
					cb(err,result);
				}
				
			});
		}
		
	}
	
	Cementbagremovalstbl.remoteMethod('addEditCementBagRemoval',{
		http: { path: '/addEditCementBagRemoval', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'removal_id', type:'number', http:{ source:"query"} }
				],
		returns: { arg: 'result', type: 'object'}
	});
	
	Cementbagremovalstbl.getCementBagRemoval = function(removal_id,district_id,from_date,to_date,created_date,created_by,updated_date,updated_by,limit,page,rolename,user_id,cb){
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		
		var dataArr = [];
		var sqlQuery = "select ct.*, d.name as district_name from cement_bag_removals_tbl ct join district d on ct.district_id = d.id where 1=1 ";
		if(rolename == "$ra"){
			sqlQuery+=" and ct.created_by in ( select uid from user_mapping where meta_key = 'district_id' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
			dataArr.push(user_id);
		}
		
		if(removal_id){
			sqlQuery+=" AND ct.id = (?)";
			dataArr.push(removal_id);
		}
		if(district_id){
			sqlQuery+=" AND ct.district_id = (?)";
			dataArr.push(district_id);
		}
		if(from_date){
			sqlQuery+=" AND ct.from_date >= (?)";
			dataArr.push(from_date);
		}
		if(to_date){
			sqlQuery+=" AND ct.to_date <= (?)";
			dataArr.push(to_date);
		}
		if(created_date){
			sqlQuery+=" AND ct.created_date > (?)";
			dataArr.push(created_date);
		}
		if(created_by){
			sqlQuery+=" AND ct.created_by = (?)";
			dataArr.push(created_by);
		}
		if(updated_date){
			sqlQuery+=" AND ct.updated_date > (?)";
			dataArr.push(updated_date);
		}
		if(updated_by){
			sqlQuery+=" AND ct.updated_by = (?)";
			dataArr.push(updated_by);
		}
		sqlQuery+=" ORDER BY ct.id DESC ";
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Cementbagremovalstbl.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			if(err){
				cb(err,"Failed");
			}else{
				cb(err,resultObj);
			}
		})
	}
	
	Cementbagremovalstbl.remoteMethod('getCementBagRemoval',{
		http:{ path: '/getCementBagRemoval', verb: 'get' },
		accepts: [
					{ arg: 'removal_id', type: 'number', source:{http:'query'}},
					{ arg: 'district_id', type: 'number', source:{http:'query'}},
					{ arg: 'from_date', type: 'number', source:{http:'query'}},
					{ arg: 'to_date', type: 'number', source:{http:'query'}},
					{ arg: 'created_date', type: 'number', source:{http:'query'}},
					{ arg: 'created_by', type: 'number', source:{http:'query'}},
					{ arg: 'updated_date', type: 'number', source:{http:'query'}},
					{ arg: 'updated_by', type: 'number', source:{http:'query'}},
					{ arg:'limit', type: 'number', source:{http:'query'}},
					{ arg:'page', type: 'number', source:{http:'query'}},
					{ arg:"rolename", type:"string", source:{http:'query'}},
					{ arg:"user_id", type:"number", source:{http:'query'}}
					
				],
		returns:{ arg: 'result', type: 'object' }
	});
	
	Cementbagremovalstbl.getCementBagRemovalCount = function(removal_id,district_id,from_date,to_date,created_date,created_by,updated_date,updated_by,limit,page,rolename,user_id,cb){
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		
		var dataArr = [];
		var sqlQuery = "select count(*) as total from cement_bag_removals_tbl ct join district d on ct.district_id = d.id where 1=1 ";
		if(rolename == "$ra"){
			sqlQuery+=" and ct.created_by in ( select uid from user_mapping where meta_key = 'district_id' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
			dataArr.push(user_id);
		}
		
		if(removal_id){
			sqlQuery+=" AND ct.id = (?)";
			dataArr.push(removal_id);
		}
		if(district_id){
			sqlQuery+=" AND ct.district_id = (?)";
			dataArr.push(district_id);
		}
		if(from_date){
			sqlQuery+=" AND ct.from_date >= (?)";
			dataArr.push(from_date);
		}
		if(to_date){
			sqlQuery+=" AND ct.to_date <= (?)";
			dataArr.push(to_date);
		}
		if(created_date){
			sqlQuery+=" AND ct.created_date > (?)";
			dataArr.push(created_date);
		}
		if(created_by){
			sqlQuery+=" AND ct.created_by = (?)";
			dataArr.push(created_by);
		}
		if(updated_date){
			sqlQuery+=" AND ct.updated_date > (?)";
			dataArr.push(updated_date);
		}
		if(updated_by){
			sqlQuery+=" AND ct.updated_by = (?)";
			dataArr.push(updated_by);
		}
		
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Cementbagremovalstbl.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			if(err){
				cb(err,"Failed");
			}else{
				cb(err,resultObj);
			}
		})
	}
	
	Cementbagremovalstbl.remoteMethod('getCementBagRemovalCount',{
		http:{ path: '/getCementBagRemovalCount', verb: 'get' },
		accepts: [
					{ arg: 'removal_id', type: 'number', source:{http:'query'}},
					{ arg: 'district_id', type: 'number', source:{http:'query'}},
					{ arg: 'from_date', type: 'number', source:{http:'query'}},
					{ arg: 'to_date', type: 'number', source:{http:'query'}},
					{ arg: 'created_date', type: 'number', source:{http:'query'}},
					{ arg: 'created_by', type: 'number', source:{http:'query'}},
					{ arg: 'updated_date', type: 'number', source:{http:'query'}},
					{ arg: 'updated_by', type: 'number', source:{http:'query'}},
					{ arg:'limit', type: 'number', source:{http:'query'}},
					{ arg:'page', type: 'number', source:{http:'query'}},
					{ arg:"rolename", type:"string", source:{http:'query'}},
					{ arg:"user_id", type:"number", source:{http:'query'}}
					
				],
		returns:{ arg: 'result', type: 'object' }
	});
	
	
	Cementbagremovalstbl.getReceiptQuantity = function(from_date,to_date,district_id,cb){
		var dataArr = [];
		
		if(district_id!=""){
			
			var sqlQuery = "select sum(quantity) as totalQuantity from products_receipt_tbl pt LEFT JOIN products_receipt_approval_tbl pra ON pra.receipt_id = pt.receipt_id LEFT JOIN products_tbl p ON pt.product_id = p.id where pra.is_closed = 0 and pra.approval_role = 'SA' and pra.approval_status = 1 and p.is_cement = 1 and pt.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( select p.id from postal_code p, subdistrict sd, district d, municipality m	where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and  d.id = (?) ) ) ";
			dataArr.push(district_id);
			
			if(from_date){
				sqlQuery+=" AND pt.created_date >= (?)";
				dataArr.push(from_date);
			}
			if(to_date){
				sqlQuery+=" AND pt.created_date <= (?)";
				dataArr.push(to_date);
			}
			
			Cementbagremovalstbl.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
				if(err){
					cb(err,"Failed");
				}else{
					cb(err,resultObj);
				}
				
			})
		}else{
			cb(null,"Incomplete details");
		}
		
	}
	
	Cementbagremovalstbl.remoteMethod('getReceiptQuantity',{
		http:{ path: '/getReceiptQuantity', verb: 'get' },
		accepts: [
					{ arg: 'from_date', type: 'number', source:{http:'query'}},
					{ arg: 'to_date', type: 'number', source:{http:'query'}},
					{ arg: 'district_id', type: 'number', source:{http:'query'}}
				],
		returns:{ arg: 'result', type: 'object' }
	});
	
};