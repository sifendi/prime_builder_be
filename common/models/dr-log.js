'use strict';

module.exports = function(Drlog) {
	Drlog.addDrLog = function(userid,password,sender,messageId,deliverystatus,datehit,datereceived,cb){
		
		if((userid!="" && typeof(userid)!="undefined") && (password!="" && typeof(password)!="undefined") && (messageId!=""  && typeof(messageId)!="undefined") && (sender!=""  && typeof(sender)!="undefined") && (deliverystatus!=""  && typeof(deliverystatus)!="undefined") && (datehit!=""  && typeof(datehit)!="undefined") && (datereceived!=""  && typeof(datereceived)!="undefined")){
			var created_date = Math.floor(Date.now());
			
			// add the product receipt
			var sqlQuery = "insert into [sms_dr_log] (userid,password,sender,messageId,delivery_status,date_hit,date_received,created_date) OUTPUT Inserted.dr_id values ((?),(?),(?),(?),(?),(?),(?),(?))";
			var dataArr = [userid,password,sender,messageId,deliverystatus,datehit,datereceived,created_date];
			
			Drlog.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
				var result = {};
				try{
					if(resultObj.length > 0){
						result.id = resultObj[0].dr_id;
						result.updated_date = created_date;
						result.status = "success";
					}
				}catch(ee){
						
				}
				
				cb(err,result);
			});
		}else{
			var result = {};
			result.status = "failed";
			cb(null,result);
		}
	}
	
	Drlog.remoteMethod('addDrLog',{
		http:{ path: '/addDrLog', verb: 'get'},
		accepts:[
					{ arg: 'userid', type:'string', http:{ source:"query"} },
					{ arg: 'password', type:'string', http:{ source:"query"} },
					{ arg: 'sender', type:'string', http:{ source:"query"} },
					{ arg: 'messageId', type:'string', http:{ source:"query"} },
					{ arg: 'deliverystatus', type:'number', http:{ source:"query"} },
					{ arg: 'datehit', type:'string', http:{ source:"query"} },
					{ arg: 'datereceived', type:'string', http:{ source:"query"} }
				],
		returns:{ arg: 'result', type: 'object' }
	});
};