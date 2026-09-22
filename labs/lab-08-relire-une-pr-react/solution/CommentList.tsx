// CommentList.tsx — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
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
      {/* Contenu utilisateur : rendu comme texte React, jamais interprété comme du HTML —
          React échappe automatiquement, c'est la protection XSS par défaut qu'on retirait
          en passant par dangerouslySetInnerHTML sans raison. */}
      <div>{comment.content}</div>
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
      {comments.map((comment) => (
        // `comment.id` comme clé : l'état local de CommentRow (isEditing, editText) suit
        // le COMMENTAIRE, pas sa position dans la liste — survit à une suppression ailleurs.
        <CommentRow key={comment.id} comment={comment} onDelete={onDelete} />
      ))}
    </ul>
  );
}
