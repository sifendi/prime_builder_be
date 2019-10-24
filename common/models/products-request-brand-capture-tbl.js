'use strict';

module.exports = function(Productsrequestbrandcapturetbl) {
	// to add stock and link it to the visit
	Productsrequestbrandcapturetbl.addEditBrandCapture = function(dataArrObj,capture_id,cb){
		
		if(capture_id){
			Productsrequestbrandcapturetbl.findOne({ where:{id:scapture_id}}, function(err,captureData){
				if(captureData){
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
					dataArr.push(capture_id);
					var sqlQuery = "update [products_request_brand_capture_tbl] set "+paramsKey+" "+whereCond;
				
					Productsrequestbrandcapturetbl.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = capture_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid capture id",null);
				}
			});
		}
		else{
			
			// check if this visit exists
			var reqModel = Productsrequestbrandcapturetbl.app.models.app_product_request;
			reqModel.findOne({ where:{ id:dataArrObj.request_id }},function(err,reqData){
				if(reqData){
					
					// check if the brand exists
					var sqlBrand = "select * from [products_tbl] where id = (?)";
					var brandArr = [dataArrObj.brand_id];
					
					Productsrequestbrandcapturetbl.app.dbConnection.execute(sqlBrand,brandArr,(err,brand)=>{
						
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
							var sqlQuery = "insert into [products_request_brand_capture_tbl] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";

							Productsrequestbrandcapturetbl.app.dbConnection.execute(sqlQuery,rdsArr,(err,resultObj)=>{
								
								if(err){
									cb("",'error occured');
								}else{
									var result = {};
									if(resultObj.length > 0){
										result.id = resultObj[0].id;
										result.updated_date = created_date;
									}
									cb(err,result);
								}
							});
						}else{
							cb("Brand does not exist",null);
						}
					});
				}else{
					cb("Request does not exist",null);
				}
			});
		}
		
	}
	
	Productsrequestbrandcapturetbl.remoteMethod('addEditBrandCapture',{
		http:{ path: '/addEditBrandCapture', verb: 'post' },
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'capture_id', type:'number', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	})

	// filter visits
	Productsrequestbrandcapturetbl.getBrandCapture = function(request_id,capture_id,brand_id,created_date,created_by,updated_date,updated_by,limit,page,cb){
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		var sqlQuery = "select p.name as product_name, prb.* from products_request_tbl pr, products_request_brand_capture_tbl prb, products_tbl p where pr.id = prb.request_id and prb.brand_id = p.id ";
		
		var dataArr = [];
		
		if(request_id){
			sqlQuery+=" AND prb.request_id = (?)";
			dataArr.push(request_id);
		}
		if(capture_id){
			sqlQuery+=" AND prb.id = (?)";
			dataArr.push(capture_id);
		}
		if(brand_id){
			sqlQuery+=" AND prb.brand_id = (?)";
			dataArr.push(brand_id);
		}
		if(created_date){
			sqlQuery+=" AND prb.created_date > (?)";
			dataArr.push(created_date);
		}
		if(created_by){
			sqlQuery+=" AND prb.created_by = (?)";
			dataArr.push(created_by);
		}
		if(updated_date){
			sqlQuery+=" AND prb.updated_date > (?)";
			dataArr.push(updated_date);
		}
		if(updated_by){
			sqlQuery+=" AND prb.updated_by = (?)";
			dataArr.push(updated_by);
		}
		sqlQuery+=" ORDER BY prb.id DESC ";
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Productsrequestbrandcapturetbl.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	}
	
	Productsrequestbrandcapturetbl.remoteMethod('getBrandCapture',{
		http:{ path: '/getBrandCapture', verb: 'get' },
		accepts: [
					{ arg: 'request_id', type: 'number', source:{http:'query'}},
					{ arg: 'capture_id', type: 'number', source:{http:'query'}},
					{ arg: 'brand_id', type: 'number', source:{http:'query'}},
					{ arg: 'created_date', type: 'number', source:{http:'query'}},
					{ arg: 'created_by', type: 'number', source:{http:'query'}},
					{ arg: 'updated_date', type: 'number', source:{http:'query'}},
					{ arg: 'updated_by', type: 'number', source:{http:'query'}},
					{ arg:'limit', type: 'number', source:{http:'query'}},
					{ arg:'page', type: 'number', source:{http:'query'}}
				],
		returns:{ arg: 'result', type: 'object' }
	});
};