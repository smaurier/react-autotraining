# Review — `src/CommentList.tsx`

À remplir AVANT de lancer l'oracle, en lisant `src/CommentList.tsx` (rien d'autre). Le
correcteur lit ce fichier avant ton code.

1. **`dangerouslySetInnerHTML={{ __html: comment.content }}`** — `comment.content` vient
   d'un utilisateur (un commentaire posté sur TribuZen). Que se passe-t-il si son contenu
   est `<img src=x onerror="...">` ? Ce problème a un nom précis en sécurité web — lequel ?

2. **`<CommentRow key={index} ...>`** — chaque `CommentRow` a son propre état local
   (`isEditing`, `editText`). Décris, étape par étape, ce qui se passe pour l'état
   d'édition en cours si on SUPPRIME le tout premier commentaire de la liste pendant qu'on
   est en train d'éditer le DEUXIÈME. (Indice : à quoi `key` sert-elle vraiment pour React —
   identifier une POSITION, ou une IDENTITÉ ?)

3. Pour chacun des deux problèmes, quelle est la correction minimale ?
