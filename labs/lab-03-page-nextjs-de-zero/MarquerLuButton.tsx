// MarquerLuButton.tsx — DONNÉ, ne se modifie pas. Le seul bout interactif de la page : tout
// le reste est un Server Component (page.tsx), ce composant est le CLIENT isolé (Next 15 :
// "use client" descend le plus bas possible dans l'arbre, jamais toute la page).
"use client";
import { useState } from "react";

export function MarquerLuButton({ familyId }: { familyId: string }) {
  const [statut, setStatut] = useState<"idle" | "envoi" | "ok" | "erreur">("idle");

  async function handleClick() {
    setStatut("envoi");
    try {
      const res = await fetch(`/api/families/${familyId}/ack`, { method: "POST" });
      setStatut(res.ok ? "ok" : "erreur");
    } catch {
      setStatut("erreur");
    }
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={statut === "envoi"}>
        {statut === "envoi" ? "Envoi…" : "Marquer comme lu"}
      </button>
      {statut === "ok" && <p role="status">Marqué comme lu.</p>}
      {statut === "erreur" && <p role="alert">Échec de l'envoi.</p>}
    </div>
  );
}
