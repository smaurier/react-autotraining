// ExampleWidget.tsx — DONNÉ, EXISTANT dans la codebase mission, RÉFÉRENCE SEULEMENT. Ne se
// modifie pas, ne s'importe pas non plus (il n'est pas utilisé par ta feature — il te montre
// juste la convention d'équipe à reproduire : Card + useApiResource, textes exacts pour les
// états de chargement/erreur, export nommé, pas d'export par défaut).
import { Card } from "./Card";
import { useApiResource } from "./useApiResource";

interface Espace {
  name: string;
}

export function ExampleWidget({ spaceId }: { spaceId: string }) {
  const state = useApiResource<Espace>(`/api/spaces/${spaceId}`);

  if (state.status === "loading") return <p>Chargement…</p>;
  if (state.status === "error") return <p>Erreur.</p>;

  return (
    <Card title="Espace">
      <p>{state.data.name}</p>
    </Card>
  );
}
