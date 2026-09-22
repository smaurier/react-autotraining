// CommentList.tsx — L'EXISTANT, PR ouverte par un collègue, prête à merger. La démo
// passe : les commentaires s'affichent, on peut les éditer et les supprimer. Deux problèmes
// réels s'y cachent — lis REVIEW.md AVANT de lancer l'oracle, remplis-le, PUIS reviens ici.
import { useState } from "react";

export interface Comment {
  id: string;
  content: string;
}

function CommentRow({ comment, onDelete }: { comment: Comment; onDelete: (id: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);

  if (isEditing) {
    return (
      <li>
        <input
          aria-label={`Modifier le commentaire`}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
        />
        <button type="button" onClick={() => setIsEditing(false)}>
          Fermer
        </button>
      </li>
    );
  }

  return (
    <li>
      {/* Le contenu vient d'un utilisateur — jamais vérifié ni échappé ici. */}
      <div dangerouslySetInnerHTML={{ __html: comment.content }} />
      <button type="button" onClick={() => setIsEditing(true)}>
        Modifier
      </button>
      <button type="button" onClick={() => onDelete(comment.id)}>
        Supprimer
      </button>
    </li>
  );
}

export function CommentList({ comments, onDelete }: { comments: Comment[]; onDelete: (id: string) => void }) {
  return (
    <ul>
      {comments.map((comment, index) => (
        // `index` comme clé : React associe l'état local de CommentRow à une POSITION, pas
        // au commentaire lui-même — voir REVIEW.md question 2.
        <CommentRow key={index} comment={comment} onDelete={onDelete} />
      ))}
    </ul>
  );
}
