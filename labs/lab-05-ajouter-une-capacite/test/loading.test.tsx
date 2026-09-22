// Oracle de la NOUVELLE capacité. Ne pas modifier. RED tant que `loading` n'existe pas sur
// IconButton — c'est la spécification de ce que tu ajoutes.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "@lab/IconButton";

afterEach(cleanup);

describe("IconButton — capacité loading", () => {
  it("désactive le bouton et annonce aria-busy quand loading est vrai", () => {
    render(<IconButton icon="📌" label="Épingler" onClick={vi.fn()} loading />);
    const bouton = screen.getByRole("button", { name: "Épingler" });
    expect(bouton).toBeDisabled();
    expect(bouton).toHaveAttribute("aria-busy", "true");
  });

  it("expose un indicateur de chargement accessible (role=status)", () => {
    render(<IconButton icon="📌" label="Épingler" onClick={vi.fn()} loading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("n'appelle PAS onClick pendant loading, même via un clic programmatique (double rempart)", async () => {
    const onClick = vi.fn();
    render(<IconButton icon="📌" label="Épingler" onClick={onClick} loading />);
    const bouton = screen.getByRole("button", { name: "Épingler" });
    // Un clic programmatique contourne l'attribut `disabled` du navigateur (userEvent, lui,
    // le respecte déjà) — la garde doit être dans le code, pas seulement dans l'attribut HTML.
    bouton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("sans loading (comportement par défaut), rien ne change : pas de role=status, pas disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton icon="📌" label="Épingler" onClick={onClick} />);
    const bouton = screen.getByRole("button", { name: "Épingler" });
    expect(bouton).not.toBeDisabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(bouton);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
