'use strict';
var _ = require('lodash');
var async = require('async');

module.exports = function(DashboardApi) {
    DashboardApi.overviewDashboardByzantine = function(dataArrObj,cb){
        // console.log('hiiiiiiiiiiiiiiiiii',);
            var result={};
            // validate if this user has checked in
            var dataAry=[];
            var regQuery = `SELECT COUNT(DISTINCT(hpb.hpb_id)) as count_hpb,r.id,r.name
            FROM dbo.region as r 
            INNER JOIN dbo.province as p on p.region_id = r.id 
            INNER JOIN dbo.district as d on d.province_id = p.id 
            INNER JOIN dbo.municipality as m on m.district_id = d.id 
            INNER JOIN dbo.subdistrict as s on s.municipality_id = m.id 
            INNER JOIN dbo.postal_code as po on po.subdistrict_id=s.id
            INNER JOIN dbo.user_mapping as um on po.id = um.meta_value AND um.meta_key='postal_code'
            INNER JOIN dbo.hpb_info_tbl as hpb on hpb.uid = um.uid
            GROUP by r.id,r.name`
			DashboardApi.app.dbConnection.execute(regQuery,dataAry, function(err,regionIds){
                if(err){console.log('no mapped',err);}
                // console.log('total regions',regionIds);
                result["total"]=_.size(regionIds);
                var items = [];
                // for (let rId of regionIds) {
                async.each(regionIds,(rId,callback)=>{
                    var resObj={};
                    resObj["region_id"]=rId.id;
                    resObj["region_name"]=rId.name;
                    resObj["count_hpb"]=rId.count_hpb;
                    var rewardAry=[rId.id];
                    var rewardQuery = `SELECT COUNT(DISTINCT(hpb.hpb_id)) as count_hpb_points_awarded,r.id,r.name
                    FROM dbo.region as r 
                    INNER JOIN dbo.province as p on p.region_id = r.id 
                    INNER JOIN dbo.district as d on d.province_id = p.id 
                    INNER JOIN dbo.municipality as m on m.district_id = d.id 
                    INNER JOIN dbo.subdistrict as s on s.municipality_id = m.id 
                    INNER JOIN dbo.postal_code as po on po.subdistrict_id=s.id
                    INNER JOIN dbo.user_mapping as um on po.id = um.meta_value AND um.meta_key='postal_code'
                    INNER JOIN dbo.hpb_info_tbl as hpb on hpb.uid = um.uid
                    INNER JOIN dbo.products_receipt_tbl as prt on hpb.hpb_id = prt.hpb_id AND prt.points>0
                    where r.id =(?)
                    GROUP by r.id,r.name`
                    DashboardApi.app.dbConnection.execute(rewardQuery,rewardAry, function(err,rewardHpbIds){
                        if(err){console.log('no mapped',err);}
                        // console.log('this hpbIds',_.size(rewardHpbIds));
                        if(_.size(rewardHpbIds)>0){
                            resObj["count_hpb_points_awarded"] = rewardHpbIds[0].count_hpb_points_awarded;
                        }else{
                            resObj["count_hpb_points_awarded"] = 0;
                        }
                        var redeemedAry=[rId.id];
                        var redeemedQuery=`SELECT COUNT(DISTINCT(hpb.hpb_id)) as count_hpb_points_redeemed,r.id,r.name
                        FROM dbo.region as r 
                        INNER JOIN dbo.province as p on p.region_id = r.id 
                        INNER JOIN dbo.district as d on d.province_id = p.id 
                        INNER JOIN dbo.municipality as m on m.district_id = d.id 
                        INNER JOIN dbo.subdistrict as s on s.municipality_id = m.id 
                        INNER JOIN dbo.postal_code as po on po.subdistrict_id=s.id
                        INNER JOIN dbo.user_mapping as um on po.id = um.meta_value AND um.meta_key='postal_code'
                        INNER JOIN dbo.hpb_info_tbl as hpb on hpb.uid = um.uid
                        INNER JOIN dbo.reward_claims_tbl as rct on hpb.hpb_id = rct.hpb_id AND rct.status=1
                        where r.id =(?)
                        GROUP by r.id,r.name`
                        DashboardApi.app.dbConnection.execute(redeemedQuery,redeemedAry, function(err,redeemedHpbIds){
                            if(err){console.log('no mapped',err);}
                            if(_.size(redeemedHpbIds)>0){
                                resObj["count_hpb_points_redeemed"] = redeemedHpbIds[0].count_hpb_points_redeemed;
                            }else{
                                resObj["count_hpb_points_redeemed"] = 0;
                            }
                            items.push(resObj);
                            callback();
                        });
                    });
                },()=>{
                    result["items"]=items;
                    // console.log('data',result);
                    cb(null,result);
                })
                // }
			});
		}
	
	
        DashboardApi.remoteMethod('overviewDashboardByzantine',{
            http:{ path: '/overviewDashboardByzantine', verb: 'GET' },
            accepts:[
                        { arg: 'dataArrObj', type:'object', http:{ source:"body"} },
                    ],
            returns:{ arg: 'result', type: 'object' }
	    });
}; 
 