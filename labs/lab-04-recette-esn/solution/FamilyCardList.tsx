// FamilyCardList.tsx — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
import { Card } from "../Card";
import { useApiResource } from "../useApiResource";

export interface Member {
  id: string;
  email: string;
}

export function FamilyCardList({ familyId }: { familyId: string }) {
  const state = useApiResource<Member[]>(`/api/families/${familyId}/members`);

  if (state.status === "loading") return <p>Chargement…</p>;
  if (state.status === "error") return <p>Erreur.</p>;

  return (
    <Card title="Membres">
      <ul>
        {state.data.map((member) => (
          <li key={member.id}>{member.email}</li>
        ))}
      </ul>
    </Card>
  );
}
