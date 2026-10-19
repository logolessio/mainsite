#!/bin/bash
# Builds the scroll Mac app (Release) into scroll-mac/build/Scroll.app. Needs Xcode 26 or later (Apple's liquid glass). Signed to run on this Mac only.
set -euo pipefail
cd "$(dirname "$0")"
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
xcodebuild -project Scroll.xcodeproj -scheme Scroll -configuration Release -derivedDataPath build/derived build | tail -3
rm -rf build/Scroll.app
cp -R build/derived/Build/Products/Release/Scroll.app build/Scroll.app
echo "Built: $(pwd)/build/Scroll.app"
