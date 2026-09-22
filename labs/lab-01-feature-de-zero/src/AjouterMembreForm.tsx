// AjouterMembreForm.tsx — PAGE BLANCHE. Le formulaire "ajouter un membre" de TribuZen, en
// vrai : écran, état, appel API typé, validation, accessibilité — pas un exercice isolé.
//
// Props attendues :
//
//   AjouterMembreForm({ familyId, onSuccess })
//     familyId: string — la famille à laquelle rattacher le nouveau membre.
//     onSuccess?: (member: Member) => void — appelé après un ajout réussi.
//
// Comportement attendu :
//
//   - Un champ email (label "Email") et un champ rôle (label "Rôle", <select> avec les
//     options "admin", "parent", "enfant" — voir Member["role"] dans ./api.ts), tous deux
//     associés à leur label par un vrai `<label htmlFor>` ou un wrapping <label> (les tests
//     interrogent le DOM par label, jamais par un attribut de test).
//   - Un bouton de soumission, texte "Ajouter le membre".
//   - Validation CÔTÉ CLIENT avant tout appel réseau : un email qui ne contient pas "@" et
//     un "." après doit produire un message d'erreur visible (role="alert") et NE DOIT PAS
//     déclencher d'appel à createMember. Piège : un <input type="email"> déclenche la
//     validation NATIVE du navigateur, qui bloque le submit AVANT que ton onSubmit ne soit
//     appelé — mets `noValidate` sur le <form> pour garder la main sur la validation.
//   - Pendant l'appel réseau : le bouton est désactivé et affiche "Ajout en cours…".
//   - En cas de succès : appelle onSuccess(member), affiche un message de confirmation
//     (role="status", ex. "Membre ajouté."), réinitialise le formulaire (email vidé, rôle
//     remis à vide).
//   - En cas d'échec réseau (l'API renvoie une erreur) : affiche le message d'erreur du
//     serveur dans un role="alert", GARDE les valeurs saisies (l'utilisateur ne doit pas
//     tout retaper), réactive le bouton.
import type { Member } from "../api";

export interface AjouterMembreFormProps {
  familyId: string;
  onSuccess?: (member: Member) => void;
}

export function AjouterMembreForm(_props: AjouterMembreFormProps) {
  throw new Error("AjouterMembreForm n'est pas encore implémenté");
}
