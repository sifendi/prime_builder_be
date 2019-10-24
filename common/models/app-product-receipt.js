'use strict';
var async = require('async');
var Promise = require("bluebird");

module.exports = function(Appproductreceipt) {
	
	// to add product receipt
	Appproductreceipt.addEditProductReceipt = function(dataArrObj,receipt_id,cb){
		
		var created_date = Math.floor(Date.now());
		var updated_date = Math.floor(Date.now());
		
		if(receipt_id){
			Appproductreceipt.findOne({ where:{ receipt_id:receipt_id }}, function(err,receiptData){
				if(receiptData){
					dataArrObj.updated_date = updated_date;
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where receipt_id = (?)';
					dataArr.push(receipt_id);
					var sqlQuery = "update [products_receipt_tbl] set "+paramsKey+" "+whereCond;
				
					Appproductreceipt.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = receipt_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid receipt id",null);
				}
			});
		}
		else{
			var checkIfReceiptExist = "select * from products_receipt_tbl where rds_id = (?) and hpb_id = (?) and product_id = (?) and project_id = (?) and quantity = (?) and unit = (?) and local_created_date = (?) and purchase_date = (?) and invoice_quantity = (?) ";
			var receiptArr = [dataArrObj.rds_id,dataArrObj.hpb_id,dataArrObj.product_id,dataArrObj.project_id,dataArrObj.quantity,dataArrObj.unit,dataArrObj.local_created_date,dataArrObj.purchase_date,dataArrObj.invoice_quantity];
			
			Appproductreceipt.app.dbConnection.execute(checkIfReceiptExist,receiptArr,(err,receiptData)=>{
				if(typeof(receiptData)!='undefined' && receiptData.length > 0){
					var result = {};
					result.id = receiptData[0].receipt_id;
					result.updated_date = receiptData[0].created_date;
					cb(err,result);
				}
				else{
					// check if project_id and hpb id  is valid
					var selectProject = "select project_id, hpb_status, prospect_switching_dt from [projects_tbl] p join hpb_info_tbl h on p.hpb_id = h.hpb_id where p.hpb_id = (?) and p.project_id = (?)";
					Appproductreceipt.app.dbConnection.execute(selectProject,[dataArrObj.hpb_id,dataArrObj.project_id],(err,projectData)=>{
						if(projectData.length > 0){
							
							// check if product is valid
							var productModel = Appproductreceipt.app.models.app_products;
							productModel.findOne({ where:{ id:dataArrObj.product_id }}, function(err,productData){
								
								if(productData){
									
									// check if rds id is valid
									var rdsModel = Appproductreceipt.app.models.app_rds;
									rdsModel.findOne({ where:{ id:dataArrObj.rds_id} }, function(err,rdsData){
										
										if(rdsData){
											dataArrObj.hpb_status = projectData[0].hpb_status;
											dataArrObj.created_date = created_date;
											dataArrObj.updated_date = created_date;
											
											var receiptArr = [];
											var paramsArr = [];
											
											for(var o in dataArrObj) {
												receiptArr.push(dataArrObj[o]);
												paramsArr.push("(?)");
											}
											
											var paramsKey = paramsArr.join(', ');
											var keyString = Object.keys(dataArrObj).join(', ');
											
											// add the product receipt
											var sqlQuery = "insert into [products_receipt_tbl] ("+keyString+") OUTPUT Inserted.receipt_id values ("+paramsKey+")";
											
											Appproductreceipt.app.dbConnection.execute(sqlQuery,receiptArr,(err,resultObj)=>{
												var result = {};
												try{
													if((projectData[0]['hpb_status'] == 'switching') && ((projectData[0]['prospect_switching_dt'] == '') || (projectData[0]['prospect_switching_dt'] == null))){
														
														// update switching date of hpb as that of receipt created date
														var updateHpb = "update hpb_info_tbl set prospect_switching_dt = (?) where hpb_id = (?)";
														Appproductreceipt.app.dbConnection.execute(updateHpb,[created_date,dataArrObj.hpb_id],(err,hpbObj)=>{
															result.id = resultObj[0].receipt_id;
															result.updated_date = created_date;
															cb(err,result);
														});
														
													}else{
														result.id = resultObj[0].receipt_id;
														result.updated_date = created_date;
														cb(err,result);
													}
												}catch(ee){
													cb(err,result);	
												}
											});
											
										}else{
											cb("Invalid rds id",null);
										}
									});
								}
								else{
									cb("Invalid product id",null);
								}
							});
						}
						else{
							cb("Invalid project id/ hpb id",null);
						}
					});
				}
			});
		}
		
	}
	
	Appproductreceipt.remoteMethod('addEditProductReceipt',{
		http:{ path: '/addEditProductReceipt', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'receipt_id', type:'number', http:{ source:"query"} }
					
				],
		returns:{ arg: 'result', type: 'object' }
	});
	
	
	// to get product receipt based on the filters starts here
	Appproductreceipt.getProductReceipt = function(receipt_id, hpb_id, project_id, product_id, rds_id, user_id, rolename, approval, created_by, created_date, updated_by, updated_date, limit,page, from_date, to_date, cb){
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		var dataArr = [];
		if(rolename == "$tlh"){
			var selectQuery =	`select '' as app, u.realm as sph_name, h.hpb_name,h.hpb_type, rm.rds_name as retailer, 
								pr.*, p.name as product, pj.project_name as project, pj.is_srku  
								from hpb_info_tbl h, products_receipt_tbl pr,  projects_tbl pj, products_tbl p, 
								retailer_distributor_master rm, [User] u  where pr.project_id = pj.project_id 
								and pr.product_id = p.id and rm.id = pr.rds_id and  h.hpb_id = pj.hpb_id and 
								u.id = pr.created_by and pr.created_by in (
									select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 
										select id from postal_code where  subdistrict_id in (
											select meta_value from user_mapping where uid = (?) and  meta_key = 'subdistrict_id'
										) 
									)
								)`;
			dataArr.push(user_id);
		}
		else if(rolename == "$ac"){
			var selectQuery = 	`select '' as app, u.realm as sph_name, h.hpb_name, h.hpb_type, rm.rds_name as retailer, 
								pr.*, p.name as product, pj.project_name as project, pj.is_srku  
								from hpb_info_tbl h, products_receipt_tbl pr,  projects_tbl pj, products_tbl p, 
								retailer_distributor_master rm, [User] u  where pr.project_id = pj.project_id 
								and pr.product_id = p.id and rm.id = pr.rds_id and  h.hpb_id = pj.hpb_id and 
								u.id = pr.created_by and pr.created_by in (
									select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 
										select p.id from postal_code p, subdistrict sd, district d, municipality m 
										where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id
										and d.id in (
											select meta_value from user_mapping where uid = (?) and 
											meta_key = 'district_id'
										) 
									)
								)`;
			dataArr.push(user_id);
		}
		else{
			var selectQuery = "select '' as app, u.realm as sph_name, h.hpb_name, h.hpb_type, rm.rds_name as retailer, pr.*, p.name as product, pj.project_name as project, pj.is_srku  from hpb_info_tbl h, products_receipt_tbl pr,  projects_tbl pj, products_tbl p, retailer_distributor_master rm, [User] u  where pr.project_id = pj.project_id and pr.product_id = p.id and rm.id = pr.rds_id and  h.hpb_id = pj.hpb_id and u.id = pr.created_by";
		}
		
		if(receipt_id){
			selectQuery+=" AND pr.receipt_id = (?)";
			dataArr.push(receipt_id);
		}
		if(hpb_id){
			selectQuery+=" AND pr.hpb_id = (?)";
			dataArr.push(hpb_id);
		}
		if(project_id){
			selectQuery+=" AND pr.project_id = (?)";
			dataArr.push(project_id);
		}
		if(product_id){
			selectQuery+=" AND pr.product_id = (?)";
			dataArr.push(product_id);
		}
		if(rds_id){
			selectQuery+=" AND pr.rds_id = (?)";
			dataArr.push(rds_id);
		}
		if(created_by){
			selectQuery+=" AND pr.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(updated_by){
			selectQuery+=" AND pr.updated_by = (?) ";
			dataArr.push(updated_by);
		}
		if(created_date){
			selectQuery+=" AND pr.created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			selectQuery+=" AND pr.updated_date > (?) ";
			dataArr.push(updated_date);
		}
		if(from_date){
			selectQuery+=" AND pr.created_date >= (?) ";
			dataArr.push(from_date);
		}
		if(to_date){
			selectQuery+=" AND pr.created_date <= (?) ";
			dataArr.push(to_date);
		}
		selectQuery+=" ORDER BY pr.receipt_id DESC ";
		if(limit){
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Appproductreceipt.app.dbConnection.execute(selectQuery,dataArr,(err,resultObject)=>{
			var dataLength = resultObject.length;
			var key = 0;
			if((resultObject) && (resultObject.length > 0)){
				async.each(resultObject, function(json, callback) {
					var selectAppQuery = "select * from [products_receipt_approval_tbl] where is_closed = 0 and receipt_id = "+json.receipt_id;
					selectAppQuery+=" order by updated_date desc ";
					Appproductreceipt.app.dbConnection.execute(selectAppQuery,null,(err,result)=>{
						if((result) && (result.length > 0)){
							json.app = {};
							var resultLength = result.length;
							for(var i=0; i<resultLength; i++){
								if(result[i]['approval_role'] == "TLH"){
									json.app.tlhapproval = result[i]['approval_status'];
								}else if(result[i]['approval_role'] == "AC"){
									json.app.acapproval = result[i]['approval_status'];
								}else if(result[i]['approval_role'] == "SA"){
									json.app.saapproval = result[i]['approval_status'];
								}
							}
							
						}
						callback();
					});
				},
				()=>{
					// to manipulate points
					if(hpb_id > 0){
						var getPreviousPoints = "select previous_points,(select sum(mpt.points) from mason_point_tbl mpt join reward_claims_tbl rct on mpt.order_id = rct.id  where rct.hpb_id=(?)) as mason_point from hpb_info_tbl where hpb_id = (?)";
						Appproductreceipt.app.dbConnection.execute(getPreviousPoints,[hpb_id,hpb_id],(err,result)=>{
							if(result){
								resultObject[0]['points'] = resultObject[0]['points'] + result[0]['previous_points'] + parseInt(result[0].mason_point?result[0].mason_point:0);
							}
							cb(null,resultObject);
						});
					}else{
						cb(null,resultObject);
					}
				});
			}else{
				cb(null,resultObject);
			}
		});
	}

	Appproductreceipt.remoteMethod('getProductReceipt',{
		http:{ path: '/getProductReceipt', verb: 'get'},
		accepts:[
					{ arg:"receipt_id", type:"number", source:{http:'query'}},
					{ arg:"hpb_id", type:"number", source:{http:'query'}},
					{ arg:"project_id", type:"number", source:{http:'query'}},
					{ arg:"product_id", type:"number", source:{http:'query'}},
					{ arg:"rds_id", type:"number", source:{http:'query'}},
					{ arg:"user_id", type:"number", source:{http:'query'}},
					{ arg:"rolename", type:"string", source:{http:'query'}},
					{ arg:"approval", type:"string", source:{http:'query'}},
					{ arg:"created_by", type:"number", source:{http:'query'}},
					{ arg:"created_date", type:"number", source:{http:'query'}},
					{ arg:"updated_by", type:"number", source:{http:'query'}},
					{ arg:"updated_date", type:"number", source:{http:'query'}},
					{ arg:"limit", type:"number", source:{http:'query'}},
					{ arg:"page", type:"number", source:{http:'query'}},
					{ arg:"from_date", type:"number", source:{http:'query'}},
					{ arg:"to_date", type:"number", source:{http:'query'}}
				],
		returns:{ arg: 'result', type: 'object'}
	});

	// to get product receipt based on the filters starts here
	Appproductreceipt.getProductReceiptWithApproval = function(receipt_id, hpb_id, project_id, product_id, rds_id, user_id, rolename, approval, approval_by, created_by, created_date, updated_by, updated_date, limit,page, from_date, to_date, project_name, cb){
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		var dataArr = [];
		
		
		// if you want the data by approval by, join the approval table or else dont, to avoid duplicates
		if((typeof(approval_by)!="undefined") && (approval_by!="")){
			if(rolename == "$tlh"){
				var selectQuery =	`select '' as app, u.realm as sph_name, h.hpb_name, h.hpb_type, rm.rds_name as retailer, 
									pr.*, p.name as product, pj.project_name as project, pj.is_srku  
									from hpb_info_tbl h, products_receipt_tbl pr,  projects_tbl pj, products_tbl p, 
									retailer_distributor_master rm, [User] u, products_receipt_approval_tbl pra  where pr.receipt_id = pra.receipt_id and pra.is_closed = 0 and pr.project_id = pj.project_id 
									and pr.product_id = p.id and rm.id = pr.rds_id and  h.hpb_id = pj.hpb_id and 
									u.id = pr.created_by and pr.created_by in (
										select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 
											select id from postal_code where  subdistrict_id in (
												select meta_value from user_mapping where uid = (?) and  meta_key = 'subdistrict_id'
											) 
										)
									)`;
				dataArr.push(user_id);
			}
			else if(rolename == "$ac"){
				var selectQuery = 	`select '' as app, u.realm as sph_name, h.hpb_name, h.hpb_type, rm.rds_name as retailer, 
									pr.*, p.name as product, pj.project_name as project, pj.is_srku  
									from hpb_info_tbl h,  projects_tbl pj, products_tbl p, 
									retailer_distributor_master rm, [User] u, products_receipt_approval_tbl pra, products_receipt_tbl pr inner join  products_receipt_approval_tbl pra2 on pr.receipt_id = pra2.receipt_id  where pra2.approval_role = 'TLH' and pra2.approval_status = 1 and pr.receipt_id = pra.receipt_id and pra2.is_closed = 0 and pra.is_closed = 0 and pr.project_id = pj.project_id  and pr.product_id = p.id and rm.id = pr.rds_id and  h.hpb_id = pj.hpb_id and 
									u.id = pr.created_by and pr.created_by in (
										select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 
											select p.id from postal_code p, subdistrict sd, district d, municipality m 
											where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id
											and d.id in (
												select meta_value from user_mapping where uid = (?) and 
												meta_key = 'district_id'
											) 
										)
									)`;
				dataArr.push(user_id);
			}
			else{
				var selectQuery = "select '' as app, u.realm as sph_name, h.hpb_name, h.hpb_type, rm.rds_name as retailer, pr.*, p.name as product, pj.project_name as project, pj.is_srku  from hpb_info_tbl h, products_receipt_tbl pr,  projects_tbl pj, products_tbl p, retailer_distributor_master rm, [User] u,products_receipt_approval_tbl pra where pr.receipt_id = pra.receipt_id and pr.project_id = pj.project_id and pr.product_id = p.id and rm.id = pr.rds_id and  h.hpb_id = pj.hpb_id and u.id = pr.created_by and pra.is_closed = 0";
			}
		}else{
			if(rolename == "$tlh"){
				var selectQuery =	`select '' as app, u.realm as sph_name, h.hpb_name, h.hpb_type, rm.rds_name as retailer, 
									pr.*, p.name as product, pj.project_name as project, pj.is_srku  
									from hpb_info_tbl h, products_receipt_tbl pr,  projects_tbl pj, products_tbl p, 
									retailer_distributor_master rm, [User] u where pr.project_id = pj.project_id 
									and pr.product_id = p.id and rm.id = pr.rds_id and  h.hpb_id = pj.hpb_id and 
									u.id = pr.created_by and pr.created_by in (
										select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 
											select id from postal_code where  subdistrict_id in (
												select meta_value from user_mapping where uid = (?) and  meta_key = 'subdistrict_id'
											) 
										)
									)`;
				dataArr.push(user_id);
			}
			else if(rolename == "$ac"){
				var selectQuery = 	`select '' as app, u.realm as sph_name, h.hpb_name, h.hpb_type, rm.rds_name as retailer, 
									pr.*, p.name as product, pj.project_name as project, pj.is_srku  
									from hpb_info_tbl h, products_receipt_tbl pr,  projects_tbl pj, products_tbl p, 
									retailer_distributor_master rm, [User] u where pr.project_id = pj.project_id 
									and pr.product_id = p.id and rm.id = pr.rds_id and  h.hpb_id = pj.hpb_id and 
									u.id = pr.created_by and pr.created_by in (
										select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 
											select p.id from postal_code p, subdistrict sd, district d, municipality m 
											where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id
											and d.id in (
												select meta_value from user_mapping where uid = (?) and 
												meta_key = 'district_id'
											) 
										)
									)`;
				dataArr.push(user_id);
			}
			else{
				var selectQuery = "select '' as app, u.realm as sph_name, h.hpb_name, h.hpb_type, rm.rds_name as retailer, pr.*, p.name as product, pj.project_name as project, pj.is_srku  from hpb_info_tbl h, products_receipt_tbl pr,  projects_tbl pj, products_tbl p, retailer_distributor_master rm, [User] u where pr.project_id = pj.project_id and pr.product_id = p.id and rm.id = pr.rds_id and  h.hpb_id = pj.hpb_id and u.id = pr.created_by";
			}
		}
		
		if((typeof(approval_by)!="undefined") && (approval_by!="")){
			approval_by = approval_by.replace("$","");
			selectQuery+=" AND pra.approval_role = (?) ";
			dataArr.push(approval_by);
		}
		
		if(approval){
			selectQuery+=" AND pra.approval_status = (?)";
			dataArr.push(approval);
		}
		
		if(receipt_id){
			selectQuery+=" AND pr.receipt_id = (?)";
			dataArr.push(receipt_id);
		}
		if(hpb_id){
			selectQuery+=" AND pr.hpb_id = (?)";
			dataArr.push(hpb_id);
		}
		if(project_id){
			selectQuery+=" AND pr.project_id = (?)";
			dataArr.push(project_id);
		}
		if(project_name){
			selectQuery+=" AND pj.project_name like (?)";
			project_name = "%"+project_name+"%";
			dataArr.push(project_name);
		}
		if(product_id){
			selectQuery+=" AND pr.product_id = (?)";
			dataArr.push(product_id);
		}
		if(rds_id){
			selectQuery+=" AND pr.rds_id = (?)";
			dataArr.push(rds_id);
		}
		if(created_by){
			selectQuery+=" AND pr.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(updated_by){
			selectQuery+=" AND pr.updated_by = (?) ";
			dataArr.push(updated_by);
		}
		if(created_date){
			selectQuery+=" AND pr.created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			selectQuery+=" AND pr.updated_date > (?) ";
			dataArr.push(updated_date);
		}
		if(from_date){
			selectQuery+=" AND pr.created_date >= (?) ";
			dataArr.push(from_date);
		}
		if(to_date){
			selectQuery+=" AND pr.created_date <= (?) ";
			dataArr.push(to_date);
		}
		selectQuery+=" ORDER BY pr.receipt_id DESC ";
		if(limit){
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Appproductreceipt.app.dbConnection.execute(selectQuery,dataArr,(err,resultObject)=>{
			if(resultObject){
				var dataLength = resultObject.length;
				var key = 0;
				
				if((resultObject) && (resultObject.length > 0)){
					async.each(resultObject, function(json, callback) {
						
						var selectAppQuery = "select * from [products_receipt_approval_tbl] where is_closed = 0 and receipt_id = "+json.receipt_id;
						
						var dataApp = [];
						selectAppQuery+="  order by updated_date desc ";
						Appproductreceipt.app.dbConnection.execute(selectAppQuery,dataApp,(err,result)=>{
							if((result) && (result.length > 0)){
								
								json.app = {};
								json.app.rejection_reason = "";
								
								var resultLength = result.length;
								for(var i=0; i<resultLength; i++){
									if(result[i]['approval_role'] == "TLH"){
										json.app.tlh = { "id": result[i]['id'], "approval_status": result[i]['approval_status'] };
										if(result[i]['approval_status'] == -1){
											json.app.rejection_reason = result[i]['rejection_reason'];
										}
									}else if(result[i]['approval_role'] == "AC"){
										json.app.ac = { "id": result[i]['id'], "approval_status": result[i]['approval_status'] };
										if(result[i]['approval_status'] == -1){
											json.app.rejection_reason = result[i]['rejection_reason'];
										}
									}else if(result[i]['approval_role'] == "SA"){
										json.app.sa = { "id": result[i]['id'], "approval_status": result[i]['approval_status'] };
										if(result[i]['approval_status'] == -1){
											json.app.rejection_reason = result[i]['rejection_reason'];
										}
									}
								}
								
							}
							callback();
						});
					},
					()=>{
						cb(null,resultObject);
					});
				}else{
					cb(null,resultObject);
				}
			}else{
				cb(null,"");
			}
		});
	}
	
	Appproductreceipt.remoteMethod('getProductReceiptWithApproval',{
		http:{ path: '/getProductReceiptWithApproval', verb: 'get'},
		accepts:[
					{ arg:"receipt_id", type:"number", source:{http:'query'}},
					{ arg:"hpb_id", type:"number", source:{http:'query'}},
					{ arg:"project_id", type:"number", source:{http:'query'}},
					{ arg:"product_id", type:"number", source:{http:'query'}},
					{ arg:"rds_id", type:"number", source:{http:'query'}},
					{ arg:"user_id", type:"number", source:{http:'query'}},
					{ arg:"rolename", type:"string", source:{http:'query'}},
					{ arg:"approval", type:"string", source:{http:'query'}},
					{ arg:"approval_by", type:"string", source:{http:'query'}},
					{ arg:"created_by", type:"number", source:{http:'query'}},
					{ arg:"created_date", type:"number", source:{http:'query'}},
					{ arg:"updated_by", type:"number", source:{http:'query'}},
					{ arg:"updated_date", type:"number", source:{http:'query'}},
					{ arg:"limit", type:"number", source:{http:'query'}},
					{ arg:"page", type:"number", source:{http:'query'}},
					{ arg:"from_date", type:"number", source:{http:'query'}},
					{ arg:"to_date", type:"number", source:{http:'query'}},
					{ arg:"project_name", type:"string", source:{http:'query'}}
				],
		returns:{ arg: 'result', type: 'object'}
	});

	// to get product receipt based on the filters starts here
	Appproductreceipt.getProductReceiptForAdmin = function(receipt_id, hpb_id, project_id, product_id, rds_id, user_id, rolename, approval, approval_by, created_by, created_date, updated_by, updated_date, limit,page, from_date, to_date,  project_name, product_name, hpb_name, sa_approval, cb){
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		var dataArr = [];
		
		var selectQuery = "select '' as app, u.realm as sph_name, u.username as sph_mobile, h.hpb_name, h.hpb_type, rm.rds_name as retailer, pr.*, p.name as product, pj.project_name as project, pj.is_srku, p.unit_value as unit_value, pt.project_type from hpb_info_tbl h join projects_tbl pj on h.hpb_id = pj.hpb_id join products_receipt_tbl pr on pr.project_id = pj.project_id join products_tbl p on pr.product_id = p.id join retailer_distributor_master rm on rm.id = pr.rds_id  join [User] u on u.id = pr.created_by left join project_type_tbl pt on pj.project_type = pt.id  ";
		
		if(((typeof(approval_by)!="undefined") && (approval_by!="")) || ((typeof(approval)!="undefined") && (approval!="")) || ((typeof(sa_approval)!="undefined") && (sa_approval!=""))){
			selectQuery+= " join products_receipt_approval_tbl pra on pra.receipt_id = pr.receipt_id and pra.is_closed = 0 ";
		}
		selectQuery+=" where 1=1 ";
		if(rolename=="$ra"){
			selectQuery+=" and pr.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
			dataArr.push(user_id);
		}
		
		if((typeof(approval_by)!="undefined") && (approval_by!="")){
			approval_by = approval_by.replace("$","");
			selectQuery+=" AND pra.approval_role = (?) ";
			dataArr.push(approval_by);
		}
		if((typeof(approval)!="undefined") && (approval!="")){
			selectQuery+=" AND pra.approval_status = (?) ";
			dataArr.push(approval);
		}
		
		if((typeof(sa_approval)!="undefined") && (sa_approval!="")){
			selectQuery+=" AND pra.approval_status = 0 and pra.approval_role = 'SA' ";
		}
		
		if(hpb_name){
			selectQuery+=" AND h.hpb_name like (?)";
			hpb_name = "%"+hpb_name+"%";
			dataArr.push(hpb_name);
		}
		if(product_name){
			selectQuery+=" AND p.name like (?)";
			product_name = "%"+product_name+"%";
			dataArr.push(product_name);
		}
		if(project_name){
			selectQuery+=" AND pj.project_name like (?)";
			project_name = "%"+project_name+"%";
			dataArr.push(project_name);
		}
		if(receipt_id){
			selectQuery+=" AND pr.receipt_id = (?)";
			dataArr.push(receipt_id);
		}
		if(hpb_id){
			selectQuery+=" AND pr.hpb_id = (?)";
			dataArr.push(hpb_id);
		}
		if(project_id){
			selectQuery+=" AND pr.project_id = (?)";
			dataArr.push(project_id);
		}
		if(product_id){
			selectQuery+=" AND pr.product_id = (?)";
			dataArr.push(product_id);
		}
		if(rds_id){
			selectQuery+=" AND pr.rds_id = (?)";
			dataArr.push(rds_id);
		}
		if(created_by){
			selectQuery+=" AND pr.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(updated_by){
			selectQuery+=" AND pr.updated_by = (?) ";
			dataArr.push(updated_by);
		}
		if(created_date){
			selectQuery+=" AND pr.created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			selectQuery+=" AND pr.updated_date > (?) ";
			dataArr.push(updated_date);
		}
		if(from_date){
			selectQuery+=" AND pr.created_date >= (?) ";
			dataArr.push(from_date);
		}
		if(to_date){
			selectQuery+=" AND pr.created_date <= (?) ";
			dataArr.push(to_date);
		}

		selectQuery+=" ORDER BY pr.receipt_id DESC ";
		if(limit){
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		//console.log(selectQuery);
		Appproductreceipt.app.dbConnection.execute(selectQuery,dataArr,(err,resultObject)=>{
			getApproval(resultObject).then((resultData)=>{
				cb(null,resultData);
			},()=>{
				cb(null,resultData);
			});
		});
	}
	
	Appproductreceipt.remoteMethod('getProductReceiptForAdmin',{
		http:{ path: '/getProductReceiptForAdmin', verb: 'get'},
		accepts:[
					{ arg:"receipt_id", type:"number", source:{http:'query'}},
					{ arg:"hpb_id", type:"number", source:{http:'query'}},
					{ arg:"project_id", type:"number", source:{http:'query'}},
					{ arg:"product_id", type:"number", source:{http:'query'}},
					{ arg:"rds_id", type:"number", source:{http:'query'}},
					{ arg:"user_id", type:"number", source:{http:'query'}},
					{ arg:"rolename", type:"string", source:{http:'query'}},
					{ arg:"approval", type:"string", source:{http:'query'}},
					{ arg:"approval_by", type:"string", source:{http:'query'}},
					{ arg:"created_by", type:"number", source:{http:'query'}},
					{ arg:"created_date", type:"number", source:{http:'query'}},
					{ arg:"updated_by", type:"number", source:{http:'query'}},
					{ arg:"updated_date", type:"number", source:{http:'query'}},
					{ arg:"limit", type:"number", source:{http:'query'}},
					{ arg:"page", type:"number", source:{http:'query'}},
					{ arg:"from_date", type:"number", source:{http:'query'}},
					{ arg:"to_date", type:"number", source:{http:'query'}},
					{ arg:"project_name", type:"string", source:{http:'query'}},
					{ arg:"product_name", type:"string", source:{http:'query'}},
					{ arg:"hpb_name", type:"string", source:{http:'query'}},
					{ arg:"sa_approval", type:"string", source:{http:'query'}}
				],
		returns:{ arg: 'result', type: 'object'}
	});

	// to get product receipt based on the filters starts here
	Appproductreceipt.getProductReceiptForAdminCount = function(receipt_id, hpb_id, project_id, product_id, rds_id, user_id, rolename, approval, approval_by, created_by, created_date, updated_by, updated_date, limit,page, from_date, to_date,  project_name, product_name, hpb_name, sa_approval, cb){
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		var dataArr = [];
		
		var selectQuery = "select count(pr.receipt_id) as total  from hpb_info_tbl h join projects_tbl pj on h.hpb_id = pj.hpb_id join products_receipt_tbl pr on pr.project_id = pj.project_id join products_tbl p on pr.product_id = p.id join retailer_distributor_master rm on rm.id = pr.rds_id  join [User] u on u.id = pr.created_by  ";
		
		if(((typeof(approval_by)!="undefined") && (approval_by!="")) || ((typeof(approval)!="undefined") && (approval!="")) || ((typeof(sa_approval)!="undefined") && (sa_approval!=""))){
			selectQuery+= " join products_receipt_approval_tbl pra on pra.receipt_id = pr.receipt_id and pra.is_closed = 0 ";
		}
		selectQuery+=" where 1=1 ";
		if(rolename=="$ra"){
			selectQuery+=" and pr.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
			dataArr.push(user_id);
		}
		
		if((typeof(approval_by)!="undefined") && (approval_by!="")){
			approval_by = approval_by.replace("$","");
			selectQuery+=" AND pra.approval_role = (?) ";
			dataArr.push(approval_by);
		}
		if((typeof(approval)!="undefined") && (approval!="")){
			selectQuery+=" AND pra.approval_status = (?) ";
			dataArr.push(approval);
		}
		
		if((typeof(sa_approval)!="undefined") && (sa_approval!="")){
			selectQuery+=" AND pra.approval_status = 0 and pra.approval_role = 'SA' ";
		}
		
		if(hpb_name){
			selectQuery+=" AND h.hpb_name like (?)";
			hpb_name = "%"+hpb_name+"%";
			dataArr.push(hpb_name);
		}
		if(product_name){
			selectQuery+=" AND p.name like (?)";
			product_name = "%"+product_name+"%";
			dataArr.push(product_name);
		}
		if(project_name){
			selectQuery+=" AND pj.project_name like (?)";
			project_name = "%"+project_name+"%";
			dataArr.push(project_name);
		}
		if(receipt_id){
			selectQuery+=" AND pr.receipt_id = (?)";
			dataArr.push(receipt_id);
		}
		if(hpb_id){
			selectQuery+=" AND pr.hpb_id = (?)";
			dataArr.push(hpb_id);
		}
		if(project_id){
			selectQuery+=" AND pr.project_id = (?)";
			dataArr.push(project_id);
		}
		if(product_id){
			selectQuery+=" AND pr.product_id = (?)";
			dataArr.push(product_id);
		}
		if(rds_id){
			selectQuery+=" AND pr.rds_id = (?)";
			dataArr.push(rds_id);
		}
		if(created_by){
			selectQuery+=" AND pr.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(updated_by){
			selectQuery+=" AND pr.updated_by = (?) ";
			dataArr.push(updated_by);
		}
		if(created_date){
			selectQuery+=" AND pr.created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			selectQuery+=" AND pr.updated_date > (?) ";
			dataArr.push(updated_date);
		}
		if(from_date){
			selectQuery+=" AND pr.created_date >= (?) ";
			dataArr.push(from_date);
		}
		if(to_date){
			selectQuery+=" AND pr.created_date <= (?) ";
			dataArr.push(to_date);
		}

		//selectQuery+=" ORDER BY pr.receipt_id DESC ";
		// if(limit){
			// selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			// dataArr.push(offset);
			// dataArr.push(limit);
		// }
		Appproductreceipt.app.dbConnection.execute(selectQuery,dataArr,(err,resultObject)=>{
			var totalData = parseInt(resultObject[0].total);
			var totalResult = [{"total":totalData}];
			cb(null,totalResult);
		});
	}
	
	Appproductreceipt.remoteMethod('getProductReceiptForAdminCount',{
		http:{ path: '/getProductReceiptForAdminCount', verb: 'get'},
		accepts:[
					{ arg:"receipt_id", type:"number", source:{http:'query'}},
					{ arg:"hpb_id", type:"number", source:{http:'query'}},
					{ arg:"project_id", type:"number", source:{http:'query'}},
					{ arg:"product_id", type:"number", source:{http:'query'}},
					{ arg:"rds_id", type:"number", source:{http:'query'}},
					{ arg:"user_id", type:"number", source:{http:'query'}},
					{ arg:"rolename", type:"string", source:{http:'query'}},
					{ arg:"approval", type:"string", source:{http:'query'}},
					{ arg:"approval_by", type:"string", source:{http:'query'}},
					{ arg:"created_by", type:"number", source:{http:'query'}},
					{ arg:"created_date", type:"number", source:{http:'query'}},
					{ arg:"updated_by", type:"number", source:{http:'query'}},
					{ arg:"updated_date", type:"number", source:{http:'query'}},
					{ arg:"limit", type:"number", source:{http:'query'}},
					{ arg:"page", type:"number", source:{http:'query'}},
					{ arg:"from_date", type:"number", source:{http:'query'}},
					{ arg:"to_date", type:"number", source:{http:'query'}},
					{ arg:"project_name", type:"string", source:{http:'query'}},
					{ arg:"product_name", type:"string", source:{http:'query'}},
					{ arg:"hpb_name", type:"string", source:{http:'query'}},
					{ arg:"sa_approval", type:"string", source:{http:'query'}}
				],
		returns:{ arg: 'result', type: 'object'}
	});

	function getApproval(resultObject){
		return new Promise((resolve,reject)=>{
			if((resultObject) && (resultObject.length > 0)){
				async.each(resultObject, function(json, callback) {
					var selectAppQuery = "select * from [products_receipt_approval_tbl] where is_closed = 0 and receipt_id = "+json.receipt_id;
					selectAppQuery+=" order by updated_date desc ";
					Appproductreceipt.app.dbConnection.execute(selectAppQuery,null,(err,result)=>{
						if((result) && (result.length > 0)){
							json.app = {};
							var resultLength = result.length;
							json.app.tlhapproval = "-";
							json.app.acapproval = "-";
							json.app.saapproval = "-";
							for(var i=0; i<resultLength; i++){
								
								if(result[i]['approval_role'] == "TLH"){
									json.app.tlhapproval = result[i]['approval_status'];
								}else if(result[i]['approval_role'] == "AC"){
									json.app.acapproval = result[i]['approval_status'];
								}else if(result[i]['approval_role'] == "SA"){
									json.app.saapproval = result[i]['approval_status'];
								}
							}
							
						}
						callback();
					});
				},
				()=>{
					resolve(resultObject);
				});
			}else{
				resolve(resultObject);
			}
		});
	}
};