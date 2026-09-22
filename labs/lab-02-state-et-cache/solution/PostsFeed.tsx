// PostsFeed.tsx — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
import { create } from "zustand";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPosts, togglePin, type Post } from "../api";

interface FilterState {
  filter: "all" | "pinned";
  setFilter: (filter: "all" | "pinned") => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  filter: "all",
  setFilter: (filter) => set({ filter }),
}));

export function PostsFeed({ familyId }: { familyId: string }) {
  const queryClient = useQueryClient();
  const { filter, setFilter } = useFilterStore();

  const { data: posts, isPending, isError } = useQuery({
    queryKey: ["posts", familyId],
    queryFn: () => fetchPosts(familyId),
  });

  const mutation = useMutation({
    mutationFn: ({ postId, pinned }: { postId: string; pinned: boolean }) =>
      togglePin(familyId, postId, pinned),
    onSuccess: () => {
      // Invalidation, pas mise à jour manuelle du cache : on redemande la vérité au serveur.
      queryClient.invalidateQueries({ queryKey: ["posts", familyId] });
    },
  });

  if (isPending) return <p>Chargement…</p>;
  if (isError) return <p role="alert">Impossible de charger les posts.</p>;

  const visibles = filter === "pinned" ? posts.filter((p: Post) => p.pinned) : posts;

  return (
    <div>
      <div role="tablist">
        <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          Tous
        </button>
        <button type="button" aria-pressed={filter === "pinned"} onClick={() => setFilter("pinned")}>
          Épinglés
        </button>
      </div>
      <ul>
        {visibles.map((post: Post) => (
          <li key={post.id}>
            <span>{post.content}</span>
            <button
              type="button"
              onClick={() => mutation.mutate({ postId: post.id, pinned: !post.pinned })}
            >
              {post.pinned ? "Désépingler" : "Épingler"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
