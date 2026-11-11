# 🎓 steg_form — Plateforme de gestion des formations STEG

Application web complète pour la **Direction de la Formation de la STEG** (Société Tunisienne de l'Électricité et du Gaz) : planification des sessions, inscriptions, présences, certificats signés électroniquement, et assistance IA.

> 📅 Résumé généré le 20 septembre 2026.

---

## 🏗️ Architecture (2 projets)

| | Backend (`Gestion-Formation-Back-main`) | Frontend (`Gestion-Formation-Front-main`) |
|---|---|---|
| **Framework** | NestJS (Node.js) | TanStack Start (React 19, SSR) |
| **Base de données** | MySQL via TypeORM (`gestion_formations`) | — |
| **UI** | — | Tailwind CSS 4 + shadcn/ui + lucide-react |
| **Auth** | JWT access + refresh tokens (bcrypt) | TanStack Query, fetch authentifié avec auto-refresh |
| **Autres** | Multer (uploads), Nodemailer, `@nestjs/schedule` (cron) | Sonner (toasts), Recharts, react-hook-form + zod |

---

## 👥 Quatre rôles utilisateurs

- **Admin** — pilotage global de la plateforme
- **Cabinet** — organisme de formation gérant ses propres formations/sessions/formateurs (multi-tenant : les formations peuvent être clonées depuis un cabinet vers la plateforme)
- **Formateur** — anime les sessions, gère les documents
- **Participant / Employé** — s'inscrit, suit ses formations, évalue

---

## 🧩 Modules backend (18 modules — `src/modules/`)

- **auth** — inscription, connexion, refresh token, bcrypt
- **formation** — catalogue intra / inter / catalogue, tarifs, catégories, images, clonage
- **session** — planification (dates, lieu, capacité), formateurs & participants associés
- **inscription** — inscription aux sessions + suivi des paiements (`StatutPaiement`)
- **presence** — feuilles de présence par session
- **evaluation** — évaluations des formations par les participants
- **certificate / signature / document-signe** — certificats avec signature électronique et QR-code de vérification d'authenticité
- **session-document** — partage de documents (PDF, PPTX, DOC, images, 20 Mo max) : upload, liste, téléchargement, suppression
- **notification** — cloche de notifications in-app
- **mail** — convocations et e-mails automatiques
- **tasks** — cron toutes les heures : rappels automatiques des sessions qui commencent dans moins de 24h (participants + formateurs)
- **employe / entreprise / formateur** — gestion des entités RH
- **ai** — assistant IA (Groq, modèle `qwen/qwen3.8-27b`) : résumé de formation par RAG sur les PDF des sessions, Q&A scopée aux documents, textes de certificats, résumés de session
- **chatbot** — chatbot global avec accès aux données de la base selon le rôle

---

## 🗄️ Modèle de données (14 entités — `src/entities/`)

`User`, `Entreprise`, `Employe`, `Formation`, `Session`, `Inscription`, `Presence`, `Evaluation`, `Certificate`, `Signature`, `DocumentSigne`, `SessionDocument`, `Notification` — avec enums pour rôles, types de formation, statuts de présence / paiement / certificat.

---

## 🖥️ Interface frontend (~35 pages — `src/routes/`)

- **Public** : accueil (landing animée), à propos, contact, connexion, inscription, catalogue (recherche + filtres), détail formation
- **Participant** : mes formations, calendrier, évaluation de session, profil
- **Formateur** : dashboard « Mes sessions » avec upload/suppression de documents, calendrier
- **Admin** : KPI/dashboard, formations, sessions, participants, formateurs, cabinets, employés, documents, évaluations, paiements, approbations, paramètres
- **Cabinet** : tableau de bord, formations, sessions, formateurs
- **Transverse** : mode sombre, notifications, chatbot flottant, design system STEG bleu/ocre avec typographie *Instrument Serif*

---

## ✨ Points forts

1. **Cycle de formation complet** : catalogue → inscription → paiement → convocation → présence → évaluation → certificat signé
2. **IA intégrée** : RAG sur les documents PDF (extraction texte, chunking par pertinence avec filtre de mots vides français, fallback hors-ligne), réponses scopées aux documents
3. **Automatisations** : rappels 24h avant les sessions, e-mails, notifications
4. **Fiabilité documentaire** : vérification d'authenticité des certificats par QR-code

---

## 🚀 Démarrage

### Backend
```bash
cd Gestion-Formation-Back-main
npm install
# Configurer .env : DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE, JWT_SECRET, GROQ_API_KEY...
npm run start:dev
```

### Frontend
```bash
cd Gestion-Formation-Front-main
npm install
# Configurer VITE_API_URL (défaut : http://localhost:3000)
npm run dev
```
