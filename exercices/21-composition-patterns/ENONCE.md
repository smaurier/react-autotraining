# Exercice 21 — Composition patterns

**Module** : 08-Performance & Patterns · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 minutes
**Cours** : `cours/08-performance-patterns/03-patterns-avances.md`

---

## Objectif

Construire un composant `Tabs` (onglets) en utilisant le pattern **Compound Components**. Ce composant est headless (sans styles imposes) et utilise Context internalement pour partager l'état entre les sous-composants.

Le pattern Compound Components permet de créer des APIs declaratives ou les composants enfants communiquent implicitement avec leur parent, comme `<select>` et `<option>` en HTML natif.

---

## Consignes

1. **Créer le composant compose** avec les sous-composants suivants :
   - `<Tabs>` : conteneur principal, géré l'état de l'onglet actif.
   - `<Tabs.List>` : conteneur de la barre d'onglets (role `tablist`).
   - `<Tabs.Tab>` : un onglet cliquable (role `tab`).
   - `<Tabs.Panel>` : le contenu associe à un onglet (role `tabpanel`).

2. **Utiliser Context** pour partager l'état :
   - `TabsContext` : contient `activeTab`, `setActiveTab`.
   - Le contexte est interne — l'utilisateur du composant n'a pas besoin de le connaître.

3. **API declarative** — l'utilisation doit ressembler a :
   ```tsx
   <Tabs defaultTab="tab1">
     <Tabs.List>
       <Tabs.Tab id="tab1">Onglet 1</Tabs.Tab>
       <Tabs.Tab id="tab2">Onglet 2</Tabs.Tab>
       <Tabs.Tab id="tab3">Onglet 3</Tabs.Tab>
     </Tabs.List>
     <Tabs.Panel tabId="tab1">Contenu 1</Tabs.Panel>
     <Tabs.Panel tabId="tab2">Contenu 2</Tabs.Panel>
     <Tabs.Panel tabId="tab3">Contenu 3</Tabs.Panel>
   </Tabs>
   ```

4. **Headless** : aucun style impose. Les composants rendent des éléments HTML simples avec les bons attributs ARIA.

5. **Accessibilité** :
   - `role="tablist"`, `role="tab"`, `role="tabpanel"`.
   - `aria-selected` sur l'onglet actif.
   - `aria-controls` lie l'onglet au panel.
   - `aria-labelledby` lie le panel a l'onglet.
   - Navigation clavier : fleches gauche/droite pour changer d'onglet.

6. **Créer une page de demo** `src/app/tabs-demo/page.tsx` avec 2 instances du composant `<Tabs>` utilisant des styles différents.

---

## Contraintes TypeScript

- Mode `strict` active.
- Typer les props de chaque sous-composant avec des interfaces.
- Le Context doit etre type (pas de valeur par defaut `null` sans check).
- Utiliser un custom hook `useTabsContext()` avec une erreur explicite si utilise hors du provider.
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter le support du mode "controlled" (`activeTab` + `onChange` en props).
- [ ] Ajouter une transition/animation lors du changement d'onglet.
- [ ] Supporter l'orientation verticale (`orientation="vertical"`).
- [ ] Ajouter un composant `<Tabs.Indicator>` pour une barre animee sous l'onglet actif.

---

## Fichiers

```
src/
  components/
    Tabs/
      index.ts
      Tabs.tsx
      TabList.tsx
      Tab.tsx
      TabPanel.tsx
      TabsContext.tsx
  app/
    tabs-demo/
      page.tsx
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| L'API est declarative (Compound Components)      | oui     |
| Le Context est interne et non expose             | oui     |
| Les roles ARIA sont corrects                     | oui     |
| La navigation clavier fonctionne                 | oui     |
| Le composant est headless (pas de styles)        | oui     |
| 2 instances independantes fonctionnent sur la même page | oui |
| Le code compile sans erreur TypeScript           | oui     |

---

## Ressources

- [React — Context](https://react.dev/reference/react/createContext)
- [WAI-ARIA — Tabs Pattern](https://www.w3.org/WAI/ARIA/apd/patterns/tabs/)
- [Kent C. Dodds — Compound Components](https://kentcdodds.com/blog/compound-components-with-react-hooks)
