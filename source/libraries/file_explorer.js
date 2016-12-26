
"use strict";

var path = require ('path');
var fs = require ('fs');
var debug = require ('debug')('wylidorin:app:server:file_explorer');
var uplink = require ('./uplink');
var rmdir = require ("rimraf");

console.log ('Loading file_explorer library');

function treeforce(arr,callback)
{
	var parts = "/";

	arr.forEach( function (dir)
	{
		parts = path.join(parts,dir);

		make_tree(parts,function (data)
		{
			callback(data,parts);
		});
	});	
}


function linux_ls(place,list)
{
	fs.readdir(place, function (err, files) 
	{
	    if (err) 
	    {
	    	list(["ERROR"]);
	    }
	    else
	    {
		    var ls=[];
		    files.forEach (function (file)
		    {
		        var lss = {};
		        lss.name = file;
		        lss.size = fs.statSync(path.join(place,file)).size;
		        lss.isdir = fs.statSync(path.join(place,file)).isDirectory();
		        lss.isfile = fs.statSync(path.join(place,file)).isFile();
		        lss.islink = fs.lstatSync(path.join(place,file)).isSymbolicLink();
		        ls.push(lss);
			});
			//console.log(ls);
	    	list(ls);
	    }
	});
}

function make_tree(place,callback){
	try {
		var files = fs.readdirSync(place);

		var ls=[];
	    files.forEach (function (file)
	    {
	        var lss = {};
	        lss.p = path.join(place,file);
	        lss.d = fs.statSync(path.join(place,file)).isDirectory();
	        //console.log(lss);
	        ls.push(lss);
		});
		callback(ls);
	} catch (e) {
		callback(["ERROR"]);
	}
}


function send_file(link,index,pksize,callyes,callacces,callnofile)
{
	fs.open(link,'r', function (err, fd)
	{
		if (err)
		{
			callnofile();
		}
		else
		{
			fs.fstat(fd, function(err, stats) {
				if (err)
				{
					callacces();
				}
				else
				{
					var bufferSize;
					var end;
					if (stats.size > index+pksize)
					{
						//max packet size
						bufferSize = pksize;
						end = false;
					}
					else
					{
						bufferSize = stats.size-index;
						end = true;
					}
					var buffer = new Buffer(bufferSize);
					fs.read(fd,buffer,0,bufferSize,index,function (err, bytesRead, buffer)
					{
						if (err)
						{
							callacces();
						}
						else
						{
							callyes(buffer,index+bufferSize,end,stats.size);
						}
					});
				}
			});
		}
	});
}

function put_file(folder,file,content,t,end,calldone,callacces,callexist,callmore)
{
	try {
		if (t == 'w')
		{
			fs.statSync(path.join(folder,file));
			callexist();
		}
		else
		{
			throw "append to file";
		}
	} catch (e) {
		fs.appendFile(path.join(folder,file), content, function(err) 
		{
	    	if(err) 
	    	{
	        	callacces();
	    	}
	    	else
	    	{
	    		if (end)
	    		{
	    			calldone();
	    		}
	    		else
	    		{
	    			callmore();
	    		}
	    	}
		});

	}	
}

// TODO should we use sendLowPriority for speed imporvement

debug ('Registering for tag fe');
uplink.tags.on ('fe', function (p)
{
	if (p.a == "ls")
	{
		linux_ls (p.b,function (listoffolder)
		{
			uplink.send ('fe1', listoffolder);
		});
	}
	if (p.a == "phd")
	{
		uplink.send ('fe2', process.env.HOME);
	}
	if (p.a == "down")
	{
		send_file(path.join(p.b,p.c),p.z,p.size,function (data,index,end,all)
		{
			uplink.send ("fe3",{f:data,i:index,end:end,all:all});
		}, function ()
		{
			uplink.send('fe6', {a:'down',e:'EACCES'});
		}, function ()
		{
			uplink.send('fe6', {a:'down',e:'ENOENT'});
		});
		
	}
	if (p.a == "tree")
	{
		make_tree(p.b,function (data)
		{
			uplink.send ("fe4",{a:data,p:p.b});
		});
		
	}
	if (p.a == "treeforce")
	{
		treeforce(p.b,function (data,partsinside)
		{
			uplink.send ("fe5",{a:data,p:partsinside});
		});
	}
	if (p.a == "up")
	{
		put_file(p.b,p.c,p.d,p.t,p.end,function ()
		{
			uplink.send('fe7', {a:'up'});
		}, function() 
		{
			uplink.send('fe6', {a:'up',e:'EACCES'});
		}, function()
		{
			uplink.send('fe6', {a:'up',e:'EEXIST'});
		}, function()
		{
			uplink.send('fe8', {});
		});
		
	}
	if (p.a == "del")
	{
		try {
			rmdir.sync(path.join(p.b,p.c));
			uplink.send('fe7', {a:'del'});
		} catch (e) {
			uplink.send('fe6', {a:'del',e:e.code});
		}
	}
	if (p.a == "ren")
	{
		try {
			fs.statSync(path.join(p.b,p.d));
			uplink.send('fe6', {a:'ren',e:'EEXIST'});
		} catch (e) {
			try {
				fs.renameSync(path.join(p.b,p.c),path.join(p.b,p.d));
				uplink.send('fe7', {a:'ren'});
			} catch (e) {
				uplink.send('fe6', {a:'ren',e:e.code});
			}
		}
	}
	if (p.a == "newf")
	{
		try {
			fs.mkdirSync(path.join(p.b,p.c),parseInt('0744',8));
			uplink.send('fe7', {a:'newf'});
		} catch (e) {
			uplink.send('fe6', {a:'newf',e:e.code});
		}
	}
		
});
