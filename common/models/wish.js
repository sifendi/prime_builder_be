'use strict';

module.exports = function(Wish) {
	Wish.getWishlist = function(user_id,rolename,created_from,created_to,sph_name,limit,page,cb){
		var selectQuery = "select rw.*, u.realm as sph_name from reward_wishlist rw, [User] u where rw.created_by = u.id ";
		var dataArr = [];
		
		if(rolename == "$ra"){
			selectQuery+=" and rw.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
			dataArr.push(user_id);
		}
		
		if(sph_name){
			selectQuery+=" AND u.realm like (?) ";
			sph_name = "%"+sph_name+"%";
			dataArr.push(sph_name);
		}
		if(created_from){
			selectQuery+=" AND rw.created_date >= (?) ";
			dataArr.push(created_from);
		}
		if(created_to){
			selectQuery+=" AND rw.created_date <= (?) ";
			dataArr.push(created_to);
		}
		
		selectQuery+=" order by rw.id DESC ";
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		
		Wish.app.dbConnection.execute(selectQuery,dataArr,(err,resultObject)=>{
			cb(null,resultObject);
		});
	}
	
	Wish.remoteMethod('getWishlist',{
		http:{ path: '/getWishlist', verb: 'get'},
		accepts:[
					{ arg: 'user_id', type: 'number', source: {http:'query' }},
					{ arg: 'rolename', type: 'string', source: {http:'query' }},
					{ arg: 'created_from', type: 'number', source: {http:'query' }},
					{ arg: 'created_to', type: 'number', source: {http:'query' }},
					{ arg: 'sph_name', type: 'string', source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }}
		],
		returns:{ arg: 'result', type: 'object'}
	});
	
	Wish.getWishlistCount = function(user_id,rolename,created_from,created_to,sph_name,limit,page,cb){
		var selectQuery = "select count(*) as total from reward_wishlist rw join [User] u on rw.created_by = u.id where 1=1";
		var dataArr = [];
		
		if(rolename == "$ra"){
			selectQuery+=" and rw.created_by in ( select uid from user_mapping where meta_key = 'postal_code' and meta_value in ( 	select p.id from postal_code p, subdistrict sd, district d, municipality m, region r, province pr where d.id = m.district_id and m.id = sd.municipality_id and sd.id = p.subdistrict_id and d.province_id = pr.id and pr.region_id = r.id and r.id in ( select meta_value from user_mapping where uid = (?) and meta_key = 'region_id' ) ) )";
			dataArr.push(user_id);
		}
		
		if(sph_name){
			selectQuery+=" AND u.realm like (?) ";
			sph_name = "%"+sph_name+"%";
			dataArr.push(sph_name);
		}
		if(created_from){
			selectQuery+=" AND rw.created_date >= (?) ";
			dataArr.push(created_from);
		}
		if(created_to){
			selectQuery+=" AND rw.created_date <= (?) ";
			dataArr.push(created_to);
		}
		
		if(limit){
			if(!page){ page = 0; }
			var offset = page*limit;
			selectQuery+=" OFFSET (?) ROWS FETCH NEXT (?) ROWS ONLY";
			dataArr.push(offset);
			dataArr.push(limit);
		}
		Wish.app.dbConnection.execute(selectQuery,dataArr,(err,resultObject)=>{
			cb(null,resultObject);
		});
	}
	
	Wish.remoteMethod('getWishlistCount',{
		http:{ path: '/getWishlistCount', verb: 'get'},
		accepts:[
					{ arg: 'user_id', type: 'number', source: {http:'query' }},
					{ arg: 'rolename', type: 'string', source: {http:'query' }},
					{ arg: 'created_from', type: 'number', source: {http:'query' }},
					{ arg: 'created_to', type: 'number', source: {http:'query' }},
					{ arg: 'sph_name', type: 'string', source: {http:'query' }},
					{ arg: 'limit', type: 'number', source: {http:'query' }},
					{ arg: 'page', type: 'number', source: {http:'query' }}
		],
		returns:{ arg: 'result', type: 'object'}
	});
};