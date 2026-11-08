#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
bt=${BUILD_TOOLS:-${ANDROID_HOME:-}/build-tools/35.0.0}
platform=${ANDROID_JAR:-${ANDROID_HOME:-}/platforms/android-35/android.jar}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir "$work/classes"
compiler=(javac)
if [[ -n ${ECJ_JAR:-} ]]; then compiler=(java -jar "$ECJ_JAR"); fi
mapfile -t sources < <(find src -name '*.java')
"${compiler[@]}" -source 8 -target 8 -bootclasspath "$platform:$bt/core-lambda-stubs.jar" -d "$work/classes" "${sources[@]}"
mapfile -t classes < <(find "$work/classes" -name '*.class')
"$bt/d8" --lib "$platform" --min-api 26 --output "$work" "${classes[@]}"
"$bt/aapt2" compile --dir res -o "$work/res.zip"
"$bt/aapt2" link --manifest AndroidManifest.xml -I "$platform" -A assets -o "$work/app.apk" "$work/res.zip"
(cd "$work" && zip -q app.apk classes.dex)
"$bt/zipalign" -f 4 "$work/app.apk" "$work/aligned.apk"
key=${SIGN_KEY:-${HOME}/.android/debug.keystore}
if [[ ! -f "$key" && -z ${SIGN_KEY:-} ]]; then
 mkdir -p "$(dirname "$key")"
 keytool -genkeypair -keystore "$key" -storepass android -keypass android -alias androiddebugkey -dname CN=AndroidDebug -keyalg RSA -validity 10000
fi
export SIGN_PASS=${SIGN_PASS:-android}
"$bt/apksigner" sign --ks "$key" --ks-pass env:SIGN_PASS --out Kara-2.2.apk "$work/aligned.apk"
"$bt/apksigner" verify --verbose Kara-2.2.apk
