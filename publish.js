
"use strict";

var fs = require ('fs');
var child_process = require ('child_process');

var a = process.argv[2];
var p = process.argv[3];

if (a === 'p')
{
	fs.writeFileSync ('/etc/avahi/services/wyliodrinapp.service', '<service-group> <name replace-wildcards="yes">%h</name> <service protocol="ipv4"> <type>_wyapp._tcp</type> <port>'+p+'</port> </service> </service-group>');
	child_process.exec ('/etc/init.d/avahi-daemon restart');
}
else if (a === 's')
{
	fs.unlinkSync ('/etc/avahi/services/wyliodrinapp.service');
	child_process.exec ('sleep 2; /etc/init.d/avahi-daemon restart');
}

