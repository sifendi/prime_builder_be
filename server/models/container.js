'use strict';

module.exports = function(Container) {
	
	Container.afterRemote('upload', function(ctx, unused, next) {

		var files = ctx.result.result.files.file;
		var item = files[0];
		
		if(item.type != "application/x-sqlite3"){
			var detect = require('detect-file-type'); // to detect the file type
			var sizeOf = require('image-size'); // to detect the image height and width
			
			
			var filename = item.name;
			var path = "D:/Projects/hpb/api/server/storage/"+item.container+"/"+filename;
			//console.log("filename",files);
			
			const readChunk = require('read-chunk');
			const fileType = require('file-type');
			// const url = 'https://hpb-id.hssanet.com/api/container/'+item.container+'/download/'+filename;
			
			
			const fs = require("fs"); //Load the filesystem module
			const stats = fs.statSync(path);
			const fileSizeInBytes = stats.size;
			const buffer = readChunk.sync(path, 0, fileSizeInBytes);
			console.log("fileSizeInBytes",fileSizeInBytes);
			
			var fileTypeExt = fileType(buffer);
			console.log("fileTypeExt",fileTypeExt);
			
			if(fileTypeExt){
				var fileTypeRes = fileTypeExt['mime'];
			}else{
				var fileTypeRes = 'error'; // if mime is not present only, its corrupted file
			}
			
			var fileTypeAllowed = ["image/gif","image/jpeg","image/png","application/pdf","text/csv","application/vnd.ms-excel","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
			
			if(fileTypeAllowed.indexOf(fileTypeRes) < 0){
				
				console.log("ERROR");
				
				var error = new Error();
				error.status = 500;
				
				// since we know its not correct, delete the file
				Container.removeFile(item.container, item.name, (fileerror, reply) => {
					console.log("ERROR in loop",error);
					if (fileerror) {
						console.log("ERROR in error loop");
						return next(new Error(fileerror));
					}
					next(error);
				});
			}else{
				// to avoid pixel flooding
				if(fileTypeRes.indexOf("image/") >= 0){
					var dimensions = sizeOf(path);
					//console.log("dimensions",dimensions);
					if(dimensions.width > 2000 || dimensions.height > 3000){
						var error = new Error();
						error.status = 500;
						next(error);
					}else{
						next();
					}
				}else{
					next();
				}
			}
			
		}else{
			next();
		}
		
	}); // works
  
	function isInArray(value, array) {
		return array.indexOf(value) > -1;	
	}
};