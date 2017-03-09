"use strict";

var path = require ('path');
var fs = require ('fs');
var debug = require ('debug')('wylidorin:app:server:file_explorer');
var uplink = require ('./uplink');
var rmdir = require ("rimraf");
var settings = require("./settings");
var spawn = require("child_process").spawnSync


console.log ('Loading deploy library');


var DIR = path.join(path.dirname(settings.SETTINGS.build_file),'deploy');
var INFO_FILE = "info.json";
var SUPERVISOR_DIR = "/etc/supervisor/conf.d";
var SUPERVISOR_PREFIX = "wyliodrin.";

debug ('Registering for tag dep');
uplink.tags.on ('dep', function (p)
{
	if (p.a == "ls")
	{
		var projects = fs.readdirSync(DIR).filter(function (value){
			return !value.startsWith("wyliodrin-");
		});
		//pune busy status  (status)hash si tot ce e in info.json
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
		var obj = p.b;
		var local = path.join(DIR,obj.hash);
		fs.mkdirSync(local);

		//make info.json
		fs.writeFileSync(path.join(local, "info.json"), {name:obj.name,id:obj.id,date:obj.date,language:obj.language});

		//make content folder
		local = path.join(local,"content");
		fs.mkdirSync(local);

		//make main file
		//obj.language "python" "visual"
		var main = _.find(_.find(obj.tree[0].children, "issoftware").children, "ismain");
		fs.writeFileSync(path.join(local,main.name), main.content);

		//make supervisord file
		fs.writeFileSync(path.join(SUPERVISOR_DIR, SUPERVISOR_PREFIX + obj.hash), obj.supervisor_file);

		//ack
		uplink.send ('dep', {a:"ACK", b:obj.hash});
		console.log("am scris cce trebue");
		console.log("\n"+obj.hash);
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