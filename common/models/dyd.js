'use strict';

module.exports = function(Dyd) {

	
	
    Dyd.runCron = function(cb) {
    	
    	console.log('runCron');
    	Dyd.app.cronFr();
		cb(null,{result:"cron running..."});

    }
    
	Dyd.remoteMethod(
	    'runCron', {
	        http: { path: '/runCron', verb: 'get' },
	        accepts: [
	         
	        ],
	        returns: { arg: 'result', type: 'object' }
	    }
	);
};
