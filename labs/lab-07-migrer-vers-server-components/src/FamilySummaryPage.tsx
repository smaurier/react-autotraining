// FamilySummaryPage.tsx — L'EXISTANT, EN PRODUCTION (page App Router /families/[id]/summary).
// Ticket : « cette page n'a quasiment aucune interactivité qui justifie tout ce JS client —
// migre-la en Server Component, ne garde en client que ce qui en a vraiment besoin. »
//
// Le fichier MARCHE déjà : "use client", useEffect + fetch + useState pour charger le nom de
// la famille ET le nombre de membres en ligne, un écran de chargement pendant l'attente.
// Seul le compteur "en ligne" (LiveOnlineCount.tsx — DONNÉ, ne le modifie pas) justifie du JS
// client : c'est le seul bout que l'utilisateur rafraîchit à la demande.
//
// Après migration :
//
//   export default async function FamilySummaryPage({ params }: { params: Promise<{ id: string }> })
//
//   - PLUS de "use client", PLUS de useState/useEffect dans CE fichier.
//   - `await params`, fetch DIRECT de `${NESTJS_API_URL ?? "http://localhost:4000"}/families/${id}/summary`
//     (renvoie `{ name: string; onlineCount: number }`).
//   - Rend `<h1>{name}</h1>` puis `<LiveOnlineCount familyId={id} initialCount={onlineCount} />`.
//   - AUCUN écran de "Chargement…" : le Server Component ne se rend qu'une fois les données
//     là — c'est tout l'intérêt de la migration, pas une régression à combler autrement.
"use client";
import { useEffect, useState } from "react";
import { LiveOnlineCount } from "../LiveOnlineCount";

const NESTJS_API_URL = process.env.NEXT_PUBLIC_NESTJS_API_URL ?? "http://localhost:4000";

export default function FamilySummaryPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<{ name: string; onlineCount: number } | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch(`${NESTJS_API_URL}/families/${params.id}/summary`)
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) setData(json);
      });
    return () => {
      ignore = true;
    };
  }, [params.id]);

  if (!data) return <p>Chargement…</p>;

  return (
    <div>
      <h1>{data.name}</h1>
      <LiveOnlineCount familyId={params.id} initialCount={data.onlineCount} />
    </div>
  );
}
