#!/bin/bash
# Builds the Mac app (Release) into macos/build/Logoless.app. Needs Xcode. Signed to run on this Mac only.
set -euo pipefail
cd "$(dirname "$0")"
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
xcodebuild -project Logoless.xcodeproj -scheme Logoless -configuration Release -derivedDataPath build/derived build | tail -3
rm -rf build/Logoless.app
cp -R build/derived/Build/Products/Release/Logoless.app build/Logoless.app
echo "Built: $(pwd)/build/Logoless.app"
