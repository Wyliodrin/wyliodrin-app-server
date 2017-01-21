
"use strict";

var util = require ('./util.js');
var debug = require ('debug')('wyliodrin:app:server');

/* startup */

console.log ('Starting Server');
if (util.isWindows ()) 
{
	console.log ('OS is Windows, setting NODE_PATH to '+process.env.APPDATA+'\\npm\\node_modules');
	process.env.NODE_PATH = process.env.APPDATA+'\\npm\\node_modules';
}

var settings = require ('./libraries/settings');
var gadget = require ('./libraries/gadget');
var uplink = require ('./libraries/uplink');
uplink.run ();
var peripherals = require ('./libraries/peripherals');
var bonjour = require ('./libraries/bonjour');
var project = require ('./libraries/project');
var treeProject = require ('./libraries/treeProject');
var network = require ('./libraries/network');
var shell = require ('./libraries/shell');
var file_explorer = require ('./libraries/file_explorer');
var task_manager = require ('./libraries/task_manager');
var update = require ('./libraries/update');
var package_manager = require ('./libraries/package_manager');
var signal = require ('./libraries/signal');
var notebook = require ('./libraries/notebook');


process.title = 'wyliodrin-app-server';

// catch ctrl+c event and exit normally
process.on('SIGINT', function () 
{
	console.log('Ctrl-C...');
	process.exit(2);
});

//catch uncaught exceptions, trace, then exit normally
process.on('uncaughtException', function(e) 
{
	console.log('Uncaught Exception...');
	console.log(e.stack);
	process.exit(99);
});












// setInterval (function ()
// {
// 	send ('i', {c:boardtype.toString()});
// }, 1000);

