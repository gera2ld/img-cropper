DIST=dist-demo
rm -rf $DIST
cp -R scripts/demo $DIST
ln -s ../index.js $DIST
cd $DIST
git init
git add -A
git commit -m 'Auto deploy to GitHub pages'
git push -f git@github.com:gera2ld/img-cropper.git master:gh-pages
