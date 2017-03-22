"use strict";

var path = require ('path');
var fs = require ('fs');
var debug = require ('debug')('wylidorin:app:server:file_explorer');
var uplink = require ('../uplink');
var rmdir = require ("rimraf");
var settings = require("../settings");
var child_process = require("child_process");
var _ = require("lodash");
var mkdirp = require("mkdirp");
var board = require ('../settings').board;
var util = require("../../util");
var exec = require ('child_process').exec;


console.log ('Loading deploy library');


var DIR = path.join(path.dirname(settings.SETTINGS.build_file),'deploy');
var INFO_FILE = "info.json";
var SUPERVISOR_DIR_TEMP = "/tmp"
var SUPERVISOR_DIR = "/etc/supervisor/conf.d";
var SUPERVISOR_PREFIX = "wyliodrin.";

var sudo = settings.SETTINGS.run.split(' ');
if (sudo[0]==='sudo')
{
	sudo = 'sudo';
}
else
{
	sudo = '';
}

function command_os_dependent(name){
	if (util.isWindows())
	{
		return 'cmd /c '+path.join (__dirname, name+'.cmd')+' ';
	}
	else
	{
		return  board.shell+' '+path.join (__dirname, name+'.sh')+' ';
	}
}

function make_supervisor_file(obj){
	var ret = "[supervisord]\n";
	ret += "[program:" + SUPERVISOR_PREFIX + obj.hash + "]\n";
	ret += "user=" + obj.supervisor_file.user + "\n";
	ret += "directory=" + path.join(DIR,obj.hash) + "\n";
	ret += "command=" + "python main.py" +"\n";//////////////////////////////////////////////////////////
	ret += "autostart=" + obj.supervisor_file.autostart +"\n";
	ret += "exitcodes=" + obj.supervisor_file.exitcodes +"\n";
	ret += "autorestart=" + obj.supervisor_file.autorestart +"\n";
	ret += "environment=" + obj.supervisor_file.environment +"\n";
	ret += "priority=" + obj.supervisor_file.priority +"\n";

	return ret;

}
		

debug ('Registering for tag dep');
uplink.tags.on ('dep', function (p)
{
	if (p.a == "ls")
	{
		var projects;
		try
		{
			projects = fs.readdirSync(DIR);
		}
		catch (e)
		{
			projects = []; 
		}

		var toSend = [];

		_.each(projects, function(proj){
			var hash = proj;
			var info = JSON.parse(fs.readFileSync(path.join(DIR,proj,INFO_FILE)).toString());

			var cmd = command_os_dependent("status");
			var arg1 = SUPERVISOR_PREFIX + hash;
			exec (cmd + arg1 +' "'+sudo+'" ' , function (err, stdout, stderr)
			{
				info.status = stdout;
			});

			var final = _.merge({hash:hash}, info);
			toSend.push(final);
		});

		uplink.send ('dep', {a:"ls", b:toSend});

		//pune busy status  (status)  hash si tot ce e in info.json
	}
	if (p.a == "stop")
	{
		var hash = p.b;
		var cmd = command_os_dependent("stop");
		var arg1 = SUPERVISOR_PREFIX + hash;
		exec (cmd + arg1 +' "'+sudo+'" ' , function (err, stdout, stderr)
		{
			//ack
			uplink.send ('dep', {a:"ACK", b:hash});
		});
		///////////////////////fa stop pe hashul p.b, da ack
	}
	if (p.a == "run")
	{
		var hash = p.b;
		var cmd = command_os_dependent("start");
		var arg1 = SUPERVISOR_PREFIX + hash;
		exec (cmd + arg1 +' "'+sudo+'" ' , function (err, stdout, stderr)
		{
			//ack
			uplink.send ('dep', {a:"ACK", b:hash});
		});
		////////////////////////fa run pe hashul p.b da ack
	}
	if (p.a == "restart")
	{
		var hash = p.b;
		var cmd = command_os_dependent("restart");
		var arg1 = SUPERVISOR_PREFIX + hash;
		exec (cmd + arg1 +' "'+sudo+'" ' , function (err, stdout, stderr)
		{
			//ack
			uplink.send ('dep', {a:"ACK", b:hash});
		});
		////////////////////////fa restart pe hashul p.b da ack
	}
	if (p.a == "deploy")
	{
		//make project folder
		mkdirp(DIR);
		var obj = p.b;
		var local = path.join(DIR,obj.hash);
		//fs.mkdirSync(local);
		mkdirp.sync(local);

		//make info.json
		fs.writeFileSync(path.join(local, "info.json"), JSON.stringify({title:obj.title,id:obj.id,date:obj.date,language:obj.language}));

		//make content folder
		local = path.join(local,"content");
		//fs.mkdirSync(local);
		mkdirp.sync(local);

		//make main file
		//obj.language "python" "visual"
		var main = _.find(_.find(obj.tree[0].children, "issoftware").children, "ismain");
		fs.writeFileSync(path.join(local,main.name), main.content);

		//make supervisord file
		local = path.join(SUPERVISOR_DIR_TEMP, SUPERVISOR_PREFIX + obj.hash);
		fs.writeFileSync(local, make_supervisor_file(obj));

		//make the command
		var cmd = command_os_dependent("deploy");

		//run it
		exec (cmd + local +' "'+sudo+'" ' + path.join(SUPERVISOR_DIR, SUPERVISOR_PREFIX + obj.hash), function (err, stdout, stderr)
		{
			//ack
			uplink.send ('dep', {a:"ACK", b:obj.hash});
		});

	}
	if (p.a == "undeploy")
	{
		var hash = p.b;
		var local = path.join(DIR,hash);

		var cmd = command_os_dependent("undeploy");
		var arg1 = SUPERVISOR_PREFIX + hash;
		var arg4 = path.join(SUPERVISOR_DIR, "wyliodrin." + hash); //supervisord script
		console.log(cmd + arg1 +' "'+sudo+'" ' + local + arg4);
		exec (cmd + arg1 +' "'+sudo+'" ' + local + " " + arg4, function (err, stdout, stderr)
		{
			//ack
			uplink.send ('dep', {a:"ACK", b:hash});
		});

	}
	if (p.a == "redeploy")
	{
		//tbd
		var obj = p.b;
		var hash = obj.hash;
		uplink.send ('dep', {a:"ACK", b:hash});
		//////////////////////////////////////////// UNDEPLOY THEN REDEPLOY
	}
});