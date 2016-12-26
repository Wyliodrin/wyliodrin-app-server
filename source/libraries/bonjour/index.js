
"use strict";

var child_process = require ('child_process');
var boardtype = require ('../settings').boardtype;
var settings = require ('../settings');
var uplink = require ('../uplink');
var msgpack = require ('msgpack-lite');
var peripherals = require ('../peripherals');
var path = require ('path');

console.log ('Loading bonjour library');

process.on ('exit', function ()
{
	console.log ('Unpublishing');
	var sudo = settings.SETTINGS.run.split(' ');
	var run = 'node';
	var params = [path.join (__dirname, 'publish.js'), 's', settings.board.avahi];
	if (sudo[0]==='sudo')
	{
		params.splice (0, 0, run);
		run = 'sudo';
	}
	child_process.execFile (run, params);
});

var republish = false;
var running = false;

function publish ()
{
	if (running)
	{
		republish = true;
	}
	else
	if (uplink.server)
	{
		running = true;
		console.log ('Publishing');
		var sudo = settings.SETTINGS.run.split(' ');
		var run = 'node';
		var params = [path.join (__dirname, 'publish.js'), 'p', uplink.server.address().port, settings.board.avahi, settings.boardname, boardtype, msgpack.encode (peripherals.getPeripherals()).toString ('base64')];
		if (sudo[0]==='sudo')
		{
			params.splice (0, 0, run);
			run = 'sudo';
		}
		console.log (peripherals.getPeripherals());
		child_process.execFile (run, params, function (error, stdout, stderr)
		{
			running = false;
			if (republish)
			{
				setTimeout (publish, 1000);
				republish = false;
			}
			// console.log (error);
		});
	}
	else
	{
		console.log ('No server');
	}
}

module.exports.publish = publish;