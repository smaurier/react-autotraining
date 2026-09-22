// Oracle de NON-RÉGRESSION. Ne pas modifier. Doit rester VERT avant ET après ta modification
// d'IconButton — les trois écrans consommateurs ne doivent jamais se casser.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PinButton } from "@lab/screens/PinButton";
import { DeleteButton } from "@lab/screens/DeleteButton";
import { RefreshButton } from "@lab/screens/RefreshButton";

afterEach(cleanup);

describe("PinButton — non-régression", () => {
  it("expose un bouton nommé « Épingler » et appelle onPin au clic", async () => {
    const user = userEvent.setup();
    const onPin = vi.fn();
    render(<PinButton onPin={onPin} />);
    await user.click(screen.getByRole("button", { name: "Épingler" }));
    expect(onPin).toHaveBeenCalledTimes(1);
  });
});

describe("DeleteButton — non-régression, y compris la className propre à cet écran", () => {
  it("expose un bouton nommé « Supprimer », appelle onDelete, et garde sa className", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<DeleteButton onDelete={onDelete} />);
    const bouton = screen.getByRole("button", { name: "Supprimer" });
    expect(bouton).toHaveClass("danger");
    await user.click(bouton);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("RefreshButton — non-régression", () => {
  it("expose un bouton nommé « Rafraîchir » et appelle onRefresh au clic", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(<RefreshButton onRefresh={onRefresh} />);
    await user.click(screen.getByRole("button", { name: "Rafraîchir" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
