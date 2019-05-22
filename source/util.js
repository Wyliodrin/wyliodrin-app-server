
"use strict";

var EventEmitter = require ('events').EventEmitter;
var _ = require ('lodash');
var child_process = require ('child_process');

function load (name)
{
	var library = null;
	try
	{
		library = require(name);
	}
	catch (e)
	{
		console.log ('Failed loading the library '+name);
	}
	return library;
}

function isWindows ()
{
	return (process.platform === "win32");
}

var pty = load ('node-pty');

if (pty === null) 
{
	// pty = require ('ptyw.js');
	pty = {
		spawn: function (cmd, parameters, options)
		{
			var emitter = new EventEmitter ();
			try
			{
				var running = child_process.spawn (cmd, parameters, options);
				running.stdout.on ('data', function (data)
				{
					emitter.emit ('data', data.toString ());
				});

				running.stderr.on ('data', function (data)
				{
					emitter.emit ('data', data.toString ());
				});

				running.on ('error', function (error)
				{
					emitter.emit ('error', error);
				});

				running.on ('exit', function (code)
				{
					emitter.emit ('exit', code);
				});
				_.assign (emitter, running);
				emitter.resize = function ()
				{

				};
				emitter.write = function (data)
				{
					//console.log (data);
					running.stdin.write (data+'\n');
				};
			}
			catch (e)
			{
				//console.log (e.stack);
				emitter.emit ('exit', -1, e);
			}
			return emitter;
		}
	};
}

module.exports.load = load;
module.exports.isWindows = isWindows;
module.exports.pty = pty;
