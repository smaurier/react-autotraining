# Checklist — Exercice 16b : Middleware Next.js

## Validation

- [ ] Le fichier `middleware.ts` est place dans `src/` (racine du code source)
- [ ] Le middleware exporte une fonction `middleware(request: NextRequest)`
- [ ] Les routes protegees (`/dashboard`, `/profile`, `/settings`) redirigent vers `/login` sans cookie
- [ ] La route `/login` redirige vers `/dashboard` si le cookie `session-token` est present
- [ ] Le `callbackUrl` est sauvegarde en query param et utilise après la connexion
- [ ] Les headers de sécurité sont ajoutes (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`)
- [ ] Un `X-Request-Id` unique est généré pour chaque requête
- [ ] Le `config.matcher` exclut `_next/static`, `_next/image`, `favicon.ico` et `api/`
- [ ] La page login pose le cookie `session-token` via `document.cookie`
- [ ] La page dashboard offre un bouton de deconnexion qui supprime le cookie
- [ ] `router.refresh()` est appele après modification du cookie
- [ ] Les types `NextRequest` et `NextResponse` sont utilises correctement
- [ ] Aucun `any` dans le code — `strict: true` respecte
