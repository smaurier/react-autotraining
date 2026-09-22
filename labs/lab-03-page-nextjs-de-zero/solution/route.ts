// route.ts — SOLUTION DE RÉFÉRENCE (commentée). Ne l'ouvre pas avant ton GREEN.
const NESTJS_API_URL = process.env.NESTJS_API_URL ?? "http://localhost:4000";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const upstream = await fetch(`${NESTJS_API_URL}/families/${id}/ack`, { method: "POST" });
  const body = await upstream.json().catch(() => null);
  // Le statut est relayé TEL QUEL — un BFF ne réécrit jamais l'issue de l'appel en aval.
  return new Response(body === null ? null : JSON.stringify(body), {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}
