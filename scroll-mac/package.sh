#!/bin/bash
# Builds the scroll Mac app for sharing, with no Apple developer account: a Release build, signed for any Mac ("ad hoc"), as a zip and a disk image.
# Needs Xcode 26 or later. Output: scroll-mac/dist/scroll.zip and scroll-mac/dist/scroll.dmg
set -euo pipefail
cd "$(dirname "$0")"
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
rm -rf build/derived dist
xcodebuild -project Scroll.xcodeproj -scheme Scroll -configuration Release -derivedDataPath build/derived ARCHS="arm64 x86_64" ONLY_ACTIVE_ARCH=NO build | tail -2
APP="build/derived/Build/Products/Release/Scroll.app"
codesign --force --deep --sign - --options runtime --entitlements Scroll.entitlements "$APP"
mkdir -p dist
rm -rf "dist/scroll.app" && cp -R "$APP" "dist/scroll.app"
# zip with ditto (keeps what a Mac app needs), then a disk image
ditto -c -k --keepParent "dist/scroll.app" dist/scroll.zip
hdiutil create -quiet -volname "scroll" -srcfolder "dist/scroll.app" -ov -format UDZO dist/scroll.dmg
rm -rf "dist/scroll.app"
echo "Built: $(pwd)/dist/scroll.zip and $(pwd)/dist/scroll.dmg"
lipo -archs "$APP/Contents/MacOS/Scroll"
