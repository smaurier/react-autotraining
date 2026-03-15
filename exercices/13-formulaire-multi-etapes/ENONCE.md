# Exercice 13 — Formulaire multi-étapes

**Module** : 05-Formulaires · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 75 minutes
**Cours** : `cours/05-formulaires/05-formulaires.md`

---

## Objectif

Créer un formulaire multi-étapes (wizard) avec React Hook Form, Zod et `useFieldArray`. Tu apprendras a découper un formulaire complexe en étapes, a valider chaque étape independamment, a gérer un tableau dynamique de champs, et a afficher une barre de progression.

---

## Consignes

### Étape 1 — Informations personnelles

1. **Champs** : `firstName`, `lastName`, `email`, `phone`.
2. **Validation Zod** : tous obligatoires, email valide, phone au format français (optionnel : regex).

### Étape 2 — Adresses

3. **Utiliser `useFieldArray`** pour gérer un tableau `addresses`.
4. **Chaque adresse** contient : `street`, `city`, `zipCode`, `country`.
5. **Boutons** : "Ajouter une adresse" et "Supprimer" pour chaque adresse.
6. **Validation** : au moins une adresse obligatoire, tous les champs de chaque adresse sont requis.

### Étape 3 — Récapitulatif et soumission

7. **Afficher** un résumé de toutes les donnees saisies (lecture seule).
8. **Bouton "Soumettre"** qui log les donnees dans la console.
9. **Bouton "Modifier"** pour revenir à une étape précédente.

### Structure globale

10. **Créer une barre de progression** :
    - Afficher les 3 étapes avec un indicateur visuel de l'étape courante.
    - Les étapes passees sont marquees comme completees.

11. **Navigation** :
    - Boutons "Précédent" et "Suivant".
    - "Suivant" valide l'étape courante avant de passer à la suivante.
    - "Précédent" ne perd pas les donnees déjà saisies.

---

## Contraintes TypeScript

- Mode `strict` active.
- Le schema Zod doit couvrir les 3 étapes avec un type global `WizardFormData`.
- `useFieldArray` doit etre type avec le bon générique.
- Les étapes doivent etre typees (ex : `type Step = 1 | 2 | 3`).
- Aucun `any` autorise.

---

## Bonus

- [ ] Persister les donnees du formulaire dans `sessionStorage` pour survivre au rechargement.
- [ ] Ajouter une animation de transition entre les étapes.
- [ ] Ajouter un `useFieldArray` pour des numéros de telephone multiples dans l'étape 1.
- [ ] Valider le code postal avec un format spécifique selon le pays selectionne.

---

## Fichiers

```
src/exercises/ex13/
  ├── schema.ts
  ├── WizardForm.tsx
  ├── steps/
  │   ├── StepPersonal.tsx
  │   ├── StepAddresses.tsx
  │   └── StepReview.tsx
  ├── components/
  │   ├── ProgressBar.tsx
  │   └── FormField.tsx
  └── App.tsx
```

---

## Criteres de reussite

| Critere                                            | Attendu |
| -------------------------------------------------- | ------- |
| Les 3 étapes s'affichent correctement              | oui     |
| La validation fonctionne à chaque étape            | oui     |
| `useFieldArray` géré le tableau d'adresses         | oui     |
| On peut ajouter/supprimer des adresses             | oui     |
| La barre de progression reflette l'étape courante  | oui     |
| Le récapitulatif affiche toutes les donnees        | oui     |
| Les donnees ne sont pas perdues en naviguant       | oui     |
| Aucun `any` dans le code                           | oui     |

---

## Ressources

- [React Hook Form — useFieldArray](https://react-hook-form.com/docs/usefieldarray)
- [React Hook Form — Wizard Form](https://react-hook-form.com/advanced-usage#WizardFormFunnel)
- [Zod — Arrays](https://zod.dev/?id=arrays)
