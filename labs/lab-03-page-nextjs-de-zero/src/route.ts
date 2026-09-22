// route.ts — PAGE BLANCHE. Le Route Handler POST /api/families/[id]/ack : un BFF (backend-
// for-frontend) devant l'API NestJS. Le navigateur appelle CET endpoint (jamais NestJS
// directement — voir MarquerLuButton.tsx), qui relaie vers NestJS.
//
// export async function POST(request: Request, { params }: { params: Promise<{ id: string }> })
//
//   - `params` est une Promise (Next 15) — `await`e-la pour obtenir `id`.
//   - Relaie vers `${process.env.NESTJS_API_URL ?? "http://localhost:4000"}/families/${id}/ack`
//     avec la méthode POST (pas de body à transmettre, l'ack n'en porte pas).
//   - Le statut HTTP renvoyé au navigateur doit être EXACTEMENT celui renvoyé par NestJS
//     (200 → 200, 401 → 401, 404 → 404, etc.). Un BFF qui avale les erreurs et renvoie
//     toujours 200 cache des pannes réelles à l'appelant — piège à éviter.
//   - Le corps JSON renvoyé par NestJS est relayé tel quel dans la réponse.
export async function POST(
  _request: Request,
  _context: { params: Promise<{ id: string }> },
): Promise<Response> {
  throw new Error("POST (route.ts) n'est pas encore implémenté");
}
