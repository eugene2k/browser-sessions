OUTDIR:=build
PKGDIR:=pkg
TSC:=tsc --outDir $(OUTDIR)
WEXT_FLAGS:= -s $(OUTDIR)
WEXT_BUILD_FLAGS:= --overwrite-dest -a $(PKGDIR)

API_KEY:="user:14938617:849"
API_SECRET:="1cc1c372ad6e7459208b772a9db207dcdbbae79258d8ea9d8f1788365f8a5e05"

TS_FILES:=$(wildcard src/*.ts)
JS_FILES:=$(patsubst src/%.ts, $(OUTDIR)/%.js, $(TS_FILES))

build: prepare $(TS_FILES)
	web-ext $(WEXT_FLAGS) $(WEXT_BUILD_FLAGS) build

run: prepare $(TS_FILES)
	web-ext $(WEXT_FLAGS) run -p ./test_profile --keep-profile-changes

showconfig:
	$(TSC) --showConfig

sign: build
	web-ext sign -s $(OUTDIR) -a $(PKGDIR) --api-key $(API_KEY) --api-secret=$(API_SECRET) --channel="unlisted"

prepare: $(JS_FILES)
	cp -r res/* $(OUTDIR)

$(OUTDIR)/%.js: src/%.ts
	$(TSC)

clean:
	rm -r $(OUTDIR)
