"use strict";

var path = require ('path');
var fs = require ('fs');
var debug = require ('debug')('wylidorin:app:server:file_explorer');
var uplink = require ('./uplink');
var rmdir = require ("rimraf");
var settings = require("./settings");


console.log ('Loading deploy library');


var DIR = path.join(path.dirname(settings.SETTINGS.build_file),'deploy');
var INFO_FILE = "info.json";
var SUPERVISOR_DIR = "/etc/supervisor/conf.d";

debug ('Registering for tag dep');
uplink.tags.on ('dep', function (p)
{
	if (p.a == "ls")
	{
		projects = fs.readdirSync(srcpath).filter(file => fs.statSync(path.join(srcpath, file)).isDirectory());
	}
	if (p.a == "stop")
	{
		///////////////////////fa stop pe hashul p.b, da ack
	}
	if (p.a == "run")
	{
		////////////////////////fa run pe hashul p.b da ack
	}
	if (p.a == "restart")
	{
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
		fs.writeFileSync(path.join(SUPERVISOR_DIR,obj.supervisor_name), obj.supervisor_file);

		//ack
		uplink.send ('dep', {a:"ACK", b:obj.hash});
	}
	if (p.a == "undeploy")
	{
		var hash = p.b;
		var local = path.join(DIR,hash);
		//////////////////////////////////////////////////////////////////////////////STOP THE SERVICE
		rimraf.sync(local);
	}
	if (p.a == "redeploy")
	{
		var obj = p.b;
		var hash = obj.hash;
		//////////////////////////////////////////// UNDEPLOY THEN REDEPLOY
	}
}