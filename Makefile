.PHONY: build
build:
	npm install

.PHONY: install
install:
	mkdir -p $(DESTDIR)/usr/wyliodrin/wyliodrin-app-server
	cp -rf source package.json $(DESTDIR)/usr/wyliodrin/wyliodrin-app-server
	mkdir -p $(DESTDIR)/etc/supervisor/conf.d
	cp -rf wyliodrin-app-server.conf $(DESTDIR)/etc/supervisor/conf.d

.PHONY: clean
clean:
	rm -rf node_modules
