// api.ts — DONNÉ, ne se modifie pas. Les vrais appels réseau ; les tests les interceptent
// via MSW (jamais un mock manuel de ces fonctions).
export interface Post {
  id: string;
  content: string;
  pinned: boolean;
}

export async function fetchPosts(familyId: string): Promise<Post[]> {
  const res = await fetch(`/api/families/${familyId}/posts`);
  if (!res.ok) throw new Error("Impossible de charger les posts.");
  return res.json();
}

export async function togglePin(familyId: string, postId: string, pinned: boolean): Promise<Post> {
  const res = await fetch(`/api/families/${familyId}/posts/${postId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pinned }),
  });
  if (!res.ok) throw new Error("Impossible de mettre à jour le post.");
  return res.json();
}
