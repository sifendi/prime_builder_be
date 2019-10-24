'use strict';
var async = require('async');

module.exports = function(Projects) {
	
	
	// to get projects according to filter applied
	Projects.getProject = function(hpb_id,project_id,project_name,project_type,project_stage,project_pincode,is_srku,created_by,updated_by,created_date,updated_date,user_id,rolename,limit,page,approval,approvalDashboard,assigned_to,cb){
		var dataArr = [];
		
		if(rolename == "$tlh"){
			var sqlQuery =	`select n.nmc_type, '' as app, h.hpb_name, u.realm as sph_name, ps.project_stage as project_stage_name, pt.project_type as project_type_name, p.* from project_stage_tbl ps, project_type_tbl pt, [User] u, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on p.non_micro_credit_type = n.id where p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by and p.assigned_to in ( 
									select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 
										select id from postal_code where 
										subdistrict_id in (
											select meta_value from user_mapping where uid = (?) and 
											meta_key = 'subdistrict_id'
										) 
									)
								)`;
			dataArr.push(user_id);
		}
		else if(rolename == "$ac"){
			var sqlQuery = 	`select n.nmc_type, '' as app, h.hpb_name, u.realm as sph_name, ps.project_stage as project_stage_name, pt.project_type as project_type_name, p.* from project_stage_tbl ps, project_type_tbl pt, [User] u, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on p.non_micro_credit_type = n.id where p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by and p.assigned_to in ( 
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
		else if(rolename == "$ra"){
			var sqlQuery = 	`select n.nmc_type, '' as app, h.hpb_name, u.realm as sph_name, ps.project_stage as project_stage_name, pt.project_type as project_type_name, p.* from project_stage_tbl ps, project_type_tbl pt, [User] u, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on p.non_micro_credit_type = n.id where p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by and p.assigned_to in ( 
								select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	
									select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr
									where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id
									and pr.region_id = r.id
									and r.id in (
										select meta_value from user_mapping where uid = (?) and 
										meta_key = 'region_id'
									) 
								)
							)`;
			dataArr.push(user_id);
		}
		else if(typeof(approvalDashboard)!="undefined" && approvalDashboard!=""){
			var sqlQuery = "select n.nmc_type, '' as app, h.hpb_name, u.realm as sph_name, ps.project_stage as project_stage_name, pt.project_type as project_type_name, p.* from project_stage_tbl ps, srku_approval_status_tbl sa, project_type_tbl pt, [User] u, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on p.non_micro_credit_type = n.id where p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by and sa.project_id = p.project_id  and sa.srku_approval_status = (?) and sa.is_closed = 0 ";
			dataArr.push(approvalDashboard);
		}
		else{
			var sqlQuery = "select n.nmc_type, '' as app, h.hpb_name, u.realm as sph_name, ps.project_stage as project_stage_name, pt.project_type as project_type_name, p.* from project_stage_tbl ps, project_type_tbl pt, [User] u, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on p.non_micro_credit_type = n.id where p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by ";
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
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
		if(hpb_id){
			sqlQuery+=" AND p.hpb_id = (?) ";
			dataArr.push(hpb_id);
		}
		if(project_type){
			sqlQuery+=" AND p.project_type = (?) ";
			dataArr.push(project_type);
		}
		if(project_stage){
			sqlQuery+=" AND p.project_stage = (?) ";
			dataArr.push(project_stage);
		}
		if(project_pincode){
			sqlQuery+=" AND p.project_pincode = (?) ";
			dataArr.push(project_pincode);
		}
		if(is_srku){
			sqlQuery+=" AND p.is_srku = (?) ";
			dataArr.push(is_srku);
		}
		if(created_by){
			sqlQuery+=" AND p.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(updated_by){
			sqlQuery+=" AND p.updated_by = (?) ";
			dataArr.push(updated_by);
		}
		if(created_date){
			sqlQuery+=" AND p.created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			sqlQuery+=" AND p.updated_date > (?) ";
			dataArr.push(updated_date);
		}

		if(assigned_to){
			sqlQuery+=" AND p.assigned_to = (?) ";
			dataArr.push(assigned_to);
		}

		sqlQuery+=" ORDER BY p.project_id DESC ";
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}

		console.log("sqlQuery",sqlQuery);
		console.log("dataArr",dataArr);

		//console.log(sqlQuery);
		Projects.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			var dataLength = resultObj.length;
			var key = 0;
			if((resultObj) && (resultObj.length > 0)){
				async.each(resultObj, function(json, callback) {
					var dataApp = [];
					var selectAppQuery = "select * from [srku_approval_status_tbl] where is_closed = 0 and project_id = "+json.project_id;
					if(approval || approvalDashboard){
						selectAppQuery+=" AND srku_approval_status = (?)";
						if(approvalDashboard){
							approval = approvalDashboard;
						}
						dataApp.push(approval);
					}

					// console.log("selectAppQuery : ",selectAppQuery);
					// console.log("approval",approval);
					
					Projects.app.dbConnection.execute(selectAppQuery,dataApp,(err,result)=>{
						
						if((result) && (result.length > 0)){
							json.app = result;
						}
						callback();
					});
				},
				(err)=>{
					cb(null,resultObj);
				});
			}else{
				cb(null,resultObj);
			}
		});
	}
	
	Projects.remoteMethod('getProject',{
		http:{ path: '/getProject', verb: 'get' },
		accepts:[
					{ arg: 'hpb_id', type: 'number', source: {http:'query' }},
					{ arg: 'project_id', type: 'number', source: {http:'query' }},
					{ arg: 'project_name', type: 'string', source: {http:'query' }},
					{ arg: 'project_type', type: 'number', source: {http:'query' }},
					{ arg: 'project_stage', type: 'number', source: {http:'query' }},
					{ arg: 'project_pincode', type: 'number', source: {http:'query' }},
					{ arg: 'is_srku', type: 'string', source: {http:'query' }},
					{ arg: 'created_by', type: 'number', source: {http:'query' }},
					{ arg: 'updated_by', type: 'number', source: {http:'query' }},
					{ arg: 'created_date', type: 'number', source: {http:'query' }},
					{ arg: 'updated_date', type: 'number', source: {http:'query' }},
					{ arg: 'user_id', type: 'number', source: {http:'query' }},
					{ arg: 'rolename', type: 'string', source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'approval', type: 'string', source: {http:'query' }},
					{ arg: 'approvalDashboard', type: 'string', source: {http:'query' }},
					{ arg: 'assigned_to', type: 'number', source: {http:'query' }},
				],
		returns: { arg: 'result', type: 'object' }
	})
	
	// to get projects according to filter applied
	Projects.getProjectCount = function(hpb_id,project_id,project_name,project_type,project_stage,project_pincode,is_srku,created_by,updated_by,created_date,updated_date,user_id,rolename,limit,page,approval,approvalDashboard,cb){
		var dataArr = [];
		
		if(rolename == "$tlh"){
			var sqlQuery =	`select p.* from project_stage_tbl ps, project_type_tbl pt, [User] u, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on p.non_micro_credit_type = n.id where p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by and p.assigned_to in ( 
									select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 
										select id from postal_code where 
										subdistrict_id in (
											select meta_value from user_mapping where uid = (?) and 
											meta_key = 'subdistrict_id'
										) 
									)
								)`;
			dataArr.push(user_id);
		}
		else if(rolename == "$ac"){
			var sqlQuery = 	`select p.* from project_stage_tbl ps, project_type_tbl pt, [User] u, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on p.non_micro_credit_type = n.id where p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by and p.assigned_to in ( 
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
		else if(rolename == "$ra"){
			var sqlQuery = 	`select p.* from project_stage_tbl ps, project_type_tbl pt, [User] u, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on p.non_micro_credit_type = n.id where p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by and p.assigned_to in ( 
								select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	
									select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr
									where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id
									and pr.region_id = r.id
									and r.id in (
										select meta_value from user_mapping where uid = (?) and 
										meta_key = 'region_id'
									) 
								)
							)`;
			dataArr.push(user_id);
		}
		else if(typeof(approvalDashboard)!="undefined" && approvalDashboard!=""){
			var sqlQuery = "select p.* from project_stage_tbl ps, srku_approval_status_tbl sa, project_type_tbl pt, [User] u, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on p.non_micro_credit_type = n.id where p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by and sa.project_id = p.project_id  and sa.srku_approval_status = (?) and sa.is_closed = 0 ";
			dataArr.push(approvalDashboard);
		}
		else{
			var sqlQuery = "select p.* from project_stage_tbl ps, project_type_tbl pt, [User] u, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on p.non_micro_credit_type = n.id where p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by ";
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
		}
		
		if(project_id){
			sqlQuery+=" AND p.project_id = (?) ";
			dataArr.push(project_id);
		}
		if(project_name){
			sqlQuery+=" AND p.project_name = (?) ";
			dataArr.push(project_name);
		}
		if(hpb_id){
			sqlQuery+=" AND p.hpb_id = (?) ";
			dataArr.push(hpb_id);
		}
		if(project_type){
			sqlQuery+=" AND p.project_type = (?) ";
			dataArr.push(project_type);
		}
		if(project_stage){
			sqlQuery+=" AND p.project_stage = (?) ";
			dataArr.push(project_stage);
		}
		if(project_pincode){
			sqlQuery+=" AND p.project_pincode = (?) ";
			dataArr.push(project_pincode);
		}
		if(is_srku){
			sqlQuery+=" AND p.is_srku = (?) ";
			dataArr.push(is_srku);
		}
		if(created_by){
			sqlQuery+=" AND p.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(updated_by){
			sqlQuery+=" AND p.updated_by = (?) ";
			dataArr.push(updated_by);
		}
		if(created_date){
			sqlQuery+=" AND p.created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			sqlQuery+=" AND p.updated_date > (?) ";
			dataArr.push(updated_date);
		}
		Projects.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			var srkuProj = 0;
			var totalProj = 0;
			var nmcProj = 0;
			
			async.each(resultObj, function(json, callback) {
				if(json.is_srku == 1){
					srkuProj++;
				}
				if(json.is_micro_credit == 1){
					nmcProj++;
				}
				totalProj++;
				callback();
			},
			(err)=>{
				var result = [{"total":totalProj,"srku":srkuProj,"nmc":nmcProj}];
				cb(null,result);
			})
			
		});
	}
	
	Projects.remoteMethod('getProjectCount',{
		http:{ path: '/getProjectCount', verb: 'get' },
		accepts:[
					{ arg: 'hpb_id', type: 'number', source: {http:'query' }},
					{ arg: 'project_id', type: 'number', source: {http:'query' }},
					{ arg: 'project_name', type: 'string', source: {http:'query' }},
					{ arg: 'project_type', type: 'number', source: {http:'query' }},
					{ arg: 'project_stage', type: 'number', source: {http:'query' }},
					{ arg: 'project_pincode', type: 'number', source: {http:'query' }},
					{ arg: 'is_srku', type: 'string', source: {http:'query' }},
					{ arg: 'created_by', type: 'number', source: {http:'query' }},
					{ arg: 'updated_by', type: 'number', source: {http:'query' }},
					{ arg: 'created_date', type: 'number', source: {http:'query' }},
					{ arg: 'updated_date', type: 'number', source: {http:'query' }},
					{ arg: 'user_id', type: 'number', source: {http:'query' }},
					{ arg: 'rolename', type: 'string', source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'approval', type: 'string', source: {http:'query' }},
					{ arg: 'approvalDashboard', type: 'string', source: {http:'query' }}
				],
		returns: { arg: 'result', type: 'object' }
	})
	
	
	// to get projects according to filter applied
	Projects.getProjectWithApp = function(hpb_id,project_id,project_name,project_type,project_stage,project_pincode,is_srku,created_by,updated_by,created_date,updated_date,user_id,rolename,limit,page,approval,sub_district_name,cb){
		var dataArr = [];
		
		if(approval){
			if(rolename == "$tlh"){
				var sqlQuery =	`select '' as app, h.hpb_name, u.realm as sph_name, ps.project_stage as project_stage_name, pt.project_type as project_type_name, p.*, st.srku_approval_id, st.srku_approval_status, st.srku_rejection_reason, n.nmc_type as non_micro_credit_type_name from project_stage_tbl ps, project_type_tbl pt, [User] u, srku_approval_status_tbl st, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on p.non_micro_credit_type = n.id  where st.project_id = p.project_id and st.is_closed = 0 and p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by and p.assigned_to in ( 
										select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 
											select id from postal_code where 
											subdistrict_id in (
												select meta_value from user_mapping where uid = (?) and 
												meta_key = 'subdistrict_id'
											) 
										)
									)`;
				dataArr.push(user_id);
			}
			else if(rolename == "$ac"){
				var sqlQuery = 	`select '' as app, h.hpb_name, u.realm as sph_name, ps.project_stage as project_stage_name, pt.project_type as project_type_name, p.*, st.srku_approval_id, st.srku_approval_status, st.srku_rejection_reason, n.nmc_type as non_micro_credit_type_name from project_stage_tbl ps, project_type_tbl pt, [User] u, srku_approval_status_tbl st, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on p.non_micro_credit_type = n.id where st.project_id = p.project_id and st.is_closed = 0 and p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by and p.assigned_to in ( 
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
				var sqlQuery = "select '' as app, h.hpb_name, u.realm as sph_name, ps.project_stage as project_stage_name, pt.project_type as project_type_name, p.*, st.srku_approval_id, st.srku_approval_status, st.srku_rejection_reason, n.nmc_type as non_micro_credit_type_name  from srku_approval_status_tbl st, project_stage_tbl ps, project_type_tbl pt, [User] u, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on n.id = p.non_micro_credit_type where st.project_id = p.project_id and p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by and st.is_closed = 0 ";
			}
		}
		else{
			if(rolename == "$tlh"){
				var sqlQuery =	`select '' as app, h.hpb_name, u.realm as sph_name, ps.project_stage as project_stage_name, pt.project_type as project_type_name, p.*, n.nmc_type as non_micro_credit_type_name from project_stage_tbl ps, project_type_tbl pt, [User] u, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on n.id = p.non_micro_credit_type where p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by and p.assigned_to in ( 
										select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 
											select id from postal_code where 
											subdistrict_id in (
												select meta_value from user_mapping where uid = (?) and 
												meta_key = 'subdistrict_id'
											) 
										)
									)`;
				dataArr.push(user_id);
			}
			else if(rolename == "$ac"){
				var sqlQuery = 	`select '' as app, h.hpb_name, u.realm as sph_name, ps.project_stage as project_stage_name, pt.project_type as project_type_name, p.*, n.nmc_type as non_micro_credit_type_name from project_stage_tbl ps, project_type_tbl pt, [User] u, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on n.id = p.non_micro_credit_type where p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by and p.assigned_to in ( 
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
				var sqlQuery = "select '' as app, h.hpb_name, u.realm as sph_name, ps.project_stage as project_stage_name, pt.project_type as project_type_name, p.*, n.nmc_type as non_micro_credit_type_name from project_stage_tbl ps, project_type_tbl pt, [User] u, [projects_tbl] p left join hpb_info_tbl h on p.hpb_id = h.hpb_id left join nmc_tbl n on n.id = p.non_micro_credit_type where p.project_stage = ps.id and p.project_type = pt.id and u.id = p.created_by";
			}
		}
		if(approval){
			sqlQuery+=" AND st.srku_approval_status = (?)";
			dataArr.push(approval);
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
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
		if(hpb_id){
			sqlQuery+=" AND p.hpb_id = (?) ";
			dataArr.push(hpb_id);
		}
		if(project_type){
			sqlQuery+=" AND p.project_type = (?) ";
			dataArr.push(project_type);
		}
		if(project_stage){
			sqlQuery+=" AND p.project_stage = (?) ";
			dataArr.push(project_stage);
		}
		if(project_pincode){
			sqlQuery+=" AND p.project_pincode = (?) ";
			dataArr.push(project_pincode);
		}
		if(is_srku || is_srku==0 || is_srku=="0"){
			sqlQuery+=" AND p.is_srku = (?) ";
			dataArr.push(is_srku);
		}
		if(sub_district_name){
			sqlQuery+=" AND p.project_sub_district = (?) ";
			dataArr.push(sub_district_name);
		}
		if(created_by){
			sqlQuery+=" AND p.created_by = (?) ";
			dataArr.push(created_by);
		}
		if(updated_by){
			sqlQuery+=" AND p.updated_by = (?) ";
			dataArr.push(updated_by);
		}
		if(created_date){
			sqlQuery+=" AND p.created_date > (?) ";
			dataArr.push(created_date);
		}
		if(updated_date){
			sqlQuery+=" AND p.updated_date > (?) ";
			dataArr.push(updated_date);
		}
		sqlQuery+=" ORDER BY p.project_id DESC ";
		if(limit){
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Projects.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
			var dataLength = resultObj.length;
			var key = 0;
			
			if((resultObj) && (resultObj.length > 0)){
				async.each(resultObj, function(json, callback) {
					
					if(json.is_srku == 1){
						
						// if approval by not passed means, u need to get approval status
						if((typeof(approval) == "undefined") || (approval=="")){
							var getStatus = "select st.* from projects_tbl p, srku_approval_status_tbl st where st.is_closed = 0 and p.project_id = st.project_id and p.project_id = (?) ";
							Projects.app.dbConnection.execute(getStatus,[json.project_id],(err,approvalData)=>{
								
								json.app = {};
								json.app.rejection_reason = approvalData[0]['srku_rejection_reason'];
								json.app.tlh = { "id": approvalData[0]['srku_approval_id'], "approval_status": approvalData[0]['srku_approval_status'] };
								callback();
							});
						}else{
							json.app = {};
							json.app.rejection_reason = json.srku_rejection_reason;
							json.app.tlh = { "id": json.srku_approval_id, "approval_status": json.srku_approval_status };
							callback();
						}
						
					}else{
						callback();
					}
					
				},
				(err)=>{
					cb(null,resultObj);
				});
			}else{
				cb(null,resultObj);
			}
		});
	}
	
	Projects.remoteMethod('getProjectWithApp',{
		http:{ path: '/getProjectWithApp', verb: 'get' },
		accepts:[
					{ arg: 'hpb_id', type: 'number', source: {http:'query' }},
					{ arg: 'project_id', type: 'number', source: {http:'query' }},
					{ arg: 'project_name', type: 'string', source: {http:'query' }},
					{ arg: 'project_type', type: 'number', source: {http:'query' }},
					{ arg: 'project_stage', type: 'number', source: {http:'query' }},
					{ arg: 'project_pincode', type: 'number', source: {http:'query' }},
					{ arg: 'is_srku', type: 'number', source: {http:'query' }},
					{ arg: 'created_by', type: 'number', source: {http:'query' }},
					{ arg: 'updated_by', type: 'number', source: {http:'query' }},
					{ arg: 'created_date', type: 'number', source: {http:'query' }},
					{ arg: 'updated_date', type: 'number', source: {http:'query' }},
					{ arg: 'user_id', type: 'number', source: {http:'query' }},
					{ arg: 'rolename', type: 'string', source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }},
					{ arg: 'approval', type: 'string', source: {http:'query' }},
					{ arg: 'sub_district_name', type: 'string', source: {http:'query' }}
				],
		returns: { arg: 'result', type: 'object' }
	})
	
	
	// to add projects
	Projects.addEditProject = function(dataArrObj,project_id,cb){
		
		var created_date = Math.floor(Date.now());
		var updated_date = Math.floor(Date.now());
		
		if(project_id){
			Projects.findOne({ where:{ project_id:project_id}}, function(err,project){
				if(project){
					dataArrObj.updated_date = updated_date;
					var dataArr = [];
					var paramsArr = [];
					
					for(var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o+"=(?)");
					}
					
					let paramsKey= paramsArr.join(', ');
					var whereCond = 'where project_id = (?)';
					dataArr.push(project_id);
					var sqlQuery = "update [projects_tbl] set "+paramsKey+" "+whereCond;
				
					Projects.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						var result = {};
						result.id = project_id;
						result.updated_date = dataArrObj.updated_date;
						cb(err,result);
					});
				}
				else{
					cb("Invalid project id",null);
				}
			});
		}else{
			// if hpb is present, validate the user
			if(dataArrObj.hpb_id){
				
				var validateHpb = "select u.id from [User] u, [Role] r, hpb_info_tbl h where u.id = h.uid and h.hpb_id = (?) and r.name = '$hpb' ";
				Projects.app.dbConnection.execute(validateHpb,[dataArrObj.hpb_id],(err,hpbData)=>{
					if(hpbData){
						
						dataArrObj.created_date = created_date;
						dataArrObj.updated_date = updated_date;
						
						var projectArr = [];
						var paramsArr = [];
						
						for(var o in dataArrObj) {
							projectArr.push(dataArrObj[o]);
							paramsArr.push("(?)");
						}
						
						var paramsKey = paramsArr.join(', ');
						var keyString = Object.keys(dataArrObj).join(', ');
						
						// add the product receipt
						var sqlQuery = "insert into [projects_tbl] ("+keyString+") OUTPUT Inserted.project_id values ("+paramsKey+")";
						
						Projects.app.dbConnection.execute(sqlQuery,projectArr,(err,resultObj)=>{
							var result = {};

							if(resultObj){
								if(resultObj.length > 0){
									result.id = resultObj[0].project_id;
									result.updated_date = created_date;
								}
								
							}
							cb(err,result);
						});
					}else{
						cb("Invalid hpb id",null);
					}
				});
				
			}
			else{
				
				dataArrObj.created_date = created_date;
				dataArrObj.updated_date = updated_date;
				
				var projectArr = [];
				var paramsArr = [];
				
				for(var o in dataArrObj) {
					projectArr.push(dataArrObj[o]);
					paramsArr.push("(?)");
				}
				
				var paramsKey = paramsArr.join(', ');
				var keyString = Object.keys(dataArrObj).join(', ');
				
				// add the product receipt
				var sqlQuery = "insert into [projects_tbl] ("+keyString+") OUTPUT Inserted.project_id values ("+paramsKey+")";
				
				Projects.app.dbConnection.execute(sqlQuery,projectArr,(err,resultObj)=>{
					var result = {};

					if(resultObj){
						if(resultObj.length > 0){
							result.id = resultObj[0].project_id;
							result.updated_date = created_date;
						}
					}
						
					
					cb(err,result);
				});
				
			}
		}
	}
	
	Projects.remoteMethod('addEditProject',{
		http:{ path: '/addEditProject', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'project_id', type:'number', http:{ source:"query"} }
				],
		returns:{ arg:'result', type:'object'}
	});
};