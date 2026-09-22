// Oracle RUNTIME du lab 06. Ne pas modifier. Le "profiler" ici, c'est un compteur de rendus
// réel : `onRowRender` est appelé UNIQUEMENT quand le corps de fonction de MemberRow
// s'exécute vraiment — si `memo()` bloque le rendu (props inchangées), le compteur ne bouge
// pas. C'est une mesure, pas une supposition sur ce que React "devrait" faire.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FamilyMembersList, type Member } from "@lab";

afterEach(cleanup);

const MEMBERS: Member[] = [
  { id: "m1", email: "alice@tribuzen.app" },
  { id: "m2", email: "bob@tribuzen.app" },
  { id: "m3", email: "chloe@tribuzen.app" },
];

describe("FamilyMembersList — comportement de base", () => {
  it("affiche tous les membres et filtre par email", async () => {
    const user = userEvent.setup();
    render(<FamilyMembersList members={MEMBERS} onSelectMember={vi.fn()} />);
    expect(screen.getByText("alice@tribuzen.app")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/rechercher/i), "bob");
    expect(screen.queryByText("alice@tribuzen.app")).not.toBeInTheDocument();
    expect(screen.getByText("bob@tribuzen.app")).toBeInTheDocument();
  });
});

describe("FamilyMembersList — re-renders mesurés", () => {
  it("chaque MemberRow ne re-render PAS à chaque frappe qui ne change pas ce qu'il affiche", async () => {
    const user = userEvent.setup();
    const rendersParMembre: Record<string, number> = { m1: 0, m2: 0, m3: 0 };
    const onRowRender = vi.fn((id: string) => {
      rendersParMembre[id] = (rendersParMembre[id] ?? 0) + 1;
    });

    render(<FamilyMembersList members={MEMBERS} onSelectMember={vi.fn()} onRowRender={onRowRender} />);
    // Un rendu initial pour chaque membre visible.
    expect(rendersParMembre.m1).toBe(1);
    expect(rendersParMembre.m2).toBe(1);
    expect(rendersParMembre.m3).toBe(1);

    // Cinq frappes dans le champ de recherche, texte qui ne filtre RIEN encore ("a" matche
    // tous les emails ici via "@" ? non — tapons un caractère présent nulle part au début
    // pour garder les trois lignes visibles pendant toute la frappe).
    await user.type(screen.getByLabelText(/rechercher/i), "@trib");

    // Les trois membres sont toujours visibles (le filtre matche tous les emails) — mais
    // AUCUN MemberRow ne doit s'être re-rendu pendant ces 5 frappes : leurs props (member,
    // onSelect) n'ont pas changé.
    expect(rendersParMembre.m1).toBe(1);
    expect(rendersParMembre.m2).toBe(1);
    expect(rendersParMembre.m3).toBe(1);
  });

  it("un membre qui sort puis revient dans le filtre se re-render normalement (le memo n'empêche pas l'affichage)", async () => {
    const user = userEvent.setup();
    render(<FamilyMembersList members={MEMBERS} onSelectMember={vi.fn()} />);

    await user.type(screen.getByLabelText(/rechercher/i), "bob");
    expect(screen.queryByText("alice@tribuzen.app")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/rechercher/i));
    expect(screen.getByText("alice@tribuzen.app")).toBeInTheDocument();
  });
});
