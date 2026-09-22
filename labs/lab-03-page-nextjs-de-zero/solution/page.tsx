// page.tsx — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
import { MarquerLuButton } from "../MarquerLuButton";

const NESTJS_API_URL = process.env.NESTJS_API_URL ?? "http://localhost:4000";

export default async function FamillePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${NESTJS_API_URL}/families/${id}`);

  if (res.status === 404) {
    return <p>Famille introuvable.</p>;
  }

  const family: { id: string; name: string; memberCount: number } = await res.json();

  return (
    <div>
      <h1>{family.name}</h1>
      <p>{family.memberCount} membres</p>
      <MarquerLuButton familyId={id} />
    </div>
  );
}
