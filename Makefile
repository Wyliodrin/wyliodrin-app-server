install:
	mkdir -p $(DESTDIR)/usr/wyliodrin/wyliodrin-app-server
	cp -rf network.js node_modules publish.js update-server.sh nm.js package.json startup.js $(DESTDIR)/usr/wyliodrin/wyliodrin-app-server
