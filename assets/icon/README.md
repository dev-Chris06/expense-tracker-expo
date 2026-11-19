# Sources de l'icône « Dépenses Perso »

Icône B2 : portefeuille blanc, fermoir bleu nuit marqué d'un « F », carte verte,
sur fond bleu `#175CD3`. Chaque fichier `.svg` donne le PNG du même nom dans
`assets/images/`.

Pour régénérer les PNG après une retouche (Chrome sans fenêtre) :

```bash
for f in icon android-icon-foreground android-icon-background android-icon-monochrome favicon; do
  google-chrome --headless --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size=1024,1024 --screenshot="assets/images/$f.png" "file://$PWD/assets/icon/$f.svg"
done
google-chrome --headless --disable-gpu --hide-scrollbars --default-background-color=00000000 \
  --window-size=512,512 --screenshot=assets/images/splash-icon.png "file://$PWD/assets/icon/splash-icon.svg"
```

`favicon.png` est ensuite réduit à 48 × 48 (version web uniquement).
