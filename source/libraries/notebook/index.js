
"use strict";

/* python
{
	python: process,
	scripts: [{
		script: script string,
		label: any number,
	}],
	status: LOADING / READY / PROCESSING / STOPPED,
	waiting: DATA_TYPE / DATA_VALUE
	dataBuffer: string,
	dataType: string,
	currentScript: {},
	boundary: random string,
	prompt: prompt_stream
}
*/

var child_process = require ('child_process');
var split2 = require ('split2');
var uuid = require ('uuid');
var debug = require ('debug')('wyliodrin:app:server:notebook');
var uplink = require ('../uplink');
var path = require ('path');
var _ = require ('lodash');
var settings = require ('../settings');
var fs = require ('fs');
var mkdirp = require ('mkdirp');

var redis = require ('redis');

var async = require ('async');

var DATA_TYPE = 0;
var DATA_VALUE = 1;

var LOADING = 0;
var READY = 1;
var PROCESSING = 2;
var STOPPED = 3;

var serial = null;
var flashing = null;
var readserial = null;

// var script = 
// `
// import matplotlib
// #matplotlib.use ('Agg')
// import matplotlib.pyplot as plt
// import matplotlib.axes as axes
// import pandas as pd
// import numpy as np
// for i in range (1, 100):
// 	i
// 	#print i
// df = pd.DataFrame(np.random.randint(0,100,size=(100, 4)), columns=list('ABCD'))
// #df
// df10000.plot ()
// `;

console.log ('Loading notebook library');

