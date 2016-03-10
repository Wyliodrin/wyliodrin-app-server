#!/bin/sh

opkg update
opkg install git make gcc node-serialport node-tty.js avr-tools arduino-files -d mnt

cp -R /opt/usr/lib/node_modules/tty.js/node_modules/pty.js /opt/usr/lib/node_modules

mkdir /opt/wyliodrin

ln -s /opt/wyliodrin /wyliodrin

mkdir /wyliodrin/projects
mkdir /wyliodrin/projects/build

cd /wyliodrin

git clone git://www.github.com/wyliodrin/wyliodrin-app-server
cd wyliodrin-app-server

mkdir /etc/wyliodrin
echo -n arduinoyun > /etc/wyliodrin/boardtype
cp setup/settings_arduinoyun.json /etc/wyliodrin

cp scripts/arduinoyun_package.json package.json
npm install

cp scripts/S99wyliodrin-app-server /etc/rc.d/
reboot
