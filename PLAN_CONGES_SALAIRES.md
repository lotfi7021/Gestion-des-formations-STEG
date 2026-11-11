# Plan — Gestion des congés et des salaires

## 1. Objectif

Ajouter au projet deux modules RH :

- **Congés** : demande, validation, solde, calendrier, notifications.
- **Salaires** : profils salariaux, bulletins mensuels, PDF, consultation par l'agent.

Réutilisation de l'existant : `User` (poste, département, direction, date d'embauche),
notifications + SSE, emails avec pièces jointes, `pdfkit`, cron, guards admin.

## 2. Décisions à valider

- [ ] Bénéficiaires : participants uniquement (agents STEG) / tous les rôles / + honoraires formateurs.
- [ ] Congés : demande + validation simple / + soldes annuels / + calendrier d'équipe.
- [ ] Salaires : bulletins saisis manuellement / calcul simple paramétrable / calcul CNSS-IRPP complet.
- [ ] Validation : admin uniquement / nouveau rôle RH-Manager.
- [ ] Congé sans solde : déduction automatique en paie (recommandé) ou simple information.

## 3. Architecture

### Backend

Nouveaux enums :

- `leave-status.enum.ts` : EN_ATTENTE, APPROUVE, REFUSE, ANNULE
- `payroll-status.enum.ts` : BROUILLON, VALIDE, PAYE

Nouvelles entités :

- `leave-type.entity.ts` : code, libelle, quotaAnnuelJours, paye, justificatifRequis, isActive
- `leave-request.entity.ts` : user, type, dateDebut, dateFin, nbJours, motif, statut,
  validePar, dateDecision, commentaireDecision
- `leave-balance.entity.ts` (optionnel) : user, type, annee, joursAcquis, joursPris
- `salary-profile.entity.ts` : user, salaireBase, primesFixes, dateEffet, isActive
- `payroll-period.entity.ts` : mois, annee, statut, dateValidation
- `payslip.entity.ts` : user, period, salaireBase, primes, joursSansSolde,
  retenueConges, cnss, irpp, autresRetenues, net, statut, pdfUrl
- `payroll-setting.entity.ts` : tauxCnss, tauxIrpp, autresParametres (JSON)

Nouveaux modules :

- `src/modules/leave/` : service, contrôleurs, DTO
- `src/modules/payroll/` : service, contrôleurs, DTO, génération PDF

## 4. Module Congés

### Règles

- Solde = quota annuel − jours approuvés de l'année.
- Interdiction de chevauchement entre deux demandes.
- Alerte si la demande chevauche une session où l'agent est inscrit.
- Workflow : agent → demande ; admin → approuve/refuse ; notification + email dans les deux sens.
- Annulation possible tant que la demande est en attente.

### API

- `GET/POST/PATCH/DELETE /leave-types` (admin)
- `GET /leaves/mine`
- `POST /leaves`
- `PATCH /leaves/:id/cancel`
- `GET /leaves/pending` (admin)
- `PATCH /leaves/:id/approve|reject` (admin)
- `GET /leaves/calendar` (admin)
- `GET /leaves/stats` (admin)

### Front

- `/mes-conges` : solde, formulaire, historique.
- `/admin/conges` : demandes à traiter, calendrier, types, statistiques.
- Entrées dans `admin-shell.tsx` et le menu participant.
- Clés dans `query-keys.ts`, formulaires RHF + Zod, erreurs via `getErrorMessage`.

## 5. Module Salaires

### Règles

- Brut = salaireBase + primesFixes − (jours sans solde × taux journalier).
- Retenues = CNSS (% paramétrable) + IRPP (% ou barème) + autres retenues.
- Valeurs figées dans le bulletin (snapshot).
- Génération mensuelle en brouillon, validation, puis paiement.
- PDF généré avec `pdfkit`, stocké dans `uploads/`, envoyé en pièce jointe.

### API

- `GET/PUT /salary-profiles/:userId` (admin)
- `GET /payroll/periods` (admin)
- `POST /payroll/generate` (admin)
- `PATCH /payroll/periods/:id/validate` (admin)
- `GET /payslips/mine`
- `GET /payslips/:id/pdf` (propriétaire ou admin)

### Front

- `/admin/paie` : profils, génération, bulletins.
- `/mes-bulletins` : consultation et téléchargement.
- Masquage des champs salaire dans les écrans génériques.

## 6. Intégrations

- Congés sans solde approuvés → déduction dans la paie du mois.
- Congé chevauchant une session → avertissement + présence `EXCUSE` (option).
- Paie → email avec PDF joint.
- Notifications temps réel réutilisées pour les validations.

## 7. Phasage

1. Congés : ~6–8 jours.
2. Paie simple : ~7–9 jours.
3. Intégration congés → paie + reporting : ~2–3 jours.

## 8. Risques

- Données salariales sensibles : accès self/admin uniquement.
- Exactitude légale CNSS/IRPP : taux paramétrables, mention « démo ».
- Chevauchements et doubles validations : contraintes + transactions.
- Report des congés d'une année sur l'autre : règle à définir.
- Scope creep : livrer Congés avant Salaires.

## 9. Checklist d'implémentation

- [ ] Entités + enums + modules enregistrés dans `app.module.ts`
- [ ] Migration/synchronize dev vérifiée
- [ ] Guards admin + accès self
- [ ] Notifications et emails (demande, décision, bulletin)
- [ ] Seed de démonstration (types de congés, profils salariaux)
- [ ] Écrans front + navigation + query keys
- [ ] PDF bulletin + stockage `uploads/`
- [ ] Scénario de démo et tests manuels

## 10. Scénario de démonstration

1. Un agent demande 3 jours de congé annuel.
2. L'admin reçoit notification + email, approuve.
3. Le solde de l'agent est mis à jour et il reçoit la confirmation.
4. L'admin génère la paie du mois : le congé sans solde est déduit.
5. L'agent télécharge son bulletin PDF.
