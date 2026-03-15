# Cours 19 — Paramètres de route et loaders

> **Objectif** : Maîtriser les paramètres de route dynamiques (`:id`) avec `useParams`, les paramètres de recherche avec `useSearchParams`, et les loaders pour charger les données avant le rendu. Comprendre les error boundaries par route.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre Link et NavLink dans React Router ?</summary>

`Link` génère un simple lien sans état visuel. `NavLink` expose une propriété `isActive` (via une fonction dans `className` ou `style`) qui permet de styliser le lien quand la route correspondante est active.
</details>

<details>
<summary>2. À quoi sert le composant Outlet ?</summary>

`Outlet` est le placeholder ou React Router affiche le composant enfant correspondant à la route courante. C'est l'équivalent de `<RouterView>` en Vue et `<router-outlet>` en Angular.
</details>

<details>
<summary>3. Comment naviguer programmatiquement vers une autre page ?</summary>

Avec le hook `useNavigate()` : `const navigate = useNavigate(); navigate('/dashboard');`. On peut aussi utiliser `navigate(-1)` pour revenir en arrière ou `{ replace: true }` pour remplacer l'entrée dans l'historique.
</details>

---

## Analogie

Imaginez un **système de billetterie**. Quand vous demandez le billet n 4512 (route `/tickets/4512`), le guichetier (le router) note le numéro (`:id` = 4512) puis va chercher les informations dans le système (le **loader**) **avant** de vous les présenter. Il ne vous montre pas un guichet vide en disant « attendez, je cherche » — il prépare tout avant de vous appeler (chargement avant le rendu). Les paramètres de recherche (`?status=open&page=2`) sont comme les filtres que vous ajoutez : « je veux les billets ouverts, page 2 ».

---

## Théorie

### Paramètres de route dynamiques

```tsx
// Configuration de la route avec :id
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { path: 'products', element: <ProductList /> },
      { path: 'products/:id', element: <ProductDetail /> },
      { path: 'users/:userId/posts/:postId', element: <UserPost /> },
    ],
  },
]);
```

### useParams — lire les paramètres d'URL

```tsx
import { useParams } from 'react-router';

function ProductDetail() {
  // ✅ useParams retourne un objet avec les paramètres de la route
  const { id } = useParams<{ id: string }>();
  // Attention : id est toujours une string ! Il faut parser si besoin.

  return <h1>Produit n {id}</h1>;
}

// ✅ Plusieurs paramètres
function UserPost() {
  const { userId, postId } = useParams<{ userId: string; postId: string }>();
  return <p>Post {postId} de l'utilisateur {userId}</p>;
}
```

> **Piège courant** : `useParams` retourne toujours des `string | undefined`. Pensez à convertir (`Number(id)`) et à vérifier que le paramètre existe.

```tsx
// ✅ Pattern robuste avec validation
function ProductDetail() {
  const { id } = useParams<{ id: string }>();

  if (!id || isNaN(Number(id))) {
    return <p>ID de produit invalide</p>;
  }

  const productId = Number(id);
  // ... utiliser productId (number)
}
```

### useParams + TanStack Query

```tsx
// ✅ Pattern recommandé : useParams + useQuery
function ProductDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['products', id],
    queryFn: () => fetchProduct(Number(id)),
    enabled: !!id,
  });

  if (isLoading) return <p>Chargement...</p>;
  if (isError) return <p>Produit introuvable</p>;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.price} EUR</p>
    </div>
  );
}
```

### useSearchParams — paramètres de recherche

Les search params (`?query=react&page=2`) sont l'équivalent des query params dans tous les frameworks :

```tsx
import { useSearchParams } from 'react-router';

function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Lire les paramètres
  const query = searchParams.get('query') ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const category = searchParams.get('category');

  // ✅ Mettre à jour les paramètres (remplace l'URL)
  const handleSearch = (newQuery: string) => {
    setSearchParams({ query: newQuery, page: '1' });
  };

  // ✅ Ajouter/modifier un paramètre sans perdre les autres
  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      prev.set('page', String(newPage));
      return prev;
    });
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Rechercher..."
      />
      <p>Page {page}</p>
      <button onClick={() => handlePageChange(page + 1)}>
        Page suivante
      </button>
    </div>
  );
}
```

### useSearchParams + TanStack Query

```tsx
// ✅ Les search params servent de queryKey pour TanStack Query
function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('query') ?? '';
  const page = Number(searchParams.get('page') ?? '1');

  const { data, isLoading } = useQuery({
    queryKey: ['products', { query, page }],
    queryFn: () => fetchProducts({ query, page }),
  });

  // Les données sont automatiquement re-fetchées quand l'URL change !
  return (/* ... */);
}
```

### Loaders — charger les données AVANT le rendu

Les loaders sont une fonctionnalité puissante de React Router v7 : ils chargent les données **avant** que le composant ne s'affiche.

```tsx
import { useLoaderData, type LoaderFunctionArgs } from 'react-router';

// ✅ Le loader s'exécute AVANT le rendu du composant
async function productLoader({ params }: LoaderFunctionArgs) {
  const response = await fetch(`/api/products/${params.id}`);
  if (!response.ok) {
    throw new Response('Produit introuvable', { status: 404 });
  }
  return response.json();
}

function ProductDetail() {
  // ✅ Les données sont déjà disponibles, pas de loading state !
  const product = useLoaderData() as Product;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.price} EUR</p>
    </div>
  );
}

// Configuration
const router = createBrowserRouter([
  {
    path: 'products/:id',
    element: <ProductDetail />,
    loader: productLoader,
    errorElement: <ProductError />,
  },
]);
```

### Loader vs useQuery : quand utiliser lequel ?

