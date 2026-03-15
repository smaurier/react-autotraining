# Exercice 12 — Formulaire React Hook Form

**Module** : 05-Formulaires · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 minutes
**Cours** : `cours/05-formulaires/05-formulaires.md`

---

## Objectif

Créer un formulaire d'inscription complet avec React Hook Form et Zod pour la validation. Tu apprendras à utiliser `useForm`, a définir un schema de validation avec Zod, a afficher les erreurs et a gérer la soumission.

---

## Consignes

1. **Installer les dépendances** :
   ```bash
   npm install react-hook-form zod @hookform/resolvers
   ```

2. **Créer le schema Zod** dans `src/exercises/ex12/schema.ts` :
   ```ts
   // Le schema doit valider :
   // - name : string, min 2 caracteres, max 50
   // - email : string, format email valide
   // - password : string, min 8 caracteres, au moins 1 majuscule, 1 chiffre
   // - confirmPassword : string, doit correspondre a password
   ```
   - Utiliser `.refine()` ou `.superRefine()` pour la vérification du mot de passe.
   - Exporter le type `RegistrationFormData` infere avec `z.infer<typeof schema>`.

3. **Créer le composant** `src/exercises/ex12/RegistrationForm.tsx` :
   - Utiliser `useForm<RegistrationFormData>` avec le resolver Zod.
   - Créer un champ pour chaque propriété du schema.
   - Afficher les erreurs sous chaque champ avec `errors.fieldName?.message`.
   - Desactiver le bouton de soumission pendant le traitement (`isSubmitting`).
   - Au submit, afficher les donnees dans la console (simuler un envoi API).

4. **Créer le composant** `src/exercises/ex12/FormField.tsx` (optionnel mais recommande) :
   - Composant réutilisable pour un champ de formulaire avec label et message d'erreur.
   - Accepter les props : `label`, `error`, `children`.

5. **Créer le fichier** `src/exercises/ex12/App.tsx`.

---

## Contraintes TypeScript

- Mode `strict` active.
- Le type du formulaire doit etre infere depuis le schema Zod (`z.infer`).
- `useForm` doit utiliser le générique `RegistrationFormData`.
- Les `register` doivent etre types automatiquement par RHF.
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter un indicateur de force du mot de passe (faible/moyen/fort).
- [ ] Afficher un message de succes après la soumission.
- [ ] Ajouter un champ "Conditions d'utilisation" (checkbox obligatoire).
- [ ] Utiliser `Controller` pour un champ custom (ex : select avec react-select).

---

## Fichiers

```
src/exercises/ex12/
  ├── schema.ts
  ├── RegistrationForm.tsx
  ├── FormField.tsx (optionnel)
  └── App.tsx
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| Le schema Zod valide tous les champs             | oui     |
| `confirmPassword` doit correspondre a `password` | oui     |
| Les erreurs s'affichent sous chaque champ        | oui     |
| Le formulaire ne se soumet pas si invalide       | oui     |
| Le bouton est désactivé pendant la soumission    | oui     |
| Le type est infere depuis le schema Zod          | oui     |
| Aucun `any` dans le code                         | oui     |

---

## Ressources

- [React Hook Form — Get Started](https://react-hook-form.com/get-started)
- [React Hook Form — useForm](https://react-hook-form.com/docs/useform)
- [Zod — Documentation](https://zod.dev/)
- [hookform/resolvers — Zod](https://github.com/react-hook-form/resolvers#zod)
