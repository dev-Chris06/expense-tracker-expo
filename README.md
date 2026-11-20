# Dépenses Perso (Expo / React Native)

Application mobile de suivi de dépenses personnelles, 100 % hors ligne
(SQLite local), écrite avec React Native / Expo. Les montants sont pour
l'instant en FCFA ; le choix de la devise est prévu.

Née d'un comparatif Expo vs Flutter : la version Flutter (dépôt
`expense-tracker-flutter`) n'est plus développée.

## Fonctionnalités

- **Navigation par onglets** : Accueil, Opérations, Stats, Réglages, et un
  bouton ＋ central toujours visible pour ajouter une opération.
- **Accueil** : solde du mois (revenus − dépenses), suivi des budgets
  (bouton « Définir mon budget du mois » s'il n'y en a pas), 5 dernières
  opérations.
- **Devise au choix** : toutes les devises en usage dans le monde (154),
  recherche par pays ou par nom (« Bénin » → franc CFA) ; au premier
  lancement, celle du pays réglé dans le téléphone (une devise pour toute
  l'app). Les montants sont stockés en
  entiers dans la plus petite unité de la devise ; changer de devise garde
  les chiffres tapés (pas de taux de change).
- **Saisie rapide** : pavé numérique intégré (touche « 000 », ou « , » pour
  les devises à centimes ; appui long sur ⌫ pour tout effacer), catégories
  les plus utilisées en premier, date « aujourd'hui » par défaut, note
  facultative (280 car.), interrupteur « Répéter chaque mois ». La case « ＋ Nouvelle »
  crée une catégorie et la sélectionne aussitôt. Le même écran sert à
  modifier ou supprimer une opération.
- **Opérations récurrentes** : loyer, forfait, salaire… ajoutés tout seuls
  à leur jour chaque mois (le 31 devient le 30 ou le 28 des mois courts),
  avec rattrapage des mois manqués ; pause, reprise, suppression.
- **Mes données** : sauvegarde complète dans un fichier JSON partagé où
  l'on veut (Drive, WhatsApp…), restauration après vérification complète du
  fichier (tout ou rien), export CSV pour Excel / Google Sheets (« ; »,
  virgule décimale, dépenses en négatif).
- **Catégories personnalisables** : création, renommage, icône vectorielle,
  couleur, masquage (les opérations passées sont conservées).
- **Budgets** : budget global du mois (écran dédié avec pavé numérique et
  montants suggérés d'après les 3 derniers mois) et budget par catégorie ; barres
  orange à 80 %, rouges à 100 %, alerte quand une dépense franchit un seuil.
- **Opérations** : groupées par jour avec le total du jour, navigation par
  mois, recherche dans tous les mois (sans accents ni casse), filtres
  dépenses / revenus puis par catégorie, bouton « Trier » (date récentes ou
  anciennes d'abord, montant le plus gros d'abord),
  appui long pour supprimer.
- **Statistiques** : dépenses, revenus et solde d'un mois (‹ ›), moyenne
  par jour, évolution par rapport au mois précédent, répartition par
  catégorie, graphique des 6 derniers mois.
- **Réglages** : thème (comme le téléphone, clair, sombre), budget du mois,
  devise, opérations récurrentes, catégories, sauvegarde / restauration /
  export CSV, version et recherche de mise à jour.
- **Icône** : portefeuille marqué d'un « F » (sources SVG et commande de
  génération dans `assets/icon/`).
- **Mises à jour** : l'accueil signale une nouvelle version publiée ;
  l'APK s'ouvre dans le navigateur.

L'app ne lit aucun compte (Mobile Money, banque) : elle ne connaît que ce
que l'utilisateur saisit.

## Stack

Expo SDK 58 · React Native 0.88 · expo-router · expo-sqlite · expo-file-system · expo-sharing · expo-document-picker · @expo/vector-icons (Ionicons) · TypeScript strict · Jest

```
app/          écrans (routing par fichiers) : (tabs)/ = onglets index, list,
              stats, settings ; add, edit/[id], budget, categories,
              category/[id], currency, recurring
components/   TabBar, QuickEntry (saisie), TransactionRow, CategoryIcon,
              MonthNav, Chip, BudgetBar, mises à jour
constants/    devises, couleurs et icônes de catégories, palettes clair/sombre
db/           connexion, migrations (PRAGMA user_version), transactions,
              catégories, récurrences, réglages (devise), sauvegarde
utils/        validation, formatage, devise en cours, dates, mois, pavé
              numérique, récurrences, sauvegarde, CSV, fichiers partagés,
              regroupement par jour, recherche, budgets, mises à jour
__tests__/    tests unitaires + migrations, devise, récurrences et
              restauration sur SQLite réel (node:sqlite)
```

## Développement

```bash
npm install
npm start          # serveur de dev (Expo Go doit être en SDK 58)
npm run lint
npm run typecheck
npm test
```

## Devises

`constants/currencyData.ts` est généré (ne pas l'éditer à la main) à partir
du paquet `country-to-currency` (pays → devise) et des données Unicode CLDR
de Node.js (noms français, symboles, décimales) :

```bash
node scripts/generate-currencies.mjs
```

Les symboles courts habituels (F pour le franc CFA, DH, DA…) sont fixés dans
le script.

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
   dans `app.json` (et garder `version` de `package.json` identique).
2. Commiter, puis pousser un tag correspondant : `git tag v1.3.3 && git push origin v1.3.3`.
3. Le workflow **Build Android APK** publie l'APK et un `version.json` dans les
   Releases. C'est ce fichier que l'app lit pour détecter la mise à jour.

Le workflow peut aussi être lancé à la main (onglet Actions → *Run workflow*) :
l'APK est alors dans un artefact (zip), sans release ni mise à jour proposée.

Si la construction échoue sur « Could not find … » (téléchargement Gradle /
Maven), c'est en général passager : relancer le job (`gh run rerun <id> --failed`).

**Installer directement par USB** (téléphone branché, débogage USB activé) :

```bash
gh release download v1.3.3 -p 'depenses-expo-*.apk'
adb install -r depenses-expo-1.3.3.apk   # -r : mise à jour, données conservées
```

Le nom du fichier APK (`depenses-expo-…`) est volontairement conservé :
`utils/updates.ts` construit le lien de téléchargement avec ce nom.

Avant de publier, lancer **Smoke test (emulator)** (onglet Actions) : l'app
est installée et lancée sur des émulateurs Android 7 à 16 ; le journal et
une capture d'écran sont gardés en artefact en cas de crash.

En release, une erreur JavaScript non rattrapée s'affiche dans une boîte de
dialogue (`utils/crashReporter.ts`) au lieu de fermer l'app.
