
"use strict";

console.log ('Loading network library');

var util = require ('../../util.js');
var ifconfig = util.load ('wireless-tools/ifconfig');
var iwconfig = util.load ('wireless-tools/iwconfig');
var uplink = require ('../uplink');
var debug = require ('debug')('wyliodrin:app:server:network');
var nm = require ('./nm.js');
var tcpp = util.load ('tcp-ping');
var gadget = require ('../gadget');
var board = require ('../settings').board;
var fs = require ('fs');
var child_process = require ('child_process');
var path = require ('path');
var _ = require ('lodash');
var settings = require ('../settings');

var network = false;
var networkManager = null;

var networkPing = function ()
{
	if (tcpp)
	{
		tcpp.ping ({address:'www.google.com', attempts: 5}, function (error, host)
		{
			// console.log (error);
			// console.log (host);
			if (!error && !isNaN(host.avg)) network = true;
			else network = false;
			setTimeout (networkPing, (network?60:10)*1000);
			gadget.status ();
		});
	}
	else
	{
		process.nextTick (function ()
		{
			network = true;
			gadget.status ();
		});
	}
};

console.log ('Networking ping');

networkPing ();

console.log ('Wifi connect');
function wifi_connect (p)
{
	var sudo = settings.SETTINGS.run.split(' ');
	var run = 'node';
	var params = [path.join (__dirname, 'network.js'), board.nettype, 'connect', p.i, p.s, p.p];
	fs.writeFileSync ('/wyliodrin/wifi.json', JSON.stringify (p));
	if (sudo[0]==='sudo')
	{
		params.splice (0, 0, run);
		run = 'sudo';
	}
	child_process.execFile (run, params, function (error, stdout, stderr)
	{
		uplink.send ('net', {a:'s', i:p.i, e:error});
	});
}

try
{
	var p = JSON.parse(fs.readFileSync (path.join (settings.env.HOME, 'wifi.json')));
	wifi_connect (p);
}
catch (e)
{
	
}

debug ('Registering for tag net');
uplink.tags.on ('net', function (p)
{
	var displayNetworks = function (done)
	{
		var l = [];
		ifconfig.status (function (err, status)
		{
			if (err)
			{
				done (err);
			}
			else
			{
				var sendinterfaces = function ()
				{
					done (null, l);
				};
				_.each (status, function (sinterface)
				{
					if (sinterface.link === 'ethernet')
					{
						l.push ({
							ip:sinterface.ipv4_address, 
							m:sinterface.ipv4_subnet_mask, 
							b:sinterface.ipv4_broadcast,
							t:'e', 
							h:sinterface.address,
							i:sinterface.interface,
							up:sinterface.up
						});
					}
				});
				if (board.nettype === 'iwconfig')
				{
					debug ('iwconfig');
					iwconfig.status (function (err, status)
					{
						if (err)
						{
							
						}
						else
						{
							_.each (l, function (sl)
							{
								_.each (status, function (sinterface)
								{
									if (sl.i === sinterface.interface)
									{
										sl.t = 'w';
										sl.s = sinterface.ssid;
										sl.q = sinterface.quality;
									}
								});
							});
						}
						sendinterfaces ();
					});
				}
				else
				if (board.nettype === 'nm')
				{
					debug ('nm');
					nm.status (function (error, devices)
					{
						if (error)
						{

						}
						else
						{
							_.each (l, function (sl)
							{
								_.each (devices, function (dinterface)
								{
									if (sl.i === dinterface.interface)
									{
										sl.t = 'w';
										sl.s = dinterface.ssid;
										sl.q = dinterface.quality;
									}
								});
							});
						}
						sendinterfaces();
					});
				}
				else
				{
					sendinterfaces();
				}
			}
		});
	};
	var networks = [];
	var sudo = settings.SETTINGS.run.split(' ');
	var run = '';
	var params = [];
	if (p.a === 's')
	{
		networks = [];
		sudo = settings.SETTINGS.run.split(' ');
		run = 'node';
		params = [path.join (__dirname, 'network.js'), board.nettype, 's', p.i];
		if (sudo[0]==='sudo')
		{
			params.splice (0, 0, run);
			run = 'sudo';
		}
		child_process.execFile (run, params, function (error, stdout, stderr)
		{
			if (error)
			{
				uplink.send ('net', {a:'s', i:p.i, e:error});
			}
			else
			{
				try
				{
					// console.log ();
					// console.log (stdout);
					// console.log ();
					var l = JSON.parse (stdout.toString());
					_.each (l, function (lnetwork)
					{
						networks.push ({
							s: lnetwork.ssid,
							p: lnetwork.security,
							rss: lnetwork.signal,
							q: lnetwork.quality
						});
					});
					uplink.send ('net', {a:'s', i:p.i, n:networks});
					// console.log (networks);
				}
				catch (e)
				{
					// console.log (e)
					uplink.send ('net', {a:'s', i:p.i, e:45});
				}
			}
		});
	}
	else if (p.a === 'd')
	{
		networks = [];
		sudo = settings.SETTINGS.run.split(' ');
		run = 'node';
		params = [path.join (__dirname, 'network.js'), board.nettype, 'disconnect', p.i];
		if (sudo[0]==='sudo')
		{
			params.splice (0, 0, run);
			run = 'sudo';
		}
		try
		{
			fs.unlinkSync ('/wyliodrin/wifi.json');
		}
		catch (e)
		{
			
		}
		child_process.execFile (run, params, function (error, stdout, stderr)
		{
			uplink.send ('net', {a:'s', i:p.i, e:error});
		});
	}
	else if (p.a === 'c')
	{
		networks = [];
		wifi_connect (p);
	}
	else
	if (p.a === 'run')
	{
		var s = 5000;
		if (_.isNumber (p.s)) s = p.s*1000;
		if (networkManager === null)
		{
			displayNetworks (function (err, l)
			{
				if (err)
				{
					uplink.send ('net', {a:'l', e:err});
				}
				else
				{
					uplink.send ('net', {a:'l', n:l});
				}
			});
			networkManager = setInterval (function ()
			{
				displayNetworks (function (err, l)
				{
					if (err)
					{
						uplink.send ('net', {a:'l', e:err});
					}
					else
					{
						uplink.send ('net', {a:'l', n:l});
					}
				});
			}, s);
		}
	}
	else
	if (p.a === 'stop')
	{
		if (networkManager !== null)
		{
			clearInterval (networkManager);
			networkManager = null;
		}
	}
});

function getNetwork ()
{
	return network;
}

module.exports.getNetwork = getNetwork;

