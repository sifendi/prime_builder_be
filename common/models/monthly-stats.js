'use strict';

module.exports = function(Monthlystats) {
	
	Monthlystats.getStats = function(sph_id,stat_date,am_id,cb){
		var dataArr = [];
		
		if(am_id!="" && typeof(am_id)!="undefined"){
			var sqlQuery = 	`select m.* from [monthly_stats] m, [User] u where m.sph_id = u.id and m.sph_id in ( 
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
			dataArr.push(am_id);
		}else{
			var sqlQuery = "SELECT * FROM [monthly_stats] m where 1=1 ";
		}
		
		if(sph_id){
			sph_id = JSON.parse("[" + sph_id + "]");
			var sphId = "";
			for(var i=0; i<sph_id.length; i++){
				
				if(sph_id.length == i+1){
					sphId+="'"+sph_id[i]+"'";
				}else{
					sphId+="'"+sph_id[i]+"',";
				}
				
			}
			sqlQuery+= " AND m.sph_id IN ("+sphId+")";
		}
		
		if(stat_date){
			sqlQuery+=" AND m.stat_date = (?)";
			dataArr.push(stat_date);
		}
		
		Monthlystats.app.dbConnection.execute(sqlQuery,dataArr,(err,resultObject)=>{
			cb(null,resultObject);
		});
	}
	
	Monthlystats.remoteMethod('getStats',{
		http:{ path:'/getStats', verb: 'GET' },
		accepts:[
				{ arg:'sph_id', type:'array' },
				{ arg:'stat_date', type:'string' },
				{ arg:'am_id', type:'number' },
		],
		returns: { arg: 'result', type: 'object'}
	});
	
	Monthlystats.getDistinctTargetLabel = function(cb){
		var dataArr = [];
		
		var sqlQuery = "SELECT distinct target_for FROM [monthly_stats] where target_for not in ('srku_vol','new_switching_hpb','cement_vol_switching','srku_house_num','cement_vol_maintain')";
		Monthlystats.app.dbConnection.execute(sqlQuery,null,(err,resultObject)=>{
			cb(null,resultObject);
		});
	}
	
	Monthlystats.remoteMethod('getDistinctTargetLabel',{
		http:{ path:'/getDistinctTargetLabel', verb: 'GET' },
		accepts:[],
		returns: { arg: 'result', type: 'object'}
	});
};