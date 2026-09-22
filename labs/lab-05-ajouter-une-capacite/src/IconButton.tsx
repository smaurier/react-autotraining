// IconButton.tsx — L'EXISTANT, EN PRODUCTION. Consommé par trois écrans (src/screens/) que
// tu ne dois PAS modifier. Ticket : « on doit pouvoir désactiver le bouton et montrer qu'une
// action est en cours (suppression, envoi…) — sans casser les écrans qui l'utilisent déjà. »
// Ajoute une prop `loading?: boolean` : voir test/loading.test.tsx pour le contrat exact.
// AVANT de toucher au code, remplis FINDINGS.md à la racine de ce lab.
import type { ReactNode } from "react";

export interface IconButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

export function IconButton({ icon, label, onClick, className }: IconButtonProps) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={className}>
      {icon}
    </button>
  );
}
