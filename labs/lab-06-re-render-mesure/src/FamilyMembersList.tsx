// FamilyMembersList.tsx — L'EXISTANT, EN PRODUCTION. Ticket : « taper dans le champ de
// recherche est saccadé sur les grosses familles — on dirait que toute la liste se redessine
// à chaque frappe. » Ton travail : PROFILER (ici, un compteur de rendus injecté par les
// tests joue ce rôle — en vrai tu utiliserais React DevTools Profiler), TROUVER pourquoi,
// CORRIGER, et laisser l'oracle PROUVER que ça ne se reproduit plus.
//
// Piège : ce fichier COMPILE et MARCHE déjà — le bug n'est pas une erreur, c'est une perte
// de performance invisible sans mesure. `onRowRender` (sur FamilyMembersList) et `onRender`
// (sur MemberRow) sont le compteur de rendus utilisé par l'oracle — NE LES RETIRE PAS, ce
// n'est pas de l'UI, c'est l'instrument de mesure. La correction touche DEUX endroits :
// comment `MemberRow` est déclaré (le mémoïser ne suffit pas seul), ET comment
// `FamilyMembersList` lui passe `onSelect` (une closure stable, pas une nouvelle fonction à
// chaque rendu).
import { useState } from "react";

export interface Member {
  id: string;
  email: string;
}

export function MemberRow({
  member,
  onSelect,
  onRender,
}: {
  member: Member;
  onSelect: (id: string) => void;
  onRender?: (id: string) => void;
}) {
  onRender?.(member.id);
  return (
    <li>
      <button type="button" onClick={() => onSelect(member.id)}>
        {member.email}
      </button>
    </li>
  );
}

export function FamilyMembersList({
  members,
  onSelectMember,
  onRowRender,
}: {
  members: Member[];
  onSelectMember: (id: string) => void;
  onRowRender?: (memberId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const visibles = members.filter((m) => m.email.includes(query));

  return (
    <div>
      <label htmlFor="recherche-membres">Rechercher</label>
      <input id="recherche-membres" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {visibles.map((member) => (
          // Bug : cette closure est une NOUVELLE fonction à chaque rendu de
          // FamilyMembersList — même sans React.memo sur MemberRow, une prop qui change
          // d'identité à chaque frappe annule tout intérêt à mémoïser.
          <MemberRow key={member.id} member={member} onSelect={(id) => onSelectMember(id)} onRender={onRowRender} />
        ))}
      </ul>
    </div>
  );
}
