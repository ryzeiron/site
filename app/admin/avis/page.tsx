import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import AdminReviewActions from "@/components/AdminReviewActions";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { reviews, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="text-lg tracking-wide text-yellow-200">
      {"*".repeat(rating)}
      <span className="text-gray-600">{"*".repeat(5 - rating)}</span>
    </div>
  );
}

export default async function AdminAvisPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const db = getDb();

  const [reviewRows, userRows] = await Promise.all([
    db.select().from(reviews).orderBy(desc(reviews.createdAt)),
    db.select().from(users),
  ]);

  const usersById = new Map(userRows.map((user) => [user.id, user]));

  const average =
    reviewRows.length > 0
      ? reviewRows.reduce((total, review) => total + review.rating, 0) /
        reviewRows.length
      : 0;

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Avis</h1>
          <p className="mt-1 text-sm text-gray-400">
            Consulte les avis clients et supprime ceux que tu ne veux pas
            afficher.
          </p>
        </div>

        <LogoutButton />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin" className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
          Retour stocks
        </Link>

        <Link href="/admin/modifications" className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
          Modifications
        </Link>

        <Link href="/admin/commandes" className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
          Commandes
        </Link>

        <Link href="/admin/clients" className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
          Clients
        </Link>

        <Link href="/admin/favoris" className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
          Favoris
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-4">
          <div className="text-sm text-gray-400">Avis total</div>
          <div className="mt-1 text-2xl font-bold text-white">{reviewRows.length}</div>
        </div>

        <div className="rounded-lg border border-yellow-400/20 bg-yellow-500/10 p-4">
          <div className="text-sm text-yellow-100/80">Note moyenne</div>
          <div className="mt-1 text-2xl font-bold text-white">
            {average ? average.toFixed(1) : "-"} / 5
          </div>
        </div>

        <div className="rounded-lg border border-violet-400/20 bg-violet-500/10 p-4">
          <div className="text-sm text-violet-100/80">Gestion</div>
          <div className="mt-1 text-2xl font-bold text-white">Suppression</div>
        </div>
      </div>

      {reviewRows.length === 0 ? (
        <p className="text-gray-400">Aucun avis pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {reviewRows.map((review) => {
            const user = usersById.get(review.userId);

            return (
              <section key={review.id} className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Stars rating={review.rating} />

                    <div className="mt-2 font-semibold text-white">
                      {user?.name || "Client sans nom"}
                    </div>

                    <div className="text-xs text-gray-400">
                      {user?.email ?? review.userId}
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-400">
                    {formatDate(review.createdAt)}
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                  {review.comment}
                </p>

                <AdminReviewActions reviewId={review.id} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
