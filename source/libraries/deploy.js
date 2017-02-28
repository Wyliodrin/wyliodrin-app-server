"use strict";

var path = require ('path');
var fs = require ('fs');
var debug = require ('debug')('wylidorin:app:server:file_explorer');
var uplink = require ('./uplink');
var rmdir = require ("rimraf");


console.log ('Loading deploy library');


debug ('Registering for tag dep');
uplink.tags.on ('dep', function (p)
{
	if (p.a == "stop")
	{
		///////////////////////fa stop pe hashul p.b, da ack
	}
	if (p.a == "run")
	{
		////////////////////////fa run pe hashul p.b da ack
	}
	if (p.a == "restart")
	{
		////////////////////////fa restart pe hashul p.b da ack
	}

}