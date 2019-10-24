'use strict';
var async = require('async');

module.exports = function(Appproductrequest) {

	Appproductrequest.afterRemote('addEditRequest', function(context, repsData,next) {
		var ProjectModal = Appproductrequest.app.models.app_projects;
		//console.log('context.args',context.args);
		if(!context.args['req_id']){
	
				
				var project_id = context.args['dataArrObj']['project_id'];
				var currUid = context.args['dataArrObj']['created_by'];
				var request_id = repsData['result']['id'];
				var sqlQuery=`exec relatedUserFetch ${currUid}`;
				var dataArr=[];
				var fromUserData={};
				fromUserData['uid']=currUid;
				var requestDataObj = context.args['dataArrObj'];
				requestDataObj['request_id']=request_id;
				var ntc_type="product_request_added";
				var UserModal = Appproductrequest.app.models.user;
				Appproductrequest.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObjArrs)=>{
					
					if(!err){

						ProjectModal.findOne({where: { project_id:project_id }}, function(err, projectData) {
						
								if(!err){
									  	requestDataObj['projectData']=projectData;
										var acFlag=false;
										var currDateTime =  Math.floor(Date.now());
										var projectCompletedDate = projectData['project_completion_date'];
										if(currDateTime>projectCompletedDate){
											acFlag=true;
										}

										UserModal.findOne({where: { id:currUid }}, function(err, userResData) {
											
												
											if(!err){
												var notificationArr=[];
												var NotificationCenterModal = Appproductrequest.app.models.app_notification_center;
												async.each(resultObjArrs,(resultObj,callback)=>{
													
													if(resultObj['uid']>0 && (resultObj['rolename']=='$tlh' || (acFlag && resultObj['rolename']=='$ac') )){
														
														fromUserData['name']=userResData['realm'];
														fromUserData['username']=userResData['username'];
														fromUserData['email']=userResData['email'];
														var currNotificationsObject={
														"ntc_app_name": "HPB",
														"ntc_type": ntc_type,
														"ntc_type_id": request_id,
														"ntc_type_data": JSON.stringify(requestDataObj),
														"ntc_from_user_id": currUid,
														"ntc_from_user_data":JSON.stringify(fromUserData),
														"ntc_to_user_id": resultObj['uid'],
														"ntc_to_user_data": JSON.stringify(resultObj),
														"ntc_user_read_flag": 0,
														"created_date": currDateTime,
														"updated_date": currDateTime,
														"status": 1
														};
														notificationArr.push(currNotificationsObject);
														console.log('notificationArr',notificationArr);
														
												 }
													callback();
												},(err)=>{
													
													NotificationCenterModal.create(notificationArr,(err,models)=>{
														console.log('notification created',models);
														
													});

												});

											}

									})
								}
						});

					}

				});									

		}

		next();
	});

	Appproductrequest.addEditRequest = function(dataArrObj,req_id,cb){
		if(req_id){
			Appproductrequest.findOne({ where:{id:req_id}}, function(err,requestData){
				console.log(requestData);
				if(requestData){
					
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
					dataArr.push(req_id);
					var sqlQuery = "update [products_request_tbl] set "+paramsKey+" "+whereCond;
				
					Appproductrequest.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = req_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid request id",null);
				}
			});
		}
		else{
			var created_date = Math.floor(Date.now()); // to get server created date
			dataArrObj.created_date = created_date;
			dataArrObj.updated_date = created_date;
			
			var projectArr = [];
			var paramsArr = [];
			
			for(var o in dataArrObj) {
				projectArr.push(dataArrObj[o]);
				paramsArr.push("(?)");
			}
			
			var paramsKey = paramsArr.join(', ');
			var keyString = Object.keys(dataArrObj).join(', ');
			
			// add the product receipt
			var sqlQuery = "insert into [products_request_tbl] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";
			
			Appproductrequest.app.dbConnection.execute(sqlQuery,projectArr,(err,resultObj)=>{
				var result = {};

				if(resultObj){
					if(resultObj.length > 0){
						result.id = resultObj[0].id;
						result.updated_date = created_date;
					}
				}	
				
				cb(err,result);
			});
		}
	}
	
	Appproductrequest.remoteMethod('addEditRequest',{
		http:{ path:'/addEditRequest', verb: 'post' },
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'req_id', type:'any', http:{ source:"query"} }
				],
		returns: { arg:'result', type:'object'}
	});

	Appproductrequest.getProductRequest = function(req_id,created_by,updated_by,created_date,updated_date,user_id,rolename,limit,page,hpb_id,project_id,req_date_from, req_date_to,req_status, project_name, hpb_name,cb){
		var sqlQuery = "select p.project_name as project, pr.*, h.hpb_name, u.realm from projects_tbl p join products_request_tbl pr on pr.project_id = p.project_id left join hpb_info_tbl h on pr.hpb_id = h.hpb_id join [user] u on pr.created_by = u.id where 1=1 ";
		var dataArr = [];
		
		if(rolename == "$ra"){
			sqlQuery+=" and pr.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) ) ";
			dataArr.push(user_id);
		}else if(rolename == "$tlh"){
			sqlQuery+=" and pr.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( select id from postal_code where subdistrict_id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'subdistrict_id' )  ) ) ";
			dataArr.push(user_id);
		}else if(rolename == "$ac"){
			sqlQuery+=" and pr.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( select p.id from postal_code p, subdistrict sd, district d, municipality m where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'district_id' ) ) ) ";
			dataArr.push(user_id);
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		if(req_id){
			sqlQuery+=" AND pr.id = (?) ";
			dataArr.push(req_id);
		}
		if(req_date_from){
			sqlQuery+=" AND pr.request_date > (?) ";
			dataArr.push(req_date_from);
		}
		if(req_date_to){
			sqlQuery+=" AND pr.request_date < (?) ";
			dataArr.push(req_date_to);
		}
		if(req_status){
			sqlQuery+=" AND pr.product_request_status = (?) ";
			dataArr.push(req_status);
		}
		if(hpb_id){
			sqlQuery+=" AND pr.hpb_id = (?) ";
			dataArr.push(hpb_id);
		}
		if(hpb_name){
			sqlQuery+=" AND h.hpb_name like (?) ";
			hpb_name = "%"+hpb_name+"%";
			dataArr.push(hpb_name);
		}
		if(project_id){
			sqlQuery+=" AND p.project_id = (?) ";
			dataArr.push(project_id);
		}
		if(project_name){
			sqlQuery+=" AND p.project_name like (?) ";
			project_name = "%"+project_name+"%";
			dataArr.push(project_name);
		}
		if(created_by){
			sqlQuery+=" AND pr.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(updated_by){
			sqlQuery+=" AND pr.updated_by = (?) ";
			dataArr.push(updated_by);
		}
		if(created_date){
			sqlQuery+=" AND pr.created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			sqlQuery+=" AND pr.updated_date > (?) ";
			dataArr.push(updated_date);
		}
		sqlQuery+=" ORDER BY pr.id DESC ";
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Appproductrequest.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObject)=>{
			
			async.each(resultObject, function(json, callback) {
				
				var getCapture = "select p.name as product_name, prb.* from products_request_tbl pr, products_request_brand_capture_tbl prb, products_tbl p where pr.id = prb.request_id and prb.brand_id = p.id  and prb.request_id = "+json.id;
				Appproductrequest.app.dbConnection.execute(getCapture,null,(err,result)=>{
					
					json.brand_captured = {};
					if(result && (result.length > 0)){
						json.brand_captured = result;
					}
					
					callback();
				});
				
			},
			(err)=>{
				cb(null,resultObject);
			});
			
		});
	}
	
	Appproductrequest.remoteMethod('getProductRequest',{
		http:{ path: '/getProductRequest', verb: 'get'},
		accepts:[
					{ arg: 'req_id', type: 'number', source: {http:'query' }},
					{ arg: 'created_by', type: 'number', source: {http:'query' }},
					{ arg: 'updated_by', type: 'number', source: {http:'query' }},
					{ arg: 'created_date', type: 'number', source: {http:'query' }},
					{ arg: 'updated_date', type: 'number', source: {http:'query' }},
					{ arg: 'user_id', type: 'number', source: {http:'query' }},
					{ arg: 'rolename', type: 'string', source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'hpb_id', type: 'number', source: {http:'query' }},
					{ arg: 'project_id', type: 'number', source: {http:'query' }},
					{ arg: 'req_date_from', type: 'number', source: {http:'query' }},
					{ arg: 'req_date_to', type: 'number', source: {http:'query' }},
					{ arg: 'req_status', type: 'string', source: {http:'query' }},
					{ arg: 'project_name', type: 'string', source: {http:'query' }},
					{ arg: 'hpb_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type: 'object'}
	});

	Appproductrequest.getProductRequestCount = function(req_id,created_by,updated_by,created_date,updated_date,user_id,rolename,limit,page,hpb_id,project_id,req_date_from, req_date_to,req_status,project_name, hpb_name,cb){
		var sqlQuery = "select count(*) as total from projects_tbl p join products_request_tbl pr on pr.project_id = p.project_id left join hpb_info_tbl h on pr.hpb_id = h.hpb_id where 1=1 ";
		var dataArr = [];
		
		if(rolename == "$ra"){
			sqlQuery+=" and pr.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) ) ";
			dataArr.push(user_id);
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		if(req_id){
			sqlQuery+=" AND pr.id = (?) ";
			dataArr.push(req_id);
		}
		if(hpb_id){
			sqlQuery+=" AND pr.hpb_id = (?) ";
			dataArr.push(hpb_id);
		}
		if(project_id){
			sqlQuery+=" AND pr.project_id = (?) ";
			dataArr.push(project_id);
		}
		if(req_date_from){
			sqlQuery+=" AND pr.request_date > (?) ";
			dataArr.push(req_date_from);
		}
		if(req_date_to){
			sqlQuery+=" AND pr.request_date < (?) ";
			dataArr.push(req_date_to);
		}
		if(req_status){
			sqlQuery+=" AND pr.product_request_status = (?) ";
			dataArr.push(req_status);
		}
		if(hpb_name){
			sqlQuery+=" AND h.hpb_name like (?) ";
			project_name = "%"+hpb_name+"%";
			dataArr.push(hpb_name);
		}
		if(project_name){
			sqlQuery+=" AND p.project_name like (?) ";
			project_name = "%"+project_name+"%";
			dataArr.push(project_name);
		}
		if(created_by){
			sqlQuery+=" AND pr.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(updated_by){
			sqlQuery+=" AND pr.updated_by = (?) ";
			dataArr.push(updated_by);
		}
		if(created_date){
			sqlQuery+=" AND pr.created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			sqlQuery+=" AND pr.updated_date > (?) ";
			dataArr.push(updated_date);
		}
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Appproductrequest.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObject)=>{
			
			async.each(resultObject, function(json, callback) {
				
				var getCapture = "select p.name as product_name, prb.* from products_request_tbl pr, products_request_brand_capture_tbl prb, products_tbl p where pr.id = prb.request_id and prb.brand_id = p.id  and prb.request_id = "+json.id;
				Appproductrequest.app.dbConnection.execute(getCapture,null,(err,result)=>{
					
					json.brand_captured = {};
					if(result && (result.length > 0)){
						json.brand_captured = result;
					}
					
					callback();
				});
				
			},
			(err)=>{
				cb(null,resultObject);
			});
			
		});
	}
	
	Appproductrequest.remoteMethod('getProductRequestCount',{
		http:{ path: '/getProductRequestCount', verb: 'get'},
		accepts:[
					{ arg: 'req_id', type: 'number', source: {http:'query' }},
					{ arg: 'created_by', type: 'number', source: {http:'query' }},
					{ arg: 'updated_by', type: 'number', source: {http:'query' }},
					{ arg: 'created_date', type: 'number', source: {http:'query' }},
					{ arg: 'updated_date', type: 'number', source: {http:'query' }},
					{ arg: 'user_id', type: 'number', source: {http:'query' }},
					{ arg: 'rolename', type: 'string', source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'hpb_id', type: 'number', source: {http:'query' }},
					{ arg: 'project_id', type: 'number', source: {http:'query' }},
					{ arg: 'req_date_from', type: 'number', source: {http:'query' }},
					{ arg: 'req_date_to', type: 'number', source: {http:'query' }},
					{ arg: 'req_status', type: 'string', source: {http:'query' }},
					{ arg: 'project_name', type: 'string', source: {http:'query' }},
					{ arg: 'hpb_name', type: 'string', source: {http:'query' }}
		],
		returns:{ arg: 'result', type: 'object'}
	});

};