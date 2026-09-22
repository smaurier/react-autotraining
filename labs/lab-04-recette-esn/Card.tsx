// Card.tsx — DONNÉ, EXISTANT dans la codebase mission. Ne se modifie pas. C'est le composant
// de layout que toute l'équipe utilise pour envelopper un bloc de contenu — l'utiliser (au
// lieu de réinventer son propre <div>) fait partie de la mission.
export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article data-slot="card">
      <h2>{title}</h2>
      {children}
    </article>
  );
}
