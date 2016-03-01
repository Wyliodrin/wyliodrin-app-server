
"use strict";

var fs = require ('fs');

var a = process.argv[2];
var p = process.argv[3];

if (a === 'p')
{
	fs.writeFileSync ('/etc/avahi/services/wyliodrinapp.service', '<service-group> <name replace-wildcards="yes">%h</name> <service> <type>_wyapp._tcp</type> <port>'+p+'</port> </service> </service-group>');
}
else if (a === 's')
{
	fs.unlinkSync ('/etc/avahi/services/wyliodrinapp.service');
}

