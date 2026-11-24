# Journal des versions — Dépenses Perso

Chaque section est reprise telle quelle comme description de la release
GitHub correspondante (voir `.github/workflows/build-apk.yml`). Toutes les
versions restent téléchargeables sur la page Releases du dépôt.

## 1.6.0 — 24/11/2026

- **Accueil au premier lancement**, en 3 écrans courts (« Passer » toujours
  possible) : ce que fait l'app, la devise choisie d'après le pays (à
  vérifier ou changer), et le rappel du soir.
- « J'ai déjà une sauvegarde » dès le premier écran : en changeant de
  téléphone, on récupère tout en une minute.
- Premiers pas sur l'accueil : « Touche le bouton ＋ » pour la première
  dépense, puis « Bravo » avec comment modifier ou supprimer une opération.
- Les utilisateurs actuels ne voient pas cet accueil après la mise à jour.

## 1.5.2 — 23/11/2026

- Rappel du soir : il pouvait arriver en double (deux notifications le même
  soir) ; corrigé.
- Rappel du soir : supprimer ou déplacer la seule opération du jour fait
  revenir le rappel de ce soir tout de suite.
- Sauvegardes : le nom du dossier s'affiche sans « / » en trop.
- Thème sombre : les interrupteurs (rappel, « Répéter chaque mois ») sont
  de nouveau visibles.
- Texte agrandi dans Android : toutes les catégories restent visibles au-dessus
  du pavé, et « Opérations » ne se coupe plus en deux dans la barre du bas.
- Devise : l'écran se referme tout seul après le changement.

## 1.5.1 — 20/11/2026

- Accueil : « Aujourd’hui · 2 opérations · −1 500 F » remplace « Bonjour /
  Bonsoir » (ce qui est déjà noté dans la journée, d'un coup d'œil).
- Devise : la barre de recherche reste en haut quand on fait défiler.
- Réglages : thème « Système / Clair / Sombre » avec icônes ; une icône sur
  chaque ligne ; « Exporter vers Excel » au lieu de « Exporter en CSV ».

## 1.5.0 — 20/11/2026

- **Rappel du soir** : « Tu as fait le point de ta journée ? », à 20 h par
  défaut (19 h, 20 h, 21 h, 22 h ou une autre heure). Pas de rappel les jours
  où une opération a déjà été notée. Toucher le rappel ouvre la saisie.
  Proposé par une carte sur l'accueil : la demande d'autorisation d'Android
  n'apparaît qu'après « Oui ».
- **Sauvegarde automatique** : chaque semaine, à l'ouverture de l'app, dans
  un dossier choisi une fois pour toutes ; les 5 dernières sont gardées.
- **Envoi hors du téléphone** : une carte rappelle d'envoyer une sauvegarde
  sur Drive ou WhatsApp si rien n'est parti depuis 30 jours.
- Le dossier de sauvegarde reste propre à chaque téléphone : il ne part pas
  dans les sauvegardes et une restauration ne le change pas.

## 1.4.1 — 20/11/2026

- Toutes les devises du monde (154), avec recherche par pays ou par nom.
- Pays du téléphone deviné par son fuseau horaire (un téléphone en
  « français (France) » au Bénin propose bien le franc CFA).
- « Répéter chaque mois » sur sa propre ligne, avec un interrupteur.
- Bouton « Trier » : les 3 tris expliqués, avec une coche sur le tri actif.
- « Catégorie » sans texte superflu ; grille entière au-dessus du pavé.

## 1.4.0 — 20/11/2026

- Choix de la devise (franc CFA par défaut). Changer de devise garde les
  chiffres tapés, sans taux de change.
- Opérations récurrentes (loyer, forfait, salaire…) ajoutées toutes seules
  chaque mois ; pause, reprise, suppression.
- Sauvegarde dans un fichier, restauration vérifiée (tout ou rien), export
  CSV pour Excel ou Google Sheets.
- Budgets proposés d'après les 3 derniers mois.

## 1.3.4 — 20/11/2026

- Toutes les catégories accessibles sans défiler (case « Plus »).
- Bouton « Enregistrer » grisé tant qu'il manque le montant ou la catégorie.
- Même pourcentage de budget partout.

## 1.3.3 — 20/11/2026

- Date et note juste sous le montant, toujours visibles.

## 1.3.1 — 19/11/2026

- Nouveau nom « Dépenses Perso » et nouvelle icône.
- Écran du budget du mois ; « ＋ Nouvelle » crée une catégorie depuis la
  saisie. Noms de catégories en entier, plus de « −0 F ».

## 1.3.0 — 19/11/2026

- Nouveau design : onglets Accueil, Opérations, Stats, Réglages et bouton ＋.
- Saisie rapide avec pavé numérique ; liste groupée par jour ; icônes
  vectorielles pour les catégories.

## 1.2.0 — 11/11/2026

- Réglages, catégories personnalisables, revenus et solde du mois, budgets.

## 1.1.0 — 31/10/2026

- Première version : dépenses enregistrées sur le téléphone, liste,
  recherche, modification, statistiques, thème sombre, vérification des
  mises à jour.
