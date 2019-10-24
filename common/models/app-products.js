'use strict';

module.exports = function(Products) {
	Products.getProductslist = function(name,is_cement,type,limit,page,prod_id,cb){
		var selectQuery = "select * from products_tbl where 1=1 ";
		var dataArr = [];
		
		if(name){
			selectQuery+=" AND name like (?) ";
			name = "%"+name+"%";
			dataArr.push(name);
		}
		if(is_cement){
			selectQuery+=" AND is_cement = (?) ";
			dataArr.push(is_cement);
		}
		if(type){
			selectQuery+=" AND type = (?) ";
			dataArr.push(type);
		}
		if(prod_id){
			selectQuery+=" AND id = (?) ";
			dataArr.push(prod_id);
		}
		selectQuery+=" order by id DESC ";
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Products.app.dbConnection.execute(selectQuery,dataArr,(err,resultObject)=>{
			cb(null,resultObject);
		});
	}
	
	Products.remoteMethod('getProductslist',{
		http:{ path: '/getProductslist', verb: 'get'},
		accepts:[
					{ arg: 'name', type: 'string', source: {http:'query' }},
					{ arg: 'is_cement', type: 'string', source: {http:'query' }},
					{ arg: 'type', type: 'string', source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'prod_id', type: 'number', source: {http:'query' }}
		],
		returns:{ arg: 'result', type: 'object'}
	});
	
	Products.getProductslistCount = function(name,is_cement,type,limit,page,prod_id,cb){
		var selectQuery = "select count(id) as total from products_tbl where 1=1 ";
		var dataArr = [];
		
		if(name){
			selectQuery+=" AND name like (?) ";
			name = "%"+name+"%";
			dataArr.push(name);
		}
		if(is_cement){
			selectQuery+=" AND is_cement = (?) ";
			dataArr.push(is_cement);
		}
		if(type){
			selectQuery+=" AND type = (?) ";
			dataArr.push(type);
		}
		if(prod_id){
			selectQuery+=" AND id = (?) ";
			dataArr.push(prod_id);
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Products.app.dbConnection.execute(selectQuery,dataArr,(err,resultObject)=>{
			cb(null,resultObject);
		});
	}
	
	Products.remoteMethod('getProductslistCount',{
		http:{ path: '/getProductslistCount', verb: 'get'},
		accepts:[
					{ arg: 'name', type: 'string', source: {http:'query' }},
					{ arg: 'is_cement', type: 'string', source: {http:'query' }},
					{ arg: 'type', type: 'string', source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'prod_id', type: 'number', source: {http:'query' }}
		],
		returns:{ arg: 'result', type: 'object'}
	});

	// to add/edit product
	Products.addEditProduct = function(dataArrObj,product_id,cb){
		
		if(product_id){
			Products.findOne({ where:{id:product_id}}, function(err,productData){
				if(productData){
					
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
					dataArr.push(product_id);
					var sqlQuery = "update [products_tbl] set "+paramsKey+" "+whereCond;
				
					Products.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = product_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid product id",null);
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
			var sqlQuery = "insert into [products_tbl] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

			Products.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
				var result = {};
				if(resultObj.length > 0){
					result.id = resultObj[0].id;
					result.updated_date = created_date;
				}
				cb(err,result);
			});
		}
	}
	
	Products.remoteMethod('addEditProduct',{
		http:{ path:'/addEditProduct', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'product_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});
};