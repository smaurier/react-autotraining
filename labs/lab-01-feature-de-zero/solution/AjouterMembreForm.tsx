// AjouterMembreForm.tsx — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
import { useState } from "react";
import { createMember, type CreateMemberInput, type Member } from "../api";

export interface AjouterMembreFormProps {
  familyId: string;
  onSuccess?: (member: Member) => void;
}

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AjouterMembreForm({ familyId, onSuccess }: AjouterMembreFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CreateMemberInput["role"] | "">("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setSucces(false);

    // Validation côté client : aucun appel réseau si l'email est manifestement invalide.
    if (!EMAIL_VALIDE.test(email)) {
      setValidationError("Cet email n'a pas l'air valide.");
      return;
    }
    if (!role) {
      setValidationError("Choisis un rôle.");
      return;
    }
    setValidationError(null);

    setEnCours(true);
    try {
      const member = await createMember(familyId, { email, role });
      setSucces(true);
      setEmail("");
      setRole("");
      onSuccess?.(member);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="membre-email">Email</label>
        <input
          id="membre-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={enCours}
        />
      </div>
      <div>
        <label htmlFor="membre-role">Rôle</label>
        <select
          id="membre-role"
          value={role}
          onChange={(e) => setRole(e.target.value as CreateMemberInput["role"])}
          disabled={enCours}
        >
          <option value="">— choisir —</option>
          <option value="admin">admin</option>
          <option value="parent">parent</option>
          <option value="enfant">enfant</option>
        </select>
      </div>

      {validationError && <p role="alert">{validationError}</p>}
      {serverError && <p role="alert">{serverError}</p>}
      {succes && <p role="status">Membre ajouté.</p>}

      <button type="submit" disabled={enCours}>
        {enCours ? "Ajout en cours…" : "Ajouter le membre"}
      </button>
    </form>
  );
}
