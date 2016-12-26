
"use strict";

var uplink = require ('./uplink');
var debug = require ('debug')('wylidorin:app:server:package_manager');
var child_process = require ('child_process');
var _ = require ('lodash');
var settings = require ('./settings');
var util = require ('../util.js');

console.log ('Loading package_manager library');

function listPackagesNodejs (done)
{
	debug ('List packages nodejs');
	child_process.exec ('npm -g --depth=0 --json ls', function (error, stdout, stderr)
	{
		if (error)
		{
			debug ('List packages nodejs error '+error);
			done (error);
		}
		else
		{
			try
			{
				var npmpackages = JSON.parse (stdout).dependencies;
				var packages = [];
				_.each (npmpackages, function (packagevalue, name)
				{
					packages.push ({n:name, v:packagevalue.version});
				});
				// console.log (packages);
				done (null, packages);
			}
			catch (e)
			{
				debug ('List packages nodejs error '+e);
				done (e);
			}
		}
	});
}

function listPackagesPython (done)
{
	debug ('List packages nodejs');
	child_process.exec ('pip list', function (error, stdout, stderr)
	{
		if (error)
		{
			debug ('List packages python error '+error);
			done (error);
		}
		else
		{
			try
			{
				var pippackages = stdout.split ('\n');
				var packages = [];
				var regex = /([^\s]+)\s\(([^\)]+)\)/;
				_.each (pippackages, function (packagevalue)
				{
					if (packagevalue.length > 0)
					{
						var value = packagevalue.match(regex);
						if (value.length > 0)
						{
							packages.push ({n:value[1], v:value[2]});
						}
						// console.log (packagevalue.match(regex));
					}
				});
				// console.log (packages);
				done (null, packages);
			}
			catch (e)
			{
				debug ('List packages python error '+e);
				done (e);
			}
		}
	});
} 



var runmanager = {
	'nodejs':{},
	'python':{}
};



debug ('Registering for tag pm');
uplink.tags.on ('pm', function (p)
{
	if (p.a === 'p')
	{
		var done = function (error, packages)
		{
			if (error) uplink.send ('pm', {a: 'p', l:p.l, e: error});
			else uplink.send ('pm', {a: 'p', l:p.l, p:packages});
		};

		if (p.l === 'nodejs') listPackagesNodejs (done);
		else
		if (p.l === 'python') listPackagesPython (done);
	}
	else
	if (p.a === 'i' || p.a === 'u')
	{
		debug ('Install package '+p.p+' langauge '+p.l);
		var manager = '';
		var params = [];
		if (p.l === 'nodejs')
		{
			manager = (util.isWindows ()?'npm.cmd':'npm');
			if (p.a === 'i') params = ['-g', 'install'];
			else if (p.a === 'u') params = ['-g', 'uninstall'];
		}
		else if (p.l === 'python')
		{
			manager = 'pip';
			if (p.a === 'i') params = ['install'];
			else if (p.a === 'u') params = ['uninstall', '--yes'];
		}
		if (manager.length > 0)
		{
			params.push (p.p);
			var sudo = settings.SETTINGS.run.split(' ');
			if (sudo[0]==='sudo')
			{
				params.splice (0, 0, manager);
				manager = 'sudo';
			}
			runmanager[p.l][p.p] = child_process.spawn (manager, params);
			runmanager[p.l][p.p].stdout.on ('data', function (data)
			{
				uplink.send ('pm', {a:'i', p:p.p, l:p.l, out:data.toString()});
			});
			runmanager[p.l][p.p].stderr.on ('data', function (data)
			{
				uplink.send ('pm', {a:'i', p:p.p, l:p.l, err:data.toString()});
			});
			runmanager[p.l][p.p].on ('close', function (error)
			{
				uplink.send ('pm', {a:'i', p:p.p, l:p.l, e:error});
				delete runmanager[p.l][p.p];
			});
		}
	}
	else
	if (p.a === 's')
	{
		if (runmanager[p.l] && runmanager[p.l][p.p])
		{
			// debug ('runmanager '+runmanager[p.l][p.p].pid);
			if (p.l === 'nodejs') child_process.exec ('sudo killall npm');
			else if (p.l === 'python') child_process.exec ('sudo killall pip');

		}
	}
});