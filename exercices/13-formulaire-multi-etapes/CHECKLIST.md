# Checklist — Exercice 13 : Formulaire multi-étapes

Coche chaque élément une fois valide :

- [ ] Le schema Zod couvre les 3 étapes avec un type global `WizardFormData`
- [ ] L'étape 1 valide `firstName`, `lastName`, `email`, `phone`
- [ ] L'étape 2 utilise `useFieldArray` pour gérer le tableau `addresses`
- [ ] On peut ajouter et supprimer des adresses dynamiquement
- [ ] Au moins une adresse est obligatoire (validation Zod `z.array().min(1)`)
- [ ] La barre de progression reflette l'étape courante
- [ ] Le bouton "Suivant" valide l'étape courante avec `trigger` avant d'avancer
- [ ] Le bouton "Précédent" ne perd pas les donnees déjà saisies
- [ ] L'étape 3 affiche un récapitulatif complet en lecture seule
- [ ] Le bouton "Modifier" permet de revenir à une étape précédente
- [ ] `FormProvider` enveloppe le formulaire pour partager le contexte
- [ ] Les sous-composants utilisent `useFormContext` au lieu de props
- [ ] `key={field.id}` est utilise dans le `.map()` de `useFieldArray`
- [ ] Aucun `any` n'est present dans le code
- [ ] Le code compile sans erreur TypeScript en mode strict
