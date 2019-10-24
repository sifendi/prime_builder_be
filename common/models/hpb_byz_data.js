'use strict';
var _ = require('lodash');
var async = require('async');

module.exports = function(ByzDataApi) {
    ByzDataApi.getHPBDataByzantine = function(hpb_id,cb){
		if(!hpb_id) {
			cb("please provide the hpb_id", null);
			return false;
		}

		ByzDataApi.app.get_hpb_all_data(hpb_id).then((res) => cb(null, res));
	}
	ByzDataApi.remoteMethod('getHPBDataByzantine',{
		http:{ path:'/getHPBDataByzantine', verb: 'get' },
		accepts:[
			{ arg:'hpb_id', type: 'any', source:{http:'query'}},
		],
		returns:{ arg:'result', type: 'object'}
	});
}; 
 