function Python ()
{
	var regex = /^<([a-zA-Z0-9_\.]+)\s+\'([a-zA-Z0-9_\.]+)\'>$/;
	this.linkredis = 'notebook='+uuid.v4()+'=';

	this.sudo = false;

	var cmd = 'python';
	var args = ['-u', 
				'-i', 
				path.join (__dirname, 'loader.py'), 
				this.linkredis
			];

	var sudo = settings.SETTINGS.run.split(' ');
	if (sudo[0]==='sudo')
	{
		this.sudo = true;
		cmd = 'sudo';
		args.splice (0, 0, '-E', 'python');
	}

	mkdirp.sync (path.join(process.env.HOME, 'notebook'));
	fs.chmodSync (path.join(process.env.HOME, 'notebook'), '2775');
	fs.writeFileSync (path.join(process.env.HOME, 'notebook', 'matplotlibrc'), 'backend : Agg\n');
	// console.log (parseInt ('0002', 8));
	// var oldumask = process.umask (parseInt ('0002', 8));
	this.python = child_process.spawn (cmd, args, {stdio: ['pipe', 'pipe', 'pipe'], 'env':_.assign (process.env, {'MPLBACKEND':'Agg'})});
	this.pid = this.python.pid;
	debug ('Python [%d] started', this.pid);
	this.waiting = DATA_TYPE;
	this.dataBuffer = '';
	this.dataType = null;
	this.exceptionBuffer = '';
	this.scripts = [];
	this.currentScript = null;
	this.status = LOADING;
	this.prompt = split2();	
	this.stdoutBuffer = '';
	this.stderrBuffer = '';

	this.connection = redis.createClient ();
	this.connection.on ('error', function ()
	{
		console.log ('redis error');
	});
	this.connection.subscribe (this.linkredis+'response');
	this.connection.subscribe (this.linkredis+'exception');

	this.response = null;
	this.exception = null;

	this.connection.on ('message', function (channel, message)
	{
		console.log (channel);
		if (that.status !== STOPPED)
		{
			if (channel === that.linkredis+'response')
			{
				that.dataType = message.substr(0, message.indexOf("\n"));
				that.dataBuffer = message.substr(message.indexOf("\n")+1);
				var type = regex.exec (that.dataType);
				var f = '';
				var s = '';
				if (type && type.length==3)
				{
					f = type[1];
					s = type[2];
				}
				that.response = {
					type: {
						f: f,
						s: s
					},
					buf: that.dataBuffer
				};
				if (that.status === READY)
				{
					uplink.send ('note', {
						a: 'r', 
						t: 'r',
						d: that.response,
						l: that.currentScript.label
					});
					that.response = null;
				}
				// console.log (response);
				that.dataType = null;
				that.dataBuffer = '';
			}
			else
			if (channel === that.linkredis+'exception')
			{
				if (that.currentScript)
				{
					that.exceptionBuffer = message
					that.exception = {
						buf: that.exceptionBuffer
					};
					uplink.send ('note', {
						a: 'r', 
						t: 'e',
						d: that.exception,
						l: that.currentScript.label
					});
					// console.log (exception);
					that.exceptionBuffer = '';
				}
			}
		}
	});

	// this._data = function _data (data)
	// {
	// 	if (this.status !== STOPPED)
	// 	{
	// 		if (this.waiting === DATA_TYPE)
	// 		{
	// 			this.dataType = data.toString();
	// 			this.waiting = DATA_VALUE;
	// 		}
	// 		else
	// 		if (this.waiting === DATA_VALUE)
	// 		{
	// 			if (data.toString() === this.boundary)
	// 			{
	// 				this.waiting = DATA_TYPE;
	// 				// console.log (this.dataBuffer);
	// 				// console.log (this.dataType);
	// 				var type = regex.exec (this.dataType);
	// 				var f = '';
	// 				var s = '';
	// 				if (type && type.length==3)
	// 				{
	// 					f = type[1];
	// 					s = type[2];
	// 				}
	// 				this.response = {
	// 					type: {
	// 						f: f,
	// 						s: s
	// 					},
	// 					buf: this.dataBuffer.substring (0, this.dataBuffer.length-1)
	// 				};
	// 				if (this.status === READY)
	// 				{
	// 					uplink.send ('note', {
	// 						a: 'r', 
	// 						t: 'r',
	// 						d: this.response,
	// 						l: this.currentScript.label
	// 					});
	// 					this.response = null;
	// 				}
	// 				// console.log (response);
	// 				this.dataType = null;
	// 				this.dataBuffer = '';
	// 			}
	// 			else
	// 			{
	// 				this.dataBuffer = this.dataBuffer + data + '\n';
	// 				// console.log (data);
	// 			}
	// 		}
	// 	}
	// };

	// this._exception = function _exception (data)
	// {
	// 	if (this.status !== STOPPED && this.currentScript)
	// 	{
	// 		if (data.toString() === this.boundary)
	// 		{
	// 			this.exception = {
	// 				buf: this.exceptionBuffer
	// 			};
	// 			uplink.send ('note', {
	// 				a: 'r', 
	// 				t: 'e',
	// 				d: this.exception,
	// 				l: this.currentScript.label
	// 			});
	// 			// console.log (exception);
	// 			this.exceptionBuffer = '';
	// 		}
	// 		else
	// 		{
	// 			// console.log (data);
	// 			this.exceptionBuffer = this.exceptionBuffer + data + '\n';
	// 			// console.log (data);
	// 		}
	// 	}
	// 	else
	// 	{
	// 		console.log (data);
	// 	}
	// };

	this.evaluate = function evaluate (script, label)
	{
		if (!label) label = uuid.v4 ();
		this.scripts.push ({
			script: script,
			label: label
		});
		debug ('Added script %s to queue', this.scripts[this.scripts.length-1].label);
		this._next ();
		return label;
	};

	this._next = function _next ()
	{
		if (this.status === READY && this.scripts.length > 0)
		{
			this.currentScript = this.scripts[0];
			debug ('Running script %s', this.currentScript.label);
			this.scripts.splice (0, 1);
			this.status = PROCESSING;
			sendStatus ();
			this.python.stdin.write (this._format (this.currentScript.script));
		}
	};

	this.interrupt = function interrupt ()
	{
		if (this.python)
		{
			if (sudo)
			{
				child_process.spawn ('sudo', ['kill', '-2', this.pid]);
			}
			else
			{
				this.python.kill ('SIGINT');
			}
		}
	};

	this.stop = function stop ()
	{
		clearInterval (this.sendBuffer);
		this.connection.quit ();
		if (this.python)
		{
			if (sudo)
			{
				child_process.spawn ('sudo', ['kill', '-9', this.pid]);
			}
			else
			{
				this.python.kill ('SIGKILL');
			}
			this.python = null;
			this.status = STOPPED;
			sendStatus ();
		}
	};

	this.running = function running ()
	{
		return this.python !== null;
	};

	this.stopped = function stopped ()
	{
		return this.status === STOPPED;
	};

	this._format = function _format (script)
	{
		var lines = script.split (/\r?\n/);
		var script = 'if 1:\n';
		lines.forEach (function (line)
		{
			if (line.trim () !== '') script = script + '  '+ line + '\n';
		});
		script = script + '\n';
		// console.log (script);
		return script;
	};

	var that = this;

	this.prompt.on ('data', function (data)
	{
		if (data === '>>>') 
		{
			if (that.currentScript) 
			{
				debug ('Finished script %s', that.currentScript.label);
				if (that.response !== null)
				{
					uplink.send ('note', {
						a: 'r', 
						t: 'r',
						d: that.response,
						l: that.currentScript.label
					});
					that.response = null;
				}
				uplink.send ('note', {
						a: 'r', 
						t: 'd',
						l: that.currentScript.label
					});
			}
			that.status = READY;
			sendStatus ();
			that._next ();
		}
		else if (data !== '...')
		{
			that.stderrBuffer = that.stderrBuffer + data + '\n';
		}
		// console.log (pythonStatus);
	});

	this.sendBuffer = setInterval (function ()
	{
		if (that.currentScript)
		{
			// console.log ('send output buffers');
			if (that.stdoutBuffer.length > 0)
			{
				uplink.send ('note', {
					a: 'r', 
					t: 's',
					s: 'o',
					d: that.stdoutBuffer,
					l: that.currentScript.label
				});
				that.stdoutBuffer = '';
			}
			if (that.stderrBuffer.length > 0)
			{
				uplink.send ('note', {
					a: 'r',
					t: 's',
					s: 'e', 
					d: that.stderrBuffer,
					l: that.currentScript.label
				});
				that.stderrBuffer = '';
			}
		}
	}, 1000);

	this.python.on ('exit', function (err)
	{
		that.status = STOPPED;
		sendStatus ();
		debug ('Python [%d] has exited', that.pid);
	});
	this.python.stdout.on ('data', function (data)
	{
		that.stdoutBuffer = that.stdoutBuffer + data.toString ();
		console.log ('stdout: '+data.toString ());
	});
	this.python.stderr.on ('data', function (data)
	{
		that.prompt.write (data);
		// that.stderrBuffer = that.stderrBuffer + data;
		console.log ('stderr: '+data.toString ());
	});
	// this.python.stdio[3].pipe (split2()).on ('data', function (data)
	// {
	// 	// console.log ('output');
	// 	that._data (data);
	// });
	// this.python.stdio[4].pipe (split2()).on ('data', function (data)
	// {
	// 	that._exception (data);
	// });
}

