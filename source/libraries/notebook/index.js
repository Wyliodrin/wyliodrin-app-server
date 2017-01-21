
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

var DATA_TYPE = 0;
var DATA_VALUE = 1;

var LOADING = 0;
var READY = 1;
var PROCESSING = 2;
var STOPPED = 3;

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
	var regex = /^<([a-zA-Z0-9_]+)\s+\'([a-zA-Z0-9_]+)\'>$/;
	this.boundary = '================================'+uuid.v4()+'================================';
	this.python = child_process.spawn ('python', ['-u', '-i', path.join (__dirname, 'loader.py'), this.boundary], {stdio: ['pipe', 'pipe', 'pipe', 'pipe', 'pipe']});
	this.pid = this.python.pid;
	debug ('Python [%d] started', this.pid);
	this.waiting = DATA_TYPE;
	this.dataBuffer = '';
	this.dataType = null;
	this.exceptionBuffer = '';
	this.scripts = [];
	this.currentScript = null;
	this.status = LOADING;
	this.prompt = split2(' ');	
	this.stdoutBuffer = '';
	this.stderrBuffer = '';

	this.response = null;
	this.exception = null;
	this._data = function _data (data)
	{
		if (this.status !== STOPPED)
		{
			if (this.waiting === DATA_TYPE)
			{
				this.dataType = data.toString();
				this.waiting = DATA_VALUE;
			}
			else
			if (this.waiting === DATA_VALUE)
			{
				if (data.toString() === this.boundary)
				{
					this.waiting = DATA_TYPE;
					// console.log (this.dataBuffer);
					// console.log (this.dataType);
					var type = regex.exec (this.dataType);
					var f = '';
					var s = '';
					if (type && type.length==3)
					{
						f = type[1];
						s = type[2];
					}
					this.response = {
						type: {
							f: f,
							s: s
						},
						buf: this.dataBuffer.substring (0, this.dataBuffer.length-1)
					};
					if (this.status === READY)
					{
						uplink.send ('note', {
							a: 'r', 
							t: 'r',
							d: this.response,
							l: this.currentScript.label
						});
					}
					// console.log (response);
					this.dataType = null;
					this.dataBuffer = '';
				}
				else
				{
					this.dataBuffer = this.dataBuffer + data + '\n';
					// console.log (data);
				}
			}
		}
	};

	this._exception = function _exception (data)
	{
		if (this.status !== STOPPED)
		{
			if (data.toString() === this.boundary)
			{
				this.exception = {
					buf: this.exceptionBuffer
				};
				uplink.send ('note', {
					a: 'r', 
					t: 'e',
					d: this.exception,
					l: this.currentScript.label
				});
				// console.log (exception);
				this.exceptionBuffer = '';
			}
			else
			{
				this.exceptionBuffer = this.exceptionBuffer + data + '\n';
				// console.log (data);
			}
		}
	};

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
			this.python.stdin.write (this._format (this.currentScript.script));
		}
	};

	this.interrupt = function interrupt ()
	{
		if (this.python) this.python.kill ('SIGINT');
	};

	this.stop = function stop ()
	{
		clearInterval (this.sendBuffer);
		if (this.python)
		{
			this.python.kill ('SIGKILL');
			this.python = null;
			this.status = STOPPED;
		}
	};

	this.running = function running ()
	{
		return this.python !== null;
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
				if (that.dataBuffer.length !== null)
				{
					uplink.send ('note', {
						a: 'r', 
						t: 'r',
						d: that.response,
						l: that.currentScript.label
					});
				}
			}
			that.status = READY;
			that._next ();
		}
		// console.log (pythonStatus);
	});

	this.sendBuffer = setInterval (function ()
	{
		if (this.currentScript)
		{
			if (that.stdoutBuffer.length > 0)
			{
				uplink.send ('note', {
					a: 'r', 
					t: 's',
					s: 'o',
					d: that.stdoutBuffer,
					l: this.currentScript.label
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
					l: this.currentScript.label
				});
				that.stderrBuffer = '';
			}
		}
	}, 1000);

	this.python.on ('exit', function (err)
	{
		that.status = STOPPED;
		debug ('Python [%d] has exited', that.pid);
	});
	this.python.stdout.on ('data', function (data)
	{
		that.stdoutBuffer = that.stdoutBuffer + data.toString ();
		// console.log ('stdout: '+data.toString ());
	});
	this.python.stderr.on ('data', function (data)
	{
		that.prompt.write (data);
		that.stderrBuffer = that.stderrBuffer + data;
		console.log ('stderr: '+data.toString ());
	});
	this.python.stdio[3].pipe (split2()).on ('data', function (data)
	{
		// console.log ('output');
		that._data (data);
	});
	this.python.stdio[4].pipe (split2()).on ('data', function (data)
	{
		// console.log ('output');
		that._exception (data);
	});
}

debug ('Registering for note tag');

var python = null;

uplink.tags.on ('note', function (p)
{
	// restart
	if (p.a === 'reset')
	{
		if (python) python.stop ();
		python = new Python ();
	}
	else
	if (p.a === 'r')
	{
		if (!python) python = new Python ();
		if (python)
		{
			var l = python.evaluate (p.s, p.l);
			uplink.send ('note', {
				a:'d',
				l: l
			});
		}
		else
		{
			uplink.send ('note', {
				a: 'e',
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
});

	

// var p = new Python ();
// for (var i=0; i< 10; i++) p.evaluate (script);
