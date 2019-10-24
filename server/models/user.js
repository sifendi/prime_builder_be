'use strict';

module.exports = function(User) {




//User.disableRemoteMethodByName("create", false);
User.disableRemoteMethodByName("upsert", true);
User.disableRemoteMethodByName("replaceOrCreate", true);
User.disableRemoteMethodByName("upsertWithWhere", true);
User.disableRemoteMethodByName("updateAll", true);
User.disableRemoteMethodByName("updateAttributes", false);
User.disableRemoteMethodByName("find", true);
User.disableRemoteMethodByName("findById", true);
User.disableRemoteMethodByName("findOne", false);
User.disableRemoteMethodByName("deleteById", true);
User.disableRemoteMethodByName("confirm", true);
User.disableRemoteMethodByName("count", true);
User.disableRemoteMethodByName("exists", true);
User.disableRemoteMethodByName("resetPassword", true);
User.disableRemoteMethodByName('__count__accessTokens', true);
User.disableRemoteMethodByName('__create__accessTokens', true);
User.disableRemoteMethodByName('__delete__accessTokens', true);
User.disableRemoteMethodByName('__destroyById__accessTokens', true);
User.disableRemoteMethodByName('__findById__accessTokens', true);
User.disableRemoteMethodByName('__get__accessTokens', true);
User.disableRemoteMethodByName('__updateById__accessTokens', true);
User.disableRemoteMethodByName('createChangeStream', true);


};
