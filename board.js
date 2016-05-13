
"use strict";

var board = {
	'raspberrypi':
	{
		linux:
		{
			serial:'/dev/ttyAMA0',
			firmware:'/Arduino/src/Arduino.ino',
			firmware_makefile: '',
			signals:'redis',
			nettype:'iwconfig',
			shell:'bash',
			avahi:'publish',
			capabilities: {'nodejs':true, 'python':true, 'visual':true, 'shell':true, 'csharp':true}
		},
		windows:
		{
			serial:'/dev/ttyAMA0',
			firmware:'\\Arduino\\src\\Arduino.ino',
			firmware_makefile: '',
			signals:'udp',
			nettype:'',
			shell:'powershell.exe',
			avahi:'publish',
			capabilities: {'nodejs':true, 'visual':true, 'powershell':true}
		}
		
	},
	'beagleboneblack':
	{
		serial:'/dev/ttyGS0',
		firmware:'',
		firmware_makefile: '',
		signals:'redis',
		nettype:'iwconfig',
		shell:'bash',
		avahi:'publish',
		capabilities: {'nodejs':true, 'python':true, 'visual':true, 'shell':true, 'csharp':true}
	},
	'udooneo':
	{
		serial:'/dev/ttyGS0',
		firmware:'/Arduino/Arduino.ino',
		firmware_makefile: '',
		signals:'redis',
		nettype:'nm',
		shell:'bash',
		avahi:'publish',
		capabilities: {'nodejs':true, 'python':true, 'visual':true, 'shell':true, 'csharp':true}
	},
	'arduinoyun':
	{
		serial:null,
		firmware:'/Arduino/Arduino.ino',
		firmware_makefile: 'arduinoyun.mk',
		signals:'udp',
		nettype:'iwconfig',
		shell:'sh',
		avahi:'restart',
		capabilities: {'nodejs':true, 'python':true, 'visual':true, 'shell':true}
	}
};

module.exports = board;
