# Démo vidéo 3 minutes — steg_form

Storyboard de tournage pour une démo de **3 min 00** couvrant les trois rôles : public, administrateur, formateur, participant.

---

## 1. Fiche technique

| Élément | Valeur |
|---|---|
| Durée cible | 3:00 (180 s) |
| Format | 1920×1080, 30 fps, MP4 H.264 + AAC |
| Langue | Français |
| Ton | Posé, professionnel, sans jargon technique |
| Narration | Voix off enregistrée séparément, calée sur les timecodes |
| Livrable | `demo_steg_form_3min.mp4` |

---

## 2. Comptes et URLs

| Rôle | Identifiant | Mot de passe | Redirection après connexion |
|---|---|---|---|
| Admin | `admin` | `123456` | `/admin` |
| Formateur | `formateur` | `123456` | `/formateur/dashboard` |
| Participant | `participant` | `123456` | `/catalogue` |

> Les mots de passe par défaut viennent de `seed.service.ts` (`SEED_*_PASSWORD ?? '123456'`). Si tu as défini des `SEED_*` dans `.env`, utilise ces valeurs.
> La connexion accepte l'identifiant court, l'email ou l'identifiant STEG.

- Front : `http://localhost:8080`
- API : `http://localhost:3000/api`

---

## 3. Préparer les données de démo

À faire **avant** d'appuyer sur Enregistrer.

1. **Services** : démarrer MySQL, puis le back (`npm run start:dev` dans `Gestion-Formation-Back-main`) et le front (`npm run dev` dans `Gestion-Formation-Front-main`).
2. **Catalogue** : vérifier qu'au moins 3 formations sont visibles sur l'accueil (le seed en crée 2 : BC/CBR et HSE ; en ajouter une via *Formations → Nouvelle formation* si besoin).
3. **Session du jour (pour le QR / pointage)** : *Sessions → Planifier une session*.
   - Formation : BC/CBR – Consignation et Rétablissement
   - Dates : aujourd'hui → aujourd'hui
   - Lieu : Centre de formation STEG – Tunis
   - Capacité : 12
   - Participants : Mohamed Trabelsi — Formateur : Ahmed Ben Salah
4. **Session terminée (pour évaluation + certificat)** : créer une session avec des dates passées, le même participant, puis sur la carte :
   - *Marquer comme terminée*
   - *Certificats* → vérifier que le certificat est généré
5. **Documents signés** : *Documents → Générer un document* (convention/contrat pour la session terminée), puis *Signer électroniquement* → vérifier l'onglet *Documents signés*.
6. **Approbations** : créer un compte en attente via `/inscription` (ex. `demo.candidat` / `demo.candidat@steg.tn` / `123456`). **Ne pas l'approuver** : la ligne doit rester visible.
7. **Paiements** : faire inscrire un participant à une session ouverte sans valider le paiement, pour obtenir une ligne « en attente » dans *Paiements*.
8. **Assistant IA** : lancer `ollama serve`, vérifier le modèle (`ollama pull gemma3:4b`) et envoyer une première question **hors caméra** (la première réponse charge le modèle, elle est beaucoup plus lente).
9. **Test à blanc** : dérouler tout le parcours ci-dessous une fois, sans enregistrer, et chronométrer.

> Les étapes 4 à 7 sont à faire une seule fois : le pointage et l'évaluation sont des actions non répétables. Pour un second take, prévoir une deuxième session ou réinitialiser la ligne concernée.

---

## 4. Régler l'environnement de capture

- Chrome, **F11** plein écran, zoom **100 %**, barre de favoris masquée (`Ctrl+Shift+B`).
- Fermer les extensions, les autres onglets et les notifications Windows.
- Thème **clair** (meilleure lisibilité vidéo/projecteur).
- Taille du pointeur souris : 2 (Paramètres → Accessibilité → Souris).
- Enregistrement : **OBS Studio** (recommandé) ou Xbox Game Bar (`Win+G`).
  - OBS : Capture d'écran 1920×1080, 30 fps, curseur visible, sortie MP4 H.264 ~8 Mbps, micro 48 kHz sur une piste séparée.
  - Optionnel : PointerFocus (gratuit) pour surligner les clics.
- Éviter d'utiliser le serveur de dev pendant le tournage (un fichier modifié déclenche un rechargement). Ne rien éditer, ou lancer un build de prévisualisation.

---

## 5. Storyboard minuté

