// RefreshButton.tsx — CONSOMMATEUR EXISTANT, ne se modifie pas. L'admin l'utilise pour
// rafraîchir une liste.
import { IconButton } from "../IconButton";

export function RefreshButton({ onRefresh }: { onRefresh: () => void }) {
  return <IconButton icon="🔄" label="Rafraîchir" onClick={onRefresh} />;
}
