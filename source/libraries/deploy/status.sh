$2 supervisorctl status | grep "$1" | tr -s " " | cut -d " " -f 2