| # | Chrono | Durée | Écran | Actions précises |
|---|---|---|---|---|
| S01 | 0:00 → 0:08 | 8 s | Accueil `/` | Scroll très lent sur le hero. S'arrêter sur les 3 statistiques. |
| S02 | 0:08 → 0:20 | 12 s | Accueil — « Formations à l'affiche » | Descendre jusqu'à la section, survoler 2 cartes, ouvrir la première. |
| S03 | 0:20 → 0:30 | 10 s | Fiche formation | Descendre jusqu'à « Prochaines sessions », montrer le tarif, cliquer **« S'inscrire »** → redirection vers `/connexion`. |
| S04 | 0:30 → 0:38 | 8 s | Connexion | Saisir `admin` + `123456`, cliquer **« Se connecter »**. |
| S05 | 0:38 → 0:50 | 12 s | Admin — Tableau de bord | Survoler les 4 KPI, descendre sur « Sessions par mois » et « Prochaines sessions ». |
| S06 | 0:50 → 1:00 | 10 s | Admin — Formations | Cliquer **« Nouvelle formation »**, survoler les champs (titre, catégorie, tarif, durée, programme, PDF), fermer avec `Échap`. |
| S07 | 1:00 → 1:12 | 12 s | Admin — Sessions | Survoler une carte de session, cliquer l'icône **QR code de pointage**, montrer le QR et « Lien de pointage », cliquer **Copier le lien** (toast), fermer. |
| S08 | 1:12 → 1:22 | 10 s | Admin — Participants / Approbations / Paiements | Passer 3 s par écran. Survoler « Approuver » et « Paiement reçu » **sans cliquer**. |
| S09 | 1:22 → 1:32 | 10 s | Admin — Documents | Montrer les onglets « Documents signés » / « Signatures », ouvrir **« Signer électroniquement »**, montrer la zone de signature 2 s, fermer. |
| S10 | 1:32 → 1:40 | 8 s | Admin — KPI Formations | Descendre sur « Moyennes semestrielles », survoler **« Exporter Excel »** sans cliquer. |
| S11 | 1:40 → 1:47 | 7 s | Déconnexion + connexion | Avatar → **« Déconnexion »**, puis `formateur` + `123456`, **« Se connecter »**. |
| S12 | 1:47 → 1:58 | 11 s | Formateur | Montrer « Mes sessions », puis cliquer **« Calendrier »** dans le header et montrer la vue mois. |
| S13 | 1:58 → 2:05 | 7 s | Déconnexion + connexion | Avatar → **« Déconnexion »**, puis `participant` + `123456`, **« Se connecter »**. |
| S14 | 2:05 → 2:15 | 10 s | « Mes formations » | Descendre sur les inscriptions confirmées, survoler **« Certificat »** et **« Évaluer »**. |
| S15 | 2:15 → 2:24 | 9 s | Pointage | Nouvel onglet, `Ctrl+L` puis `Ctrl+V` (le lien copié en S07), `Entrée`, cliquer **« Confirmer ma présence »**, montrer le toast. |
| S16 | 2:24 → 2:36 | 12 s | Évaluation | Retour sur « Mes formations » → **« Évaluer »** sur la session terminée. Noter 4 questions (échelle 1–4), descendre, cliquer **« Envoyer l'évaluation »**. |
| S17 | 2:36 → 2:44 | 8 s | Certificat | Retour sur « Mes formations » → **« Certificat »** : le PDF s'ouvre dans un nouvel onglet. Montrer le document 3 s, fermer l'onglet. |
| S18 | 2:44 → 2:54 | 10 s | Assistant IA | Cliquer le bouton flottant « Assistant steg_form », saisir une question, envoyer, montrer la réponse. |
| S19 | 2:54 → 3:00 | 6 s | Carton de fin | Logo `steg_form` + tagline + « Merci ». |

**Lower-thirds suggérés** : S05 « Espace Administrateur », S11 « Espace Formateur », S13 « Espace Participant », S15 « Pointage QR », S18 « Assistant IA ».

---

## 6. Script voix off (téléscripteur)

À lire à un rythme calme (~2,2 mots/seconde). Le découpage suit exactement les clips.

**S01 — 0:00 → 0:08**
> Bienvenue sur steg_form, la plateforme qui pilote tout le cycle de vie des formations de la STEG.

**S02 — 0:08 → 0:20**
> Côté usager, chaque agent parcourt les formations à l'affiche, consulte le programme et repère la session qui lui convient.

**S03 — 0:20 → 0:30**
> La fiche formation regroupe le programme, les prochaines sessions et le tarif. Pour s'inscrire, l'utilisateur se connecte.

**S04 — 0:30 → 0:38**
> Nous voici dans l'espace administrateur. La connexion est sécurisée par JWT, avec un rôle par utilisateur.

**S05 — 0:38 → 0:50**
> Le tableau de bord donne la vision du service formation : sessions du mois, participants actifs, catalogue et satisfaction, avec les prochaines échéances.

**S06 — 0:50 → 1:00**
> L'administrateur crée une formation en quelques champs : catégorie, tarif, durée, programme et supports PDF.

