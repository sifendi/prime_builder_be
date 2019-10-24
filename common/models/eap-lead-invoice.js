'use strict';

module.exports = function(Eapleadinvoice) {
	
	// to add/edit lead
	Eapleadinvoice.addEditInvoice = function(dataArrObj,invoice_id,cb){
		
		if(invoice_id){
			// Eapleadinvoice.findOne({ where:{invoice_id:invoice_id}}, function(err,invoiceData){
				
			// 	if(invoiceData){
					var leadApi = Eapleadinvoice.app.models.eap_lead;
					leadApi.findOne({ where:{lead_id:dataArrObj.invoice_lead_id}}, function(err,leadData){
						if(leadData!=null){
							var updated_date = Math.floor(Date.now()); // to get server created date
							dataArrObj.updated_date = updated_date;
							
							var dataArr = [];
							var paramsArr = [];
							
							for(var o in dataArrObj) {
								dataArr.push(dataArrObj[o]);
								paramsArr.push(o+"=(?)");
							}
							
							let paramsKey= paramsArr.join(', ');
							var whereCond = 'where invoice_id = (?)';
							dataArr.push(invoice_id);
							var sqlQuery = "update [eap_lead_invoice] set "+paramsKey+" "+whereCond;
						
							Eapleadinvoice.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
								var result = {};
								result.id = invoice_id;
								result.updated_date = dataArrObj.updated_date;
								cb(err,result);
							});
						}
						else{
							cb(null,"Invalid Lead");
						}
					});
			// 	}
			// 	else{
			// 		cb("Invalid invoice Id",null);
			// 	}
			// });
		}
		else{
			
			var leadApi = Eapleadinvoice.app.models.eap_lead;
			leadApi.findOne({ where:{lead_id:dataArrObj.invoice_lead_id}}, function(err,leadData){
				if(leadData!=null){
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
					var sqlQuery = "insert into [eap_lead_invoice] ("+keyString+") OUTPUT Inserted.invoice_id values ("+paramsKey+")";

					Eapleadinvoice.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
						var result = {};
						if(resultObj.length > 0){
							result.id = resultObj[0].invoice_id;
							result.updated_date = created_date;
						}
						cb(err,result);
					});
				}
				else{
					cb(null,"Invalid Lead");
				}
			});
		}
	}
	
	Eapleadinvoice.remoteMethod('addEditInvoice',{
		http:{ path:'/addEditInvoice', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'invoice_id', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});

	
	// to add/edit lead
	Eapleadinvoice.getInvoice = function(dataArrObj,limit,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var sqlQuery = "select ec.*, el.lead_name, p.name as productname ,u1.realm as createdBy,ea.approval_status,ea.rejection_reason,rds.rds_name as eapRdsName,mrds.rds_name as mRdsName, dist.name as district, subdist.name as subdistrict from eap_lead_invoice ec join eap_lead el on ec.invoice_lead_id = el.lead_id join eap_approval ea on ea.type_id=ec.invoice_id and ea.type='invoice' join products_tbl p on p.id=ec.invoice_product_id join [User] u1 on ec.created_by = u1.id left join eap_retailer_distributor rds on rds.id=ec.invoice_rds_id and ec.invoice_rds_tag = 'eap' left join retailer_distributor_master mrds on mrds.id=ec.invoice_rds_id and ec.invoice_rds_tag = 'hpb' left join municipality dist on dist.id=ec.invoice_city left join subdistrict subdist on subdist.id=ec.invoice_sub_district where 1=1"
		for(var o in dataArrObj) {
			if(o == "created_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" > (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND ec."+o+" < (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "approval_status"){
				if(dataArrObj[o]!=''||dataArrObj[o]===0){
					sqlQuery+=" AND ea.approval_status = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			else if(o =="purchaseDateFrom"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec.invoice_purchase_date >= (?)"
					leadArr.push(dataArrObj['purchaseDateFrom']);
				
				}
			}
			else if(o =="purchaseDateTo"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec.invoice_purchase_date <= (?)"
					leadArr.push(dataArrObj['purchaseDateTo']);
				
				}
			}
			else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}else{
				if(o=='limit'){
					if(!dataArrObj['page']){ dataArrObj['page'] = 0; }
					var offset = dataArrObj['page']*dataArrObj['limit'];
					
					sqlQuery+="  ORDER BY ec.invoice_id DESC  OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY ";
					leadArr.push(offset,dataArrObj[o]);
				}
			}
		}

		Eapleadinvoice.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	
	}
	
	Eapleadinvoice.remoteMethod('getInvoice',{
		http:{ path:'/getInvoice', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
					{ arg: 'limit', type:'any', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object'}
	});


	Eapleadinvoice.getInvoiceCount = function(dataArrObj,cb){
		
		var leadArr = [];
		var paramsArr = [];
		var sqlQuery = "select count(invoice_id) as total from eap_lead_invoice ec join eap_lead el on ec.invoice_lead_id = el.lead_id join eap_approval ea on ea.type_id=ec.invoice_id and ea.type='invoice' where 1=1 ";
		var DateFilCount = 0 ;
		for(var o in dataArrObj) {
			
			if(o == "created_date"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" > (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			else if(o == "updated_date"){
				sqlQuery+=" AND ec."+o+" < (?)";
				leadArr.push(dataArrObj[o]);
			}
			else if(o == "approval_status"){
				//console.log(dataArrObj[o]);
				if(dataArrObj[o]!=''||dataArrObj[o]===0){
					//console.log(o);
					sqlQuery+=" AND ea.approval_status = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			else if(o =="purchaseDateFrom"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec.invoice_purchase_date >= (?)"
					leadArr.push(dataArrObj['purchaseDateFrom']);
				
				}
			}
			else if(o =="purchaseDateTo"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec.invoice_purchase_date <= (?)"
					leadArr.push(dataArrObj['purchaseDateTo']);
				
				}
			}
			else if(o != "limit" && o != "page"){
				if(dataArrObj[o]!=''){
					sqlQuery+=" AND ec."+o+" = (?)";
					leadArr.push(dataArrObj[o]);
				}
			}
			
		}
		//console.log(dataArrObj,sqlQuery,leadArr);
		Eapleadinvoice.app.dbConnection.execute(sqlQuery,leadArr,(err,resultObj)=>{
			cb(err,resultObj);
		})
	
	}
	
	Eapleadinvoice.remoteMethod('getInvoiceCount',{
		http:{ path:'/getInvoiceCount', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
				],
		returns:{ arg: 'result', type: 'object'}
	});
	
};