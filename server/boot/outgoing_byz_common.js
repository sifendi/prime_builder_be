var async = require('async');
var http = require('http');
var schedule = require('node-schedule');
var moment = require('moment');
module.exports = function(app) {
	var SUBMIT_HPB_REDEMPTION_DATA_IMAGE_URL = 'https://hpb-id.hssanet.com/api/container/reward/download/';
	var SUBMIT_HPB_POINT_DATA_URL="http://52.221.217.165/api/submit/HPBPointData";
	var SUBMIT_HPB_REDEMPTION_DATA_URL="http://52.221.217.165/api/submit/HPBRedemptionData";
	var SUBMIT_PRODUCT_RECEIPT_DATA_URL="http://52.221.217.165/api/submit/ProductReceiptData";
	var SUBMIT_REWARD_MASTER_DATA_URL="http://52.221.217.165/api/submit/MasterRewardData";
	var SUBMIT_HPB_REWARD_MASTER_URL="http://52.221.217.165/api/submit/HpbMasterData";
	
	app.byz_hpb_point_data = function(redemDataObj){
		try{
			console.log('byz_hpb_point_data redemDataObj', redemDataObj);
			let obj_data = {};
			obj_data['total'] = 1;
			obj_data['items'] = [];
			let dateObj = new Date(redemDataObj['updated_date']);
			dateObjStr = moment(dateObj).format('YYYY-MM-DD HH:mm:ss');
			app.models.app_hpb.getHpbPoints(redemDataObj['hpb_id'],(err,totalPoints)=>{
				let totalPointsFinal = parseInt(totalPoints) - parseInt(redemDataObj['points_redeemed']);
				let currObj = {
				"hpb_id": redemDataObj['hpb_id'],
				"unique_id": "",
				"points": redemDataObj['points_redeemed'],
				"balance": totalPointsFinal > 0 ? totalPointsFinal : 0,
				"approval_date": dateObjStr
				};
				obj_data['items'].push(currObj);
				let final_data_obj_str = JSON.stringify(obj_data);
				outgoingObj = {};
				outgoingObj['name'] = "SUBMIT HPB Point Data";
				outgoingObj['method'] = "POST";
				outgoingObj['url'] = SUBMIT_HPB_POINT_DATA_URL;
				outgoingObj['body'] = final_data_obj_str;
				outgoingObj['status'] = 0;
				outgoingObj['retries'] = 0;
				app.byz_save_outgoing_request(outgoingObj,0);
			});
			
		}catch(e){
			console.log('byz_hpb_point_data errorr',e)
		}
	}
	app.byz_hpb_redemption_data = function(redemDataObj){
		try{
			console.log('redemDataObj byz_hpb_redemption_data', redemDataObj);
			let obj_data = {};
			obj_data['total'] = 1;
			obj_data['items'] = [];
			currObj = {};
			let sqlQueryReward = `select rm.name, rm.image,rm.status, rm.reward_code ,rc.rew_category_name from [reward_master] rm join reward_category rc on rm.reward_cat_id = rc.rew_category_id where rm.id = ${redemDataObj['reward_id']}`;
			app.dbConnection.execute(sqlQueryReward,[],(errR,rewardDataArr)=>{
			let rewardData = rewardDataArr[0];
			app.models.app_hpb.findOne({where: { hpb_id:redemDataObj['hpb_id'] }}, function(err, hpbData) {
				if(hpbData['uid'] == redemDataObj['created_by']){
					currObj = {
					"order_id": redemDataObj['id'],
					"image": SUBMIT_HPB_REDEMPTION_DATA_IMAGE_URL + rewardData['image'],
					"name": rewardData['name'],
					"points": redemDataObj['points_redeemed'],
					"status": rewardData['status'],
					"category": rewardData['rew_category_name'],
					"code": rewardData['reward_code'],
					"redeemer_id": hpbData['uid'],
					"hpb_id":redemDataObj['hpb_id'],
					"redeemer_name": hpbData['hpb_name'],
					"redeemer_mobile": hpbData['primary_mobile_no'],
					"redeemer_type": "HPB",
					"shipping_address": "idcard",
					"shipping_recipient_name": hpbData['hpb_name'],
					"shipping_recipient_phone": hpbData['primary_mobile_no'],
					"shipping_recipient_address": "",
					"shipping_recipient_city": "",
					"shipping_recipient_subdistrict": "",
					"shipping_recipient_province": "",
					"shipping_recipient_postalcode": ""
					};
					obj_data['items'].push(currObj)
					let final_data_obj_str = JSON.stringify(obj_data);
					outgoingObj = {};
					outgoingObj['name'] = "SUBMIT HPB Redemption Data";
					outgoingObj['method'] = "POST";
					outgoingObj['url'] = SUBMIT_HPB_REDEMPTION_DATA_URL;
					outgoingObj['body'] = final_data_obj_str;
					outgoingObj['status'] = 0;
					outgoingObj['retries'] = 0;
					app.byz_save_outgoing_request(outgoingObj,0);
				}else{
					let sqlQuery = `select * from [User] where id = ${redemDataObj['created_by']}`;
					app.dbConnection.execute(sqlQuery,[],(err,resultObj)=>{
						   let currSphData = resultObj[0];
							currObj = {
							"order_id": redemDataObj['id'],
							"image": SUBMIT_HPB_REDEMPTION_DATA_IMAGE_URL + rewardData['image'],
							"name": rewardData['name'],
							"points": redemDataObj['points_redeemed'],
							"status": rewardData['status'],
							"category": rewardData['rew_category_name'],
							"code": rewardData['reward_code'],
							"redeemer_id": currSphData['id'],
							"hpb_id":redemDataObj['hpb_id'],
							"redeemer_name": currSphData['realm'],
							"redeemer_mobile": currSphData['username'],
							"redeemer_type": "SPH",
							"shipping_address": "idcard",
							"shipping_recipient_name": hpbData['hpb_name'],
							"shipping_recipient_phone": hpbData['primary_mobile_no'],
							"shipping_recipient_address": "",
							"shipping_recipient_city": "",
							"shipping_recipient_subdistrict": "",
							"shipping_recipient_province": "",
							"shipping_recipient_postalcode": ""
							};
							obj_data['items'].push(currObj)
							let final_data_obj_str = JSON.stringify(obj_data);
							outgoingObj = {};
							outgoingObj['name'] = "SUBMIT HPB Redemption Data";
							outgoingObj['method'] = "POST";
							outgoingObj['url'] = SUBMIT_HPB_REDEMPTION_DATA_URL;
							outgoingObj['body'] = final_data_obj_str;
							outgoingObj['status'] = 0;
							outgoingObj['retries'] = 0;
							app.byz_save_outgoing_request(outgoingObj,0);
					});
				}

			});

		   })

		}catch(e){
			console.log('byz_hpb_redemption_data errorr',e)
		}
	}
	app.byz_product_receipt = function(receipt_id){
	try{
			app.models.app_product_receipt.getProductReceiptForAdmin(receipt_id,"","","","","","","","","","","","","","","","","","","","",(err2,resultObjData)=>{
				var receiptDataObj = {};
				resultObjData[0]['created_date'] = moment(resultObjData[0]['created_date']).format('YYYY-MM-DD HH:mm:ss');
				resultObjData[0]['updated_date'] = moment(resultObjData[0]['updated_date']).format('YYYY-MM-DD HH:mm:ss');
				if(resultObjData){
					if(resultObjData[0]['app']['saapproval']==1){
						var dataArr=[];
						var currUid = resultObjData[0]['created_by'];
						var sqlQuery=`exec relatedUserFetch ${currUid}`;
						app.dbConnection.execute(sqlQuery,dataArr,(err,resultObjArrs)=>{
							async.each(resultObjArrs,(resultObj,callback)=>{
								if(resultObj['uid']>0 && (resultObj['rolename']=='$ac')){
									var quantity = resultObjData[0]['quantity'];
									var value = resultObjData[0]['unit_value'];
									var valueTonne = ((quantity * value)/1000);
									receiptDataObj.total = 1;
									receiptDataObj['items'] = [];
									receiptDataObj['items'][0] = {};
									receiptDataObj['items'][0]['product_details'] = [];
									receiptDataObj['items'][0]['product_details'][0] = {};
									receiptDataObj['items'][0]['receipt_id'] = resultObjData[0]['receipt_id'];
									receiptDataObj['items'][0]['ac_name'] = resultObj['realm'];
									receiptDataObj['items'][0]['sph_name'] = resultObjData[0]['sph_name'];
									receiptDataObj['items'][0]['sph_mobile'] = resultObjData[0]['sph_mobile'];
									receiptDataObj['items'][0]['created_date'] = resultObjData[0]['created_date'];
									receiptDataObj['items'][0]['updated_date'] = resultObjData[0]['updated_date'];
									receiptDataObj['items'][0]['product_details'][0]['name'] = resultObjData[0]['product'];
									receiptDataObj['items'][0]['product_details'][0]['quantity'] = quantity;
									receiptDataObj['items'][0]['product_details'][0]['unit'] = resultObjData[0]['unit'];
									receiptDataObj['items'][0]['product_details'][0]['value'] = value;
									receiptDataObj['items'][0]['product_details'][0]['quantity_tonnes'] = valueTonne;
									receiptDataObj['items'][0]['project_type'] = resultObjData[0]['project_type'];
									
									if(receiptDataObj){
										let final_data_obj_str = JSON.stringify(receiptDataObj);
										outgoingObj = {};
										outgoingObj['name'] = "SUBMIT PRODUCT RECEIPT DATA";
										outgoingObj['method'] = "POST";
										outgoingObj['url'] = SUBMIT_PRODUCT_RECEIPT_DATA_URL;
										outgoingObj['body'] = final_data_obj_str;
										outgoingObj['status'] = 0;
										outgoingObj['retries'] = 0;
										app.byz_save_outgoing_request(outgoingObj,0);
									}
								}
							},(err)=>{
								console.log("receiptDataObj", receiptDataObj);
							});
						});
					}
				}else{
					console.log("receiptDataObj Null", receiptDataObj);
				}
			});
		}catch(e){
			console.log('product_receipt errorr',e);
		}	
	}
	app.byz_reward_master_data = function(DataObj){
		try{
			console.log('DataObj', DataObj);
			let obj_data = {};
			obj_data['total'] = 1;
			obj_data['items'] = [];
			let updateDate = new Date(DataObj['updated_date']);
			let createDate = new Date(DataObj['created_date']);
			DataObj['updated_date'] = moment(updateDate).format('YYYY-MM-DD HH:mm:ss');
			DataObj['created_date'] = moment(createDate).format('YYYY-MM-DD HH:mm:ss');
			
			obj_data['items'].push(DataObj)
			let final_data_obj_str = JSON.stringify(obj_data);
			outgoingObj = {};
			outgoingObj['name'] = "SUBMIT REWARD MASTER DATA";
			outgoingObj['method'] = "POST";
			outgoingObj['url'] = SUBMIT_REWARD_MASTER_DATA_URL;
			outgoingObj['body'] = final_data_obj_str;
			outgoingObj['status'] = 0;
			outgoingObj['retries'] = 0;
			app.byz_save_outgoing_request(outgoingObj,0);
		}catch(e){
			console.log('byz_hpb_point_data errorr',e)
		}
	}

	app.byz_hpb_reward_master_add = function(outgoingObj,resp){
		try{
			console.log("resp['result'].id=====>",resp['result'].id);
			outgoingObj['created_date'] =  moment(resp['result'].updated_date).format('YYYY-MM-DD HH:mm:ss');
			outgoingObj['updated_date'] =  moment(resp['result'].updated_date).format('YYYY-MM-DD HH:mm:ss');
			app.get_hpb_all_data(resp['result'].id).then((pointObj)=>{
				// 1 => Preparing body object start
					//console.log("<======outgoingObj======>",Object.assign(pointObj['result'], outgoingObj));
					console.log("pointObj===>",pointObj);
					var call_out_body = {};
					call_out_body['total'] = 1;
					call_out_body['items'] = [];
					call_out_body['items'][0] = {};
					call_out_body['items'][0]['brand'] = pointObj['brand']?pointObj['brand']:'';
					call_out_body['items'][0]['district'] = pointObj['district']?pointObj['district']:'';
					call_out_body['items'][0]['city'] = pointObj['city']?pointObj['city']:'';
					call_out_body['items'][0]['region'] = pointObj['region']?pointObj['region']:'';
					call_out_body['items'][0]['segment'] = pointObj['segment']?pointObj['segment']:'';
					call_out_body['items'][0]['hpb_status'] = outgoingObj['hpb_status'];
					call_out_body['items'][0]['name'] = pointObj['name']?pointObj['name']:'';
					call_out_body['items'][0]['place_of_birth'] = outgoingObj['place_of_birth'];
					call_out_body['items'][0]['date_of_birth'] = moment(outgoingObj['date_of_birth']).format('YYYY-MM-DD');
					call_out_body['items'][0]['id_card_number'] = outgoingObj['id_card_number'];
					call_out_body['items'][0]['id_card_address'] = outgoingObj['id_card_address'];
					call_out_body['items'][0]['id_card_city'] = outgoingObj['id_card_city'];
					call_out_body['items'][0]['id_card_subdistrict'] = outgoingObj['id_card_sub_district'];
					call_out_body['items'][0]['id_card_province'] = outgoingObj['id_card_province'];
					call_out_body['items'][0]['id_card_postal_code'] = outgoingObj['id_card_pincode'];
					call_out_body['items'][0]['domicile_address'] = outgoingObj['domicile_address'];
					call_out_body['items'][0]['domicile_city'] = outgoingObj['domicile_city'];
					call_out_body['items'][0]['domicile_subdistrict'] = outgoingObj['domicile_sub_district'];
					call_out_body['items'][0]['domicile_province'] = outgoingObj['domicile_province'];
					call_out_body['items'][0]['domicile_postal_code'] = outgoingObj['domicile_pincode'];
					call_out_body['items'][0]['primary_mobile'] = outgoingObj['primary_mobile_no'];
					call_out_body['items'][0]['secondary_mobile'] = outgoingObj['secondary_mobile_no'];
					call_out_body['items'][0]['unique_id'] = '';
					call_out_body['items'][0]['hpb_id'] = resp['result'].id;
					call_out_body['items'][0]['points_total'] = pointObj['points_total']?pointObj['points_total']:0;
					call_out_body['items'][0]['points_redeemed'] = pointObj['points_redeemed']?pointObj['points_redeemed']:0;
					call_out_body['items'][0]['points_balance'] = pointObj['points_balance']?pointObj['points_balance']:0;
					call_out_body['items'][0]['dana_desa_reward'] = pointObj['dana_desa_reward']?pointObj['dana_desa_reward']:0;
					call_out_body['items'][0]['created_date'] = outgoingObj['created_date'];
					call_out_body['items'][0]['updated_date'] = outgoingObj['updated_date'];
					
				// 1 => Preparing body object end

				// 2 => dataArrObj_callOut start
					dataArrObj_callOut = {};
					dataArrObj_callOut['name'] = 'HPB MASTER DATA';
					dataArrObj_callOut['url'] = SUBMIT_HPB_REWARD_MASTER_URL;
					dataArrObj_callOut['method'] = 'POST';
					dataArrObj_callOut['body'] = JSON.stringify(call_out_body);
					dataArrObj_callOut['status'] = 0;
				
					console.log("dataArrObj_callOut=>",dataArrObj_callOut);

					app.byz_save_outgoing_request(dataArrObj_callOut,0);
			})
		}catch(e){
			console.log('byz_hpb_reward_master_add', e);
		}
	}

	app.byz_hpb_reward_master_edit = function(hpb_id){
		try{
			app.get_hpb_all_data(hpb_id).then((pointObj)=>{
				
					console.log("<======pointObj======>",pointObj);
					var selQry = "select * from [hpb_info_tbl] where hpb_id ="+hpb_id;

					app.dbConnection.execute(selQry,[],(err,editdata)=>{
						console.log("<======editdata======>",editdata);
						editdata[0]['created_date'] = moment(editdata[0]['created_date']).format('YYYY-MM-DD HH:mm:ss');
						editdata[0]['updated_date'] = moment(editdata[0]['updated_date']).format('YYYY-MM-DD HH:mm:ss');
						if(!err){
							// 1 => Preparing body object start	
								var call_out_body = {};
								call_out_body['total'] = 1;
								call_out_body['items'] = [];
								call_out_body['items'][0] = {};
								call_out_body['items'][0]['brand'] = pointObj['brand']?pointObj['brand']:'';
								call_out_body['items'][0]['district'] = pointObj['district']?pointObj['district']:'';
								call_out_body['items'][0]['city'] =  pointObj['city']?pointObj['city']:'';
								call_out_body['items'][0]['region'] = pointObj['region']?pointObj['region']:'';
								call_out_body['items'][0]['segment'] = pointObj['segment']?pointObj['segment']:'';
								call_out_body['items'][0]['hpb_status'] = editdata[0]['hpb_status'];
								call_out_body['items'][0]['name'] = pointObj['name']?pointObj['name']:'';
								call_out_body['items'][0]['place_of_birth'] = editdata[0]['place_of_birth'];
								call_out_body['items'][0]['date_of_birth'] = moment(editdata[0]['date_of_birth']).format('YYYY-MM-DD');
								call_out_body['items'][0]['id_card_number'] = editdata[0]['id_card_number'];
								call_out_body['items'][0]['id_card_address'] = editdata[0]['id_card_address'];
								call_out_body['items'][0]['id_card_city'] = editdata[0]['id_card_city'];
								call_out_body['items'][0]['id_card_subdistrict'] = editdata[0]['id_card_sub_district'];
								call_out_body['items'][0]['id_card_province'] = editdata[0]['id_card_province'];
								call_out_body['items'][0]['id_card_postal_code'] = editdata[0]['id_card_pincode'];
								call_out_body['items'][0]['domicile_address'] = editdata[0]['domicile_address'];
								call_out_body['items'][0]['domicile_city'] = editdata[0]['domicile_city'];
								call_out_body['items'][0]['domicile_subdistrict'] = editdata[0]['domicile_sub_district'];
								call_out_body['items'][0]['domicile_province'] = editdata[0]['domicile_province'];
								call_out_body['items'][0]['domicile_postal_code'] = editdata[0]['domicile_pincode'];
								call_out_body['items'][0]['primary_mobile'] = editdata[0]['primary_mobile_no'];
								call_out_body['items'][0]['secondary_mobile'] = editdata[0]['secondary_mobile_no'];
								call_out_body['items'][0]['unique_id'] = '';
								call_out_body['items'][0]['hpb_id'] = hpb_id;
								call_out_body['items'][0]['points_total'] = pointObj['points_total']?pointObj['points_total']:0;
								call_out_body['items'][0]['points_redeemed'] = pointObj['points_redeemed']?pointObj['points_redeemed']:0;
								call_out_body['items'][0]['points_balance'] = pointObj['points_balance']?pointObj['points_balance']:0;
								call_out_body['items'][0]['dana_desa_reward'] = pointObj['dana_desa_reward']?pointObj['dana_desa_reward']:0;
								call_out_body['items'][0]['created_date'] = editdata[0]['created_date'];
								call_out_body['items'][0]['updated_date'] = editdata[0]['updated_date'];
							// 1 => Preparing body object end

							// 2 => dataArrObj_callOut start
								dataArrObj_callOut = {};
								dataArrObj_callOut['name'] = 'HPB MASTER DATA';
								dataArrObj_callOut['url'] = SUBMIT_HPB_REWARD_MASTER_URL;
								dataArrObj_callOut['method'] = 'POST';
								dataArrObj_callOut['body'] = JSON.stringify(call_out_body);
								dataArrObj_callOut['status'] = 0;
							
								console.log("dataArrObj_callOut=>",dataArrObj_callOut);

								app.byz_save_outgoing_request(dataArrObj_callOut,0);
								
						}
					});
				
			})
		}catch(e){
			console.log('byz_hpb_reward_master_edit', e);
		}
	}

	app.byz_hpb_all_point_data = function(hpb_id){
		return new Promise((resolve,reject)=>{
			var pointobj = {'points_total':0,
							'points_redeemed':0,
							'points_balance':0,
							'dana_desa_reward':0
						};
			var sqlQuery = "select sum(points) as points, (select previous_points from hpb_info_tbl where hpb_id = (?)) as old_points from  [products_receipt_tbl] where hpb_id = (?)";
			app.dbConnection.execute(sqlQuery,[hpb_id,hpb_id],(err,resultObj)=>{

				if(resultObj.length > 0){
					var points = (resultObj[0].points + resultObj[0].old_points);
					pointobj['points_total'] = points?points:0;
					
					var pointsRedeemed = "select sum(points_redeemed) as redeemed from [reward_claims_tbl] where hpb_id = (?) ";
					app.dbConnection.execute(pointsRedeemed,[hpb_id],(err,resultRedeemObj)=>{
						
						var redeemed = 0;
						if(resultRedeemObj.length > 0){
						redeemed = resultRedeemObj[0].redeemed==null?0:resultRedeemObj[0].redeemed;
						}
						pointobj['points_redeemed'] = redeemed?redeemed:0;
						var pointsLeft = points - redeemed;
						pointobj['points_balance'] = pointsLeft?pointsLeft:0;
						pointobj['dana_desa_reward'] = 0;
						resolve(pointobj);
					});
					
				}else{
					resolve(pointobj);
				}
			});
		})
        
	}
	
	app.get_hpb_all_data = function(hpb_id) {
		return new Promise((resolve,reject)=>{
			var dataArr = [];
			var returnObj = {};
			
			// get points data
			app.byz_hpb_all_point_data(hpb_id).then((res) => {
				console.log("res=>",res);
				Object.assign(returnObj, res);
				var sqlQuery = "select hpb_id, hpb_status, hpb_name as name, hpb_type as segment from [hpb_info_tbl] where hpb_id = (?)";
				dataArr.push(hpb_id);
		
				app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
					var errObj = null;
					if (err) {
						errObj = err;
						resolve(errObj);
					}
					Object.assign(returnObj, resultObj[0]);
		
					// to get brand name
					sqlQuery = "SELECT TOP 1 name AS brand FROM [products_tbl] p JOIN [products_receipt_tbl] pr ON p.id = pr.product_id JOIN [hpb_info_tbl] hi ON hi.hpb_id = pr.hpb_id WHERE hi.hpb_id = (?) ORDER BY pr.created_date asc, pr.receipt_id";
					app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
						if (err) {
							errObj = err;
							resolve(errObj);
						}
						Object.assign(returnObj, resultObj[0]);
		
						// to get city, district, region
						sqlQuery = "SELECT DISTINCT mc.name as city, d.name as district, r.name as region FROM hpb_info_tbl hi JOIN user_mapping um ON hi.uid = um.uid JOIN postal_code pc ON um.meta_value = pc.id JOIN subdistrict sd ON pc.subdistrict_id = sd.id JOIN municipality mc ON sd.municipality_id = mc.id JOIN district d ON mc.district_id = d.id JOIN province p ON d.province_id = p.id JOIN region r ON p.region_id = r.id WHERE hi.hpb_id = (?)";
						app.dbConnection.execute(sqlQuery,dataArr,(err,resultArr)=>{
							// console.log('resultArr', resultArr);
							if (err) {
								errObj = err;
								resolve(errObj);
							} else {
								var cityArr = [];
								var distArr = [];
								var regionArr = [];
								var finalObj = {};
								for (let key in resultArr) {
									cityArr.push(resultArr[key].city);
									distArr.push(resultArr[key].district); 
									regionArr.push(resultArr[key].region);  
								}
		
								var uniqueCityArr = cityArr.filter( onlyUnique );
								var uniqueDistArr = distArr.filter( onlyUnique );
								var uniqueRegionArr = regionArr.filter( onlyUnique );
		
								finalObj.city = uniqueCityArr.join(', ');
								finalObj.district = uniqueDistArr.join(', ');
								finalObj.region = uniqueRegionArr.join(', ');
								Object.assign(returnObj, finalObj);
								console.log("returnObj===>",returnObj);
								resolve(returnObj);
							}
						})
					})
				})
			});
			
		})
		function onlyUnique(value, index, self) { 
			return self.indexOf(value) === index;
		}
	}

	app.byz_save_outgoing_request = function(outgoingObj,id){
		try{
			if (id == 0){
				let dataArr = [];
				let paramsArr = [];
				let dateCurr = Math.floor(Date.now()); 
				outgoingObj['created_date'] = dateCurr;
				outgoingObj['updated_date'] = dateCurr;
				for(let key in outgoingObj) {
					dataArr.push(outgoingObj[key]);
					paramsArr.push("(?)");
				}
				let paramsKey = paramsArr.join(', ');
				let keyString = Object.keys(outgoingObj).join(', ');
				let sqlQuery = "insert into [call_outgoing] ("+keyString+") OUTPUT Inserted.id values ("+paramsKey+")";
				app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
					console.log('byz_save_outgoing_request result', resultObj); 
					console.log('byz_save_outgoing_request error',err);                       
				});
			}
		}catch(e){
			console.log('byz_save_outgoing_request error', e);
		}
	}
}