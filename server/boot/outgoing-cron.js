'use strict';
var async = require('async');
var http = require('http');
var schedule = require('node-schedule');
var Promise = require("bluebird");
var taskQueue = require("promise-task-queue");
var request = require('request');
var queue = taskQueue();
var failedRequests = 0;


module.exports = function(app){
	
	
	// this will execute the function every 20mins

	queue.define("targetCronOutGoing", function() {
		return Promise.try(function() {
			app.cronExecuteForOutGoingCall();
		}).then(function(response) {
			return true;
		});
	},
	{
		concurrency: 1
	});
	
	
	//to insert/update stats
	var j = schedule.scheduleJob('* * * * *', function(cb){
		Promise.try(function() {
			return queue.push("targetCronOutGoing", []);
		}).then(function(jsonResponse) {
			console.log("Cron success: "+jsonResponse);
		})
	});
	
	app.cronExecuteForOutGoingCall = function(){
		// get monthly stats for the current monthly
		return new Promise((resolve,reject)=>{
		console.log("started outGoing cron");
           
        var selectQuery = "select * from [call_outgoing] where (status= '0' or status = '-1') and (retries < 4) order by status DESC ";

        app.dataSources.accountDS.connector.execute(selectQuery,(err,resultData)=>{

            async.each(resultData, function(data, callback) {

                let method = data.method;
                let formData = data.body;
                let contentLength = formData.length;
                let url = data.url;
                let id = data.id;
                let retries = data.retries;
                let sqlQuery = '';

                console.log("URL",url);
               
                switch(method){

                    case "POST":

                    request.post({url:url, body: formData,headers:{"Content-Type": "application/json",'Content-Length': contentLength}}, function optionalCallback(err, httpResponse, body) {
                        if(err){
                           
                            sqlQuery = "Update [call_outgoing] set status ='-1',retries="+(retries+1)+"where id="+id+";";

                        }
                        else if(httpResponse.statusCode === 200) {
                            if(!body.error){

                                sqlQuery = "Update [call_outgoing] set status ='1',response_code="+httpResponse.statusCode+",response='"+JSON.stringify(body)+"' where id="+id+";";
                                
                            }else{

                                sqlQuery = "Update [call_outgoing] set status ='-1',retries="+(retries+1)+",response_code="+httpResponse.statusCode+",response='"+JSON.stringify(body)+"' where id="+id+";";
                            }
                             
                        }else{
                            sqlQuery = "Update [call_outgoing] set status ='-1',retries="+(retries+1)+",response_code="+httpResponse.statusCode+",response='"+JSON.stringify(body)+"' where id="+id+";";
                        }

                        app.dataSources.accountDS.connector.execute(sqlQuery,(err,response)=>{
                            if(err){
                                console.log("Error",err);
                                console.log("Update successfully",sqlQuery);
                            }else{
                                console.log("Update successfully",sqlQuery);
                            }

                        });
                       
                      });

                    break;

                    case "PUT":

                    break;

                }

            });

        });
			
		});
	};
};
