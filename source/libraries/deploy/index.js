"use strict";

var path = require ('path');
var fs = require ('fs');
var debug = require ('debug')('wylidorin:app:server:file_explorer');
var uplink = require ('../uplink');
var rmdir = require ("rimraf");
var settings = require("../settings");
var spawn = require("child_process").spawnSync;
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

debug ('Registering for tag dep');
uplink.tags.on ('dep', function (p)
{
	if (p.a == "ls")
	{
		var projects;
		try
		{
			projects = fs.readdirSync(DIR).filter(function (value){
				return !value.startsWith("wyliodrin-");
			});
		}
		catch (e)
		{
			projects = []; 
		}

		var toSend = [];

		_.each(projects, function(proj){
			var hash = proj.substring(10);
			var info = JSON.parse(fs.readFileSync(path.join(DIR,proj,INFO_FILE)).toString());
			var final = _merge({hash:hash}, info)
			toSend.push(final);
		});

		uplink.send ('dep', {a:"ls", b:toSend});

		//pune busy status  (status)  hash si tot ce e in info.json
	}
	if (p.a == "stop")
	{
		var hash = p.b;
    	var cmd = spawn("sudo supervisorctl stop " + SUPERVISOR_PREFIX + hash);
    	uplink.send ('dep', {a:"ACK", b:obj.hash});
		///////////////////////fa stop pe hashul p.b, da ack
	}
	if (p.a == "run")
	{
		var hash = p.b;
    	var cmd = spawn("sudo supervisorctl start " + SUPERVISOR_PREFIX + hash);
    	uplink.send ('dep', {a:"ACK", b:obj.hash});
		////////////////////////fa run pe hashul p.b da ack
	}
	if (p.a == "restart")
	{
		var hash = p.b;
    	var cmd = spawn("sudo supervisorctl restart " + SUPERVISOR_PREFIX + hash);
    	uplink.send ('dep', {a:"ACK", b:obj.hash});
		////////////////////////fa restart pe hashul p.b da ack
	}
	if (p.a == "deploy")
	{
		//make project folder
		mkdirp(DIR);
		var obj = p.b;
		var local = path.join(DIR,obj.hash);
		//fs.mkdirSync(local);
		mkdirp(local);

		//make info.json
		fs.writeFileSync(path.join(local, "info.json"), JSON.stringify({title:obj.title,id:obj.id,date:obj.date,language:obj.language}));

		//make content folder
		local = path.join(local,"content");
		//fs.mkdirSync(local);
		mkdirp(local);

		//make main file
		//obj.language "python" "visual"
		var main = _.find(_.find(obj.tree[0].children, "issoftware").children, "ismain");
		fs.writeFileSync(path.join(local,main.name), main.content);

		//make supervisord file
		local = path.join(SUPERVISOR_DIR_TEMP, SUPERVISOR_PREFIX + obj.hash);
		fs.writeFileSync(local, obj.supervisor_file);

		//workaround for cp
		var sudo = settings.SETTINGS.run.split(' ');
		if (sudo[0]==='sudo')
		{
			sudo = 'sudo';
		}
		else
		{
			sudo = '';
		}

		var cmd;
		if (util.isWindows())
		{
			cmd = 'cmd /c '+path.join (__dirname, 'run.cmd')+' ';
		}
		else
		{
			cmd = board.shell+' '+path.join (__dirname, 'run.sh')+' ';
		}
		console.log("AICI AJUNG");
		exec (cmd + local +' "'+sudo+'" ' + path.join(SUPERVISOR_DIR, SUPERVISOR_PREFIX + obj.hash), function (err, stdout, stderr)
		{


			//ack
			uplink.send ('dep', {a:"ACK", b:obj.hash});
			console.log("AM TRIMIT CE TREBE");



		});

	}
	if (p.a == "undeploy")
	{
		var hash = p.b;
		var local = path.join(DIR,hash);
		//////////////////////////////////////////////////////////////////////////////STOP THE SERVICE
		rimraf.sync(local); //deleted folder
		rimraf.sync(path.join(SUPERVISOR_DIR, "wyliodrin." + hash)); //deleted supervisord script
	}
	if (p.a == "redeploy")
	{
		var obj = p.b;
		var hash = obj.hash;
		//////////////////////////////////////////// UNDEPLOY THEN REDEPLOY
	}
});