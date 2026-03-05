# Checklist — Exercice 13 : Formulaire multi-etapes

Coche chaque element une fois valide :

- [ ] Le schema Zod couvre les 3 etapes avec un type global `WizardFormData`
- [ ] L'etape 1 valide `firstName`, `lastName`, `email`, `phone`
- [ ] L'etape 2 utilise `useFieldArray` pour gerer le tableau `addresses`
- [ ] On peut ajouter et supprimer des adresses dynamiquement
- [ ] Au moins une adresse est obligatoire (validation Zod `z.array().min(1)`)
- [ ] La barre de progression reflette l'etape courante
- [ ] Le bouton "Suivant" valide l'etape courante avec `trigger` avant d'avancer
- [ ] Le bouton "Precedent" ne perd pas les donnees deja saisies
- [ ] L'etape 3 affiche un recapitulatif complet en lecture seule
- [ ] Le bouton "Modifier" permet de revenir a une etape precedente
- [ ] `FormProvider` enveloppe le formulaire pour partager le contexte
- [ ] Les sous-composants utilisent `useFormContext` au lieu de props
- [ ] `key={field.id}` est utilise dans le `.map()` de `useFieldArray`
- [ ] Aucun `any` n'est present dans le code
- [ ] Le code compile sans erreur TypeScript en mode strict
