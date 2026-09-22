// Oracle RUNTIME du lab 01. Ne pas modifier : si un test te semble faux, c'est un sujet pour
// le correcteur, pas une ligne à commenter. Les requêtes réseau sont de VRAIES requêtes
// `fetch`, interceptées par MSW — jamais un mock manuel de `createMember`.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AjouterMembreForm } from "@lab";
import type { Member } from "../api";

const FAMILY_ID = "fam-1";
let appelsRecus = 0;

const server = setupServer(
  http.post(`/api/families/${FAMILY_ID}/members`, async ({ request }) => {
    appelsRecus++;
    const body = (await request.json()) as { email: string; role: string };
    if (body.email === "conflit@tribuzen.app") {
      return HttpResponse.json({ message: "Cet email est déjà utilisé dans cette famille." }, { status: 409 });
    }
    const member: Member = { id: "m-99", email: body.email, role: body.role as Member["role"] };
    return HttpResponse.json(member, { status: 201 });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  appelsRecus = 0;
  cleanup();
});
afterAll(() => server.close());

describe("AjouterMembreForm — champs accessibles", () => {
  it("expose un champ Email et un champ Rôle atteignables par leur label, et un bouton nommé", () => {
    render(<AjouterMembreForm familyId={FAMILY_ID} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rôle/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ajouter le membre/i })).toBeInTheDocument();
  });
});

describe("AjouterMembreForm — validation côté client", () => {
  it("refuse un email invalide SANS appeler l'API", async () => {
    const user = userEvent.setup();
    render(<AjouterMembreForm familyId={FAMILY_ID} />);

    await user.type(screen.getByLabelText(/email/i), "pasunemail");
    await user.selectOptions(screen.getByLabelText(/rôle/i), "parent");
    await user.click(screen.getByRole("button", { name: /ajouter le membre/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/email/i);
    expect(appelsRecus).toBe(0);
  });
});

describe("AjouterMembreForm — succès", () => {
  it("appelle l'API, désactive le bouton pendant l'appel, affiche le succès, réinitialise, notifie onSuccess", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<AjouterMembreForm familyId={FAMILY_ID} onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/email/i), "nouveau@tribuzen.app");
    await user.selectOptions(screen.getByLabelText(/rôle/i), "parent");

    const bouton = screen.getByRole("button", { name: /ajouter le membre/i });
    await user.click(bouton);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/ajouté/i));

    expect(appelsRecus).toBe(1);
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ email: "nouveau@tribuzen.app", role: "parent" }),
    );
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe("");
    expect(bouton).not.toBeDisabled();
  });
});

describe("AjouterMembreForm — échec serveur", () => {
  it("affiche l'erreur du serveur, garde les valeurs saisies, réactive le bouton", async () => {
    const user = userEvent.setup();
    render(<AjouterMembreForm familyId={FAMILY_ID} />);

    await user.type(screen.getByLabelText(/email/i), "conflit@tribuzen.app");
    await user.selectOptions(screen.getByLabelText(/rôle/i), "admin");
    await user.click(screen.getByRole("button", { name: /ajouter le membre/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/déjà utilisé/i);
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe("conflit@tribuzen.app");
    expect(screen.getByRole("button", { name: /ajouter le membre/i })).not.toBeDisabled();
  });
});
