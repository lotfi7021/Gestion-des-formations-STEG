# Journal de travail — StirForma
**Date :** 16 septembre 2026  
**Projet :** Gestion-Formation (NestJS + React)

---

## 1. Démarrage du projet

- Lancé le serveur NestJS avec `npm run start:dev`
- Projet tourne sur **http://localhost:3000**
- Base de données MySQL `gestion_formations` sur `localhost:3306`
- Utilisateurs de seed déjà actifs : `admin`, `formateur`, `participant`, `employe`, `cabinet`

---

## 2. Correction du modèle IA (Groq)

**Problème :** L'IA affichait "Texte généré en mode fallback" sur les certificats et résumés.  
**Cause :** Le modèle configuré `qwen/qwen3.6-27b` n'existait pas sur Groq.  
**Fix :**

```
src/modules/ai/ai.service.ts
GROQ_MODEL : 'qwen/qwen3.6-27b'  →  'qwen/qwen3.8-27b'
```

---

## 3. Correction du taux de présence

**Problème :** Le taux de présence était toujours 0% dans les résumés de session.

**Causes identifiées :**
1. Les présences n'étaient pas créées automatiquement à l'inscription
2. Le calcul divisait `presents / totalParticipants` (nb de personnes) au lieu de `presents / totalLignes` (nb de lignes de présence)

**Corrections :**

| Fichier | Modification |
|---|---|
| `presence.service.ts` | Ajout de `initPresencesForParticipant()` — crée une ligne ABSENT par jour de session, sans doublons |
| `presence.controller.ts` | Nouveau endpoint `GET /presences/session/:sessionId` — retourne présences + taux calculé |
| `inscription.service.ts` | `confirmPayment()` appelle maintenant `initPresencesForParticipant()` automatiquement |
| `inscription.module.ts` | Import de `Presence` et `PresenceModule` |
| `ai.service.ts` | Calcul corrigé : `presents / totalLignes` |

---

## 4. Filtre d'exception global

**Problème :** Les erreurs retournées au frontend étaient génériques et peu lisibles.

**Solution :** Création d'un `HttpExceptionFilter` global.

**Fichier créé :** `src/common/filters/http-exception.filter.ts`  
**Fichier modifié :** `src/main.ts` — `app.useGlobalFilters(new HttpExceptionFilter())`

