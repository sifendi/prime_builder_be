'use strict';
var async = require('async');

module.exports = function(Eapreport){
	
	// EAP Summary Report
	Eapreport.getEAPSummary = function(cb){
		
		var activeUsers = 0;
		var inActiveUsers = 0;
		var segmentArr = [];
		var leadStatusArr = [];
		var leadDetails = [];
		var leadTotal = 0;
		var nonCementProduct = [];
		var columns = [{ header: 'Employee Registered', key: '0', width: 10 },{ header: 'Active Employee', key: '1', width: 10 },{ header: 'Customer Recorded', key: '2', width: 10 }, { header: 'Cement Ton', key: '3', width: 10 }];
		var statsColumn = [];
		var leadStatsColumn = [];
		// get Employee details
		var eapuser = "select count(u.status) as total, u.status from [User] u join RoleMapping rm on u.id = rm.principalId join Role r on rm.roleId = r.id and r.description = 'EAP' group by u.status order by u.status";
		Eapreport.app.dbConnection.execute(eapuser,null,(err,userData)=>{
			if(userData[0]['status'] == 1){
				activeUsers = userData[0]['total'];
				inActiveUsers = 0;
			}else if(userData[0]['status'] == 0){
				inActiveUsers = userData[0]['total'];
				activeUsers = userData[1]['total'];
			}
			
			statsColumn[0] = activeUsers+inActiveUsers;
			statsColumn[1] = activeUsers;
			
			// get lead details
			var lead = "select count(lead_id) as total, lead_status, segment_name from eap_lead el join eap_master_lead_segment es on el.lead_segment = es.segment_id group by lead_status, segment_name";
			Eapreport.app.dbConnection.execute(lead,null,(err,leadData)=>{
				
				leadStatsColumn.push("");
				
				// loop through the lead
				async.forEachOf(leadData, function(lead,key,leadCallback){
					
					leadTotal = leadTotal + lead['total'];
					
					// push unique segment in array
					if(segmentArr.indexOf(lead['segment_name']) < 0){
						segmentArr.push(lead['segment_name']);
					}
					
					// push unique status in array
					if(leadStatusArr.indexOf(lead['lead_status']) < 0){
						if(lead['lead_status']){
							leadStatsColumn.push(lead['lead_status'].toUpperCase());
							leadStatusArr.push(lead['lead_status']);
						}
					}
					
					// create an array
					if(typeof(leadDetails[lead['segment_name']]) == "undefined"){
						leadDetails[lead['segment_name']] = [];
					}
					
					// push the value in its respective array
					leadDetails[lead['segment_name']][[lead['lead_status']]] = lead['total'];
					
					leadCallback();
				},
				(end)=>{
					
					statsColumn[2] = leadTotal;
					
					// get invoice details of the cement product
					var cementProduct = "select sum(invoice_quantity) as total from eap_lead_invoice ei join products_tbl pt on ei.invoice_product_id = pt.id and pt.is_cement = 1 join eap_approval ea on ea.type_id = ei.invoice_id and ea.type = 'invoice' and ea.approval_status = 1 ";
					Eapreport.app.dbConnection.execute(cementProduct,null,(err,cementData)=>{
						
						if(cementData && cementData.length > 0){
							var nonCementProductTotal = (cementData[0]['total']/1000);
						}else{
							var nonCementProductTotal = 0;
						}
						statsColumn[3] = nonCementProductTotal;
						
						// get invoice details of the non cement products
						var noncementproduct = "select pt.name, sum(invoice_quantity) as total from eap_lead_invoice ei join products_tbl pt on ei.invoice_product_id = pt.id join eap_approval ea on ea.type_id = ei.invoice_id and ea.type = 'invoice' and ea.approval_status = 1 where is_cement = 0 group by pt.name";
						Eapreport.app.dbConnection.execute(noncementproduct,null,(err,noncement)=>{
						
							async.forEachOf(noncement,function(noncementproduct,key,callback){
								
								// push the total in its respective array
								var columnkey = 4+parseInt(key);
								var obj = { header: noncementproduct['name'], key: columnkey, width: 10 };
								columns.push(obj);
								statsColumn[columnkey] = noncementproduct['total'];
								callback();
							},
							(end)=>{
								// all data is processed, now export this data
								var Excel = require("exceljs");
								const tempfile = require('tempfile');
								var workbook = new Excel.Workbook();
								var sheetName =  "Summary Report";
								var worksheet = workbook.addWorksheet(sheetName);
								worksheet.columns = columns;
								
								worksheet.addRow(statsColumn);
								worksheet.addRow();
								worksheet.addRow(leadStatsColumn);
								
								var arr = [];
								for(var i=0; i<segmentArr.length; i++){
									if(arr.length > 0){
										worksheet.addRow(arr);
									}
									arr = [segmentArr[i]];
									for(var j=0; j<leadStatusArr.length; j++){
										var total = leadDetails[segmentArr[i]][leadStatusArr[j]]||0;
										arr.push(total);
									}
								}
								
								worksheet.addRow(arr); // add the last row
								
								var tempFilePath = tempfile('.xlsx');
								var date = new Date();
								var filename = "EAP-Summary-Report-"+date.getDate()+"-"+(date.getMonth()+1)+"-"+date.getFullYear()+"-"+date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds()+".xlsx";
								workbook.xlsx.writeFile("storage/report/"+filename).then(function() {
									var resultObj = [{"serverPath":"api/container/report/download/"+filename}];
									cb(null,resultObj);
								});
								
							})
							
						});
						
					});
					
				});
			});
		});

	};
	
	Eapreport.remoteMethod('getEAPSummary',{
		http:{ path:'/getEAPSummary', verb:'get' },
		returns:{ arg:'result', type:'object' }
	})

	// EAP Department Report
	Eapreport.getEAPDepartmentReport = function(cb){
		
		// get all department
		var columns = [{ header: 'Department', key: '0', width: 10 },{ header: 'Numbers of Employee Participant', key: '1', width: 10 },{ header: 'Numbers of Customer', key: '2', width: 10 }, { header: 'Total Points', key: '3', width: 10 }, { header: 'Total Cement Volume (ton)', key: '4', width: 10 }];
		// all data is processed, now export this data
		var Excel = require("exceljs");
		var workbook = new Excel.Workbook();
		var sheetName =  "EAP Department Report";
		var worksheet = workbook.addWorksheet(sheetName);
		var arr = [];
		var prodArr = [];
		var totalColumns = 5;
		var getdepartment = "select department_id,department_name from eap_master_department";
		Eapreport.app.dbConnection.execute(getdepartment,null,(err,deptData)=>{
			
			// loop through each department
			async.forEachOf(deptData,function(dept,deptkey,deptCallback){
				arr[dept.department_id] = [];
				arr[dept.department_id][0] = dept.department_name;
				arr[dept.department_id]['dept_id'] = dept.department_id;
				var totalUsers = 0;
				var totalLead = 0;
				var totalPoints = 0;
				var totalCement = 0;
				var totalNonCement = 0;
				
				
				// get all EAP users belonging to this department
				var eapusers = "select count(u.id) as total from [User] u join user_meta um on u.id = um.uid and um.meta_key = 'department' and meta_value = (?) ";
				Eapreport.app.dbConnection.execute(eapusers,[arr[dept.department_id]['dept_id']],(err,userData)=>{
					totalUsers = userData[0]['total'];
					arr[dept.department_id][1] = totalUsers;
					
					// get lead added by these users
					var getlead = "select count(el.lead_id) as total from [User] u join user_meta um on u.id = um.uid and um.meta_key = 'department' and meta_value = (?) join eap_lead el on u.id = el.created_by ";
					Eapreport.app.dbConnection.execute(getlead,[arr[dept.department_id]['dept_id']],(err,leadData)=>{
						totalLead = leadData[0]['total'];
						arr[dept.department_id][2] = totalLead;
						
						// get total points of users who belong to this department
						var getpoints = "select sum(points) as total from [User] u join user_meta um on u.id = um.uid and um.meta_key = 'department' and meta_value = (?) join eap_employee_points ep on ep.user_id = u.id";
						Eapreport.app.dbConnection.execute(getpoints,[arr[dept.department_id]['dept_id']],(err,pointData)=>{
							totalPoints = pointData[0]['total'] || 0;
							arr[dept.department_id][3] = totalPoints;
							
							// get cement product invoice details of these users
							var getcement = "select sum(invoice_quantity) as total from [User] u join user_meta um on u.id = um.uid and um.meta_key = 'department' and meta_value = (?) join eap_lead el on u.id = el.created_by join eap_lead_invoice eli on eli.invoice_lead_id = el.lead_id join products_tbl p on p.id = eli.invoice_product_id and p.is_cement = 1 join eap_approval ea on ea.type_id = eli.invoice_id and ea.type = 'invoice' and ea.approval_status = 1 ";
							Eapreport.app.dbConnection.execute(getcement,[arr[dept.department_id]['dept_id']],(err,cementData)=>{
								totalCement = (cementData[0]['total']/1000) || 0;
								arr[dept.department_id][4] = totalCement;
								
								// get non cement product
								var noncement = "select * from products_tbl where is_cement = 0";
								Eapreport.app.dbConnection.execute(noncement,null,(err,noncementData)=>{
									
									async.forEachOf(noncementData,function(product,key,callback){
										
										var getnoncement = "select p.name, sum(invoice_quantity) as total from [User] u join user_meta um on u.id = um.uid and um.meta_key = 'department' and meta_value = (?) join eap_lead el on u.id = el.created_by join eap_lead_invoice eli on eli.invoice_lead_id = el.lead_id join products_tbl p on p.id = eli.invoice_product_id and p.id = (?) join eap_approval ea on ea.type_id = eli.invoice_id and ea.type = 'invoice' and ea.approval_status = 1 group by p.name ";
										Eapreport.app.dbConnection.execute(getnoncement,[arr[dept.department_id]['dept_id'],product.id],(err,noncementprodData)=>{
											totalNonCement = 0;
											if(noncementprodData && noncementprodData.length > 0){
												totalNonCement = noncementprodData[0]['total'];
											}
											
											var columnkey = 5+(prodArr.length);
											if(prodArr.indexOf(product['name']) < 0 && (product['name']!="")){
												prodArr.push(product['name']);
												var obj = { header: product['name'], key: columnkey, width: 10 };
												columns.push(obj);
											}
											arr[dept.department_id].push(totalNonCement || 0);
											callback();
										});
									},
									(end)=>{
										worksheet.columns = columns;
										worksheet.addRow(arr[dept.department_id]);
										deptCallback();
									});
									
								});
								
							});
							
						});
						
					});
					
				});
				
			},
			(end)=>{
				var tempfile = require('tempfile');
				var tempFilePath = tempfile('.xlsx');
				var date = new Date();
				var filename = "EAP-Department-Report-"+date.getDate()+"-"+(date.getMonth()+1)+"-"+date.getFullYear()+"-"+date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds()+".xlsx";
				workbook.xlsx.writeFile("storage/report/"+filename).then(function() {
					var resultObj = [{"serverPath":"api/container/report/download/"+filename}];
					cb(null,resultObj);
				});
								
			});
			
		});

	};
	
	Eapreport.remoteMethod('getEAPDepartmentReport',{
		http:{ path:'/getEAPDepartmentReport', verb:'get' },
		returns:{ arg:'result', type:'object' }
	});
	
	
	// EAP Direcorate Report
	Eapreport.getEAPDirectorateReport = function(cb){
		
		// get all directorate
		var columns = [{ header: 'Direcorate', key: '0', width: 10 },{ header: 'Numbers of Employee Participant', key: '1', width: 10 },{ header: 'Numbers of Customer', key: '2', width: 10 }, { header: 'Total Points', key: '3', width: 10 }, { header: 'Total Cement Volume (ton)', key: '4', width: 10 }];
		// all data is processed, now export this data
		var Excel = require("exceljs");
		var workbook = new Excel.Workbook();
		var sheetName =  "EAP Direcorate Report";
		var worksheet = workbook.addWorksheet(sheetName);
		var arr = [];
		var prodArr = [];
		var totalColumns = 5;
		var getdirectorate = "select directorate_id,directorate_name from eap_master_directorate";
		Eapreport.app.dbConnection.execute(getdirectorate,null,(err,deptData)=>{
			
			// loop through each directorate
			async.forEachOf(deptData,function(dept,deptkey,deptCallback){
				arr[dept.directorate_id] = [];
				arr[dept.directorate_id][0] = dept.directorate_name;
				arr[dept.directorate_id]['dept_id'] = dept.directorate_id;
				var totalUsers = 0;
				var totalLead = 0;
				var totalPoints = 0;
				var totalCement = 0;
				var totalNonCement = 0;
				
				
				// get all EAP users belonging to this directorate
				var eapusers = "select count(u.id) as total from [User] u join user_meta um on u.id = um.uid and um.meta_key = 'directorate' and meta_value = (?) ";
				Eapreport.app.dbConnection.execute(eapusers,[arr[dept.directorate_id]['dept_id']],(err,userData)=>{
					totalUsers = userData[0]['total'];
					arr[dept.directorate_id][1] = totalUsers;
					
					// get lead added by these users
					var getlead = "select count(el.lead_id) as total from [User] u join user_meta um on u.id = um.uid and um.meta_key = 'directorate' and meta_value = (?) join eap_lead el on u.id = el.created_by ";
					Eapreport.app.dbConnection.execute(getlead,[arr[dept.directorate_id]['dept_id']],(err,leadData)=>{
						totalLead = leadData[0]['total'];
						arr[dept.directorate_id][2] = totalLead;
						
						// get total points of users who belong to this directorate
						var getpoints = "select sum(points) as total from [User] u join user_meta um on u.id = um.uid and um.meta_key = 'directorate' and meta_value = (?) join eap_employee_points ep on ep.user_id = u.id";
						Eapreport.app.dbConnection.execute(getpoints,[arr[dept.directorate_id]['dept_id']],(err,pointData)=>{
							totalPoints = pointData[0]['total'] || 0;
							arr[dept.directorate_id][3] = totalPoints;
							
							// get cement product invoice details of these users
							var getcement = "select sum(invoice_quantity) as total from [User] u join user_meta um on u.id = um.uid and um.meta_key = 'directorate' and meta_value = (?) join eap_lead el on u.id = el.created_by join eap_lead_invoice eli on eli.invoice_lead_id = el.lead_id join products_tbl p on p.id = eli.invoice_product_id and p.is_cement = 1 join eap_approval ea on ea.type_id = eli.invoice_id and ea.type = 'invoice' and ea.approval_status = 1 ";
							Eapreport.app.dbConnection.execute(getcement,[arr[dept.directorate_id]['dept_id']],(err,cementData)=>{
								totalCement = (cementData[0]['total']/1000) || 0;
								arr[dept.directorate_id][4] = totalCement;
								
								// get non cement product
								var noncement = "select * from products_tbl where is_cement = 0";
								Eapreport.app.dbConnection.execute(noncement,null,(err,noncementData)=>{
									
									async.forEachOf(noncementData,function(product,key,callback){
										
										var getnoncement = "select p.name, sum(invoice_quantity) as total from [User] u join user_meta um on u.id = um.uid and um.meta_key = 'directorate' and meta_value = (?) join eap_lead el on u.id = el.created_by join eap_lead_invoice eli on eli.invoice_lead_id = el.lead_id join products_tbl p on p.id = eli.invoice_product_id and p.id = (?) join eap_approval ea on ea.type_id = eli.invoice_id and ea.type = 'invoice' and ea.approval_status = 1 group by p.name ";
										Eapreport.app.dbConnection.execute(getnoncement,[arr[dept.directorate_id]['dept_id'],product.id],(err,noncementprodData)=>{
											totalNonCement = 0;
											if(noncementprodData && noncementprodData.length > 0){
												totalNonCement = noncementprodData[0]['total'];
											}
											
											var columnkey = 5+(prodArr.length);
											if(prodArr.indexOf(product['name']) < 0 && (product['name']!="")){
												prodArr.push(product['name']);
												var obj = { header: product['name'], key: columnkey, width: 10 };
												columns.push(obj);
											}
											arr[dept.directorate_id].push(totalNonCement || 0);
											callback();
										});
									},
									(end)=>{
										worksheet.columns = columns;
										worksheet.addRow(arr[dept.directorate_id]);
										deptCallback();
									});
									
								});
								
							});
							
						});
						
					});
					
				});
				
			},
			(end)=>{
				var tempfile = require('tempfile');
				var tempFilePath = tempfile('.xlsx');
				var date = new Date();
				var filename = "EAP-Directorate-Report-"+date.getDate()+"-"+(date.getMonth()+1)+"-"+date.getFullYear()+"-"+date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds()+".xlsx";
				workbook.xlsx.writeFile("storage/report/"+filename).then(function() {
					var resultObj = [{"serverPath":"api/container/report/download/"+filename}];
					cb(null,resultObj);
				});
								
			});
			
		});

	};
	
	Eapreport.remoteMethod('getEAPDirectorateReport',{
		http:{ path:'/getEAPDirectorateReport', verb:'get' },
		returns:{ arg:'result', type:'object' }
	})


	// EAP Employee Point
	Eapreport.getEAPEmployeePointReport = function(cb){
		
		var Excel = require("exceljs");
		var workbook = new Excel.Workbook();
		var sheetName =  "EAP Direcorate Report";
		var worksheet = workbook.addWorksheet(sheetName);
		
		// get all directorate
		var columns = [{ header: 'Employee Name', key: 'name', width: 10 },{ header: 'Employee Code', key: 'code', width: 10 },{ header: 'Directorate', key: 'directorate', width: 10 }, { header: 'Department', key: 'department', width: 10 }, { header: 'Total Point', key: 'point', width: 10 },{ header: 'Total Volume (ton)', key: 'cement', width: 10 }];
		var nonCementProdArr = [];
		
		// get non cement product
		var noncement = "select * from products_tbl where is_cement = 0";
		Eapreport.app.dbConnection.execute(noncement,null,(err,noncementData)=>{
			
			async.forEachOf(noncementData,function(prod,prodkey,prodCallback){
				nonCementProdArr.push(prod['id']);
				var obj = { header: prod['name'], key: 'prod'+prod['id'], width: 10 };
				columns.push(obj);
				prodCallback();
				
			},
			(end)=>{
				
				// once all products columns are added, add lead columns
				var totalProducts = noncementData.length;
				var obj = [{ header: 'Sr No', key: 'srno', width: 10 },{ header: 'Customer Name', key: 'customer', width: 10 },{ header: 'Segment', key: 'segment', width: 10 }, { header: 'Mobile phone', key: 'mobile', width: 10 }, { header: 'Customer Address', key: 'address', width: 10 }, { header: 'City', key: 'city', width: 10 }, { header: 'Province', key: 'province', width: 10 }, { header: 'Customer Data', key: 'customer_data', width: 10 }, { header: 'Purchase 1', key: '1_purchase', width: 10 }, { header: 'Purchase 2', key: '2_purchase', width: 10 }, { header: 'Purchase 3', key: '3_purchase', width: 10 }, { header: 'Share on social media', key: 'share', width: 10 }, { header: 'New potential Customer', key: 'potential', width: 10 }];
				
				for(let i=0; i<obj.length; i++){
					columns.push(obj[i]);
				}
				
				worksheet.columns = columns;
				
				var eapUserArr = [];
				
				// get all EAP users along with its data
				var eapuser = "select u.id, ed.department_name, edd.directorate_name, u.realm, um2.meta_value as code, (select sum(points) from eap_employee_points ep where ep.user_id = u.id) as total from [User] u join RoleMapping rm on u.id = rm.principalId join Role r on rm.roleId = r.id and r.description = 'EAP' join user_meta um on um.uid = u.id join user_meta um1 on um1.uid = u.id join user_meta um2 on um2.uid = u.id and um2.meta_key = 'code' join eap_master_department ed on ed.department_id = um.meta_value and um.meta_key = 'department' join eap_master_directorate edd on edd.directorate_id = um1.meta_value and um1.meta_key = 'directorate'";
				Eapreport.app.dbConnection.execute(eapuser,null,(err,userData)=>{
					
					async.forEachOf(userData,function(user,userKey,userCallback){
						eapUserArr[user.id] = [];
						eapUserArr[user.id][0] = {};
						eapUserArr[user.id][0]['name'] = user.realm;
						eapUserArr[user.id][0]['code'] = user.code;
						eapUserArr[user.id][0]['directorate'] = user.directorate_name;
						eapUserArr[user.id][0]['department'] = user.department_name;
						eapUserArr[user.id][0]['point'] = (user.total || 0);
						
						// get cement products invoice for this eap user
						var cementProduct = "select sum(invoice_quantity) as total from eap_lead_invoice ei join products_tbl pt on ei.invoice_product_id = pt.id and pt.is_cement = 1 and ei.created_by = (?) join eap_approval ea on ea.type_id = ei.invoice_id and ea.type = 'invoice' and ea.approval_status = 1 ";
						Eapreport.app.dbConnection.execute(cementProduct,[user.id],(err,prodData)=>{
							
							eapUserArr[user.id][0]['cement'] = (prodData[0]['total'] || 0);
							
							// now pull all non cement product invoice
							var getnoncement = "select p.id, sum(invoice_quantity) as total from [User] u join eap_lead el on u.id = el.created_by  and u.id = (?) join eap_lead_invoice eli on eli.invoice_lead_id = el.lead_id join products_tbl p  on p.id = eli.invoice_product_id and p.is_cement = 0 join eap_approval ea on ea.type_id = eli.invoice_id  and ea.type = 'invoice' and ea.approval_status = 1 group by p.id ";
							Eapreport.app.dbConnection.execute(getnoncement,[user.id],(err,noncementProdData)=>{
								
								for(let i=0; i<nonCementProdArr.length; i++){
									eapUserArr[user.id][0]['prod'+nonCementProdArr[i]] = 0;
								}
								
								async.forEachOf(noncementProdData,function(nonCement,nonKey,nonCementCallback){
									eapUserArr[user.id][0]['prod'+nonCement['id']] = (nonCement['total'] || 0);
									nonCementCallback();
								},
								(end)=>{
									
									// get all lead info generated for this EAP
									var eapLead = `select lead_name,lead_mobile, lead_status, es.segment_name, lead_province, lead_city, lead_address,
													(select points from eap_employee_points ep where ep.activity_type_id = el.lead_id and ep.activity_type = 'lead' ) as lead_point,
													(select sum(points) as points from eap_employee_points ep join eap_share_moments em on em.moment_id = ep.activity_type_id and ep.activity_type = 'moment' where em.moment_lead_id = el.lead_id ) as moment_point,
													(select ep.points from eap_employee_points ep join eap_lead_invoice ei on ei.invoice_id = ep.activity_type_id and ep.activity_type = 'invoice'
													join eap_master_points emp on emp.point_id = ep.point_master_id and point_type = '1_purchase' where ei.invoice_lead_id = el.lead_id ) as first_purchase,
													(select ep.points from eap_employee_points ep join eap_lead_invoice ei on ei.invoice_id = ep.activity_type_id and ep.activity_type = 'invoice'
													join eap_master_points emp on emp.point_id = ep.point_master_id and point_type = '2_or_3_purchase' where ei.invoice_lead_id = el.lead_id order by ei.invoice_id OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY ) as second_purchase,
													(select ep.points from eap_employee_points ep join eap_lead_invoice ei on ei.invoice_id = ep.activity_type_id and ep.activity_type = 'invoice'
													join eap_master_points emp on emp.point_id = ep.point_master_id and point_type = '2_or_3_purchase' where ei.invoice_lead_id = el.lead_id order by ei.invoice_id OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY ) as third_purchase,
													(select sum(points) as points from eap_employee_points ep join eap_refer_customer ec on ep.activity_type_id = ec.refer_id and ec.refer_via = el.lead_id where activity_type = 'refer') as refer_points
													from eap_lead el join eap_master_lead_segment es on el.lead_segment = es.segment_id
													where el.created_by = (?)`;

									Eapreport.app.dbConnection.execute(eapLead,[user.id],(err,leadData)=>{
										
										if(leadData.length == 0){
											eapUserArr[user.id][0]['srno'] = 0;
											eapUserArr[user.id][0]['customer'] = "-";
											eapUserArr[user.id][0]['mobile'] = "-";
											eapUserArr[user.id][0]['segment'] = "-";
											eapUserArr[user.id][0]['province'] = "-";
											eapUserArr[user.id][0]['city'] = "-";
											eapUserArr[user.id][0]['address'] = "-";
											eapUserArr[user.id][0]['customer_data'] = 0;
											eapUserArr[user.id][0]['share'] = (0);
											eapUserArr[user.id][0]['potential'] = (0);
											eapUserArr[user.id][0]['1_purchase'] = (0);
											eapUserArr[user.id][0]['2_purchase'] = (0);
											eapUserArr[user.id][0]['3_purchase'] = (0);
											worksheet.addRow(eapUserArr[user.id][0]);
											worksheet.addRow();
											var row = worksheet.lastRow;
											row.height = 42.5;
											worksheet.getRow(row).outlineLevel = 5;
										}
										
										async.forEachOf(leadData,function(lead,leadKey,leadCallback){
											
											if(typeof(eapUserArr[user.id][leadKey]) == "undefined"){
												eapUserArr[user.id][leadKey] = {};
											}
											
											eapUserArr[user.id][leadKey]['srno'] = leadKey+1;
											eapUserArr[user.id][leadKey]['customer'] = lead.lead_name;
											eapUserArr[user.id][leadKey]['mobile'] = lead.lead_mobile;
											eapUserArr[user.id][leadKey]['segment'] = lead.segment_name;
											eapUserArr[user.id][leadKey]['province'] = lead.lead_province;
											eapUserArr[user.id][leadKey]['city'] = lead.lead_city;
											eapUserArr[user.id][leadKey]['address'] = lead.lead_address;
											eapUserArr[user.id][leadKey]['customer_data'] = (lead.lead_point || 0);
											eapUserArr[user.id][leadKey]['share'] = (lead.moment_point || 0);
											eapUserArr[user.id][leadKey]['potential'] = (lead.refer_points || 0);
											eapUserArr[user.id][leadKey]['1_purchase'] = (lead.first_purchase || 0);
											eapUserArr[user.id][leadKey]['2_purchase'] = (lead.second_purchase || 0);
											eapUserArr[user.id][leadKey]['3_purchase'] = (lead.third_purchase || 0);
											
											worksheet.addRow(eapUserArr[user.id][leadKey]);
											leadCallback();
											
										},
										(end)=>{
											if(leadData.length > 0){
												worksheet.addRow();
												var row = worksheet.lastRow;
												row.height = 42.5;
												worksheet.getRow(row).outlineLevel = 5;
											}
											userCallback();
										});
										
									});
									
								});
								
							});
							
						});
						
					},
					(end)=>{
							const tempfile = require('tempfile');
							var tempFilePath = tempfile('.xlsx');
							var date = new Date();
							var filename = "EAP-Employee-Points-Report-"+date.getDate()+"-"+(date.getMonth()+1)+"-"+date.getFullYear()+"-"+date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds()+".xlsx";
							workbook.xlsx.writeFile("storage/report/"+filename).then(function() {
							var resultObj = [{"serverPath":"api/container/report/download/"+filename}];
							cb(null,resultObj);
						});
					});
					
				});
				
			});
			
		});
		
	};
	
	Eapreport.remoteMethod('getEAPEmployeePointReport',{
		http:{ path:'/getEAPEmployeePointReport', verb:'get' },
		returns:{ arg:'result', type:'object' }
	});
	
	
	// EAP Customer Raw
	Eapreport.getEAPCustomerDataReport = function(cb){
		
		var Excel = require("exceljs");
		var workbook = new Excel.Workbook();
		var sheetName =  "EAP Raw Customer Data Report";
		var worksheet = workbook.addWorksheet(sheetName);
		
		// get all directorate
		var columns = [{ header: 'Employee Name', key: 'name', width: 10 },{ header: 'Employee Code', key: 'code', width: 10 },{ header: 'Directorate', key: 'directorate', width: 10 }, { header: 'Department', key: 'department', width: 10 }, { header: 'Visit Date', key: 'visit', width: 10 },{ header: 'Customer Name', key: 'customer', width: 10 },{ header: 'Segment', key: 'segment', width: 10 },{ header: 'Customer Mobile', key: 'mobile', width: 10 },{ header: 'Customer Address', key: 'address', width: 10 },{ header: 'City', key: 'city', width: 10 },{ header: 'Province', key: 'province', width: 10 },{ header: 'Interview/Discussion Result', key: 'interview', width: 10 },{ header: 'Support from AC/ASM/KA', key: 'ac', width: 10 },{ header: 'Support from Telesales Beton', key: 'telesales', width: 10 },{ header: 'Customer Point', key: 'customer_point', width: 10 },{ header: 'Purchase Date', key: 'purchase_date', width: 10 },{ header: 'Purchase Quantity', key: 'purchase_quantity', width: 10 },{ header: 'Retailer Name', key: 'purchase_retailer', width: 10 },{ header: 'Proof of Purchase', key: 'purchase_proof', width: 10 },{ header: 'Remark', key: 'purchase_remark', width: 10 },{ header: 'Purchase Status', key: 'purchase_status', width: 10 },{ header: 'Purchase Point', key: 'purchase_point', width: 10 },{ header: 'Social Media ', key: 'social_media', width: 10 },{ header: 'Share Date ', key: 'share_date', width: 10 },{ header: 'Description ', key: 'description', width: 10 },{ header: 'Proof of share ', key: 'proof', width: 10 },{ header: 'Status ', key: 'share_status', width: 10 },{ header: 'Potential Customer Name ', key: 'potential_customer', width: 10 },{ header: 'Address ', key: 'potential_address', width: 10 },{ header: 'Mobile ', key: 'potential_mobile', width: 10 },{ header: 'Customer Photo ', key: 'potential_photo', width: 10 },{ header: 'Status ', key: 'potential_status', width: 10 },{ header: 'Total Points ', key: 'total', width: 10 }];
		worksheet.columns = columns;
				
		// once all the columns are set, process the file
		var getLead = `select u.realm, ed.department_name, edd.directorate_name, es.segment_name, um2.meta_value as code, el.*,
						(select points from eap_employee_points ep where ep.activity_type_id = el.lead_id and ep.activity_type = 'lead' ) as lead_point,
						(select sum(points) as points from eap_employee_points ep join eap_share_moments em on em.moment_id = ep.activity_type_id and ep.activity_type = 'moment' where em.moment_lead_id = el.lead_id ) as moment_point,
						(select ep.points from eap_employee_points ep join eap_lead_invoice ei on ei.invoice_id = ep.activity_type_id and ep.activity_type = 'invoice'
						join eap_master_points emp on emp.point_id = ep.point_master_id and point_type = '1_purchase' where ei.invoice_lead_id = el.lead_id order by ei.invoice_id OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY ) as first_purchase,
						(select ep.points from eap_employee_points ep join eap_lead_invoice ei on ei.invoice_id = ep.activity_type_id and ep.activity_type = 'invoice'
						join eap_master_points emp on emp.point_id = ep.point_master_id and point_type = '2_or_3_purchase' where ei.invoice_lead_id = el.lead_id order by ei.invoice_id OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY ) as second_purchase,
						(select ep.points from eap_employee_points ep join eap_lead_invoice ei on ei.invoice_id = ep.activity_type_id and ep.activity_type = 'invoice'
						join eap_master_points emp on emp.point_id = ep.point_master_id and point_type = '2_or_3_purchase' where ei.invoice_lead_id = el.lead_id order by ei.invoice_id OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY ) as third_purchase,
						(select sum(points) as points from eap_employee_points ep join eap_refer_customer ec on ep.activity_type_id = ec.refer_id and ec.refer_via = el.lead_id where activity_type = 'refer') as refer_points
						from eap_lead el join [User] u on el.created_by = u.id
						join eap_master_lead_segment es on es.segment_id = el.lead_segment
						join user_meta um on um.uid = u.id and um.meta_key = 'department' 
						join user_meta um1 on um1.uid = u.id and um1.meta_key = 'directorate'
						join user_meta um2 on um2.uid = u.id and um2.meta_key = 'code' 
						join eap_master_department ed on ed.department_id = um.meta_value
						join eap_master_directorate edd on edd.directorate_id = um1.meta_value
						order by el.lead_id`;
				
		var leadDetails = [];
		Eapreport.app.dbConnection.execute(getLead,null,(err,leadData)=>{
					
			async.forEachOf(leadData, function(lead,key,leadCallback){
				leadDetails[key] = [];
				leadDetails[key][0] = {};
				if(lead.lead_support_ac == 1){
					lead.lead_support_ac = "Yes";
				}else{
					lead.lead_support_ac = "No";
				}
				
				if(lead.lead_support_telesales == 1){
					lead.lead_support_telesales = "Yes";
				}else{
					lead.lead_support_telesales = "No";
				}
				
				var visitDate = new Date(lead.lead_visit_date);
						
				leadDetails[key][0]['name'] = lead.realm;
				leadDetails[key][0]['lead_id'] = lead.lead_id;
				leadDetails[key][0]['code'] = lead.code;
				leadDetails[key][0]['directorate'] = lead.directorate_name;
				leadDetails[key][0]['department'] = lead.department_name;
				leadDetails[key][0]['visit'] = (visitDate.getDate()+"-"+(visitDate.getMonth()+1)+"-"+visitDate.getFullYear());
				leadDetails[key][0]['customer'] = lead.lead_name;
				leadDetails[key][0]['segment'] = lead.segment_name;
				leadDetails[key][0]['mobile'] = lead.lead_mobile;
				leadDetails[key][0]['address'] = lead.lead_address;
				leadDetails[key][0]['city'] = lead.lead_city;
				leadDetails[key][0]['province'] = lead.lead_province;
				leadDetails[key][0]['interview'] = lead.lead_interview_result;
				leadDetails[key][0]['ac'] = lead.lead_support_ac;
				leadDetails[key][0]['telesales'] = lead.lead_support_telesales;
				leadDetails[key][0]['customer_point'] = lead.lead_point||0;
				leadDetails[key][0]['total'] = ((lead.refer_points||0)+(lead.moment_point||0)+(lead.third_purchase||0)+(lead.second_purchase||0)+(lead.first_purchase||0)+(lead.lead_point||0));
				
				// get all purchase for this lead
				var purchase = "select rds.rds_name, erds.rds_name as eap_rds_name, ea.approval_status,ep.points,eli.* from eap_lead_invoice eli left join eap_approval ea on eli.invoice_id = ea.type_id and ea.type = 'invoice' join eap_lead el on el.lead_id = eli.invoice_lead_id and ea.is_closed = 0 and eli.invoice_lead_id = (?) left join eap_employee_points ep on ep.activity_type_id = eli.invoice_id and ep.activity_type  = 'invoice' left join retailer_distributor_master rds on rds.id = eli.invoice_rds_id and eli.invoice_rds_tag = 'hpb' left join eap_retailer_distributor erds on erds.id = eli.invoice_rds_id and eli.invoice_rds_tag = 'eap'";
						
				Eapreport.app.dbConnection.execute(purchase,[leadDetails[key][0]['lead_id']],(err,purchaseData)=>{
					
					if(leadDetails[key][0]['code'] == "4545"){
						console.log("",leadDetails[key][0]);
						console.log(purchase);
						console.log(purchaseData);
					}
					
					async.forEachOf(purchaseData, function(purchase,leadKey,purchaseCallback){
						if(typeof(leadDetails[key][leadKey]) == "undefined"){
							leadDetails[key][leadKey] = {};
						}
						
						if(purchase['approval_status'] == "0"){
							leadDetails[key][leadKey]['purchase_status'] = "Pending";
						}else if(purchase['approval_status'] == "1"){
							leadDetails[key][leadKey]['purchase_status'] = "Approved";
						}else if(purchase['approval_status'] == "-1"){
							leadDetails[key][leadKey]['purchase_status'] = "Rejected";
						}
						
						var purchasePhotos = [];
						if(purchase['invoice_purchase_photos']!=''){
							var Image = JSON.parse(purchase['invoice_purchase_photos']);
							for(var j=0; j<(Image).length; j++){
								purchasePhotos[j] = Image[j].serverPath;
							}
						}
						purchasePhotos = purchasePhotos.join(",");
						
						var purchaseDate = new Date(purchase['invoice_purchase_date']);
						leadDetails[key][leadKey]['purchase_date'] = (purchaseDate.getDate())+"-"+(purchaseDate.getMonth()+1)+"-"+(purchaseDate.getFullYear());
						leadDetails[key][leadKey]['purchase_quantity'] = purchase['invoice_quantity'];
						leadDetails[key][leadKey]['purchase_retailer'] = purchase['rds_name']||purchase['eap_rds_name'];
						leadDetails[key][leadKey]['purchase_proof'] = purchasePhotos;
						leadDetails[key][leadKey]['purchase_remark'] = purchase['invoice_description'];
						leadDetails[key][leadKey]['purchase_point'] = purchase['points'];
						purchaseCallback();
					},
					(end)=>{
						
						// get customer refered by this lead
						var referCustomer = "select ec.*, eli.lead_id from eap_refer_customer ec left join eap_lead eli on ec.refer_id = eli.lead_refer_id where ec.refer_via = (?) order by ec.refer_id";
						Eapreport.app.dbConnection.execute(referCustomer,[leadDetails[key][0]['lead_id']],(err,referCustomerData)=>{
							
							async.forEachOf(referCustomerData, function(refer,referkey,referCallback){
								if(typeof(leadDetails[key][referkey]) == "undefined"){
									leadDetails[key][referkey] = {};
								}
								
								var referPhotos = [];
								if(refer['refer_photos']!=''){
									var Image = JSON.parse(refer['refer_photos']);
									for(var j=0; j<(Image).length; j++){
										referPhotos[j] = Image[j].serverPath;
									}
								}
								referPhotos = referPhotos.join(",");
								
								leadDetails[key][referkey]['potential_customer'] = refer['refer_name'];
								leadDetails[key][referkey]['potential_address'] = refer['refer_address'];
								leadDetails[key][referkey]['potential_mobile'] = refer['refer_mobile'];
								leadDetails[key][referkey]['potential_photo'] = referPhotos;
								if(refer['lead_id'] > 0){
									leadDetails[key][referkey]['potential_status'] = 1;
								}else{
									leadDetails[key][referkey]['potential_status'] = 0;
								}
								referCallback();
							},
							(end)=>{
								
								// get social share moment by this lead
								var shareCustomer = "select em.*, ea.approval_status from eap_share_moments em join eap_approval ea on em.moment_id = ea.type_id and ea.type = 'moment' and em.moment_lead_id = (?) order by moment_id";
								Eapreport.app.dbConnection.execute(shareCustomer,[leadDetails[key][0]['lead_id']],(err,shareCustomerData)=>{
									
									// loop through all the social share
									async.forEachOf(shareCustomerData, function(share,sharekey,shareCallback){
										
										if(typeof(leadDetails[key][sharekey]) == "undefined"){
											leadDetails[key][sharekey] = {};
										}

										var socialPhotos = [];
										if(share['moment_photos']!=''){
											var Image = JSON.parse(share['moment_photos']);
											for(var j=0; j<(Image).length; j++){
												socialPhotos[j] = Image[j].serverPath;
											}
										}
										
										var socialMedia = [];
										if(share['moment_social_media_type'].indexOf("1") >= 0){
											socialMedia.push("Facebook");
										}
										if(share['moment_social_media_type'].indexOf("2") >= 0){
											socialMedia.push("Twitter");
										}
										if(share['moment_social_media_type'].indexOf("3") >= 0){
											socialMedia.push("Google");
										}
										socialMedia = socialMedia.join(",");
										
										socialPhotos = socialPhotos.join(",");
										
										var shareDate = new Date(share['moment_share_date']);
										leadDetails[key][sharekey]['share_date'] = (shareDate.getDate())+"-"+(shareDate.getMonth()+1)+"-"+(shareDate.getFullYear());
										leadDetails[key][sharekey]['description'] = share['moment_description'];
										leadDetails[key][sharekey]['social_media'] = socialMedia;
										leadDetails[key][sharekey]['proof'] = socialPhotos;
										leadDetails[key][sharekey]['share_status'] = share['approval_status'];
										shareCallback();
										
									},
									(end)=>{
										for(var i=0; i<(leadDetails[key]).length; i++){
											worksheet.addRow(leadDetails[key][i]);
											if(i+1 == (leadDetails[key]).length){
												worksheet.addRow();
											}
										}
										leadCallback();
									});
									/* social share moment loop ends here */
								});
								/* social share moment ends here */
							});
							/* refer customer loop ends here */
						
						});
						/* refer customer ends here */
							
					});
					/* purchase proof loop ends here */
				});
				/* purchase proof ends here */
							
			},
			(end)=>{
				const tempfile = require('tempfile');
				var tempFilePath = tempfile('.xlsx');
				var date = new Date();
				var filename = "EAP-Customer-Raw-Data-Report-"+date.getDate()+"-"+(date.getMonth()+1)+"-"+date.getFullYear()+"-"+date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds()+".xlsx";
				workbook.xlsx.writeFile("storage/report/"+filename).then(function() {
					var resultObj = [{"serverPath":"api/container/report/download/"+filename}];
					cb(null,resultObj);
				});
			});
			/* lead loop ends here */
				
		});
		/* lead query ends here */
	};
	
	Eapreport.remoteMethod('getEAPCustomerDataReport',{
		http:{ path:'/getEAPCustomerDataReport', verb:'get' },
		returns:{ arg:'result', type:'object' }
	});

};