**S07 — 1:00 → 1:12**
> Il planifie les sessions, affecte formateurs et participants, puis génère un QR code de pointage pour chaque séance.

**S08 — 1:12 → 1:22**
> Les inscriptions en attente, les comptes à approuver et les paiements en espèces se valident depuis un seul écran.

**S09 — 1:22 → 1:32**
> Conventions et contrats sont générés automatiquement, puis signés électroniquement, avec vérification et piste d'audit.

**S10 — 1:32 → 1:40**
> Les KPI analysent satisfaction, réussite et alertes par session. L'export Excel est disponible en un clic.

**S11 — 1:40 → 1:47**
> Passons maintenant à l'espace formateur.

**S12 — 1:47 → 1:58**
> Il retrouve ses sessions, son calendrier, les documents pédagogiques et les listes de participants.

**S13 — 1:58 → 2:05**
> Et enfin, l'espace participant.

**S14 — 2:05 → 2:15**
> Chaque agent suit ses inscriptions, télécharge ses documents et accède à ses certificats.

**S15 — 2:15 → 2:24**
> Sur place, le pointage se fait en scannant le QR code : la présence est enregistrée en temps réel.

**S16 — 2:24 → 2:36**
> Après la formation, il évalue le contenu, les conditions matérielles et le formateur, sur une échelle de un à quatre.

**S17 — 2:36 → 2:44**
> Le certificat, généré par l'administration, se télécharge immédiatement au format PDF.

**S18 — 2:44 → 2:54**
> Et partout, l'assistant IA répond aux questions, résume les formations et aide à rédiger les contenus.

**S19 — 2:54 → 3:00**
> steg_form : une seule plateforme pour toute votre ingénierie de formation. Merci.

---

## 7. Tournage par clips

- Enregistrer **un clip par section** (`S01` … `S19`), pas une prise unique : les retakes sont beaucoup plus simples.
- Laisser 1 s de silence au début et à la fin de chaque clip pour le montage.
- Si un clip échoue, ne refaire que celui-là. Seules S15 (pointage) et S16 (évaluation) modifient les données : prévoir une session de secours ou réinitialiser avant le second take.
- Enregistrer la voix off clip par clip, en écoutant l'image : le calage est immédiat.
- Faire une prise complète à blanc pour vérifier les temps avant d'enregistrer la voix.

---

## 8. Montage et export

1. Importer S01 → S19 dans l'ordre (Clipchamp, CapCut ou DaVinci Resolve).
2. Couper les temps morts ; 0,2–0,3 s de fondu enchaîné entre sections.
3. Ajouter les lower-thirds aux timecodes indiqués, puis le carton de fin.
4. Poser la voix off ; normaliser autour de **−16 LUFS**, réduire le bruit de fond.
5. Musique libre de droits à **−25 dB** sous la voix.
6. Vérifier que la durée totale est **≤ 3:00**.
7. Exporter : 1920×1080, 30 fps, H.264, AAC 192 kbps.

---

## 9. Pièges et plans B

| Risque | Solution |
|---|---|
| La première réponse de l'IA locale met 30–60 s | Pré-chauffer Ollama hors caméra ; sinon filmer la question, puis couper au montage vers la réponse. |
| La page KPI est vide | Remplacer S10 par « Évaluations » (si des évaluations existent) ou sauter la section et rallonger S05/S06. |
| Le bouton « Certificat » n'apparaît pas | Il n'apparaît que si un certificat existe : le générer depuis *Sessions → Certificats* avant le tournage. |
| Le pointage est refusé | Le QR n'est valide que pendant les dates de la session, et pour un participant inscrit. Vérifier la session du jour. |
| La vérification affiche « Présence déjà enregistrée » | Normal après un premier take : recréer une session ou changer de participant pour le take suivant. |
| « Bonjour Sarah. » sur le dashboard admin | Texte codé en dur (`admin.index.tsx:81`). Le remplacer par « Bonjour. » ou le prénom de l'utilisateur connecté. |
| « Accédez à votre espace administrateur » sur la page de connexion | Visible aussi pour les rôles formateur et participant (`connexion.tsx:120-123`). Remplacer par « Accédez à votre espace ». |
| Lenteur ou rechargement du front | Ne pas modifier de fichier pendant le tournage. |

---

## 10. Checklist jour J

- [ ] MySQL + back + front démarrés, comptes testés
- [ ] Session du jour avec participant inscrit (QR)
- [ ] Session terminée avec certificat généré
- [ ] Un document signé
- [ ] Un compte en attente dans Approbations
- [ ] Un paiement en attente
- [ ] Modèle Ollama pré-chargé
- [ ] Chrome propre, 1080p, notifications coupées
- [ ] OBS configuré, micro testé
- [ ] Parcours complet chronométré une fois
