OUTDIR:=build
PKGDIR:=pkg
TSC:=tsc --outDir $(OUTDIR)
WEXT_FLAGS:= -s $(OUTDIR)
WEXT_BUILD_FLAGS:= --overwrite-dest -a $(PKGDIR)

TS_FILES:=$(wildcard src/*.ts)
JS_FILES:=$(patsubst src/%.ts, $(OUTDIR)/%.js, $(TS_FILES))

showconfig:
	$(TSC) --showConfig
build: prepare
	web-ext $(WEXT_FLAGS) $(WEXT_BUILD_FLAGS) build

run: prepare
	web-ext $(WEXT_FLAGS) run --devtools

prepare: $(JS_FILES)
	cp -r res/* $(OUTDIR)

$(OUTDIR)/%.js: src/%.ts
	$(TSC)

clean:
	rm -r $(OUTDIR)
