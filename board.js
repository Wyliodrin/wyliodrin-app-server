
"use strict";

var board = {
	'raspberrypi':
	{
		serial:'/dev/ttyAMA0',
		firmware:'/Arduino/src/Arduino.ino',
		signals:'redis',
		nettype:'iwconfig',
		shell:'bash',
		avahi:'publish'
	},
	'udooneo':
	{
		serial:'/dev/ttyGS0',
		firmware:'/Arduino/Arduino.ino',
		signals:'redis',
		nettype:'nm',
		shell:'bash',
		avahi:'publish'
	},
	'arduinoyun':
	{
		serial:null,
		firmware:'/Arduino/Arduino.ino',
		signals:'udp',
		nettype:'iwconfig',
		shell:'sh',
		avahi:'restart'
	}
};

module.exports = board;