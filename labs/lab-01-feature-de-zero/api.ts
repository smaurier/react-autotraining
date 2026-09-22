// api.ts — DONNÉ, ne se modifie pas. Le vrai appel réseau que ton composant doit utiliser ;
// les tests interceptent CETTE requête via MSW (jamais un mock manuel de la fonction).
export interface Member {
  id: string;
  email: string;
  role: "admin" | "parent" | "enfant";
}

export interface CreateMemberInput {
  email: string;
  role: Member["role"];
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function createMember(familyId: string, input: CreateMemberInput): Promise<Member> {
  const res = await fetch(`/api/families/${familyId}/members`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { message?: string });
    throw new ApiError(body.message ?? "Une erreur est survenue.");
  }
  return res.json();
}
