// Oracle de la REVUE. Ne pas modifier. RED sur les deux problèmes réels de la PR, GREEN une
// fois corrigés.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentList, type Comment } from "@lab";

afterEach(cleanup);

declare global {
  // eslint-disable-next-line no-var
  var __oracle_xss__: boolean | undefined;
}

describe("CommentList — pas d'injection HTML depuis un contenu utilisateur", () => {
  it("un commentaire contenant du markup dangereux est affiché comme TEXTE, jamais interprété", () => {
    globalThis.__oracle_xss__ = undefined;
    const malicieux: Comment[] = [
      { id: "c1", content: '<img src=x onerror="window.__oracle_xss__=true">' },
    ];
    const { container } = render(<CommentList comments={malicieux} onDelete={vi.fn()} />);

    expect(globalThis.__oracle_xss__).toBeUndefined();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});

describe("CommentList — l'état d'édition suit le commentaire, pas sa position", () => {
  it("supprimer un commentaire n'attribue pas l'édition en cours à un autre commentaire", async () => {
    const user = userEvent.setup();
    const comments: Comment[] = [
      { id: "c1", content: "A" },
      { id: "c2", content: "B" },
      { id: "c3", content: "C" },
    ];
    const { rerender } = render(<CommentList comments={comments} onDelete={vi.fn()} />);

    // On édite le DEUXIÈME commentaire (B) sans valider.
    const ligneB = screen.getByText("B").closest("li")!;
    await user.click(ligneB.querySelector("button")!); // "Modifier"
    const champEdition = screen.getByLabelText("Modifier le commentaire");
    await user.clear(champEdition);
    await user.type(champEdition, "EN COURS");

    // On supprime le PREMIER commentaire (A) — B doit rester en cours d'édition, pas C.
    const apresSuppression = comments.filter((c) => c.id !== "c1");
    rerender(<CommentList comments={apresSuppression} onDelete={vi.fn()} />);

    const lignes = screen.getAllByRole("listitem");
    const premiereLigne = lignes[0];
    expect(premiereLigne.querySelector("input")).not.toBeNull();
    expect((premiereLigne.querySelector("input") as HTMLInputElement).value).toBe("EN COURS");
  });
});
