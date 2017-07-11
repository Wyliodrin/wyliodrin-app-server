
"use strict";

console.log ('Loading gadget library');

var settings = require ('../settings');
var debug = require ('debug')('wyliodrin:app:server:gadget');
var util = require ('../../util');
var os = require ('os');
var fs = require ('fs');
var path = require ('path');
var bonjour = require ('../bonjour');
var project = require ('../project');
var treeProject = require ('../treeProject');
var network = require ('../network');
var peripherals = require ('../peripherals');
var uplink = require ('../uplink')
var child_process = require ('child_process');
var version = 0;
try
{
	version = require ('../../../package.json').version;
}
catch (e)
{
	version = require ('../../package.json').version;
}

debug ('registering for tag n');
uplink.tags.on ('n', function (p)
{
	if (p.n && p.n.length > 0)
	{
		settings.boardname = p.n;
		fs.writeFile (path.join (settings.env.HOME, 'boardname'), settings.boardname);
		bonjour.publish ();
		status ();
	}
});

debug ('Registering for tag i');
uplink.tags.on ('i', function (p)
{
	status ();
	sendVersion ();
});

debug ('Registering for tag disc');
uplink.tags.on ('disc', function (p)
{
	if (p.a === "poweroff"){
		var poweroff = settings.SETTINGS.poweroff;
		child_process.exec(poweroff, function (err, stdout, stderr){});
	}
	else if (p.a === "reboot"){
		var reboot = settings.SETTINGS.poweroff.split(' ')[0];
		if (reboot === "sudo"){
			reboot = "sudo reboot";
		}
		else{
			reboot = "reboot";
		}
		child_process.exec(reboot, function (err, stdout, stderr){});
	}
});

function status ()
{
	debug ('Sending status');
	uplink.send ('i', {
			n:settings.boardname || settings.CONFIG_FILE.jid, 
			c:settings.boardtype, 
			r:project.getProjectPid()!==0,
			tr:treeProject.getProjectPid()!==0,
			i:network.getNetwork (), 
			p:(util.isWindows()?'windows':'linux'),
			pf:peripherals.getPeripherals(),
			h:settings.env.HOME
		});
}

function sendVersion ()
{
	debug ('Sending version');
	child_process.exec("wylio -v", function (err, stdout, stderr){
		if (err){
			uplink.send ('sv', {v:version, os:os.type()+' '+os.release()});
			console.log(err);
		}
		else{
			uplink.send ('sv', {v:version, os:os.type()+' '+os.release(), libv:stdout});
		}
	});
}

function capabilities ()
{
	debug ('Sending capabilities');
	uplink.send ('capabilities', {pm:true, fe:true, net:true, tm:true, l:settings.board.capabilities});
}

module.exports.status = status;
module.exports.sendVersion = sendVersion;
module.exports.capabilities = capabilities;
