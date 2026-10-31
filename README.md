# Dépenses — version Expo (React Native)

Application mobile de suivi de dépenses personnelles en FCFA, 100 % hors
ligne (SQLite local). Version **React Native / Expo** du comparatif
Expo vs Flutter ; la version Flutter vit dans le dépôt `expense-tracker-flutter`
avec exactement les mêmes fonctionnalités.

## Fonctionnalités

- **Accueil** : total et nombre d'opérations du mois en cours, dernière dépense.
- **Ajout / modification** : montant entier en FCFA (« 1 500 » accepté),
  9 catégories fixes, date (sélecteur natif), note facultative (280 car.).
- **Liste** : recherche sans accents ni casse sur la catégorie, la note, la
  date (ISO ou JJ/MM/AAAA) et le montant ; filtre par catégorie ; suppression
  avec confirmation.
- **Statistiques** : répartition par catégorie d'un mois (navigation ‹ ›) et
  historique des 12 derniers mois.
- **Thème clair / sombre** qui suit le réglage du système.

## Stack

Expo SDK 58 · React Native 0.88 · expo-router · expo-sqlite · TypeScript strict · Jest

```
app/          écrans (routing par fichiers : index, add, list, stats, edit/[id])
components/   ExpenseForm, CategoryPicker, Chip
constants/    catégories, palettes clair/sombre
db/           connexion, migrations (PRAGMA user_version), requêtes
utils/        validation, formatage, dates, mois, recherche
__tests__/    tests unitaires + test des migrations sur SQLite réel (node:sqlite)
```

## Développement

```bash
npm install
npm start          # serveur de dev (Expo Go doit être en SDK 58)
npm run lint
npm run typecheck
npm test
```

## Base de données

Le schéma est versionné par `PRAGMA user_version`. Pour le faire évoluer,
**ajouter** une migration à la fin de `MIGRATIONS` dans `db/schema.ts` —
ne jamais modifier une migration déjà publiée. Ajouter ou renommer une
catégorie demande aussi une migration (contrainte CHECK).

## Tester sur le téléphone (APK)

Comme pour Loady, l'APK est construit par GitHub Actions et signé avec la
clé debug partagée (secret `DEBUG_KEYSTORE_BASE64`), ce qui permet
d'installer chaque nouvelle version par-dessus la précédente.

1. Mettre à jour `expo.version` **et** incrémenter `expo.android.versionCode`
   dans `app.json`.
2. Commiter, puis pousser un tag correspondant : `git tag v1.0.1 && git push origin v1.0.1`.
3. Le workflow **Build Android APK** publie `depenses-expo-<version>.apk`
   dans les Releases du dépôt (connexion GitHub requise : dépôt privé).

Le workflow peut aussi être lancé à la main (onglet Actions → *Run workflow*) :
l'APK est alors disponible en artefact.
