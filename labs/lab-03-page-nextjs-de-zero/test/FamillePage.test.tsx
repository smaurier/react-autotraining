// Oracle RUNTIME du lab 03. Ne pas modifier. `page.tsx` est un Server Component : on
// l'exécute directement (c'est une simple fonction async) puis on rend l'élément React
// obtenu — pas besoin d'un serveur Next.js réel pour prouver son comportement. `route.ts`
// est un Route Handler : on l'appelle directement avec un vrai `Request` Web standard. Le
// vrai appel réseau vers NestJS est intercepté par MSW dans les deux cas.
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import FamillePage from "@lab/page";
import { POST } from "@lab/route";

const NESTJS_API_URL = process.env.NESTJS_API_URL!;
const FAMILY_ID = "fam-1";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

describe("FamillePage — Server Component, famille trouvée", () => {
  it("affiche le nom, le nombre de membres, et le bouton client", async () => {
    server.use(
      http.get(`${NESTJS_API_URL}/families/${FAMILY_ID}`, () =>
        HttpResponse.json({ id: FAMILY_ID, name: "Famille Dupont", memberCount: 4 }),
      ),
    );

    const element = await FamillePage({ params: Promise.resolve({ id: FAMILY_ID }) });
    render(element);

    expect(screen.getByRole("heading", { name: "Famille Dupont" })).toBeInTheDocument();
    expect(screen.getByText(/4 membres/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /marquer comme lu/i })).toBeInTheDocument();
  });
});

describe("FamillePage — Server Component, famille absente", () => {
  it("affiche un message clair plutôt qu'une erreur non gérée", async () => {
    server.use(http.get(`${NESTJS_API_URL}/families/${FAMILY_ID}`, () => new HttpResponse(null, { status: 404 })));

    const element = await FamillePage({ params: Promise.resolve({ id: FAMILY_ID }) });
    render(element);

    expect(screen.getByText("Famille introuvable.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("route.ts — Route Handler POST /api/families/[id]/ack, BFF devant NestJS", () => {
  it("relaie un succès NestJS tel quel (statut ET corps)", async () => {
    server.use(
      http.post(`${NESTJS_API_URL}/families/${FAMILY_ID}/ack`, () =>
        HttpResponse.json({ acked: true }, { status: 200 }),
      ),
    );

    const res = await POST(new Request(`http://bff.test/api/families/${FAMILY_ID}/ack`, { method: "POST" }), {
      params: Promise.resolve({ id: FAMILY_ID }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ acked: true });
  });

  it("relaie une erreur NestJS SANS la transformer en succès (401 reste 401)", async () => {
    server.use(
      http.post(`${NESTJS_API_URL}/families/${FAMILY_ID}/ack`, () =>
        HttpResponse.json({ message: "Non autorisé." }, { status: 401 }),
      ),
    );

    const res = await POST(new Request(`http://bff.test/api/families/${FAMILY_ID}/ack`, { method: "POST" }), {
      params: Promise.resolve({ id: FAMILY_ID }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Non autorisé." });
  });
});
