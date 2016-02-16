
"use strict";

var child_process = require ('child_process');

var iwlist = require ('wireless-tools/iwlist');
var wpa_supplicant = require ('wireless-tools/wpa_supplicant');

var a = process.argv[2];
var nadapter = process.argv[3];

if (a === 's')
{
	child_process.exec ('ifconfig '+nadapter+' up', function (error, stdout, stderr)
	{
		iwlist.scan (nadapter, function (err, networks)
		{
			if (err)
			{
				console.log (err);
				process.exit (50);
			}
			else
			{
				console.log (JSON.stringify (networks));
			}
		});
	});
}
else if (a === 'connect')
{
	var ssid = process.argv[4];
	var psk = process.argv[5];
	wpa_supplicant.disable (nadapter, function (err)
	{
		wpa_supplicant.enable ({
			interface: nadapter,
			ssid: ssid,
			passphrase: psk,
			driver: 'wext'

		}, function (err)
		{
			if (err)
			{
				process.exit (50);
			}
			else
			{

			}
		});
	});
}
else if (a === 'disconnect')
{
	wpa_supplicant.disable (nadapter, function (err)
	{
		if (err)
		{
			process.exit (50);
		}
		else
		{
			
		}
	});
}

