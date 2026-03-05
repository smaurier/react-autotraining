# Cours 14 — Context API : partager du state sans prop drilling

> **Objectif** : Maîtriser `createContext` et `useContext` pour partager de l'état à travers l'arbre de composants sans passer par les props. Comprendre les cas d'usage légitimes du Context (thème, auth, locale) et ses limites pour les mises à jour fréquentes. Comparer avec `provide/inject` (Vue 3) et l'injection de dépendances Angular.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre useEffect avec un tableau vide et useEffect avec des dépendances ?</summary>

`useEffect(() => {}, [])` s'exécute une seule fois après le premier rendu (comme `onMounted` en Vue). `useEffect(() => {}, [dep])` se ré-exécute à chaque changement de `dep`.
</details>

<details>
<summary>2. Pourquoi faut-il retourner une fonction de nettoyage dans useEffect ?</summary>

Pour éviter les fuites mémoire : la fonction de cleanup est appelée avant chaque ré-exécution de l'effet et au démontage du composant. C'est l'équivalent du `onUnmounted` de Vue ou du `ngOnDestroy` Angular.
</details>

<details>
<summary>3. Qu'est-ce que le « prop drilling » et pourquoi est-ce problématique ?</summary>

Le prop drilling consiste à passer une prop à travers plusieurs niveaux de composants intermédiaires qui n'en ont pas besoin eux-mêmes. Cela rend le code fragile, verbeux et difficile à refactorer.
</details>

---

## Analogie

Imaginez un **réseau Wi-Fi dans un immeuble**. Sans Wi-Fi, pour transmettre un message du rez-de-chaussée au 5e étage, il faudrait le passer de voisin en voisin à chaque étage (prop drilling). Avec le Wi-Fi (Context), n'importe quel appartement peut capter le signal directement, sans déranger les étages intermédiaires. Mais attention : si tout le monde streame en 4K en même temps, le réseau sature (re-renders excessifs).

---

## Théorie

### Le problème du prop drilling

```tsx
// ❌ Prop drilling : theme passe par 3 niveaux sans être utilisé par les intermédiaires
function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  return <Layout theme={theme} setTheme={setTheme} />;
}

function Layout({ theme, setTheme }: { theme: string; setTheme: (t: 'light' | 'dark') => void }) {
  return <Sidebar theme={theme} setTheme={setTheme} />;
}

function Sidebar({ theme, setTheme }: { theme: string; setTheme: (t: 'light' | 'dark') => void }) {
  return <ThemeToggle theme={theme} setTheme={setTheme} />;
}
```

### Créer et fournir un Context

```tsx
// ✅ Étape 1 : Créer le Context avec un type strict
import { createContext, useContext, useState, type ReactNode } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// La valeur par défaut est utilisée UNIQUEMENT si aucun Provider n'est trouvé
const ThemeContext = createContext<ThemeContextType | null>(null);

// ✅ Étape 2 : Créer le Provider
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ✅ Étape 3 : Hook personnalisé pour consommer le Context
function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme doit être utilisé dans un <ThemeProvider>');
  }
  return context;
}
```

### Consommer le Context

```tsx
// ✅ N'importe quel composant enfant peut accéder au thème directement
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      Thème actuel : {theme}
    </button>
  );
}

// ✅ Monter le Provider au niveau approprié
function App() {
  return (
    <ThemeProvider>
      <Layout />
    </ThemeProvider>
  );
}

function Layout() {
  return <Sidebar />;  // Plus besoin de passer le thème !
}

function Sidebar() {
  return <ThemeToggle />;  // Accès direct via useTheme()
}
```

### Cas d'usage légitimes du Context

| Cas d'usage | Fréquence de mise à jour | Adapté au Context ? |
|-------------|--------------------------|---------------------|
| Thème (light/dark) | Rare | ✅ Oui |
| Utilisateur authentifié | Rare | ✅ Oui |
| Locale / langue | Rare | ✅ Oui |
| Configuration de l'app | Quasi jamais | ✅ Oui |
| Compteur qui change souvent | Fréquente | ❌ Non |
| Position de la souris | Très fréquente | ❌ Non |
| État d'un formulaire complexe | Fréquente | ❌ Non |

### Le problème des re-renders avec Context

