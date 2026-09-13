version := 1.1.0
FILE_NAME=u6s_and_r6s

CHECK_FILE_SIZE= (\
	FSIZE=$$(du -b ./builds/${FILE_NAME}_${version}.prod.zip | cut -f 1); \
	LEFTOVER=$$((13312 - $${FSIZE})); \
	echo "===>File size: [$${FSIZE}]; [$${LEFTOVER}] left"; \
    if [ $$FSIZE -lt 13312 ]; then \
		echo "===>Under 13k; good job!";\
	else\
		echo "===>Over 13k :( get to slimming";\
	fi)

build:
	advpng -z -4 -i 100 ./assets/*.png
	mkdir -p ./builds/tmp
	cp ./index.html ./builds/tmp/.
	cp ./levels/*.bin ./builds/tmp/.
	cp ./assets/*.png ./builds/tmp/.
	esbuild ./scripts/game.js --bundle --define:DEBUG=false --minify --format=esm --outfile=./builds/tmp/game.js --tree-shaking=true --legal-comments=none
# 	zip -r -9 ./builds/${FILE_NAME}_${version}.prod.zip assets/*.png levels/*.bin index.html
	sed -i -E 's|\n||g' ./builds/tmp/index.html
	sed -i 's|./assets/tiles.png|tiles.png|g' ./builds/tmp/game.js
	sed -i 's|/levels/||g' ./builds/tmp/game.js
	sed -i 's|./scripts/||g' ./builds/tmp/index.html
	env -C ${PWD}/builds/tmp zip -r -g ../${FILE_NAME}_${version}.prod.zip .
	advzip -z -4 -i 100 ./builds/${FILE_NAME}_${version}.prod.zip
# 	7z a -tzip -mx=9 ./builds/${FILE_NAME}_${version}.prod.zip assets/*.png levels/*.bin index.html
	@$(CHECK_FILE_SIZE)
server:
	python3 -m http.server -b 127.0.0.1
