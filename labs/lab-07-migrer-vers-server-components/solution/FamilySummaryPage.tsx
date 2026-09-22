// FamilySummaryPage.tsx — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
import { LiveOnlineCount } from "../LiveOnlineCount";

const NESTJS_API_URL = process.env.NEXT_PUBLIC_NESTJS_API_URL ?? "http://localhost:4000";

export default async function FamilySummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${NESTJS_API_URL}/families/${id}/summary`);
  const data: { name: string; onlineCount: number } = await res.json();

  return (
    <div>
      <h1>{data.name}</h1>
      <LiveOnlineCount familyId={id} initialCount={data.onlineCount} />
    </div>
  );
}
