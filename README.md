Wyliodrin App Server
====================

Server app for connecting to Wyliodrin App.

Install
-------

    git clone https://github.com/Wyliodrin/wyliodrin-app-server.git
    cd wyliodrin-app-server
    npm install
    node startup
    
Please make sure you have the Wyliodrin SD card image

Update from older Raspibian for Pi 3 B+
------

https://raspberrypi.stackexchange.com/questions/81725/raspbian-8-on-raspberry-pi-3-b

```
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install rpi-update
sudo rpi-update
wget https://archive.raspberrypi.org/debian/pool/main/f/firmware-nonfree/firmware-brcm80211_20161130-3+rpt3_all.deb
sudo dpkg -i firmware-brcm80211_20161130-3+rpt3_all.deb
```

