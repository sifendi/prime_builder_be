'use strict';

module.exports = function(server) {
  // Install a `/` route that returns server status
  //server.timeout = 5000;
  var router = server.loopback.Router();
  router.get('/', server.loopback.status());
  server.use(router);
};
