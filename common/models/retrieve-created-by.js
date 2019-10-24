'use strict';

module.exports = function(Retrievecreatedby) {
	
	Retrievecreatedby.getCreatedBy = function(tablename,limit,page,name,cb){
		if(tablename == "eap_retailer_distributor"){
			var sqlQuery = "select distinct u.realm as sph_name, u.id as user_id from "+tablename+" tb join [User] u on tb.created_by = u.id and tb.rds_status = 1";
		}else{
			var sqlQuery = "select distinct u.realm as sph_name, u.id as user_id from "+tablename+" tb join [User] u on tb.created_by = u.id and tb.status = 1";
		}
		
		var dataArr = [];
		
		if(name){
			sqlQuery+=" AND u.realm like (?)";
			name = "%"+name+"%";
			dataArr.push(name);
		}
		
		sqlQuery+=" ORDER BY u.realm";
		console.log('limit', limit);
		console.log('page', page);
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			sqlQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Retrievecreatedby.app.dbConnection.execute(sqlQuery,dataArr,(err,result)=>{
			cb(err,result);
		});
	}
	
	Retrievecreatedby.remoteMethod('getCreatedBy',{
		http:{ path:'/getCreatedBy', verb:'GET' },
		accepts:[
					{ arg:'tablename', type:'string', http:{ source:'query'}},
					{ arg:'limit', type:'any', http:{ source:'query'}},
					{ arg:'page', type:'any', http:{ source:'query'}},
					{ arg:'name', type:'any', http:{ source:'query'}}
				],
		returns:{ arg:'result', type:'object' }
	})
};