debug ('Registering for note tag');

var python = null;

function sendStatus ()
{
	if (python)
	{
		if (python.status === PROCESSING)
		{
			uplink.send ('note', {
				a:'status',
				r:'r',
				l:python.currentScript.label
			});
		}
		else
		{
			uplink.send ('note', {
				a:'status',
				r:'r'
			});
		}
	}
	else
	{
		uplink.send ('note', {
			a:'status',
			r:'s'
		});
	}
}

uplink.tags.on ('note', function (p)
{
	// restart
	if (p.a === 'stop')
	{
		if (python) python.stop ();
		python = null;
	}
	else
	if (p.a === 'reset')
	{
		if (python) python.stop ();
		python = new Python ();
	}
	else
	if (p.a === 'r')
	{
		if (!python || python.stopped ()) python = new Python ();
		if (python)
		{
			var l = python.evaluate (p.s, p.l);
			uplink.send ('note', {
				a:'r',
				t:'r',
				l: l
			});
		}
		else
		{
			uplink.send ('note', {
				a: 'r',
				t: 'e',
				e: 'python is not running',
				l: p.l
			});
		}
	}
	else
	if (p.a === 's')
	{
		if (python) python.interrupt ();
	}
	else
	if (p.a === 'status')
	{
		sendStatus ();
	}
	else
	if (p.a === 'f')
	{
		var fdir = path.join (process.env.HOME,'notebook','firmware');
		if (p.f && p.f.length>0)
		{
			if (serial) serial.kill ('SIGKILL');
			flashing = p.l;
			var f = path.basename (p.s);
			var dir = path.join (fdir, path.dirname(p.s));
			var filename = path.join (dir, f);
			var makefile = path.join (fdir,'makefile');
			var makefile_firmware = path.join (fdir,'Makefile.firmware');
			async.series ([
					function (done) { child_process.exec ('rm -rf '+fdir, done); },
					function (done) { mkdirp (dir, done) ;},
					function (done) { fs.writeFile (filename, p.f, done); },
					function (done) { fs.writeFile (makefile, p.m, done); },
					function (done) { fs.writeFile (makefile_firmware, p.mfl, done); },
				],
				function (err)
				{
					if (!err)
					{
						var label = flashing;
						serial = child_process.spawn ('make', ['PROJECTID='+0, 'FIRMWARE=notebook', 'DEVICE='+p.d, 'PORT='+p.p, 'compile', 'flash'], {cwd:fdir, stdio:['pipe', 'pipe', 'pipe']});
						serial.on ('exit', function (err)
						{
							uplink.send ('note', {
								a:'f',
								l: label,
								s:'f',
								e:err
							});
							serial = null;
							flashing = null;
						});
						serial.stdout.on ('data', function (data)
						{
							uplink.send ('note', {
								a:'f',
								l: label,
								s:'o',
								d:data.toString ()
							});
							console.log ('stdout: '+data.toString());
						});
						serial.stderr.on ('data', function (data)
						{
							uplink.send ('note', {
								a:'f',
								l: label,
								s:'e',
								d:data.toString ()
							});
							console.log ('stderr: '+data.toString());
						});
					}
				});
		}
		else
		{
			if (serial) serial.kill ('SIGKILL');
			serial = null;
		}
	}
	else
	if (p.a === 'serial')
	{
		var fdir = path.join (process.env.HOME,'notebook','firmware');
		if (p.l && p.l.length>0)
		{
			var label = p.l;
			if (readserial) child_process.spawn ('make', ['stop'], {cwd:fdir});
			readserial = child_process.spawn ('make', ['BAUD='+p.b, 'PORT='+p.p, 'serial'], {cwd:fdir, stdio:['pipe', 'pipe', 'pipe', 'pipe']});
			readserial.on ('exit', function (err)
			{
				uplink.send ('note', {
					a:'f',
					l: label,
					s:'f',
					e:err
				});
				serial = null;
				flashing = null;
			});
			readserial.stdout.on ('data', function (data)
			{
				uplink.send ('note', {
					a:'f',
					l: label,
					s:'o',
					d:data.toString ()
				});
				console.log ('stdout: '+data.toString());
			});
			readserial.stderr.on ('data', function (data)
			{
				uplink.send ('note', {
					a:'f',
					l: label,
					s:'e',
					d:data.toString ()
				});
				console.log ('stderr: '+data.toString());
			});
			readserial.stdio[3].on ('data', function (data)
			{
				uplink.send ('note', {
					a:'f',
					l: label,
					s:'r',
					d:data.toString ()
				});
			});
		}
		else
		{
			if (readserial) child_process.spawn ('make', ['stop'], {cwd:fdir});
			readserial = null;
		}
	}
});

	

// var p = new Python ();
// for (var i=0; i< 10; i++) p.evaluate (script);
