
"use strict";

var uplink = require ('./uplink');
var debug = require ('debug')('wylidorin:app:server:signal');
var util = require ('../util.js');
var board = require ('./settings').board;
var redis = util.load ('redis');
var dgram = require('dgram');
var _ = require ('lodash');

console.log ('Loading signal library');

var client = null;

var sendingValues = false;
var storedValues = false;


if (board.signals === 'redis' && redis)
{
	var subscriber = redis.createClient ();
	client = redis.createClient ();

	subscriber.on ('error', function (error)
	{
		console.log ('subscriber redis '+error);
	});

	subscriber.subscribe ("wyliodrin-project", function (channel, count)
	{
		debug ("Subscribed");
	});

	subscriber.on ("message", function (channel, message)
	{
		if (message.indexOf ('signal:app-project')===0)
		{
			var projectId = message.substring(7);
			sendValues (projectId);
		}
	});

	client.on ('error', function (error)
	{
		console.log ('client redis '+error);
	});

	debug ('Erasing signals');
	client.ltrim ('app-project', 0, -1);
}

if (board.signals === 'udp' || !redis)
{
	var udpserver = dgram.createSocket('udp4');
	udpserver.on('error', function (err) 
	{
		console.log('server error: '+err.stack);
		udpserver.close();
	});
	udpserver.on('message', function (msg, rinfo) 
	{
		var data = msg.toString().split (' ');
		if (data.length >= 2)
		{
			var s = {};
			s[data[0]] = parseFloat(data[1]);
			var t = data[2];
			uplink.sendLowPriority ('v', {t:t, s:s});
		}
	});
	udpserver.on('listening', function () 
	{
		var address = uplink.server.address();
		console.log('server listening '+address.address+':'+address.port);
	});
	udpserver.bind(7200);
}

function sendValues (projectId)
{
	if (!sendingValues)
	{
		sendingValues = true;
		debug ('Signal');
		client.lrange (projectId, 0, 100, function (err, signals)
		{
			if (err)
			{
				debug ('Signals error '+err);
			}
			else if (signals.length > 0)
			{
				storedValues = false;
				_.each (signals, function (signal)
				{
					var s = JSON.parse (signal);
					uplink.sendLowPriority ('v', {t:s.timestamp, s:s.signals});
				});
				client.ltrim (projectId, signals.length, -1, function (err)
				{
					if (err)
					{
						debug ('Signals error '+err);
					}
					sendingValues = false;
					if (storedValues) sendValues (projectId);
				});
			}
			else
			{
				sendingValues = 0;
			}
		});
	}
	else
	{
		debug ('Already sending signals');
		storedValues = true;
	}
}

debug ('Registering for tag v', function (p)
{
	if (client)
	{
		client.publish ('communication_client:signal:'+p.s, JSON.stringify ({from: 'wyliodrin_app', data:''+p.v}));
	}
});





