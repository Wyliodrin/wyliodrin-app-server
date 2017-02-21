
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

function treeToFilesystem(tree,folder,ext,generalMakefile){
	for (var i = 0 ; i < tree.length ; i++){
		if (tree[i].isspecial){
		}
		else if (tree[i].isdir){
			//mkdir
			var d = path.join(folder, tree[i].name);

			//makefile
			if (tree[i].issoftware){
				d = d + ".software";
				fs.mkdirSync(d);
				var makepath = path.join(d, "Makefile.wyliodrin");

				fs.writeFile(makepath, tree[i].m, function(err) {
				    if(err) { console.log(err) }
				}); 

			}
			else if (tree[i].isfirmware){
				if (!tree[i].enable){
					//firmware not used (no port)
					continue;
				}
				d = d + ".firmware";
				fs.mkdirSync(d);

				var here = true;

				var userDefined = false;

				for (var j = 0 ; j< tree[i].children.length;j++){
					var child = tree[i].children[j];
					if (child.name.toLowerCase() == "makefile"){
						//found user defined makefile
						var makepath = path.join(d, "Makefile.firmware");
						fs.writeFile(makepath, child.content, function(err) {
						   	if(err) { console.log(err) }
						});
						tree[i].children.splice(j,1);
						userDefined = true;
						break;
					}
						
				}

				if (!userDefined){
					//default makefile
					var makepath = path.join(d, "Makefile.firmware");
					fs.writeFile(makepath, tree[i].m.ca, function(err) {
					   	if(err) { console.log(err) }
					});
				}

				var makepath = path.join(d, "Makefile.send");
				if (tree[i].m.s){
					fs.writeFile(makepath, tree[i].m.s, function(err) {
				    	if(err) { console.log(err) }
					});
					here = false;
				}

				makepath = path.join(d, "Makefile.compileHere");
				if (tree[i].m.ch){
					fs.writeFile(makepath, tree[i].m.ch, function(err) {
				    	if(err) { console.log(err) }
					});
					here = true;
				}

				makepath = path.join(d, "Makefile.flash");
				if (tree[i].m.f){
					fs.writeFile(makepath, tree[i].m.f, function(err) {
				    	if(err) { console.log(err) }
					});
				}
				generalMakefile = firmware_makefile(generalMakefile,here,d,tree[i].faketype,tree[i].fakesubtype,tree[i].fport);

			}
			else{
				fs.mkdirSync(d);
			}
			generalMakefile = treeToFilesystem(tree[i].children, d, ext, generalMakefile);
		}
		else if (!tree[i].isdir){
			//touch
			if (tree[i].name.toLowerCase() != "makefile"){
				var d = path.join(folder, tree[i].name);
				
				fs.writeFile(d, tree[i].content, function(err) {
				    if(err) { console.log(err) }
				}); 
			}
		}
	}
	return generalMakefile;
}

function firmware_makefile(generalMakefile, here, folder, type, subtype, ports)
{
	//type and subtype have
	//.type(openmote) and .name("Open Mote")
	if (!here)
	{
		//compile onserver
		generalMakefile += ("\t+$(MAKE) -C " + "'" + folder + "' -f Makefile.send" + " -s\n");
	}
	else
	{
		//compile local
		generalMakefile += ("\t+$(MAKE) -C " + "'" + folder + "' -f Makefile.compileHere PROJECTID=0 FIRMWARE=0 DEVICE=" + subtype.type + " -s\n");
	}

	_.forEach(ports, function(port){
		generalMakefile += ("\t+$(MAKE) -C " + "'" + folder + "' -f Makefile.flash PORT=" + port + " DEVICE=" + subtype.type + " -s\n");
	});

	return generalMakefile;
}


if (util.isWindows())
{
	PROJECT_PID_TEMP = 'c:\\wyliodrin\\tmp\\.tree-project';
}
else
{
	PROJECT_PID_TEMP = '/tmp/.tree-project';
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
		fs.unlink (PROJECT_PID_TEMP, function(err){
			console.log(err);
		});
		if (project === null) gadget.status ();
	}
}

function runProject (p)
{
	var dir = settings.SETTINGS.build_file+path.sep+'tree_project';
	var exec = child_process.exec;
	var ext = 'js';
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

		////////////////////////////am in dir folderul, in p.t arborele

		//rmdir.sync(dir);
		//fs.mkdirSync(dir);
		var write_all_tree = function (p,dir,ext){
			var generalMakefile = "MAKEFLAGS += --silent\n\nrun:\n";
			generalMakefile += treeToFilesystem(p.t.children,dir,ext,generalMakefile);


			//make the software firmware
			var items = fs.readdirSync(dir);

			for (var i=0; i<items.length; i++) {
				if(_.endsWith(items[i], ".software")){
					generalMakefile += ("\t+$(MAKE) -C " + "'" + items[i] + "' -f Makefile.wyliodrin" + "\n");
				}
			}

			fs.writeFile(path.join(dir, "Makefile."+settings.boardtype), generalMakefile, function(err) {
				if(err) { console.log(err); }
			});
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

			console.log(cmd+dir+' "'+sudo+'" ');
			exec (cmd+dir+' "'+sudo+'" ', function (err, stdout, stderr)
			{
				startingProject = false;

				debug ('err: '+err);
				debug ('stdout: '+stdout);
				debug ('stderr: '+stdout);
				if (stdout) uplink.send ('tp', {a:'start', r:'s', s:'o', t:stdout});
				if (stderr) uplink.send ('tp', {a:'start', r:'s', s:'e', t:stderr});
				if (err) uplink.send ('tp', {a:'start', r:'e', e:err});
				
				write_all_tree(p,dir,ext);

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

				if (project) uplink.send ('tp', {a:'start', r:'d'});
				else uplink.send ('tp', {a:'start', r:'e'});

				gadget.status ();

				project.on('data', function(data) {
					if (runAnotherProject === null)
					{
				  		uplink.sendLowPriority ('tp', {a:'k', t:data});
				  	}
				});
				project.resize (p.c, p.r);

				project.on ('exit', function (error)
				{
					fs.unlink (PROJECT_PID_TEMP, function (err){
						console.log(err);
					});
					project = null;
					projectpid = 0;
					// console.log (runAnotherProject);
					if (runAnotherProject !== null) 
					{
						runProject (runAnotherProject);
					}
					else 
					{
						uplink.send ('tp', {a:'k', t:'Project exit with error '+error+'\n'});
						uplink.send ('tp', {a:'stop'});
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




