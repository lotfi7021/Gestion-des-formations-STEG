<div align="center">
  <br/>
  <h1>StirForma</h1>
  <p><strong>Plateforme de gestion de formations professionnelles</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/>
    <img src="https://img.shields.io/badge/TanStack_Start-FF4154?style=for-the-badge&logo=react-query&logoColor=white" alt="TanStack Start"/>
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/>
    <img src="https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white" alt="shadcn/ui"/>
  </p>

  <p>
    <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS"/>
    <img src="https://img.shields.io/badge/TypeORM-262627?style=for-the-badge&logo=typeorm&logoColor=orange" alt="TypeORM"/>
    <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL"/>
    <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white" alt="JWT"/>
  </p>

  <p>
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
    <img src="https://img.shields.io/badge/bun-282a36?style=for-the-badge&logo=bun&logoColor=fbf0df" alt="Bun"/>
    <img src="https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white" alt="npm"/>
  </p>

  <br/>
</div>

---

## Présentation

StirForma est une solution complète de gestion de formations professionnelles. Elle couvre l'intégralité du cycle de vie d'une formation : de la création du catalogue à l'émission des certificats, en passant par les inscriptions, les évaluations, la gestion des présences et la signature électronique des documents.

---

## Architecture

<div align="center">

| Couche | Technologie |
|---|---|
| **Frontend** | TanStack Start + React 19 + Tailwind CSS v4 + shadcn/ui |
| **Backend** | NestJS + TypeORM + MySQL |
| **Authentification** | JWT (access token 15 min, refresh token 7 jours) |
|

</div>

<br/>

```mermaid
graph LR
    A[Client Browser] --> B[TanStack Start SSR]
    B --> C[NestJS API :3001]
    C --> D[MySQL]
    C --> E[SMTP]
    C --> F[Groq AI]
```

---

## Démarrage rapide

### Backend

```bash
cd Gestion-Formation-Back
npm install
cp .env.example .env
npm run start:dev
```

> Serveur démarré sur **http://localhost:3001**

### Frontend

```bash
cd Gestion-Formation-Front
bun install
bun run dev
```

> Application accessible sur **http://localhost:8081**

### Seed

```bash
cd Gestion-Formation-Back
npx ts-node src/seed/seed.ts
```

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | `admin@formapro.fr` | `admin123` |
| Formateur | `formateur@formapro.fr` | `formateur123` |
| Participant | `participant@formapro.fr` | `participant123` |

---

## Fonctionnalités

<div align="center">

| Module | Description |
|---|---|
| <img src="https://img.shields.io/badge/-🔐-gray?style=flat-square"/> **Authentification** | Login, refresh token, protection RBAC (5 rôles) |
| <img src="https://img.shields.io/badge/-📚-gray?style=flat-square"/> **Formations** | CRUD complet, upload images/supports, clonage cabinet → plateforme |
| <img src="https://img.shields.io/badge/-📅-gray?style=flat-square"/> **Sessions** | Planification, assignation multi-rôle, clonage |
| <img src="https://img.shields.io/badge/-💳-gray?style=flat-square"/> **Inscriptions** | Paiement, confirmation, historique |
| <img src="https://img.shields.io/badge/-⭐-gray?style=flat-square"/> **Évaluations** | Grille 10 critères, doublon, KPI temps réel |
| <img src="https://img.shields.io/badge/-📍-gray?style=flat-square"/> **Présences** | Pointage par date, statut formation/cantine |
| <img src="https://img.shields.io/badge/-📜-gray?style=flat-square"/> **Certificats** | PDF avec QR code, signature électronique |
| <img src="https://img.shields.io/badge/-📄-gray?style=flat-square"/> **Documents** | Convention, émargement, contrat — signature multi-rôle |
| <img src="https://img.shields.io/badge/-🔔-gray?style=flat-square"/> **Notifications** | In-app + email (SMTP optionnel) |
| <img src="https://img.shields.io/badge/-🤖-gray?style=flat-square"/> **Chatbot IA** | Agent Groq pour assistance administrative |
| <img src="https://img.shields.io/badge/-📊-gray?style=flat-square"/> **KPI Dashboard** | Satisfaction, participation, évaluations |
| <img src="https://img.shields.io/badge/-🔍-gray?style=flat-square"/> **Recherche globale** | ⌘K / Ctrl+K — command palette multi-entité |
| <img src="https://img.shields.io/badge/-🧪-gray?style=flat-square"/> **Load testing** | Script k6 inclus |

</div>

---

## API

Préfixe : `/api`

### Authentification

```
POST /api/auth/login        → { access_token, refresh_token }
POST /api/auth/refresh      → { access_token, refresh_token }
PATCH /api/auth/profile     → Mise à jour profil
```

### Catalogue & Formations

```
GET    /api/formations           → Catalogue public
GET    /api/formations/:id       → Détail formation
POST   /api/formations           → Création (admin / cabinet)
PATCH  /api/formations/:id       → Modification
DELETE /api/formations/:id       → Suppression
```

### Sessions

```
GET    /api/sessions             → Liste (auth requis)
POST   /api/sessions             → Création
PATCH  /api/sessions/:id         → Modification
DELETE /api/sessions/:id         → Suppression
```

### Utilisateurs

```
GET    /api/users/participants   → Participants
GET    /api/users/cabinets       → Cabinets (admin)
GET    /api/formateurs           → Formateurs
GET    /api/employes             → Employés
PATCH  /api/users/:id            → Modifier / activer / désactiver
```

---

## Scripts

```bash
# Backend
cd Gestion-Formation-Back
npm run start:dev       # Développement
npm run build           # Production

# Frontend
cd Gestion-Formation-Front
bun run dev             # Développement
bun run build           # Production
bun run lint            # ESLint
bun run format          # Prettier

# Load test (k6)
k6 run load-test.js
```

---

## Structure du projet

```
stir-stage/
│
├── Gestion-Formation-Back/          # NestJS — CommonJS
│   ├── src/
│   │   ├── modules/                 # 17 modules métier
│   │   │   ├── auth/                # JWT, guards
│   │   │   ├── formation/           # CRUD formations
│   │   │   ├── session/             # CRUD sessions
│   │   │   ├── inscription/         # Paiements
│   │   │   ├── evaluation/          # Évaluations
│   │   │   ├── presence/            # Présences
│   │   │   ├── certificate/         # Certificats PDF
│   │   │   ├── document/            # Documents signés
│   │   │   ├── signature/           # Signatures électroniques
│   │   │   ├── notification/        # Notifications in-app
│   │   │   ├── mail/                # Service email
│   │   │   ├── chatbot/             # IA Groq
│   │   │   └── ...
│   │   ├── entities/                # Entités TypeORM
│   │   ├── common/                  # Enums, helpers
│   │   └── seed/                    # Script de seed
│   └── uploads/                     # Fichiers uploadés
│
├── Gestion-Formation-Front/         # TanStack Start — ESM
│   ├── src/
│   │   ├── routes/                  # File-based routing
│   │   ├── components/              # Composants shadcn/ui
│   │   └── lib/api/                 # Client API typé
│   └── public/
│
└── load-test.js                     # k6 — test de charge
```

---

<div align="center">
  <br/>
  <p>
    <img src="https://img.shields.io/badge/built_with-❤️-0a7c6e?style=for-the-badge"/>
  </p>
  <br/>
</div>
