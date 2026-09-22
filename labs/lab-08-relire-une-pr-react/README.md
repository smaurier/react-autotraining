# Lab 08 — Intervention : relire une PR React, findings avant vérité

> **Outcome :** à la fin, tu sais repérer dans une PR React deux problèmes réels et
> discrets à l'œil nu, tous deux invisibles en démo : une **injection HTML** depuis un
> contenu utilisateur (`dangerouslySetInnerHTML` sans raison), et un **`key={index}`** qui
> fait dériver l'état local d'un composant de sa position plutôt que de son identité — un
> classique React qui casse silencieusement dès qu'une liste change de longueur.
> **Vrai outil :** React 19 + Testing Library. `regression.test.tsx` (comportement légitime,
> déjà vert) + `pr-review.test.tsx` (rouge — les deux problèmes sont réels — puis vert).
> **Feedback :** `npm run lab:08` — GREEN seulement si non-régression **et** les deux
> problèmes de la PR sont corrigés, ensemble. `REVIEW.md` est lu par le correcteur avant ton
> code. `npm run solution:08` prouve l'oracle.

## Prérequis technique

`npm install` depuis `04-react/labs`.

## Lire avant (une lecture bornée)

- Module [`03-jsx-en-profondeur.md`](../../modules/03-jsx-en-profondeur.md) —
  `dangerouslySetInnerHTML`, ce que React fait (et ne fait PAS) pour te protéger d'une
  injection par défaut.
- Module [`06-rendu-conditionnel-et-listes.md`](../../modules/06-rendu-conditionnel-et-listes.md)
  — `key`, ce que React en fait vraiment : identifier une instance à travers les rendus, pas
  numéroter des lignes.

## Énoncé

Un collègue ouvre une PR : `CommentList` (`src/CommentList.tsx`), pour afficher, éditer et
supprimer les commentaires d'un post. La démo passe.

**0. `REVIEW.md`, avant toute ligne de code.** Lis `src/CommentList.tsx` — rien d'autre —
et réponds aux questions de `REVIEW.md`. Le correcteur lit ce fichier avant ton code.

**1. Corrige les deux problèmes**, en place :
- `dangerouslySetInnerHTML={{ __html: comment.content }}` — remplace par un rendu texte
  normal (`{comment.content}`). React échappe automatiquement le contenu d'une expression
  JSX — c'est la protection par défaut qu'on jetait sans raison.
- `<CommentRow key={index} ...>` — remplace par `key={comment.id}`. L'état local de
  `CommentRow` (édition en cours) doit suivre le commentaire, pas sa position dans la liste.

**Le piège à éviter.** Les deux bugs "marchent" en démo simple (une liste stable, un
commentaire sans caractère spécial). Ils n'apparaissent qu'avec un contenu malveillant réel
et une liste qui change de longueur PENDANT une édition en cours — exactement le genre de
scénario qu'une revue de PR pressée ne teste jamais à la main.

## Étapes (en friction)

1. Remplis `REVIEW.md`.
2. `npm run lab:08` : la non-régression est déjà VERTE, la revue est ROUGE sur les deux
   problèmes.
3. Corrige les deux lignes concernées (rien d'autre à changer dans ce fichier).
4. Relance : les deux suites doivent être vertes ENSEMBLE.

## Vérifier

```bash
cd 04-react/labs
npm install
npm run lab:08
npm run solution:08
```

**Ce que l'oracle vérifie**

Non-régression : afficher, éditer (fermer), supprimer un commentaire légitime continue de
marcher. Revue : un commentaire contenant un `<img onerror=...>` s'affiche comme texte
littéral — jamais comme un vrai élément `<img>` du DOM, et le gestionnaire ne s'exécute
jamais ; démarrer l'édition du deuxième commentaire puis supprimer le premier laisse l'état
d'édition attaché au BON commentaire (identifié par id), pas à la position qu'il occupait.

## Variante J+30 (fading)

Le produit ajoute un tri des commentaires par date, appliqué APRÈS le chargement initial (le
tableau `comments` change d'ordre sans qu'aucun élément ne soit ajouté ni retiré). Le
`key={comment.id}` suffit-il encore à garder l'état d'édition sur le bon commentaire dans ce
cas ? Pourquoi ?

## Application TribuZen

Même revue sur une vraie PR de `tribuzen-admin` : contenu utilisateur affiché, liste
d'éléments avec état local par ligne. Commit :
`fix(comments): rendu texte (pas de dangerouslySetInnerHTML) + key stable par id`.
