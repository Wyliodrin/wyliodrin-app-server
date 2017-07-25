//var socket = require('socket.io-client')(process.env.SOCKET_HOST);
var socket = require('socket.io-client')("http://localhost:3000");
console.log ('socket connect');
socket.on('connect', function(){
	console.log ('connected');
});
socket.on('event', function(data){
	console.log ('got event');
	console.log (data);
});
socket.on('disconnect', function(){});