// Oracle RUNTIME du lab 02. Ne pas modifier. Les requêtes réseau sont interceptées par MSW ;
// le compteur d'appels GET/PATCH est la preuve que le filtre est client (Zustand) et que le
// cache TanStack Query est réellement réutilisé, pas juste "semble marcher".
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { PostsFeed, useFilterStore } from "@lab";

const FAMILY_ID = "fam-1";
let getCalls = 0;
let patchCalls = 0;
let posts = [
  { id: "p1", content: "Vacances à la mer", pinned: false },
  { id: "p2", content: "Réunion de rentrée", pinned: true },
];

const server = setupServer(
  http.get(`/api/families/${FAMILY_ID}/posts`, () => {
    getCalls++;
    return HttpResponse.json(posts);
  }),
  http.patch(`/api/families/${FAMILY_ID}/posts/:postId`, async ({ params, request }) => {
    patchCalls++;
    const body = (await request.json()) as { pinned: boolean };
    posts = posts.map((p) => (p.id === params.postId ? { ...p, pinned: body.pinned } : p));
    return HttpResponse.json(posts.find((p) => p.id === params.postId));
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  getCalls = 0;
  patchCalls = 0;
  posts = [
    { id: "p1", content: "Vacances à la mer", pinned: false },
    { id: "p2", content: "Réunion de rentrée", pinned: true },
  ];
  useFilterStore.setState({ filter: "all" });
});
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

function renderFeed(client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: false } } })) {
  const utils = render(
    <QueryClientProvider client={client}>
      <PostsFeed familyId={FAMILY_ID} />
    </QueryClientProvider>,
  );
  return { ...utils, client };
}

describe("PostsFeed — chargement", () => {
  it("charge et affiche les posts via TanStack Query", async () => {
    renderFeed();
    expect(await screen.findByText("Vacances à la mer")).toBeInTheDocument();
    expect(screen.getByText("Réunion de rentrée")).toBeInTheDocument();
    expect(getCalls).toBe(1);
  });
});

describe("PostsFeed — filtre client (Zustand)", () => {
  it("filtre sans re-fetch : le compteur d'appels GET ne bouge pas", async () => {
    const user = userEvent.setup();
    renderFeed();
    await screen.findByText("Vacances à la mer");

    await user.click(screen.getByRole("button", { name: "Épinglés" }));

    expect(screen.queryByText("Vacances à la mer")).not.toBeInTheDocument();
    expect(screen.getByText("Réunion de rentrée")).toBeInTheDocument();
    expect(getCalls).toBe(1);
  });
});

describe("PostsFeed — mutation + invalidation du cache", () => {
  it("épingler un post met à jour la liste, y compris sur l'onglet Épinglés, via invalidation", async () => {
    const user = userEvent.setup();
    renderFeed();
    await screen.findByText("Vacances à la mer");

    const ligneVacances = screen.getByText("Vacances à la mer").closest("li")!;
    await user.click(within(ligneVacances).getByRole("button", { name: /épingler/i }));

    await waitFor(() => expect(patchCalls).toBe(1));

    await user.click(screen.getByRole("button", { name: "Épinglés" }));
    expect(await screen.findByText("Vacances à la mer")).toBeInTheDocument();
  });
});

describe("PostsFeed — cache réellement réutilisé", () => {
  it("un remount avec le même QueryClient ne re-fetch pas si les données sont fraîches", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: false } } });
    const { unmount } = renderFeed(client);
    await screen.findByText("Vacances à la mer");
    expect(getCalls).toBe(1);

    unmount();
    renderFeed(client);
    expect(await screen.findByText("Vacances à la mer")).toBeInTheDocument();
    expect(getCalls).toBe(1);
  });
});
