// PinButton.tsx — CONSOMMATEUR EXISTANT, ne se modifie pas. Le fil des posts l'utilise pour
// épingler un post.
import { IconButton } from "../IconButton";

export function PinButton({ onPin }: { onPin: () => void }) {
  return <IconButton icon="📌" label="Épingler" onClick={onPin} />;
}
