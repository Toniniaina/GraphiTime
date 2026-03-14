# Projet : Gestion d’emploi du temps scolaire avec Graph Coloring et GraphQL

## Pourquoi ce projet ?
Dans beaucoup d’écoles à Madagascar, l’emploi du temps est **fait manuellement**, ce qui prend **des jours voire semaines**.  
Certains profs ont **plusieurs écoles**, donc leur disponibilité est limitée.  
L’objectif est de créer un **outil automatique et intelligent** pour :  
- Optimiser l’emploi du temps  
- Éviter les conflits de profs, salles et classes  
- Gérer facilement **plusieurs contraintes** (prof externe, matières spécifiques, préférences horaires)  

Ce projet est très pratique et valorisant : il montre que tu sais gérer des **algorithmes complexes**, une **base de données relationnelle**, et créer une **interface web moderne et dynamique**.

---

## Technologies choisies
- **Backend : Python (Flask ou Django) avec GraphQL** → exposera les **API GraphQL** pour le frontend  
- **Frontend : React** → pour visualiser et manipuler l’emploi du temps  
- **Base de données : PostgreSQL** → pour stocker profs, classes, matières, créneaux, salles  
- **Algorithme principal : Graph Coloring** → pour assigner les cours aux créneaux sans conflits

---

## Architecture générale

[Frontend React] <--GraphQL--> [Backend Python (Flask/Django)]
|
|-- Graph Coloring (CSP)
|-- Gestion des contraintes externes (profs multi-emplois)
|
[Base de données PostgreSQL]


---

## TODO pour réaliser le projet

### 1️⃣ Analyse et conception
- Identifier **les entités** : Professeurs, Classes, Matières, Salles, Créneaux  
- Identifier **les contraintes** :  
  - Un prof ne peut pas être à deux cours en même temps  
  - Une salle ne peut accueillir qu’une classe à la fois  
  - Disponibilité externe du prof (autres écoles)  
  - Contraintes horaires spécifiques (ex : labo, sport)  
- Définir **l’architecture front/back** avec **GraphQL**  

---

### 2️⃣ Backend Python avec GraphQL
-
#### Initialisation backend (FastAPI + Strawberry)
- [x] Créer le dossier `backend/`
- [x] Ajouter dépendances Python (`backend/requirements.txt`)
- [x] Créer une API FastAPI minimale
  - Endpoint santé : `GET /health`
  - Endpoint GraphQL : `/graphql`
  - Query de test : `ping`
- [x] Ajouter un guide de lancement (`backend/README.md`)
- [ ] Ajouter la config via variables d’environnement (`.env`) et charger selon l’environnement (dev/prod)
- [ ] Mettre en place la connexion PostgreSQL
- [ ] Définir le modèle de données (ORM) + migrations
- [ ] Implémenter le schéma GraphQL (types, queries, mutations)
- [ ] Ajouter validation, gestion d’erreurs, et pagination
- [ ] Ajouter tests (unitaires + API)

- Créer la **base de données PostgreSQL** avec tables :  
  - `Profs(id, nom, disponibilites_externes)`  
  - `Classes(id, nom)`  
  - `Matieres(id, nom)`  
  - `Salles(id, nom, capacite)`  
  - `Cours(id, matiere_id, classe_id, prof_id, salle_id)`  
- Implémenter **Graph Coloring** :  
  - Chaque cours = nœud  
  - Conflit = arête (même prof, même salle, même classe, disponibilité externe)  
  - Couleurs = créneaux horaires  
- Développer **API GraphQL** :  
  - Queries :  
    - `cours` → récupérer tous les cours avec détails (prof, classe, matière, salle, créneau)  
    - `emploiDuTemps` → générer emploi du temps optimisé complet  
  - Mutations :  
    - `ajouterCours(input)` → ajouter un cours  
    - `modifierCours(id, input)` → modifier un cours  
    - `supprimerCours(id)` → supprimer un cours  
    - `ajouterProf(input)` / `modifierProf(id, input)` → gérer profs  

---

### 3️⃣ Frontend React
#### Initialisation frontend (Vite + React + TypeScript)
- [x] Créer le dossier `frontend/` (Vite + React TS)
- [ ] Installer les dépendances (`npm install`)
- [ ] Lancer le serveur de dev (`npm run dev`)
- [ ] Ajouter une première page avec appel GraphQL `ping`
- [ ] Ajouter un client GraphQL (Apollo Client ou urql)
- [ ] Ajouter routing (React Router) et structure de pages

- Créer **interface calendrier** :  
  - Grille semaine ou mois  
  - Chaque cours coloré par matière  
  - Cliquer sur un cours pour voir détails (prof, salle, classe)  
- Ajouter fonctionnalités :  
  - Ajouter / modifier cours, prof, salle  
  - Exporter PDF de l’emploi du temps  
  - Drag & drop pour ajustement manuel  
- Consommer **API GraphQL** pour récupérer et mettre à jour les données

---

### 4️⃣ Tests et optimisation
- Tester **Graph Coloring** avec plusieurs cas complexes (prof multi-emplois, contraintes multiples)  
- Vérifier qu’**aucun conflit n’existe**  
- Optimiser pour **réduire le nombre de créneaux** si possible  
- Vérifier interface sur desktop et mobile

---

### 5️⃣ Documentation et déploiement
- Écrire **manuel utilisateur** pour admin et profs  
- Déployer le projet localement ou sur serveur web (ex : Heroku, Railway)  
- Expliquer comment ajouter de nouveaux profs, classes ou contraintes  

---

## À la fin du projet, tu réalises
- Un **système complet** pour gérer l’emploi du temps d’une école  
- Algorithme Graph Coloring fonctionnel avec contraintes réelles  
- Interface web moderne et interactive avec React  
- Base de données PostgreSQL structurée et flexible  
- Backend Python exposant des **API GraphQL** pour interaction frontend

---

## Ce que tu apprendras / habitude que tu prends
- **Pensée algorithmique avancée** (Graph Coloring et contraintes multiples)  
- **Développement full-stack moderne** (Python + React + GraphQL)  
- Gestion de **données complexes** et **optimisation**  
- Séparation **frontend / backend / base de données**  
- Bonnes pratiques pour **projets réels** (tests, déploiement, interface utilisateur)
