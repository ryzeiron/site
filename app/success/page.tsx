import { redirect } from "next/navigation";

type Search = { session_id?: string };

export default async function SuccessAliasPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { session_id: sessionId } = await searchParams;

  redirect(sessionId ? `/suivi-commande/${sessionId}` : "/succes");
}
