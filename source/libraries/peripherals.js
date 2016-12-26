"use strict";

var util = require ('../util.js');
var _ = require ('lodash');
var msgpack = require ('msgpack-lite');
var child_process = require ('child_process');
var _ = require ('lodash');
var gadget = require ('./gadget');
var bonjour = require ('./bonjour');

var LIST_PERIPHERALS = 3000;

var serialPorts = [];
var peripherals = [];

console.log ('Loading peripherals library');

var serialport = util.load ('serialport');
function listPeripherals()
{
	// TODO a better way
	serialport.list (function (err, ports)
	{
		if (ports.length !== serialPorts.length)
		{
			serialPorts = ports;
			peripherals = [];
			_.each (serialPorts, function (peripheral)
			{
				if (peripheral.vendorId && peripheral.productId)
				{
					peripherals.push ({
						p: peripheral.comName,
						s: peripheral.serialNumber,
						vid: peripheral.vendorId,
						pid: peripheral.productId
					});
				}
			});
			console.log (peripherals);
			// console.log (msgpack.encode (peripherals).toString ('base64'));
			gadget.status ();
			bonjour.publish ();
		}
		setTimeout (listPeripherals, LIST_PERIPHERALS);
	});
}

function getPeripherals ()
{
	return peripherals;
}

console.log ('Looking for peripherals every '+LIST_PERIPHERALS+' ms');

listPeripherals ();

module.exports.getPeripherals = getPeripherals;
