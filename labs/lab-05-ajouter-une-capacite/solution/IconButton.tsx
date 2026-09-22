// IconButton.tsx — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
import type { ReactNode } from "react";

export interface IconButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
  loading?: boolean;
}

export function IconButton({ icon, label, onClick, className, loading = false }: IconButtonProps) {
  function handleClick() {
    // Double rempart : l'attribut `disabled` HTML ET une garde JS — un clic programmatique
    // (dispatchEvent) ou un lecteur d'écran qui active quand même un élément désactivé ne
    // doit JAMAIS redéclencher l'action pendant qu'une autre est en cours.
    if (loading) return;
    onClick();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        aria-busy={loading || undefined}
        disabled={loading}
        className={className}
      >
        {icon}
      </button>
      {loading && <span role="status">Chargement…</span>}
    </>
  );
}
