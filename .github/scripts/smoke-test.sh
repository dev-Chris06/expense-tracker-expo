#!/usr/bin/env bash
# Installe l'APK sur l'émulateur, lance l'app et vérifie qu'elle tourne
# encore après 25 s. Le journal (logcat) et une capture d'écran sont
# gardés dans $OUT pour diagnostiquer un crash au démarrage.
set -u
APK=$1
PKG=$2
OUT=${3:-smoke}
mkdir -p "$OUT"

adb wait-for-device
adb install -r "$APK"
adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 25

adb exec-out screencap -p > "$OUT/screen.png" || true
adb logcat -d > "$OUT/logcat.txt"
adb logcat -d -b crash > "$OUT/crash.txt" || true

echo "----- Erreurs relevées -----"
grep -nE "FATAL|AndroidRuntime|ReactNativeJS|ReactNative|libc   |DEBUG  |SoLoader|Hermes|Exception" "$OUT/logcat.txt" | head -150

if adb shell pidof "$PKG" >/dev/null; then
  echo "L'app tourne toujours après 25 s."
else
  echo "::error::L'app s'est fermée (voir crash.txt / logcat.txt dans l'artefact)."
  exit 1
fi
