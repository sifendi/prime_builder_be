'use strict';
var speakeasy = require('speakeasy');
var request = require('request');
module.exports = function(Applogin) {

Applogin.requestCode = function(credentials, fn) {
        var self = this,
    now = (new Date()).getTime(),
    defaultError = new Error('login failed');
    var UserModel = Applogin.app.models.user;
    defaultError.statusCode = 401;
    defaultError.code = 'LOGIN_FAILED';
        
        if (!credentials.username) {
            return fn(defaultError); 
        }
        
        UserModel.findOne({where: { username: credentials.username }}, function(err, user) {
            if (err) {
                return fn(defaultError);
            } else if (user) {
               	
               		console.log('login Success...',user);
                  var code = speakeasy.totp({
                  secret: Applogin.app.APP_SECRET + credentials.username,
                  encoding: 'ascii',
                  algorithm: 'sha256',
                  step:60*5
                  });
	               console.log('Two factor code for ' + credentials.username + ': ' + code);
	                
	                // [TODO] hook into your favorite SMS API and 
	                //        send your user the code!

      					//  var smsTextUrl=`http://api-alerts.solutionsinfini.com/v3/?method=sms&api_key=A95d6a36c4f175b5c6532af1efb01ad8c&to=${credentials.username}&sender=AMBUJA&message=Your+OTP+is+${code}+for+the+Ambuja+Foundation+app.+Fill+it+in+the+required+column+to+activate+the+app.`;
      					// console.log('smsTextUrl',smsTextUrl);
      					// request(smsTextUrl, function (error, response, body) {
      					// 	console.log('error:', error); // Print the error if one occurred 
      					// 	console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received 
      					// 	console.log('body:', body); // Print the HTML for the Google homepage. 
      					// 	fn(null, code);
      					// });
                  var resObj = {};
                  resObj['otpcode']=code;
                  resObj['status']=true;
	                fn(null, resObj);
	           
               
            } else {
                return fn(defaultError);
            }
        });
    };
    
    /**
     * A method for logging in a user using a time-based (quickly expiring)
     * verification code obtained using the `requestCode()` method.
     * 
     * @param  {object}   credentials A JSON object containing "email" and "twofactor" fields
     * @param  {Function} fn          The function to call in the Loopback for sending back data
     * @return {void}
     */
    Applogin.loginWithCode = function(credentials, fn) {
        var self = this,
            defaultError = new Error('login failed');
        
        defaultError.statusCode = 401;
        defaultError.code = 'LOGIN_FAILED';
        var UserModel = Applogin.app.models.user;
        if (!credentials.username || !credentials.twofactor) {
            return fn(defaultError);
        }
      //  console.log('1',credentials);
      UserModel.findOne({ where: { username: credentials.username },"include":["roles","userinfo","userinfohpb","userinfometa"]}, function(err, user) {
        	     console.log('2',user);
            if (err) return fn(err);
            if (!user) return fn(defaultError);
               console.log('3');
           var verified =   speakeasy.totp.verify({
            secret: Applogin.app.APP_SECRET + credentials.username,
            encoding: 'ascii',
            algorithm: 'sha256',
            window: 1,
            token: credentials.twofactor,
            step:60*5 
            });
          console.log('verified',verified);
              if (!verified) {
                  return fn(defaultError);
            }
       
            user.createAccessToken(-1, function(err, token) {
                if (err) return fn(err);
              
                token.__data.user = user;
                fn(err, token);
              
               
            });
        });
    };


    Applogin.appActivate = function(data, fn) {

      console.log('data',data);
      var respoData = {};
      fn(null,data);

    };

    Applogin.remoteMethod(
        'requestCode',
        {
            description: 'Request a two-factor code for a user with email and password',
            accepts: [
                {arg: 'credentials', type: 'object', required: true, http: {source: 'body'}}
            ],
            returns: {arg: 'response', type: 'object'},
            http: {verb: 'post'}
        }
    );

    Applogin.remoteMethod(
        'loginWithCode',
        {
            description: 'Login a user with email and two-factor code',
            accepts: [
                {arg: 'credentials', type: 'object', required: true, http: {source: 'body'}}
            ],
            returns: {
                arg: 'accessToken',
                type: 'object',
                root: true,
                description: 'The response body contains properties of the AccessToken created on login.\n'
            },
            http: {verb: 'post'}
        }
    );

    Applogin.remoteMethod(
        'appActivate',
        {
            description: 'appActivate',
            accepts: [
                {arg: 'data', type: 'object', required: true, http: {source: 'body'}}
            ],
            returns: {
                arg: 'result',
                type: 'object',
                root: true,
                description: 'Return Params'
            },
            http: {verb: 'post'}
        }
    );
  



};
