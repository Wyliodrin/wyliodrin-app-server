.PHONY: build
build:
	npm install

.PHONY: install
install:
	mkdir -p $(DESTDIR)/usr/wyliodrin/wyliodrin-app-server
	cp -rf network.js node_modules publish.js update-server.sh nm.js package.json startup.js $(DESTDIR)/usr/wyliodrin/wyliodrin-app-server

.PHONY: clean
clean:
	rm -rf node_modules
