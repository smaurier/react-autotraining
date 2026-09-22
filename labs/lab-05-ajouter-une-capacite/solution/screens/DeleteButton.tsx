// DeleteButton.tsx — CONSOMMATEUR EXISTANT, ne se modifie pas. La modération de la famille
// l'utilise pour supprimer un post. Passe un `className` propre à cet écran — la
// non-régression vérifie qu'il survit à ta modification d'IconButton.
import { IconButton } from "../IconButton";

export function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return <IconButton icon="🗑️" label="Supprimer" onClick={onDelete} className="danger" />;
}
