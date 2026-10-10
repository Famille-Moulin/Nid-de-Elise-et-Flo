# Notre Nid

Le carnet de la famille, installé comme une vraie appli sur vos deux téléphones :

- **Bébé** : tétées (avec chrono et côté), biberons, couches, dodos, bains, santé (vitamine D, température, médicaments), courbe de poids et taille.
- **Grand frère** : routines du matin et du soir qu'il coche lui-même, étoiles, étoiles bonus et récompense.
- **Famille** : liste de courses, tâches (Papa / Maman), rendez-vous, valise de maternité pré-remplie.
- **Avant la naissance** : compte à rebours et valise. Le bouton « Elle est née ! » bascule l'accueil en mode bébé.

Hébergement : **GitHub Pages** (gratuit). Synchro : **Firebase** (gratuit, plan Spark). Pas de serveur à gérer.

---

## Étape 1 : mettre l'appli en ligne sur GitHub (5 min)

1. Crée un compte sur [github.com](https://github.com) si besoin.
2. Clique sur **New repository**, nomme-le `notre-nid`, laisse-le **Public** (obligatoire pour GitHub Pages gratuit ; vos données ne seront pas dans le dépôt, seulement le code).
3. Dans le dépôt : **Add file → Upload files**, glisse **tout le contenu** du dossier (y compris le dossier `icons`), puis **Commit changes**.
4. **Settings → Pages** → Source : *Deploy from a branch*, branche `main`, dossier `/ (root)` → **Save**.
5. Après une minute, l'appli est disponible à `https://TON-PSEUDO.github.io/notre-nid/`.

À ce stade l'appli marche déjà, en **mode local** (les données restent sur le téléphone). Tu peux la tester tout de suite.

## Étape 2 : l'installer sur le téléphone

- **iPhone** : ouvre l'adresse dans **Safari** → bouton Partager → **Sur l'écran d'accueil**.
- **Android** : ouvre l'adresse dans **Chrome** → menu ⋮ → **Installer l'application**.

## Étape 3 : activer la synchro entre vos deux téléphones (10 min)

1. Va sur [console.firebase.google.com](https://console.firebase.google.com) avec un compte Google → **Créer un projet** (nom : `notre-nid`). Tu peux désactiver Google Analytics.
2. Menu **Build → Authentication → Commencer** → onglet *Sign-in method* → **Adresse e-mail/Mot de passe** → Activer → Enregistrer.
3. Onglet **Users → Ajouter un utilisateur** : crée ton compte, puis celui de ta femme (vos e-mails + un mot de passe chacun).
4. Menu **Build → Realtime Database → Créer une base de données** → emplacement **europe-west1 (Belgique)** → démarrer en **mode verrouillé**.
5. Onglet **Règles** de la base : remplace tout par le contenu du fichier `database.rules.json`, **en mettant vos deux vraies adresses e-mail** (en minuscules), puis **Publier**.
6. Icône ⚙ **Paramètres du projet** → en bas, *Vos applications* → icône **`</>`** (Web) → nom `notre-nid` → **Enregistrer l'application**. Firebase affiche un bloc `const firebaseConfig = { ... }`.
7. Sur GitHub, ouvre `config.js` → icône crayon ✏️ → remplace `null` par l'objet `{ ... }` copié (vérifie que la ligne `databaseURL` est bien présente ; sinon copie-la depuis la page Realtime Database) → **Commit changes**.
8. Attends une minute, rouvre l'appli sur chaque téléphone et connecte-toi avec ton e-mail et ton mot de passe. C'est synchronisé en temps réel.

> Si tu avais déjà saisi des choses en mode local : **Réglages → Exporter** avant l'étape 7, puis **Réglages → Importer** une fois connecté.

## Bon à savoir

- **Gratuit** : le plan Spark de Firebase offre 1 Go de stockage et 10 Go de transfert par mois. Une famille utilise quelques Mo par an.
- **Sécurité** : les clés de `config.js` sont publiques par nature ; ce sont les règles (étape 5) qui empêchent toute autre personne de lire vos données.
- **Hors ligne** : l'appli s'ouvre sans réseau. Les modifications faites hors ligne partent dès que le réseau revient (tant que l'appli reste ouverte).
- **Mise à jour** : si un téléphone garde une ancienne version après une modification du code, change `VERSION` dans `sw.js` (ex. `nid-v2`).
- **Sauvegarde** : Réglages → Exporter crée un fichier JSON de toutes les données.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | La page |
| `style.css` | L'apparence (clair et sombre pour les nuits) |
| `app.js` | Les écrans et les actions |
| `store.js` | Le stockage (local ou Firebase) |
| `config.js` | La configuration Firebase (à remplir à l'étape 3) |
| `database.rules.json` | Les règles de sécurité à coller dans Firebase |
| `sw.js`, `manifest.json`, `icons/` | Installation sur l'écran d'accueil et fonctionnement hors ligne |
