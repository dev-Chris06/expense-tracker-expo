#!/usr/bin/env bash
# Parcours de l'accueil du premier lancement sur une app neuve, avec une
# capture d'écran à chaque étape (dans $OUT/walk-*.png). Échoue si un
# bouton attendu n'apparaît pas.
set -u
OUT=${1:-smoke}
mkdir -p "$OUT"

# Touche le premier élément dont le texte (ou la description) contient $1
# (ou vaut exactement le texte après « = »).
tap() {
  for _ in 1 2 3 4 5; do
    adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
    adb pull /sdcard/ui.xml "$OUT/ui.xml" >/dev/null 2>&1
    xy=$(python3 - "$1" "$OUT/ui.xml" <<'PY'
import re, sys
q, f = sys.argv[1], sys.argv[2]
for n in re.findall(r'<node [^>]*>', open(f, encoding='utf8').read()):
    t = re.search(r' text="([^"]*)"', n).group(1)
    d = re.search(r'content-desc="([^"]*)"', n).group(1)
    # « =texte » : texte exact (touches du pavé), sinon « contient ».
    if (t == q[1:]) if q.startswith('=') else (q in t or q in d):
        x1, y1, x2, y2 = map(int, re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', n).groups())
        print((x1 + x2) // 2, (y1 + y2) // 2)
        break
PY
)
    if [ -n "$xy" ]; then
      adb shell input tap $xy
      sleep 2
      return 0
    fi
    sleep 2
  done
  echo "::error::Introuvable à l'écran : « $1 » (voir $OUT/ui.xml)"
  return 1
}

shot() { adb exec-out screencap -p > "$OUT/walk-$1.png" || true; }

shot 1-bienvenue
tap "Commencer" || exit 1
shot 2-devise
tap "Changer de devise" || exit 1
shot 3-liste-devises
adb shell input keyevent BACK; sleep 2
tap "Continuer" || exit 1
shot 4-rappel
tap "Plus tard" || exit 1
shot 5-accueil-vide
tap "Ajouter une opération" || exit 1
for k in 1 5 0 0; do tap "=$k" >/dev/null || exit 1; done
tap "Nourriture" || exit 1
tap "Enregistrer" || exit 1
sleep 2
shot 6-bravo
tap "Compris" || exit 1
shot 7-accueil
echo "Parcours de l'accueil terminé."
