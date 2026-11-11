# AGENTS.md

## Structure

- `Gestion-Formation-Back-main/` — API NestJS (port 3000, préfixe `/api`, MySQL `gestion_formations`).
- `Gestion-Formation-Front-main/` — SPA TanStack Start + Router + Query (Vite, port 8080).

## Commandes

Front (depuis `Gestion-Formation-Front-main`) :

```bash
npm run dev        # serveur de dev
npm run lint       # ESLint (doit rester à 0 erreur)
npm run typecheck  # tsc --noEmit
npm run build      # build de production
```

Back (depuis `Gestion-Formation-Back-main`) :

```bash
npm run start:dev  # NestJS en watch, NODE_ENV=development
```

## Conventions front

- Formulaires : `react-hook-form` + `zodResolver` avec les schémas de `src/lib/validations.ts` et les composants de `src/components/ui/form.tsx`. Pas de `useState` par champ ni de validation manuelle.
- Requêtes : clés centralisées dans `src/lib/api/query-keys.ts` (`queryKeys.*`), jamais de tableaux littéraux dans `useQuery`/`invalidateQueries`.
- Erreurs API : `getErrorMessage(err, fallback)` depuis `src/lib/api/errors.ts`.
- Auth : `requireAuth(roles?)` depuis `src/lib/route-auth.ts` dans le `beforeLoad` des routes protégées. Le snapshot utilisateur est persisté dans `localStorage` (`steg_auth_user`) par `AuthProvider`.
- Vérifier avant de terminer : `npm run lint` et `npm run typecheck`.
