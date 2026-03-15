# Checklist — Exercice 12 : Formulaire React Hook Form

Coche chaque élément une fois valide :

- [ ] Le schema Zod valide `name` (min 2, max 50 caracteres)
- [ ] Le schema Zod valide `email` (format email)
- [ ] Le schema Zod valide `password` (min 8, 1 majuscule, 1 chiffre)
- [ ] Le schema Zod valide que `confirmPassword` correspond a `password`
- [ ] Le `.refine()` utilise `path: ["confirmPassword"]` pour cibler le bon champ
- [ ] Le type `RegistrationFormData` est infere avec `z.infer`
- [ ] `useForm` utilise `zodResolver(registrationSchema)`
- [ ] Les erreurs s'affichent sous chaque champ avec `errors.field?.message`
- [ ] Le formulaire a l'attribut `noValidate` pour désactiver la validation native
- [ ] Le bouton est désactivé pendant la soumission (`isSubmitting`)
- [ ] Les champs ont des attributs `aria-invalid` pour l'accessibilité
- [ ] Aucun `any` n'est present dans le code
- [ ] Le code compile sans erreur TypeScript en mode strict
