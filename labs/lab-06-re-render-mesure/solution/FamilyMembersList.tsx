// FamilyMembersList.tsx — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
import { memo, useCallback, useState } from "react";

export interface Member {
  id: string;
  email: string;
}

// memo() seul ne suffirait pas si onSelect changeait d'identité à chaque rendu du parent —
// les deux corrections vont toujours ensemble.
export const MemberRow = memo(function MemberRow({
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
});

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

  // UNE SEULE closure, stable tant que `onSelectMember` ne change pas — passée identique à
  // chaque MemberRow, à chaque rendu de FamilyMembersList. C'est ce qui rend memo() efficace.
  // `onRowRender` est transmis TEL QUEL (jamais ré-enveloppé dans une closure inline) pour
  // la même raison : une nouvelle fonction à chaque rendu casserait memo() tout autant que
  // `onSelect` non stabilisé.
  const handleSelect = useCallback((id: string) => onSelectMember(id), [onSelectMember]);

  return (
    <div>
      <label htmlFor="recherche-membres">Rechercher</label>
      <input id="recherche-membres" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {visibles.map((member) => (
          <MemberRow key={member.id} member={member} onSelect={handleSelect} onRender={onRowRender} />
        ))}
      </ul>
    </div>
  );
}
