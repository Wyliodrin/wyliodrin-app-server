
"use strict";

var util = require ('../util.js');
var debug = require ('debug')('wyliodrin:app:server:shell');
var uplink = require ('./uplink');
var _ = require ('lodash');
var settings = require ('./settings');
var board = require ('./settings').board;

console.log ('Loading shell library');

var shell = null;

function openShell (p)
{
	if (!shell)
	{
		
		shell = util.pty.spawn(board.shell, [], {
		  name: 'xterm-color',
		  cols: p.c,
		  rows: p.r,
		  cwd: '/wyliodrin',
		  env: _.assign (process.env, settings.env)
		});

		shell.on ('error', function (error)
		{
			// send ('s', {a:'k', e:error});
			// send ('s', {a:'k', t:'Shell closed\n'});
			shell = null;
		});

		shell.on('data', function(data) {
		  	uplink.sendLowPriority ('s', {a:'k', t:data});
		});

		shell.on ('exit', function ()
		{
			uplink.send ('s', {a:'k', t:'Shell closed\n'});
			shell = null;
		});
	}
	shell.resize (p.c, p.r);
}


function keysShell (keys)
{
	if (shell) shell.write (keys);
}

function resizeShell (cols, rows)
{
	if (shell) shell.resize (cols, rows);
}

debug ('Registering for tag s');
uplink.tags.on ('s', function (p)
{
	// open
	if (p.a === 'o')
	{
		if (!shell)
		{
			openShell (p);
		}
	}
	else
	if (p.a === 'r')
	{
		resizeShell (p.c, p.r);
	}
	else
	if (p.a === 'k')
	{
		if (shell) keysShell (p.t);
		else uplink.send ('s', {a:'e', e:'noshell'});
	}
});
