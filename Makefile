.PHONY: dev build export deploy help

dev:
	pnpm dev

build:
	pnpm build

# Build statique + CNAME + .nojekyll (Strapi distant ou local requis pour le blog)
export: build
	touch out/.nojekyll
	echo "reseauevolvecapital.com" > out/CNAME

# Garde og:image puis push sur la branche gh-pages (secours manuel)
deploy: export
	node scripts/check-og-images.mjs
	pnpm run deploy

help:
	@echo "Cibles : dev | build | export | deploy"
