
"use strict";

var settings = require ('../settings');
var uplink = require ('../uplink');
var debug = require ('debug')('wyliodrin:app:server:update');
var child_process = require ('child_process');

console.log ('Loading update library');

debug ('Registering for tag u');
uplink.tags.on ('u', function (p)
{
	if (p.a === 'i')
	{
		debug ('Update wyliodrin-server');
		var script = './update-server.sh';
		var params = [];
		var sudo = settings.SETTINGS.run.split(' ');
		var manager = script;
		if (sudo[0]==='sudo')
		{
			params.splice (0, 0, '-E', script);
			manager = 'sudo';
		}
		var runscript = child_process.spawn (manager, params, {env: settings.env});
		runscript.stdout.on ('data', function (data)
		{
			uplink.send ('u', {a:'i', out:data.toString()});
		});
		runscript.stderr.on ('data', function (data)
		{
			uplink.send ('u', {a:'i', err:data.toString()});
		});
		runscript.on ('close', function (error)
		{
			uplink.send ('u', {a:'i', e:error});
		});
	}
});
