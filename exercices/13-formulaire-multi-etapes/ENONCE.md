# Exercice 13 — Formulaire multi-etapes

**Module** : 05-Formulaires · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 75 minutes
**Cours** : `cours/05-formulaires/05-formulaires.md`

---

## Objectif

Creer un formulaire multi-etapes (wizard) avec React Hook Form, Zod et `useFieldArray`. Tu apprendras a decouper un formulaire complexe en etapes, a valider chaque etape independamment, a gerer un tableau dynamique de champs, et a afficher une barre de progression.

---

## Consignes

### Etape 1 — Informations personnelles

1. **Champs** : `firstName`, `lastName`, `email`, `phone`.
2. **Validation Zod** : tous obligatoires, email valide, phone au format francais (optionnel : regex).

### Etape 2 — Adresses

3. **Utiliser `useFieldArray`** pour gerer un tableau `addresses`.
4. **Chaque adresse** contient : `street`, `city`, `zipCode`, `country`.
5. **Boutons** : "Ajouter une adresse" et "Supprimer" pour chaque adresse.
6. **Validation** : au moins une adresse obligatoire, tous les champs de chaque adresse sont requis.

### Etape 3 — Recapitulatif et soumission

7. **Afficher** un resume de toutes les donnees saisies (lecture seule).
8. **Bouton "Soumettre"** qui log les donnees dans la console.
9. **Bouton "Modifier"** pour revenir a une etape precedente.

### Structure globale

10. **Creer une barre de progression** :
    - Afficher les 3 etapes avec un indicateur visuel de l'etape courante.
    - Les etapes passees sont marquees comme completees.

11. **Navigation** :
    - Boutons "Precedent" et "Suivant".
    - "Suivant" valide l'etape courante avant de passer a la suivante.
    - "Precedent" ne perd pas les donnees deja saisies.

---

## Contraintes TypeScript

- Mode `strict` active.
- Le schema Zod doit couvrir les 3 etapes avec un type global `WizardFormData`.
- `useFieldArray` doit etre type avec le bon generique.
- Les etapes doivent etre typees (ex : `type Step = 1 | 2 | 3`).
- Aucun `any` autorise.

---

## Bonus

- [ ] Persister les donnees du formulaire dans `sessionStorage` pour survivre au rechargement.
- [ ] Ajouter une animation de transition entre les etapes.
- [ ] Ajouter un `useFieldArray` pour des numeros de telephone multiples dans l'etape 1.
- [ ] Valider le code postal avec un format specifique selon le pays selectionne.

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
| Les 3 etapes s'affichent correctement              | oui     |
| La validation fonctionne a chaque etape            | oui     |
| `useFieldArray` gere le tableau d'adresses         | oui     |
| On peut ajouter/supprimer des adresses             | oui     |
| La barre de progression reflette l'etape courante  | oui     |
| Le recapitulatif affiche toutes les donnees        | oui     |
| Les donnees ne sont pas perdues en naviguant       | oui     |
| Aucun `any` dans le code                           | oui     |

---

## Ressources

- [React Hook Form — useFieldArray](https://react-hook-form.com/docs/usefieldarray)
- [React Hook Form — Wizard Form](https://react-hook-form.com/advanced-usage#WizardFormFunnel)
- [Zod — Arrays](https://zod.dev/?id=arrays)