**Format de réponse unifié :**
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Ressource introuvable",
  "timestamp": "2026-09-16T13:00:00.000Z",
  "path": "/api/formations/xxx"
}
```

**Types d'erreurs gérés :**
- `HttpException` NestJS — messages lisibles par code HTTP
- `QueryFailedError` TypeORM — erreurs MySQL (doublons, clés étrangères, etc.)
- `EntityNotFoundError` — ressource introuvable
- Erreurs inconnues — stack trace en mode `development` uniquement

---

## 5. Assistant IA scopé par formation (RAG)

Fonctionnalité majeure ajoutée : un assistant IA pour les participants, scopé au contenu d'une formation spécifique.

### Architecture

**Décision :** Étendre le module `ai` existant (pas le module `chatbot` qui est un assistant admin général sans RAG).

### Backend

#### Nouvelles méthodes dans `AiService`

| Méthode | Description |
|---|---|
| `generateFormationSummary(formationId, userId)` | Résumé structuré à partir des PDF de session |
| `askFormationQuestion(formationId, question, userId)` | Q&A RAG scopé aux documents |
| `extractTextFromDocuments(docs, keyword?)` | Extraction texte PDF avec `pdf-parse` |
| `extractRelevantChunks(text, keyword)` | Chunking par score de pertinence |
| `assertParticipantEnrolled(formationId, userId)` | Vérifie l'inscription via JOIN |

#### Nouveaux endpoints

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| `GET` | `/formations/:id/ai-summary` | participant, employe | Génère le résumé |
| `POST` | `/formations/:id/ai-ask` | participant, employe | Pose une question |

#### Fichiers modifiés/créés (backend)

- `src/modules/ai/ai.service.ts` — méthodes RAG + `callClaude()` avec paramètre modèle
- `src/modules/ai/ai.module.ts` — ajout entité `Formation`
- `src/modules/ai/dto/ask-formation.dto.ts` — DTO validé
- `src/modules/formation/formation.controller.ts` — 2 nouveaux endpoints + import `AiService`
- `src/modules/formation/formation.module.ts` — import `AiModule`

### Frontend

#### Nouveaux fichiers

**`src/lib/api/ai.ts`** (fonctions ajoutées) :
```typescript
getFormationAiSummary(formationId)          // GET /formations/:id/ai-summary
askFormationQuestion(formationId, question) // POST /formations/:id/ai-ask
```

**`src/components/formation-ai-assistant.tsx`** — composant complet avec :
- Deux onglets : **Résumé** et **Poser une question**
- Onglet Résumé : bouton "Générer", état chargement, affichage markdown, bouton régénérer, badge fallback
- Onglet Chat : historique de conversation, scroll auto, avertissement RAG, reset conversation
- Renderer markdown inline (gras, listes numérotées, titres)

**`src/routes/formations.$id.tsx`** — intégration conditionnelle :
```tsx
// Affiché uniquement si participant/employe ET inscrit à au moins une session
{(user?.role === "participant" || user?.role === "employe") &&
  sessions.some(s => s.participants?.some(p => p.id === user?.id)) && (
    <FormationAiAssistant formationId={id} formationTitre={formation.titre} />
)}
```

### Problèmes résolus pendant l'implémentation

| Problème | Cause | Fix |
|---|---|---|
| `pdfParse is not a function` | Mauvaise version de `pdf-parse` (v2.x incompatible) | Downgrade vers `pdf-parse@1.1.1` |
| Erreur 413 (Request too large) | PDF de 48k chars → 18 688 tokens > limite 7 000 TPM Groq | `RAG_MAX_CHARS = 3 500` + chunking intelligent |
| Erreur 404 modèle Groq | `llama-3.1-8b-instant` non disponible sur ce compte | Retour sur `qwen/qwen3.8-27b` avec contexte réduit |

### Logique RAG (chunking)

**Pour le résumé** (sans mot-clé) :
→ Filtre les paragraphes avec des phrases complètes (> 80 chars, contient `.!?`)  
→ Prend les premiers jusqu'à la limite de 3 500 chars

**Pour le Q&A** (avec mot-clé) :
→ Score chaque paragraphe selon les mots de la question  
→ Trie par score décroissant, prend les 30 meilleurs  
→ Tronque à `RAG_MAX_CHARS`

---

## 6. Résumé des fichiers modifiés

### Backend (`Gestion-Formation-Back-main`)

```
src/main.ts
src/common/filters/http-exception.filter.ts    ← NOUVEAU
src/modules/ai/ai.service.ts
src/modules/ai/ai.module.ts
src/modules/ai/dto/ask-formation.dto.ts        ← NOUVEAU
src/modules/formation/formation.controller.ts
src/modules/formation/formation.module.ts
src/modules/inscription/inscription.service.ts
src/modules/inscription/inscription.module.ts
src/modules/presence/presence.service.ts
src/modules/presence/presence.controller.ts
```

### Frontend (`Gestion-Formation-Front-main`)

```
src/lib/api/ai.ts
src/components/formation-ai-assistant.tsx      ← NOUVEAU
src/routes/formations.$id.tsx
```

---

## 7. Dépendances ajoutées

| Package | Version | Usage |
|---|---|---|
| `pdf-parse` | `1.1.1` | Extraction texte depuis PDF |
| `@types/pdf-parse` | latest | Types TypeScript |

---

## 8. Configuration requise

```env
# .env — déjà configuré
GROQ_API_KEY=gsk_...   # Clé Groq gratuite, utilisée pour toutes les fonctions IA
```

> **Limite Groq gratuit :** 7 000 tokens/minute sur `qwen/qwen3.8-27b`.  
> Le RAG est limité à ~3 500 chars de contexte pour rester sous cette limite.  
> Pour lever cette limite → passer au Dev Tier Groq (payant) et augmenter `RAG_MAX_CHARS`.
