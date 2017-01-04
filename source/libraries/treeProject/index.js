
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
var rmdir = require ("rimraf");

var PROJECT_PID_TEMP = '';

var runAnotherProject = null;
var project = null;
var startingProject = false;

function treeToFilesystem(tree,folder,ext){
	for (var i = 0 ; i < tree.length ; i++){
		console.log(tree[i]);
		if (tree[i].isspecial){
		}
		else if (tree[i].isdir){
			//mkdir
			var d = path.join(folder, tree[i].name);

			//makefile
			if (tree[i].issoftware){
				d = d + ".software";
				fs.mkdirSync(d);
				var makepath = path.join(d, "Makefile");

				fs.writeFile(makepath, tree[i].m, function(err) {
				    if(err) { console.log(err) }
				}); 

			}
			else if (tree[i].isfirmware){
				d = d + ".firmware";
				fs.mkdirSync(d);
				var makepath = path.join(d, "Makefile");

				fs.writeFile(makepath, tree[i].m, function(err) {
				    if(err) { console.log(err) }
				}); 
			}
			else{
				fs.mkdirSync(d);
			}
			treeToFilesystem(tree[i].children, d, ext);
		}
		else if (!tree[i].isdir){
			//touch
			if (tree[i].ismain){
				//any name should it have, we call it main
				var d = path.join(folder, "main");
			}
			else{
				var d = path.join(folder, tree[i].name);
			}
			var d = path.join(folder, tree[i].name);
			d = d + "." + ext;
			fs.writeFile(d, tree[i].content, function(err) {
			    if(err) { console.log(err) }
			}); 
		}
	}
}


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
		/*if (sudo[0]==='sudo')
		{
			sudo = 'sudo';
		}
		else
		{
			sudo = '';
		}*/ //////////////////////////////////mai vedem

		////////////////////////////am in dir folderul, in p.t arborele

		rmdir.sync(dir);
		fs.mkdirSync(dir);

		treeToFilesystem(p.t.children,dir,ext);


		var generalMakefile = "all:\n";


		//for each part of project
		var items = fs.readdirSync(dir);

		if (!p.onlysoft)
		{
			for (var i = 0; i<items.length; i++) {
				items[i] = items[i].toString();
				if(_.endsWith(items[i], ".firmware")){
					generalMakefile += ("\t+$(MAKE) -C " + "'" + items[i] + "'" + "\n");
				}
			}
		}
		for (var i=0; i<items.length; i++) {
			if(_.endsWith(items[i], ".software")){
				generalMakefile += ("\t+$(MAKE) -C " + "'" + items[i] + "'" + "\n");
			}
		}

		fs.writeFile(path.join(dir, "Makefile"), generalMakefile, function(err) {
			if(err) { console.log(err) }
		});

		//now run makefile

		console.log ("TOTU BINE PANA AICI");




		/*var firmwaremakefile = '';
		if (board.firmware_makefile !== '')
		{
			firmwaremakefile = ' && cp ./makefile/'+board.firmware_makefile+' '+dir+path.dirname(board.firmware)+'/Makefile';
		}*/
		//////////////////////////////////iar discutabil daca il folosim sa luam firmwareuri predefinite
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
			exec (cmd, function (err, stdout, stderr)
			{
				startingProject = false;

				debug ('err: '+err);
				debug ('stdout: '+stdout);
				debug ('stderr: '+stdout);
				if (stdout) uplink.send ('p', {a:'start', r:'s', s:'o', t:stdout});
				if (stderr) uplink.send ('p', {a:'start', r:'s', s:'e', t:stderr});
				if (err) uplink.send ('p', {a:'start', r:'e', e:err});
				
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

debug ('Registering for tag tp');

uplink.tags.on ('tp', function (p)
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




