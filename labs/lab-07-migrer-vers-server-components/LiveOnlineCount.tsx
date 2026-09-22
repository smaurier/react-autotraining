// LiveOnlineCount.tsx — DONNÉ, ne se modifie pas. Le SEUL bout de cette page qui justifie
// du JS client : un compteur qu'on peut rafraîchir à la demande. Après ta migration, c'est
// le seul "use client" qui doit rester dans l'arbre de FamilySummaryPage.
"use client";
import { useState } from "react";

export function LiveOnlineCount({ familyId, initialCount }: { familyId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [enCours, setEnCours] = useState(false);

  async function handleRefresh() {
    setEnCours(true);
    try {
      const res = await fetch(`/api/families/${familyId}/online-count`);
      const data: { onlineCount: number } = await res.json();
      setCount(data.onlineCount);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <p>
      {count} en ligne{" "}
      <button type="button" onClick={handleRefresh} disabled={enCours}>
        Actualiser
      </button>
    </p>
  );
}
