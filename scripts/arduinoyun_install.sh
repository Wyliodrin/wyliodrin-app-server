#!/bin/sh

opkg update
opkg install git make node-serialport node-tty.js -d mnt

cp -R /opt/usr/lib/node_modules/tty.js/node_modules/pty.js /opt/usr/lib/node_modules

mkdir /wyliodrin
mkdir /wyliodrin/projects
mkdir /wyliodrin/projects/build

cd /wyliodrin

git clone git://www.github.com/wyliodrin/wyliodrin-app-server
cd wyliodrin-app-server
cp scripts/arduinoyun_package.json package.json
npm install

cp scripts/S99wyliodrin-app-server /etc/rc.d/
reboot
