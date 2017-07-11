
"use strict";

var uplink = require ('./uplink');
var debug = require ('debug')('wylidorin:app:server:task_manager');
var child_process = require ('child_process');
var settings = require ('./settings');
var _ = require ('lodash');

console.log ('Loading task-manager library');

var taskManager = null;

function processes (list)
{
    child_process.exec ('ps -eo pid,%cpu,vsz,comm,tty | tr -s \' \'', function (error, stdout, stderr)
    {
        if (stdout.trim().length===0)
        {
        	child_process.exec ('ps | tr -s \' \'', function (error, stdout, stderr)
        	{
        		listprocesse (stdout, list);
        	});
        }
        else
        {
        	listprocesse (stdout, list);
        }
    });
}

function kill (pid, done)
{
	//console.log (networkConfig.stop+' '+pid);
	// console.log (gadget.SETTINGS.stop+' '+pid);
    child_process.exec (settings.SETTINGS.stop+' '+pid, function (error, stdout, stderr)
    {

    	//console.log(error);
    	//console.log(stdout);
        if (done) done (error);
    });
}

function listprocesse (psls, pslist)
{
	var ps = []; 
    var lines = psls.split ('\n');
    var columns = lines[0].trim().split (' ');
    lines.splice (0,1);
    lines.forEach (function (process)
    {
        if (process!=='')
        {
            var pscolumns = process.trim().split (' ');
            var pss = {};
            for (var i=0; i<columns.length; i++)
            {
                pss[columns[i]] = pscolumns[i];
            }
            ps.push (pss);
        }
    });
    ps.splice (ps.length-3, 3);
    pslist (ps);
}

debug ('Registering for tag tm');
uplink.tags.on ('tm', function (p)
{
	if (p.a === 'run')
	{
		if (taskManager === null)
		{
			processes (function (listofprocesse)
			{
				uplink.send ('tm', listofprocesse);
			});
			var s = 5000;
			if (_.isNumber (p.s)) s = p.s*1000;
			taskManager = setInterval (function ()
			{
				processes (function (listofprocesse)
				{
					uplink.send ('tm', listofprocesse);
				});
			}, s);
		}
	}
	else
	if (p.a === 'exit')
	{
		kill (p.PID);
	}
	else
	if (p.a === 'stop')
	{
		if (taskManager !== null)
		{
			clearInterval (taskManager);
			taskManager = null;
		}
	}
});
