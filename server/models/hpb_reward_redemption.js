'use strict';
var _ = require('lodash');
module.exports = function(Redemp) {

    Redemp.updateRewardRedemptionByzantine = function(dataArrObj,cb){
        var result = {};
        if(!(_.isEmpty(dataArrObj))){

            if(dataArrObj['order_id'] && dataArrObj['points'] && dataArrObj['status'] && dataArrObj['reason'] && _.size(dataArrObj)==4){
                var dataArr = [];
                var paramsArr = [];
                var updated_date = Math.floor(Date.now());
    
                for(var o in dataArrObj) {
                    //skip role index.
                    if(o == 'status'){
                       var status = (dataArrObj[o]=='accepted'?1:-1);
                        dataArr.push(status);
                        paramsArr.push(o+"=(?)");
                    }
                    if(o == 'reason'){
                        dataArr.push(dataArrObj[o]);
                        paramsArr.push("rejected_reason = (?)");
                    }
                }

                dataArr.push(updated_date);
                paramsArr.push("updated_date = (?)");
    
                if(dataArr.length>0 && paramsArr.length>0){
                    let paramsKey= paramsArr.join(', ');
                    var whereCond = 'where id = (?)';
                    dataArr.push(dataArrObj['order_id']);
                    var updateQry = "update [reward_claims_tbl] set "+paramsKey+" "+whereCond;
                    Redemp.app.dbConnection.execute(updateQry,dataArr,(err,resultObj)=>{
                        if(!err){
                            result.error = 0;
                            result.message = "Updated with 0 error";
                            cb(null,result);
                        }else{
                            result.error = 1;
                            result.message = err;
                            cb(null,result);
                        }
                        
                    });
                }else{
                    result.error = 1;
                    result.message = "missing keys:status and reason in body params";
                    cb(null,result);
                }
            }else{
                result.error = 1;
                result.message = "inappropriate body params";
                cb(null,result);
            }
            
        }else{
            result.error = 1;
            result.message = "No body params present";
            cb(null,result);
        }
    }

    Redemp.remoteMethod('updateRewardRedemptionByzantine',{
		http:{ path:'/updateRewardRedemptionByzantine', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
				],
		returns:{ arg: 'result', type: 'object'}
	});

}