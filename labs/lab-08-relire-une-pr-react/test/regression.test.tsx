// Oracle de NON-RÉGRESSION. Ne pas modifier. Doit rester VERT avant ET après ta correction :
// afficher, éditer, supprimer un commentaire légitime continue de marcher.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentList, type Comment } from "@lab";

afterEach(cleanup);

const COMMENTS: Comment[] = [
  { id: "c1", content: "Bien reçu, merci !" },
  { id: "c2", content: "On se voit samedi ?" },
];

describe("CommentList — non-régression", () => {
  it("affiche les commentaires légitimes", () => {
    render(<CommentList comments={COMMENTS} onDelete={vi.fn()} />);
    expect(screen.getByText("Bien reçu, merci !")).toBeInTheDocument();
    expect(screen.getByText("On se voit samedi ?")).toBeInTheDocument();
  });

  it("supprime le bon commentaire au clic", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<CommentList comments={COMMENTS} onDelete={onDelete} />);
    const premiereLigne = screen.getByText("Bien reçu, merci !").closest("li")!;
    await user.click(premiereLigne.querySelector("button:nth-of-type(2)")!);
    expect(onDelete).toHaveBeenCalledWith("c1");
  });
});
