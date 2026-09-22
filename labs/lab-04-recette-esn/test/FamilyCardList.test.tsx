// Oracle RUNTIME + STATIQUE du lab 04. Ne pas modifier. Une "recette" de mission ESN, ce
// n'est pas QUE "ça marche" — c'est aussi "ça respecte les conventions déjà en place" :
// on lit donc le CODE SOURCE de ta feature (comme un relecteur de PR le ferait), en plus de
// son comportement.
import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { FamilyCardList } from "@lab";

const FAMILY_ID = "fam-1";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

describe("FamilyCardList — comportement, mêmes conventions que ExampleWidget", () => {
  it("affiche « Chargement… » puis la liste dans une Card (réutilisée, pas réinventée)", async () => {
    server.use(
      http.get(`/api/families/${FAMILY_ID}/members`, () =>
        HttpResponse.json([
          { id: "m1", email: "alice@tribuzen.app" },
          { id: "m2", email: "bob@tribuzen.app" },
        ]),
      ),
    );

    render(<FamilyCardList familyId={FAMILY_ID} />);
    expect(screen.getByText("Chargement…")).toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "Membres" })).toBeInTheDocument();
    // `data-slot="card"` vient de Card.tsx — sa présence prouve la RÉUTILISATION du composant
    // donné, pas une reconstruction d'un <div> qui ressemblerait juste à une Card.
    expect(document.querySelector('[data-slot="card"]')).toBeInTheDocument();
    expect(screen.getByText("alice@tribuzen.app")).toBeInTheDocument();
    expect(screen.getByText("bob@tribuzen.app")).toBeInTheDocument();
  });

  it("affiche « Erreur. » — texte EXACT, la convention de ExampleWidget.tsx", async () => {
    server.use(http.get(`/api/families/${FAMILY_ID}/members`, () => new HttpResponse(null, { status: 500 })));

    render(<FamilyCardList familyId={FAMILY_ID} />);
    expect(await screen.findByText("Erreur.")).toBeInTheDocument();
  });
});

describe("FamilyCardList — conformité aux conventions de la codebase (relecture du source)", () => {
  // Les commentaires en tête de fichier CITENT les mots-clés qu'on cherche ("export default",
  // "useApiResource"…) pour expliquer la règle — on les retire avant de chercher, sinon le
  // texte de l'énoncé lui-même ferait passer ou échouer le check à tort.
  const rawSource = readFileSync(process.env.LAB_SOURCE_PATH!, "utf8");
  const source = rawSource
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

  it("réutilise le hook useApiResource donné (pas de fetch/useEffect réimplémenté)", () => {
    expect(source).toMatch(/useApiResource/);
    expect(source).not.toMatch(/useEffect/);
  });

  it("réutilise le composant Card donné", () => {
    expect(source).toMatch(/\bCard\b/);
  });

  it("n'exporte QUE en export nommé — jamais `export default` (convention de l'équipe)", () => {
    expect(source).not.toMatch(/export\s+default/);
  });
});
