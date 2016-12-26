
"use strict";

console.log ('Loading project library');
var debug = require ('debug')('wyliodrin:app:server:project');
var util = require ('../../util.js');
var fs = require ('fs');
var uplink = require ('../uplink');
var _ = require ('lodash');
var gadget = require ('../gadget');
var child_process = require ('child_process');
var path = require ('path');
var board = require ('../settings').board;
var boardtype = require ('../settings').boardtype;
var settings = require ('../settings');
var async = require ('async');

var PROJECT_PID_TEMP = '';

var runAnotherProject = null;
var project = null;
var startingProject = false;


if (util.isWindows())
{
	PROJECT_PID_TEMP = 'c:\\wyliodrin\\tmp\\.app-project';
}
else
{
	PROJECT_PID_TEMP = '/tmp/.app-project';
}
console.log ('Project PID stored in '+PROJECT_PID_TEMP);

debug ('Reading projectpid');
var projectpid = 0;
try
{
	projectpid = fs.readFileSync (PROJECT_PID_TEMP);
	debug ('projectpid '+projectpid);
}
catch (e)
{

}

function stopProject ()
{
	if (projectpid !== 0)
	{
		console.log (settings.SETTINGS.stop+' '+projectpid);
		child_process.exec (settings.SETTINGS.stop+' '+projectpid);
		projectpid = 0;
		fs.unlink (PROJECT_PID_TEMP);
		if (project === null) gadget.status ();
	}
}

function runProject (p)
{
	var dir = settings.SETTINGS.build_file+path.sep+'app_project';
	var exec = child_process.exec;
	var ext = 'js';
	if (p.l === 'python') ext = 'py';
	else
	if (p.l === 'visual') ext = 'py';
	else
	if (p.l === 'shell') ext = 'sh';
	else
	if (p.l === 'csharp') ext = 'cs';
	else
	if (p.l === 'powershell') ext = 'ps1';
	else
	if (p.l === 'streams') ext = 'streams';
	if (projectpid !== 0)
	{
		runAnotherProject = p;
		debug ('Stop project already started '+projectpid);
		stopProject ();
	}
	else
	{
		var sudo = settings.SETTINGS.run.split(' ');
		if (sudo[0]==='sudo')
		{
			sudo = 'sudo';
		}
		else
		{
			sudo = '';
		}
		var firmwaremakefile = '';
		if (board.firmware_makefile !== '')
		{
			firmwaremakefile = ' && cp ./makefile/'+board.firmware_makefile+' '+dir+path.dirname(board.firmware)+'/Makefile';
		}
		runAnotherProject = null;
		debug ('Removing project');
		if (startingProject === false)
		{
			startingProject = true;
			var cmd = '';
			if (util.isWindows())
			{
				cmd = 'cmd /c '+path.join (__dirname, 'run.cmd')+' ';
			}
			else
			{
				cmd = board.shell+' '+path.join (__dirname, 'run.sh')+' ';
			}
			exec (cmd+dir+' "'+sudo+'" '+dir+path.dirname(board.firmware)+firmwaremakefile, function (err, stdout, stderr)
			{
				startingProject = false;
				console.log (err);
				debug ('err: '+err);
				debug ('stdout: '+stdout);
				debug ('stderr: '+stdout);
				if (stdout) uplink.send ('p', {a:'start', r:'s', s:'o', t:stdout});
				if (stderr) uplink.send ('p', {a:'start', r:'s', s:'e', t:stderr});
				if (err) uplink.send ('p', {a:'start', r:'e', e:err});
				if (!err) async.series ([
						function (done) { fs.writeFile (dir+path.sep+'main.'+ext, p.p, done); },
						function (done) { if (p.f) fs.writeFile (dir+board.firmware, p.f, done); else setTimeout (done); },
						function (done) { if (util.isWindows ()) {fs.writeFile (dir+path.sep+'make.cmd', p.m, done);} else { fs.writeFile (dir+path.sep+'Makefile.'+boardtype, p.m, done);} }
					],
					function (err, results)
					{
						if (err)
						{
							debug ('Error writing files '+dir+' error '+err);
						}
						else
						{
							var makerun = settings.SETTINGS.run.split(' ');
							project = util.pty.spawn(makerun[0], makerun.slice (1), {
							  name: 'xterm-color',
							  cols: p.c,
							  rows: p.r,
							  cwd: dir,
							  env: _.assign (process.env, gadget.env, {wyliodrin_project:"app-project"})
							});
	
							projectpid = project.pid;
	
							fs.writeFileSync (PROJECT_PID_TEMP, projectpid);
	
							if (project) uplink.send ('p', {a:'start', r:'d'});
							else uplink.send ('p', {a:'start', r:'e'});
	
							gadget.status ();
	
							project.on('data', function(data) {
								if (runAnotherProject === null)
								{
							  		uplink.sendLowPriority ('p', {a:'k', t:data});
							  	}
							});
							project.resize (p.c, p.r);
							}
	
							project.on ('exit', function (error)
							{
								fs.unlink (PROJECT_PID_TEMP);
								project = null;
								projectpid = 0;
								// console.log (runAnotherProject);
								if (runAnotherProject !== null) 
								{
									runProject (runAnotherProject);
								}
								else 
								{
									uplink.send ('p', {a:'k', t:'Project exit with error '+error+'\n'});
									uplink.send ('p', {a:'stop'});
									gadget.status ();
								}
							});
					});
				// fs.writeFile (dir+'/main.'+ext, p.p, function (err)
				// {
				// 	if (err)
				// 	{
				// 		debug ('Error writing file '+dir+'/app_project/main.'+ext);
				// 	}
				// 	else
				// 	{
				// 		project = util.pty.spawn('sudo', ['-E', 'node', 'main.js'], {
				// 		  name: 'xterm-color',
				// 		  cols: p.c,
				// 		  rows: p.r,
				// 		  cwd: dir+'/app_project',
				// 		  env: process.env
				// 		});
	
				// 		project.on('data', function(data) {
				// 		  	uplink.send ('r', {a:'k', t:data});
				// 		});
				// 		project.resize (p.c, p.r);
				// 	}
				// });
			});
		}
	}
}

function resizeProject (cols, rows)
{
	if (project) project.resize (cols, rows);
}

function keysProject (keys)
{
	if (project) project.write (keys);
}

debug ('Registering for tag p');

uplink.tags.on ('p', function (p)
{
	if (p.a === 'start')
	{
		runProject (p);
	}
	else if (p.a === 'stop')
	{
		stopProject ();
	}
	else if (p.a === 'k')
	{
		keysProject (p.t);
	}
});

function getProjectPid ()
{
	return projectpid;
}

module.exports.getProjectPid = getProjectPid;




