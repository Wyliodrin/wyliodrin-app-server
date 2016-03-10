.PHONY: build
build:
	npm install

.PHONY: install
install:
	mkdir -p $(DESTDIR)/usr/wyliodrin/wyliodrin-app-server
	cp -rf network.js node_modules publish.js update-server.sh nm.js package.json startup.js $(DESTDIR)/usr/wyliodrin/wyliodrin-app-server
	mkdir -p $(DESTDIR)/etc/supervisor/conf.d
  cp -rf wyliodrin-app-server $(DESTDIR)/etc/supervisor/conf.d

.PHONY: clean
clean:
	rm -rf node_modules