```tsx
// ❌ Tous les consommateurs re-rendent quand n'importe quelle valeur change
const AppContext = createContext<{
  theme: string;
  user: User;
  locale: string;
} | null>(null);

// Si seul `locale` change, les composants qui lisent `theme` re-rendent aussi !
```

```tsx
// ✅ Séparer les Contexts par domaine
const ThemeContext = createContext<ThemeContextType | null>(null);
const AuthContext = createContext<AuthContextType | null>(null);
const LocaleContext = createContext<LocaleContextType | null>(null);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LocaleProvider>
          <MainApp />
        </LocaleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

### Pattern avancé : Context + useReducer

Pour un état plus complexe, combinez Context avec `useReducer` :

```tsx
interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { user: action.payload, isLoading: false, error: null };
    case 'LOGIN_ERROR':
      return { user: null, isLoading: false, error: action.payload };
    case 'LOGOUT':
      return { user: null, isLoading: false, error: null };
  }
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isLoading: false,
    error: null,
  });

  const login = async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const user = await apiLogin(email, password);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch (err) {
      dispatch({ type: 'LOGIN_ERROR', payload: (err as Error).message });
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout: () => dispatch({ type: 'LOGOUT' }) }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Comparaison avec Vue 3 et Angular

| Concept | React | Vue 3 | Angular |
|---------|-------|-------|---------|
| Partage de données | `createContext` + `Provider` | `provide()` / `inject()` | `@Injectable` + DI |
| Consommation | `useContext(MyCtx)` | `inject('key')` | `inject(MyService)` |
| Scope | Arbre de composants sous le Provider | Arbre sous le composant qui `provide` | Hiérarchie d'injecteurs |
| Réactivité automatique | Re-render du sous-arbre | Oui (avec ref/reactive) | Oui (avec Signals) |
| Typage strict | Oui (avec generics) | Oui (avec `InjectionKey<T>`) | Oui (natif) |

```vue
<!-- Vue 3 — équivalent avec provide/inject -->
<script setup>
import { provide, ref } from 'vue'

const theme = ref('light')
const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}
provide('theme', { theme, toggleTheme })
</script>
```

```typescript
// Angular — équivalent avec un service injectable
@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<'light' | 'dark'>('light');

  toggleTheme() {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }
}
```

---

## Pratique

Créez un système de gestion de langue (i18n simplifié) avec Context :

1. Créez un `LocaleContext` avec les langues `'fr'` | `'en'`
2. Créez un `LocaleProvider` qui stocke la langue courante
3. Créez un hook `useLocale()` avec vérification du Provider
4. Créez un composant `LanguageSwitcher` qui permet de changer la langue
5. Créez un composant `Greeting` qui affiche un message selon la langue

<details>
<summary>Solution</summary>

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

// Types
type Locale = 'fr' | 'en';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const translations: Record<Locale, Record<string, string>> = {
  fr: { greeting: 'Bonjour le monde !', switch: 'Changer de langue' },
  en: { greeting: 'Hello world!', switch: 'Switch language' },
};

// Context
const LocaleContext = createContext<LocaleContextType | null>(null);

function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale doit être utilisé dans un <LocaleProvider>');
  }
  return context;
}

// Provider
function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('fr');

  const t = (key: string): string => translations[locale][key] ?? key;

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

// Composants consommateurs
function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <button onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}>
      {t('switch')} ({locale.toUpperCase()})
    </button>
  );
}

function Greeting() {
  const { t } = useLocale();
  return <h1>{t('greeting')}</h1>;
}

// App
function App() {
  return (
    <LocaleProvider>
      <Greeting />
      <LanguageSwitcher />
    </LocaleProvider>
  );
}
```
</details>

---

## Résumé

| Point clé | À retenir |
|-----------|-----------|
| `createContext` | Crée un canal de données accessible dans tout le sous-arbre |
| `Provider` | Fournit la valeur à tous les descendants |
| `useContext` | Consomme la valeur la plus proche dans l'arbre |
| Hook personnalisé | Toujours encapsuler `useContext` avec vérification du Provider |
| Re-renders | Tous les consommateurs re-rendent quand la valeur change |
| Séparer les Contexts | Un Context par domaine (theme, auth, locale) |
| Context + useReducer | Pour les états complexes avec plusieurs actions |
| Quand utiliser | Données qui changent rarement (thème, auth, locale) |

---

> **Prochain cours** : [Cours 15 — Zustand : state management simple et performant](./02-zustand.md)
