'use strict';

module.exports = function(Apprdsstock) {
	
	// to get stock
	Apprdsstock.getStock = function(visit_id,brand_id,created_date,updated_date,created_by,updated_by,limit,page,cb){
		var sqlQuery = "select rcs.*,pt.name as product_name from [retailer_current_stock_tbl] as rcs JOIN [products_tbl] as pt ON rcs.product_brand_id = pt.id where 1=1 ";
		var dataArr = [];
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		
		if(visit_id){
			sqlQuery+=" AND rds_visit_id = (?)";
			dataArr.push(visit_id);
		}
		if(brand_id){
			sqlQuery+=" AND rcs.product_brand_id = (?)";
			dataArr.push(brand_id);
		}
		if(created_by){
			sqlQuery+=" AND rcs.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(updated_by){
			sqlQuery+=" AND rcs.updated_by = (?) ";
			dataArr.push(updated_by);
		}
		if(created_date){
			sqlQuery+=" AND rcs.created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			sqlQuery+=" AND rcs.updated_date > (?) ";
			dataArr.push(updated_date);
		}
		sqlQuery+=" ORDER BY rcs.stock_id DESC ";
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Apprdsstock.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObject)=>{
			if(!err){
				cb(err,resultObject);
			}else{
				cb(err,null);
			}
		});
	}
	
	Apprdsstock.remoteMethod('getStock',{
		http:{ path: '/getStock', verb: 'get' },
		accepts:[
					{arg:'visit_id', type:'number', source:{ http: "query"}},
					{arg:'brand_id', type:'number', source:{ http: "query"}},
					{arg:'created_date', type:'number', source:{ http: "query"}},
					{arg:'updated_date', type:'number', source:{ http: "query"}},
					{arg:'created_by', type:'number', source:{ http: "query"}},
					{arg:'updated_by', type:'number', source:{ http: "query"}},
					{arg:'limit', type:'number', source:{ http: "query"}},
					{arg:'page', type:'number', source:{ http: "query"}}
				],
		returns:{ arg: 'result', type: 'object' }
	})
	
	// to add stock and link it to the visit
	Apprdsstock.addEditStock = function(dataArrObj,stock_id,cb){
		
		if(stock_id){
			Apprdsstock.findOne({ where:{stock_id:stock_id}}, function(err,stockData){
				if(stockData){
					var updated_date = Math.floor(Date.now()); // to get server created date
					dataArrObj.updated_date = updated_date;
					
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where stock_id = (?)';
					dataArr.push(stock_id);
					var sqlQuery = "update [retailer_current_stock_tbl] set "+paramsKey+" "+whereCond;
				
					Apprdsstock.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = stock_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid hpb id",null);
				}
			});
		}
		else{
			
			// check if this visit exists
			var rdsVisitModel = Apprdsstock.app.models.app_rds_visit;
			rdsVisitModel.findOne({ where:{ id:dataArrObj.visit_id }},function(err,rdsVisit){
				if(rdsVisit){
					
					// check if the brand exists
					var sqlBrand = "select * from [products_tbl] where id = (?)";
					var brandArr = [dataArrObj.product_brand_id];
					
					Apprdsstock.app.dbConnection.execute(sqlBrand,brandArr,(err,brand)=>{
						
						if((typeof(brand)!="undefined") && (brand.length>0)){
							
							var created_date = Math.floor(Date.now()); // to get server created date
							var updated_date = Math.floor(Date.now()); // to get server created date
							
							dataArrObj.created_date = created_date;
							dataArrObj.updated_date = updated_date;
							
							var rdsArr = [];
							var paramsArr = [];
							
							for(var o in dataArrObj) {
								rdsArr.push(dataArrObj[o]);
								paramsArr.push("(?)");
							}
							var paramsKey = paramsArr.join(', ');
							var keyString = Object.keys(dataArrObj).join(', ');
							
							// add the user as hpb
							var sqlQuery = "insert into [retailer_current_stock_tbl] ("+keyString+") OUTPUT Inserted.stock_id values ("+paramsKey+")";

							Apprdsstock.app.dbConnection.execute(sqlQuery,rdsArr,(err,resultObj)=>{
								var result = {};
								if(resultObj.length > 0){
									result.id = resultObj[0].stock_id;
									result.updated_date = created_date;
								}
								cb(err,result);
							});
						}else{
							cb("Brand does not exist",null);
						}
					});
				}else{
					cb("Visit does not exist",null);
				}
			});
		}
		
	}
	
	Apprdsstock.remoteMethod('addEditStock',{
		http:{ path: '/addEditStock', verb: 'post' },
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'stock_id', type:'number', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	})
};
