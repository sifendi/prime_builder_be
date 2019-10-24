'use strict';
var async = require('async');
var Promise = require("bluebird");
var taskQueue = require("promise-task-queue");
var queue = taskQueue();
module.exports = function (Appproductreceiptapproval) {
	// to add edit product receipt approval	
	Appproductreceiptapproval.afterRemote('addEditProdReceiptApproval', function (context, repsData, next) {
		var response_id = repsData['result']['id'];
		if (response_id > 0) {
			var ProjectModal = Appproductreceiptapproval.app.models.app_projects;
			var ReceiptModal = Appproductreceiptapproval.app.models.app_product_receipt;
			var UserModal = Appproductreceiptapproval.app.models.user;
			var NotificationCenterModal = Appproductreceiptapproval.app.models.app_notification_center;
			if (context.args.dataArrObj['is_closed'] == 0 && context.args.dataArrObj['approval_status'] == 0) {
				//console.log('added or updated');
				var allPostData = context.args.dataArrObj;
				var dataArrObj = {};
				dataArrObj = allPostData;
				dataArrObj['id'] = repsData['result']['id'];
				var currUid = allPostData['created_by'];
				var sqlQuery = `exec relatedUserFetch ${currUid}`;
				var fromUserData = {};
				fromUserData['uid'] = currUid;
				var receipt_id = allPostData['receipt_id'];
				Appproductreceiptapproval.app.dbConnection.execute(sqlQuery, [], (err, resultObjArrs) => {
					if (!err) {
						UserModal.findOne({ where: { id: currUid } }, function (err, userResData) {
							if (!err) {
								ReceiptModal.findOne({ where: { receipt_id: receipt_id } }, function (err, receiptData) {
									if (!err) {
										var project_id = receiptData['project_id'];
										ProjectModal.findOne({ where: { project_id: project_id } }, function (err, projectData) {
											if (!err) {
												dataArrObj['projectData'] = projectData;
												var projectCompletedDate = projectData['project_completion_date'];
												var project_quantity_estimation = projectData['project_quantity_estimation'];
												var sqlQueryNew = `SELECT  sum(prm.quantity) as 'total_quantity' FROM  products_receipt_tbl prm  JOIN products_receipt_approval_tbl prat on prm.receipt_id=prat.receipt_id  WHERE prm.receipt_id>0 AND prat.is_closed=0 AND prat.approval_status=1 AND prat.approval_role='SA'  AND prm.project_id=${project_id}`;
												Appproductreceiptapproval.app.dbConnection.execute(sqlQueryNew, [], (err, recieptQData) => {
													if (!err) {
														var totalEstimetedQ = (recieptQData[0]['total_quantity'] && recieptQData[0]['total_quantity'] != null && recieptQData[0]['total_quantity'] != 'NULL') ? recieptQData[0]['total_quantity'] : 0;
														Appproductreceiptapproval.find({ where: { receipt_id: receipt_id } }, function (err, approvalData) {
															if (!err) {
																var approvalDataTotal = approvalData['length'];
																var acUserExits = false;
																var notificationArr = [];
																var currDateTime = Math.floor(Date.now());
																var ntc_type_id = receipt_id;
																fromUserData['name'] = userResData['realm'];
																fromUserData['username'] = userResData['username'];
																fromUserData['email'] = userResData['email'];
																var ntc_type = "";
																var ntc_type_complete_date = false;
																var ntc_type_estimated = false;
																for (var i = 0; i < approvalDataTotal; i++) {
																	if (approvalData[i]['approval_role'] == 'AC' && approvalData[i]['is_closed'] == 0) {
																		acUserExits = true;
																		break;
																	}
																}
																if (approvalDataTotal > 3) {
																	ntc_type = "project_receipt_updated";
																} else {
																	ntc_type = "project_receipt_added";
																}
																if (currDateTime > projectCompletedDate) {
																	ntc_type_complete_date = true;
																}
																var finlaQuantity = parseInt(receiptData['quantity']) + parseInt(totalEstimetedQ);
																if (finlaQuantity > parseInt(project_quantity_estimation)) {
																	ntc_type_estimated = true;
																}
																/*
																console.log('finlaQuantity',finlaQuantity);
																console.log('ntc_type_estimated',ntc_type_estimated);
																console.log('totalEstimetedQ',totalEstimetedQ);
																console.log('project_quantity_estimation',project_quantity_estimation);
																console.log('recieptQData total_quantity',recieptQData['total_quantity']);
																console.log('recieptQData total_quantity',recieptQData);
																console.log('sqlQueryNew',sqlQueryNew);
																console.log('resultObjArrs',resultObjArrs);
																*/
																async.each(resultObjArrs, (resultObj, callback) => {
																	if (resultObj['uid'] > 0 && (resultObj['rolename'] == '$tlh') && allPostData['approval_role'] == "TLH") {
																		var currNotificationsObject = {
																			"ntc_app_name": "HPB",
																			"ntc_type": ntc_type,
																			"ntc_type_id": ntc_type_id,
																			"ntc_type_data": JSON.stringify(dataArrObj),
																			"ntc_from_user_id": currUid,
																			"ntc_from_user_data": JSON.stringify(fromUserData),
																			"ntc_to_user_id": resultObj['uid'],
																			"ntc_to_user_data": JSON.stringify(resultObj),
																			"ntc_user_read_flag": 0,
																			"created_date": currDateTime,
																			"updated_date": currDateTime,
																			"status": 1
																		};
																		notificationArr.push(currNotificationsObject);
																	} else if (resultObj['uid'] > 0 && (resultObj['rolename'] == '$ac') && allPostData['approval_role'] == "AC") {
																		var ntc_type_new = ntc_type + "_quantity_x";
																		var currNotificationsObject = {
																			"ntc_app_name": "HPB",
																			"ntc_type": ntc_type_new,
																			"ntc_type_id": ntc_type_id,
																			"ntc_type_data": JSON.stringify(dataArrObj),
																			"ntc_from_user_id": currUid,
																			"ntc_from_user_data": JSON.stringify(fromUserData),
																			"ntc_to_user_id": resultObj['uid'],
																			"ntc_to_user_data": JSON.stringify(resultObj),
																			"ntc_user_read_flag": 0,
																			"created_date": currDateTime,
																			"updated_date": currDateTime,
																			"status": 1
																		};
																		notificationArr.push(currNotificationsObject);
																		/*
																		if(ntc_type_complete_date){
																				var ntc_type_new_c = ntc_type+"_completed_date";
																				var currNotificationsObjectC={
																				"ntc_app_name": "HPB",
																				"ntc_type": ntc_type_new_c,
																				"ntc_type_id": ntc_type_id,
																				"ntc_type_data": JSON.stringify(dataArrObj),
																				"ntc_from_user_id": currUid,
																				"ntc_from_user_data":JSON.stringify(fromUserData),
																				"ntc_to_user_id": resultObj['uid'],
																				"ntc_to_user_data": JSON.stringify(resultObj),
																				"ntc_user_read_flag": 0,
																				"created_date": currDateTime,
																				"updated_date": currDateTime,
																				"status": 1
																				};
																				notificationArr.push(currNotificationsObjectC);
																		}
																		
																		if(ntc_type_estimated){
																				var ntc_type_new_et = ntc_type+"_quantity_estimation";
																				var currNotificationsObjectET={
																				"ntc_app_name": "HPB",
																				"ntc_type": ntc_type_new_et,
																				"ntc_type_id": ntc_type_id,
																				"ntc_type_data": JSON.stringify(dataArrObj),
																				"ntc_from_user_id": currUid,
																				"ntc_from_user_data":JSON.stringify(fromUserData),
																				"ntc_to_user_id": resultObj['uid'],
																				"ntc_to_user_data": JSON.stringify(resultObj),
																				"ntc_user_read_flag": 0,
																				"created_date": currDateTime,
																				"updated_date": currDateTime,
																				"status": 1
																				};
																				notificationArr.push(currNotificationsObjectET);
																		}
																		*/
																	} else if (resultObj['uid'] > 0 && (resultObj['rolename'] == '$ac') && allPostData['approval_role'] == "SA") {
																		if (ntc_type_complete_date) {
																			var ntc_type_new_c = ntc_type + "_completed_date";
																			var currNotificationsObjectC = {
																				"ntc_app_name": "HPB",
																				"ntc_type": ntc_type_new_c,
																				"ntc_type_id": ntc_type_id,
																				"ntc_type_data": JSON.stringify(dataArrObj),
																				"ntc_from_user_id": currUid,
																				"ntc_from_user_data": JSON.stringify(fromUserData),
																				"ntc_to_user_id": resultObj['uid'],
																				"ntc_to_user_data": JSON.stringify(resultObj),
																				"ntc_user_read_flag": 0,
																				"created_date": currDateTime,
																				"updated_date": currDateTime,
																				"status": 1
																			};
																			notificationArr.push(currNotificationsObjectC);
																		}
																		if (ntc_type_estimated) {
																			var ntc_type_new_et = ntc_type + "_quantity_estimation";
																			var currNotificationsObjectET = {
																				"ntc_app_name": "HPB",
																				"ntc_type": ntc_type_new_et,
																				"ntc_type_id": ntc_type_id,
																				"ntc_type_data": JSON.stringify(dataArrObj),
																				"ntc_from_user_id": currUid,
																				"ntc_from_user_data": JSON.stringify(fromUserData),
																				"ntc_to_user_id": resultObj['uid'],
																				"ntc_to_user_data": JSON.stringify(resultObj),
																				"ntc_user_read_flag": 0,
																				"created_date": currDateTime,
																				"updated_date": currDateTime,
																				"status": 1
																			};
																			notificationArr.push(currNotificationsObjectET);
																		}
																	}
																	callback();
																}, (endAysnc) => {
																	//console.log('notificationArr',notificationArr);
																	NotificationCenterModal.create(notificationArr, (err, models) => {
																	});
																});
															}
														});
													}
												});
											}
										});
									}
								});
							}
						});
					}
				});

				//Byzentine API hit
				if(receipt_id > 0){
					Appproductreceiptapproval.app.byz_product_receipt(receipt_id);
				}
			} else if (context.args['ra_id'] > 0 && context.args.dataArrObj['approved_by'] > 0 && context.args.dataArrObj['approval_status'] != 0) {
				//console.log('approved or rejected');
				var allPostData = context.args.dataArrObj;
				var ra_id = context.args['ra_id'];
				Appproductreceiptapproval.findOne({ where: { id: ra_id } }, function (err, approvalData) {
					if (!err) {
						var receipt_id = approvalData['receipt_id'];
						if (approvalData['is_closed'] == 0) {
							ReceiptModal.findOne({ where: { receipt_id: receipt_id } }, function (err, receiptData) {
								if (!err) {
									var project_id = receiptData['project_id'];
									ProjectModal.findOne({ where: { project_id: project_id } }, function (err, projectData) {
										if (!err) {
											var approved_by = allPostData['approved_by'];
											var approval_role = allPostData['approval_role'];
											var created_by = approvalData['created_by'];
											var ntc_type = "project_receipt_approved_reject";
											if (context.args.dataArrObj['approval_status'] == 1) {
												ntc_type = "project_receipt_approved";
											} else if (context.args.dataArrObj['approval_status'] == -1) {
												ntc_type = "project_receipt_reject";
											}

											var notificationArr = [];
											var currDateTime = Math.floor(Date.now());
											var ntc_type_id = approvalData['receipt_id'];
											var ntc_type_data = approvalData;
											var resultObj = {};
											resultObj['uid'] = created_by;
											ntc_type_data['projectData'] = projectData;
											var currNotificationsObject = {
												"ntc_app_name": "HPB",
												"ntc_type": ntc_type,
												"ntc_type_id": ntc_type_id,
												"ntc_type_data": JSON.stringify(ntc_type_data),
												"ntc_from_user_id": approved_by,
												"ntc_from_user_data": JSON.stringify(approvalData),
												"ntc_to_user_id": created_by,
												"ntc_to_user_data": JSON.stringify(resultObj),
												"ntc_user_read_flag": 0,
												"created_date": currDateTime,
												"updated_date": currDateTime,
												"status": 1
											};
											notificationArr.push(currNotificationsObject);
											NotificationCenterModal.create(notificationArr, (err, models) => {
												//console.log('models',models,err);
											});
										}
									});
								}
							});
						}
						//Byzentine API hit
						if(receipt_id > 0){
							Appproductreceiptapproval.app.byz_product_receipt(receipt_id);
						}
					}
				});
			}
		}
		next();
	});

	Appproductreceiptapproval.addEditProdReceiptApproval = function (dataArrObj, ra_id, cb) {
		var created_date = Math.floor(Date.now());
		var updated_date = Math.floor(Date.now());
		var id = ra_id;
		var sphIdArr = [];
		var sphObj = {};
		if (id) {
			var getApproval = "select pra.*, pr.created_date as receipt_date from products_receipt_tbl pr join products_receipt_approval_tbl pra on pr.receipt_id = pra.receipt_id where pra.id = (?)";
			Appproductreceiptapproval.app.dbConnection.execute(getApproval, [id], (err, appData) => {
				if (appData) {
					dataArrObj.updated_date = updated_date;
					var dataArr = [];
					var paramsArr = [];
					for (var o in dataArrObj) {
						dataArr.push(dataArrObj[o]);
						paramsArr.push(o + "=(?)");
					}

					let paramsKey = paramsArr.join(', ');
					var whereCond = 'where id = (?)';
					dataArr.push(id);
					var sqlQuery = "update [products_receipt_approval_tbl] set " + paramsKey + " OUTPUT INSERTED.receipt_id, INSERTED.approval_role, INSERTED.created_by, INSERTED.created_date " + whereCond;
					Appproductreceiptapproval.app.dbConnection.execute(sqlQuery, dataArr, (err, resultObj) => {
						console.log("dataArr", dataArr);
						console.log("sqlQuery", sqlQuery);
						sphIdArr = [resultObj[0].created_by];
						// for monthly stats cron
						sphObj.sph_id = [resultObj[0].created_by];
						sphObj.created_date = appData[0].receipt_date;
						Appproductreceiptapproval.app.cronExecuteForMonthlyStatsQueue(sphObj);
						// check if hpb needs to be switched, get his approved receipts till date
						var checkHpb = "select pr.receipt_id, pr.invoice_quantity, pr.created_date, h.hpb_id, h.hpb_status, h.prospect_switching_dt, pra.approval_role from products_receipt_tbl pr, hpb_info_tbl h, products_receipt_approval_tbl pra where pr.hpb_id = h.hpb_id and pra.receipt_id = pr.receipt_id and pra.approval_role = 'TLH' and pra.approval_status = 1 and h.hpb_id = (select hpb_id from products_receipt_tbl where receipt_id = (?))  order by created_date desc";
						Appproductreceiptapproval.app.dbConnection.execute(checkHpb, [resultObj[0].receipt_id], (err, hpbObj) => {
							if (hpbObj && hpbObj.length > 0 && (resultObj[0].approval_role == 'TLH')) {
								var hpb_status = "";
								var update_status_date = Math.floor(Date.now());
								var updatehpb = ""; // update query
								if (hpbObj[0]['hpb_status'] == "prospect") {
									hpb_status = "switching"; // if one receipt atleast, change to switching
									updatehpb = "update hpb_info_tbl set hpb_status = (?), prospect_switching_dt = (?), updated_date = (?) where hpb_id = (?) ";
								}
								else if (hpbObj[0]['hpb_status'] == "switching" && hpbObj.length > 1) {
									// difference between switched date from today
									var diff = Date.parse(new Date()) - Date.parse(new Date(hpbObj[0].prospect_switching_dt));
									var result = isNaN(diff) ? NaN : {
										diff: diff,
										ms: Math.ceil(diff % 1000),
										s: Math.ceil(diff / 1000 % 60),
										m: Math.ceil(diff / 60000 % 60),
										h: Math.ceil(diff / 3600000 % 24),
										d: Math.ceil(diff / 86400000)
									};
									if (result.d >= 90) { // if uploaded more than one receipt after 3 months
										hpb_status = "maintain";
										updatehpb = "update hpb_info_tbl set hpb_status = (?), switching_maintain_dt = (?), updated_date = (?) where hpb_id = (?) ";
									}
								}
								// if we need to change the status, update it
								if (hpb_status != "") {
									console.log("updatehpb", updatehpb);
									console.log([hpb_status, update_status_date, update_status_date, hpbObj[0].hpb_id]);
									Appproductreceiptapproval.app.dbConnection.execute(updatehpb, [hpb_status, update_status_date, update_status_date, hpbObj[0].hpb_id], (err, hpbUpdatedObj) => {
									});
								}
							} else {
								var result = {};
								result.id = id;
								result.updated_date = dataArrObj.updated_date;
							}
						});

						// update the points
						var getPoints = "select p.points, pr.receipt_id, pra.approval_role, p.unit_value, pr.quantity from products_tbl p, products_receipt_tbl pr, products_receipt_approval_tbl pra where p.id = pr.product_id and pra.is_closed =0 and pra.approval_status = 1 and pra.approval_role = 'SA' and pra.receipt_id = pr.receipt_id and pra.id = (?)";
						Appproductreceiptapproval.app.dbConnection.execute(getPoints, [ra_id], (err, pointsObj) => {
							if (pointsObj && pointsObj.length > 0 && (pointsObj[0].approval_role == 'SA')) {
								var points = pointsObj[0].points;
								var unitValue = pointsObj[0].unit_value;
								var quantity = pointsObj[0].quantity;
								var pointsAchieved = Math.ceil(points * quantity);
								var receipt_id = pointsObj[0].receipt_id;
								// update the points now in receipt
								var updatePoints = "update products_receipt_tbl set points = (?) where receipt_id = (?)";
								Appproductreceiptapproval.app.dbConnection.execute(updatePoints, [pointsAchieved, receipt_id], (err, updatePointsObj) => {
									var result = {};
									result.id = id;
									result.updated_date = dataArrObj.updated_date;
									if (sphIdArr.length > 0) {
										Appproductreceiptapproval.app.cronExecuteForStats(sphIdArr).then(() => {
											cb(err, result);
										}, () => {
											cb(err, result);
										});
									} else {
										cb(err, result);
									}
								});
							} else {
								var result = {};
								result.id = id;
								result.updated_date = dataArrObj.updated_date;
								if (sphIdArr.length > 0) {
									Appproductreceiptapproval.app.cronExecuteForStats(sphIdArr).then(() => {
										cb(err, result);
									}, () => {
										cb(err, result);
									});
								} else {
									cb(err, result);
								}
							}
						});
					});
				} else {
					cb("Invalid id", null);
				}
			});
		}
		else {
			// check if approval for this product receipt exists
			var checkExist = "select * from products_receipt_approval_tbl where is_closed = 0 and approval_role = (?) and receipt_id = (?)";
			Appproductreceiptapproval.app.dbConnection.execute(checkExist, [dataArrObj.approval_role, dataArrObj.receipt_id], (err, resultObj) => {
				if (typeof (resultObj) != 'undefined' && resultObj.length > 0) {
					cb("Approval already exists", null);
				}
				else {
					// validate the receipt id, if valid, insert the records
					var receiptApp = Appproductreceiptapproval.app.models.app_product_receipt;
					receiptApp.findOne({ where: { receipt_id: dataArrObj.receipt_id } }, (err, receiptData) => {
						if (receiptData) {
							dataArrObj.created_date = created_date;
							dataArrObj.updated_date = updated_date;
							var appArr = [];
							var paramsArr = [];
							for (var o in dataArrObj) {
								appArr.push(dataArrObj[o]);
								paramsArr.push("(?)");
							}
							var paramsKey = paramsArr.join(', ');
							var keyString = Object.keys(dataArrObj).join(', ');
							// add the product receipt
							var sqlQuery = "insert into [products_receipt_approval_tbl] (" + keyString + ") OUTPUT Inserted.id, INSERTED.created_by values (" + paramsKey + ")";
							Appproductreceiptapproval.app.dbConnection.execute(sqlQuery, appArr, (err, resultObj) => {
								var result = {};
								try {
									if (resultObj.length > 0) {
										sphIdArr = [resultObj[0].created_by];
										result.id = resultObj[0].id;
										result.updated_date = created_date;
									}
								} catch (e) {

								}
								if (sphIdArr.length > 0) {
									Appproductreceiptapproval.app.cronExecuteForStats(sphIdArr).then(() => {
										cb(err, result);
									}, () => {
										cb(err, result);
									});
								} else {
									cb(err, result);
								}
								//cb(err,result);
							});
						} else {
							cb("Invalid receipt id", null);
						}
					});
				}
			});
		}
	}

	Appproductreceiptapproval.remoteMethod('addEditProdReceiptApproval', {
		http: { path: '/addEditProdReceiptApproval', verb: 'post' },
		accepts: [
			{ arg: 'dataArrObj', type: 'object', http: { source: "body" } },
			{ arg: 'ra_id', type: 'number', http: { source: "query" } }
		],
		returns: { arg: 'result', type: 'object' }
	});

	// to get product receipt approval status
	Appproductreceiptapproval.getProductReceiptApproval = function (id, receipt_id, approved_by, limit, page, created_date, updated_date, created_by, updated_by, cb) {
		if (limit) {
			if (!page) { page = 0; }
			var offset = page * limit;
		}
		var dataArr = [];
		//var sqlQuery = "select u.realm, pd.name as product, pj.project_name as project, pra.*  from products_receipt_tbl pr, products_receipt_approval_tbl pra, projects_tbl pj, products_tbl pd, [User] u where pr.receipt_id = pra.receipt_id and pr.product_id = pd.id and pr.project_id = pj.project_id and u.id = pra.approved_by ";
		//var sqlQuery = "select distinct pra.id as gid, pra.*  from  products_receipt_approval_tbl pra where  pra.is_closed=0 ";
		var sqlQuery = "select distinct pra.id as gid, pra.*  from  products_receipt_approval_tbl pra where  pra.is_closed IN (1,0) ";
		if (receipt_id) {
			sqlQuery += " AND pra.receipt_id = (?) ";
			dataArr.push(receipt_id);
		}
		if (approved_by) {
			sqlQuery += " AND pra.approved_by = (?) ";
			dataArr.push(approved_by);
		}
		if (created_by) {
			sqlQuery += " AND pra.created_by = (?) ";
			dataArr.push(created_by);
		}
		if (updated_by) {
			sqlQuery += " AND pra.updated_by = (?) ";
			dataArr.push(updated_by);
		}
		if (created_date) {
			sqlQuery += " AND pra.created_date > (?) ";
			dataArr.push(created_date);
		}
		if (updated_date) {
			sqlQuery += " AND pra.updated_date > (?) ";
			dataArr.push(updated_date);
		}
		if (limit) {
			sqlQuery += " ORDER BY pra.id OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		Appproductreceiptapproval.app.dbConnection.execute(sqlQuery, dataArr, (err, resultObject) => {
			cb(null, resultObject);
		});
	}

	Appproductreceiptapproval.remoteMethod('getProductReceiptApproval', {
		http: { path: '/getProductReceiptApproval', verb: 'get' },
		accepts: [
			{ arg: 'id', type: 'number', source: { http: 'query' } },
			{ arg: 'receipt_id', type: 'number', source: { http: 'query' } },
			{ arg: 'approved_by', type: 'number', source: { http: 'query' } },
			{ arg: 'limit', type: 'number', source: { http: 'query' } },
			{ arg: 'page', type: 'number', source: { http: 'query' } },
			{ arg: 'created_date', type: 'number', source: { http: 'query' } },
			{ arg: 'updated_date', type: 'number', source: { http: 'query' } },
			{ arg: 'created_by', type: 'number', source: { http: 'query' } },
			{ arg: 'updated_by', type: 'number', source: { http: 'query' } },
		],
		returns: { arg: 'result', type: 'object' }
	});
};