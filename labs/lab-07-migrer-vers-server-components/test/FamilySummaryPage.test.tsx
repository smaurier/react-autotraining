// Oracle RUNTIME + STATIQUE du lab 07. Ne pas modifier. `FamilySummaryPage` est appelée
// DIRECTEMENT comme une fonction (`await FamilySummaryPage({ params })`) — exactement ce que
// Next.js fait pour un Server Component. Tant que le fichier utilise `useState`/`useEffect`,
// cet appel plante avec une "Invalid hook call" : un Server Component ne peut PAS avoir de
// hooks, ce n'est pas une question de style, c'est structurel. C'est le signal RED naturel.
import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import FamilySummaryPage from "@lab";

const FAMILY_ID = "fam-1";
const NESTJS_API_URL = process.env.NEXT_PUBLIC_NESTJS_API_URL!;

const server = setupServer(
  http.get(`${NESTJS_API_URL}/families/${FAMILY_ID}/summary`, () =>
    HttpResponse.json({ name: "Famille Dupont", onlineCount: 2 }),
  ),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

describe("FamilySummaryPage — migrée en Server Component", () => {
  it("se rend directement (appel de fonction, comme Next.js le ferait), sans écran de chargement", async () => {
    const element = await FamilySummaryPage({ params: Promise.resolve({ id: FAMILY_ID }) });
    render(element);

    expect(screen.getByRole("heading", { name: "Famille Dupont" })).toBeInTheDocument();
    expect(screen.getByText(/2 en ligne/)).toBeInTheDocument();
    expect(screen.queryByText("Chargement…")).not.toBeInTheDocument();
  });

  it("garde LiveOnlineCount interactif (le seul bout client) — Actualiser fonctionne toujours", async () => {
    const user = userEvent.setup();
    const element = await FamilySummaryPage({ params: Promise.resolve({ id: FAMILY_ID }) });
    render(element);

    server.use(
      http.get(`/api/families/${FAMILY_ID}/online-count`, () => HttpResponse.json({ onlineCount: 5 })),
    );
    await user.click(screen.getByRole("button", { name: "Actualiser" }));
    expect(await screen.findByText(/5 en ligne/)).toBeInTheDocument();
  });
});

describe("FamilySummaryPage — plus de JS client inutile (relecture du source)", () => {
  const rawSource = readFileSync(process.env.LAB_SOURCE_PATH!, "utf8");
  const source = rawSource
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

  it("n'a plus \"use client\", useState ni useEffect — c'est un vrai Server Component", () => {
    expect(source).not.toMatch(/use client/);
    expect(source).not.toMatch(/useState|useEffect/);
  });
});
