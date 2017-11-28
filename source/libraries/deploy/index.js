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
var SUPERVISOR_SUFFIX = ".conf";
var CONTENT_DIR = "content";

var DIALOG_OPEN = false;

var QUEUE = [];
var QUEUE_PERMIT = true;

var TIMER_LS = 0;
var TIMER_QUEUE = 0;


function parse_queue(){
	console.log("queue " + QUEUE);
	if (DIALOG_OPEN){
		if (QUEUE_PERMIT == true){
			console.log("acceptat");
			var element = QUEUE.shift();
			if (element === undefined)
			{

			}
			else
			{
				QUEUE_PERMIT = false;
				run_on_queue_element(element.cmd,element.done);
			}
		}
		else{
			console.log("blocat");
		}
	}
}

function add_to_queue(cmd,done){
	QUEUE.push({"cmd":cmd,"done":done});
}

var sudo = settings.SETTINGS.run.split(' ');
if (sudo[0]==='sudo')
{
	sudo = 'sudo';
}
else
{
	sudo = '';
}

function run_on_queue_element(cmd, done){
	exec(cmd, function(err, stdout, stderr){

		var ERRORS = ["error: <class 'socket.error'>, [Errno 104] Connection reset by peer: file: /usr/lib/python2.7/socket.py line: 476",
		"error: <class 'xmlrpclib.Fault'>, <Fault 6: 'SHUTDOWN_STATE'>: file: /usr/lib/python2.7/xmlrpclib.py line: 794",
		"unix:///var/run/supervisor.sock no such file"];

		var is_errored = false;

		_.each(ERRORS, function(error){
			if (stdout.indexOf(error) === 0){
				is_errored = true;
			}
		});

		if (is_errored){
			run_on_queue_element(cmd, done);
		}
		else{
			done(err,stdout,stderr);
			QUEUE_PERMIT = true;
		}
	});
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
	ret += "[program:" + SUPERVISOR_PREFIX + obj.hash + SUPERVISOR_SUFFIX + "]\n";
	ret += "user=" + obj.supervisor_file.user + "\n";
	ret += "directory=" + path.join(DIR,obj.hash,CONTENT_DIR) + "\n";
	ret += "command=" + "python main.py" +"\n";//////////////////////////////////////////////////////////
	ret += "autostart=" + obj.supervisor_file.autostart +"\n";
	ret += "exitcodes=" + obj.supervisor_file.exitcodes +"\n";
	ret += "autorestart=" + obj.supervisor_file.autorestart +"\n";
	ret += "environment=" + obj.supervisor_file.environment +"\n";
	ret += "priority=" + obj.supervisor_file.priority +"\n";

	return ret;

}

function give_ls(){

	if (QUEUE.length > 10){
		return;
	}

	console.log("adaug ls");

	var cmd = command_os_dependent("status");
		
	add_to_queue (cmd + "000" +' "'+sudo+'" ' , function (err, stdout, stderr){

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

			var procname = SUPERVISOR_PREFIX + hash + SUPERVISOR_SUFFIX;

			info.status = stdout.split("\n").filter(function (element){
				return element.indexOf(procname) === 0
			})[0];
			if (info.status === undefined){
				return;
			}
			


			info.status = info.status.replace(/\s+/g, ' ').split(" ")[1];

			var final = _.merge({hash:hash}, info);
			toSend.push(final);
		});

		uplink.send ('dep', {a:"ls", b:toSend});
	});
	//pune busy status  (status)  hash si tot ce e in info.json
}
		

debug ('Registering for tag dep');
uplink.tags.on ('dep', function (p)
{
	if (p.a == "ls")
	{
		DIALOG_OPEN = true;
		TIMER_QUEUE = setInterval(parse_queue, 300);
		TIMER_LS = setInterval(give_ls, 1000);
		give_ls();
	}
	if (p.a == "stop")
	{
		var hash = p.b;
		var cmd = command_os_dependent("stop");
		var arg1 = SUPERVISOR_PREFIX + hash + SUPERVISOR_SUFFIX;
		add_to_queue(cmd + arg1 +' "'+sudo+'" ' , function (err, stdout, stderr)
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
		var arg1 = SUPERVISOR_PREFIX + hash + SUPERVISOR_SUFFIX;
		add_to_queue(cmd + arg1 +' "'+sudo+'" ' , function (err, stdout, stderr)
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
		var arg1 = SUPERVISOR_PREFIX + hash + SUPERVISOR_SUFFIX;
		add_to_queue(cmd + arg1 +' "'+sudo+'" ' , function (err, stdout, stderr)
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
		local = path.join(local,CONTENT_DIR);
		//fs.mkdirSync(local);
		mkdirp.sync(local);

		//make main file
		//obj.language "python" "visual"
		var main = _.find(_.find(obj.tree[0].children, "issoftware").children, "ismain");
		fs.writeFileSync(path.join(local,main.name), main.content);

		//make supervisord file
		local = path.join(SUPERVISOR_DIR_TEMP, SUPERVISOR_PREFIX + obj.hash + SUPERVISOR_SUFFIX);
		fs.writeFileSync(local, make_supervisor_file(obj));

		//make the command
		var cmd = command_os_dependent("deploy");

		//run it
		add_to_queue (cmd + local +' "'+sudo+'" ' + path.join(SUPERVISOR_DIR, SUPERVISOR_PREFIX + obj.hash + SUPERVISOR_SUFFIX), function (err, stdout, stderr)
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
		var arg1 = SUPERVISOR_PREFIX + hash + SUPERVISOR_SUFFIX;
		var arg4 = path.join(SUPERVISOR_DIR, arg1); //supervisord script

		add_to_queue (cmd + arg1 +' "'+sudo+'" ' + local + " " + arg4, function (err, stdout, stderr)
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
	if(p.a == "logerr")
	{
		uplink.send('err');
	}
	if(p.a == "logout")
	{
		uplink.send('out');
	}
	if (p.a == "exit")
	{
		clearInterval(TIMER_LS);
		clearInterval(TIMER_QUEUE);
		DIALOG_OPEN = false;
		QUEUE = [];
		TIMER_QUEUE = 0;
		TIMER_LS = 0;
		QUEUE_PERMIT = true;
	}

});