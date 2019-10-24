'use strict';
var _ = require('lodash');
module.exports = function(Updatepoint) {

    Updatepoint.updateHpbPointsByzantine = function(dataArrObj,cb){
        var result = {};
        if(!(_.isEmpty(dataArrObj))){

            if(dataArrObj['order_id'] && dataArrObj['redeemer_id'] && dataArrObj['redeemer_type'] && dataArrObj['points']  && dataArrObj['status'] && dataArrObj['reason'] && _.size(dataArrObj)==6){
                
                var dataArr = [];
                var paramsArr = [];
                var created_date = Math.floor(Date.now());
                dataArrObj['created_date'] = created_date;

                for(var o in dataArrObj) {
                    //skip role index.
                     if(o == 'points' && dataArrObj['status']=='deduction'){
                         var dec = - dataArrObj[o];
                        dataArr.push(dec);
                        paramsArr.push("(?)");
                     }else{
                        dataArr.push(dataArrObj[o]);
                        paramsArr.push("(?)");
                     }           
                }
              
    
                if(dataArr.length>0 && paramsArr.length>0){
                    let paramsKey= paramsArr.join(', ');
                    let keyString = Object.keys(dataArrObj).join(', ');
                    
                    var sqlQuery = "insert into [mason_point_tbl] ("+keyString+") values ("+paramsKey+")";
                    Updatepoint.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObj)=>{
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
                    result.message = "missing keys:parameters in body params";
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

    Updatepoint.remoteMethod('updateHpbPointsByzantine',{
		http:{ path:'/updateHpbPointsByzantine', verb: 'post'},
		accepts:[
					{ arg: 'dataArrObj', type:'object', http:{ source:"body"} },
				],
		returns:{ arg: 'result', type: 'object'}
	});

}