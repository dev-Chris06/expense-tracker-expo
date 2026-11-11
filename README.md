# Dépenses — version Expo (React Native)

Application mobile de suivi de dépenses personnelles en FCFA, 100 % hors
ligne (SQLite local). Version **React Native / Expo** du comparatif
Expo vs Flutter ; la version Flutter vit dans le dépôt `expense-tracker-flutter`
avec exactement les mêmes fonctionnalités.

## Fonctionnalités

- **Accueil** : solde du mois (revenus − dépenses), suivi des budgets,
  dernière opération, ajout rapide d'une dépense ou d'un revenu.
- **Dépenses et revenus** : montant entier en FCFA (« 1 500 » accepté),
  catégorie, date (sélecteur natif), note facultative (280 car.).
- **Catégories personnalisables** : création, renommage, icône (emoji),
  couleur, masquage (les opérations passées sont conservées).
- **Budgets** : budget global du mois et budget par catégorie ; barres
  orange à 80 %, rouges à 100 %, alerte quand une dépense franchit un seuil.
- **Liste** : recherche sans accents ni casse (catégorie, note, date,
  montant), filtres dépenses / revenus puis par catégorie, suppression
  avec confirmation.
- **Statistiques** : dépenses, revenus et solde d'un mois (navigation ‹ ›),
  répartition par catégorie, historique des 12 derniers mois.
- **Réglages** : thème (comme le téléphone, clair, sombre), budget global,
  catégories, version et recherche de mise à jour.
- **Mises à jour** : l'accueil signale une nouvelle version publiée ;
  l'APK s'ouvre dans le navigateur.

## Stack

Expo SDK 58 · React Native 0.88 · expo-router · expo-sqlite · TypeScript strict · Jest

```
app/          écrans (routing par fichiers : index, add, list, stats, edit/[id],
              settings, categories, category/[id])
components/   TransactionForm, CategoryPicker, Chip, BudgetBar, mises à jour
constants/    couleurs et icônes de catégories, palettes clair/sombre
db/           connexion, migrations (PRAGMA user_version), transactions,
              catégories, réglages
utils/        validation, formatage, dates, mois, recherche, budgets, mises à jour
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
ne jamais modifier une migration déjà publiée. Les catégories vivent en
base (table `categories`) et se gèrent depuis l'app.

## Tester sur le téléphone (APK)

Comme pour Loady, l'APK est construit par GitHub Actions et signé avec la
clé debug partagée (secret `DEBUG_KEYSTORE_BASE64`), ce qui permet
d'installer chaque nouvelle version par-dessus la précédente.

**Première installation** : ouvrir
<https://github.com/dev-Chris06/expense-tracker-expo/releases/latest> sur le
téléphone et télécharger `depenses-expo-<version>.apk`. Ensuite, l'app signale
elle-même les nouvelles versions.

**Publier une version** :

1. Mettre à jour `expo.version` **et** incrémenter `expo.android.versionCode`
   dans `app.json`.
2. Commiter, puis pousser un tag correspondant : `git tag v1.2.0 && git push origin v1.2.0`.
3. Le workflow **Build Android APK** publie l'APK et un `version.json` dans les
   Releases. C'est ce fichier que l'app lit pour détecter la mise à jour.

Le workflow peut aussi être lancé à la main (onglet Actions → *Run workflow*) :
l'APK est alors dans un artefact (zip), sans release ni mise à jour proposée.

Avant de publier, lancer **Smoke test (emulator)** (onglet Actions) : l'app
est installée et lancée sur des émulateurs Android 7 à 16 ; le journal et
une capture d'écran sont gardés en artefact en cas de crash.

En release, une erreur JavaScript non rattrapée s'affiche dans une boîte de
dialogue (`utils/crashReporter.ts`) au lieu de fermer l'app.