| Critère | Loader | useQuery (TanStack Query) |
|---------|--------|---------------------------|
| Moment du fetch | Avant le rendu | Après le montage |
| Loading state | Géré par React Router (pending UI) | Géré dans le composant |
| Cache | Pas de cache natif | ✅ Cache intelligent |
| Refetch automatique | Non | ✅ staleTime, refetchOnFocus |
| Waterfall | ✅ Évité (données prêtes) | Possible si fetch en cascade |
| Simplicité | Plus simple pour les cas basiques | Plus puissant pour le cache |

> **Conseil pragmatique** : pour une app classique, combiner les deux est courant. Le loader peut fournir les données initiales, et TanStack Query gère le cache et les mises à jour.

### Loader avec paramètres de recherche

```tsx
async function productListLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') ?? '';
  const page = url.searchParams.get('page') ?? '1';

  const response = await fetch(`/api/products?query=${query}&page=${page}`);
  if (!response.ok) throw new Response('Erreur', { status: 500 });
  return response.json();
}
```

### Error boundaries par route

Chaque route peut avoir son propre `errorElement` :

```tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <GlobalError />,  // Erreur globale (fallback)
    children: [
      { index: true, element: <Home /> },
      {
        path: 'products/:id',
        element: <ProductDetail />,
        loader: productLoader,
        errorElement: <ProductError />,  // ✅ Erreur spécifique aux produits
      },
      {
        path: 'users/:id',
        element: <UserProfile />,
        loader: userLoader,
        errorElement: <UserError />,    // ✅ Erreur spécifique aux utilisateurs
      },
    ],
  },
]);
```

```tsx
import { useRouteError, isRouteErrorResponse, Link } from 'react-router';

function ProductError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div>
        <h2>Produit introuvable</h2>
        <p>Le produit demandé n'existe pas ou a été supprimé.</p>
        <Link to="/products">Retour à la liste</Link>
      </div>
    );
  }

  return (
    <div>
      <h2>Erreur lors du chargement du produit</h2>
      <Link to="/products">Retour à la liste</Link>
    </div>
  );
}
```

### Comparaison des paramètres avec Vue et Angular

| Concept | React Router | Vue Router | Angular Router |
|---------|-------------|------------|----------------|
| Param de route | `useParams()` | `useRoute().params` | `inject(ActivatedRoute).params` |
| Search params | `useSearchParams()` | `useRoute().query` | `inject(ActivatedRoute).queryParams` |
| Loader | `loader` function | Navigation guards + fetch | `resolve` guard |
| Type des params | Toujours `string` | Toujours `string` | Toujours `string` |

---

## Pratique

Créez une page de liste de produits avec recherche et pagination via les search params, et une page de détail avec un paramètre `:id` :

1. `/products?query=clavier&page=1` — Liste filtrée avec pagination
2. `/products/:id` — Détail avec loader
3. Un lien dans la liste qui mène au détail
4. Un error boundary si le produit n'existe pas

<details>
<summary>Solution</summary>

```tsx
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Link,
  useParams,
  useSearchParams,
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
  type LoaderFunctionArgs,
} from 'react-router';

interface Product {
  id: number;
  name: string;
  price: number;
}

const fakeProducts: Product[] = [
  { id: 1, name: 'Clavier mécanique', price: 89.99 },
  { id: 2, name: 'Souris ergonomique', price: 59.99 },
  { id: 3, name: 'Clavier compact', price: 69.99 },
  { id: 4, name: 'Écran 27 pouces', price: 349.99 },
];

// Loader
async function productDetailLoader({ params }: LoaderFunctionArgs) {
  const product = fakeProducts.find((p) => p.id === Number(params.id));
  if (!product) {
    throw new Response('Produit introuvable', { status: 404 });
  }
  return product;
}

// Pages
function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('query') ?? '';
  const page = Number(searchParams.get('page') ?? '1');

  const filtered = fakeProducts.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <h1>Produits (page {page})</h1>
      <input
        value={query}
        onChange={(e) => setSearchParams({ query: e.target.value, page: '1' })}
        placeholder="Rechercher..."
      />
      <ul>
        {filtered.map((p) => (
          <li key={p.id}>
            <Link to={`/products/${p.id}`}>{p.name}</Link> — {p.price} EUR
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          setSearchParams((prev) => { prev.set('page', String(page + 1)); return prev; })
        }
      >
        Page suivante
      </button>
    </div>
  );
}

function ProductDetail() {
  const product = useLoaderData() as Product;
  return (
    <div>
      <h1>{product.name}</h1>
      <p>Prix : {product.price} EUR</p>
      <Link to="/products">Retour à la liste</Link>
    </div>
  );
}

function ProductError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div>
        <h2>Produit introuvable</h2>
        <Link to="/products">Retour à la liste</Link>
      </div>
    );
  }
  return <h2>Erreur inattendue</h2>;
}

// Router
const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      { path: 'products', element: <ProductList /> },
      {
        path: 'products/:id',
        element: <ProductDetail />,
        loader: productDetailLoader,
        errorElement: <ProductError />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```
</details>

---

## Résumé

| Point clé | À retenir |
|-----------|-----------|
| `useParams` | Lit les paramètres dynamiques (`:id`) — toujours `string` |
| `useSearchParams` | Lit/modifie les query params (`?query=...&page=...`) |
| Loaders | Chargent les données **avant** le rendu du composant |
| `useLoaderData` | Récupère les données retournées par le loader |
| `throw new Response()` | Dans un loader, déclenche l'`errorElement` de la route |
| Error boundaries | Chaque route peut avoir son propre `errorElement` |
| Loader vs useQuery | Loader = données initiales, useQuery = cache et refetch |

---

> **Prochain cours** : [Cours 20 — Protection des routes et lazy loading](./03-protection-et-lazy.md)
