import Link from "next/link";
import { desc, eq, or } from "drizzle-orm";
import ReviewForm from "@/components/ReviewForm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { orders, reviews, users } from "@/lib/db/schema";
import { shouldUseLivePublicData } from "@/lib/public-live-data";

export const dynamic = "force-dynamic";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="text-lg tracking-wide text-yellow-200">
      {"★".repeat(rating)}
      <span className="text-gray-600">{"★".repeat(5 - rating)}</span>
    </div>
  );
}

export default async function AvisPage() {
  const useLiveData = await shouldUseLivePublicData();
  const session = useLiveData ? await auth() : null;
  const db = useLiveData ? getDb() : null;

  const [reviewRows, userRows] = db
    ? await Promise.all([
        db.select().from(reviews).orderBy(desc(reviews.createdAt)),
        db.select().from(users),
      ])
    : [[], []];

  const usersById = new Map(userRows.map((user) => [user.id, user]));
  let hasBought = false;
  let currentReview: typeof reviews.$inferSelect | null = null;

  if (session?.user?.id && session.user.email && db) {
    const [orderRows, reviewForUserRows] = await Promise.all([
      db
        .select({ id: orders.id })
        .from(orders)
        .where(
          or(
            eq(orders.userId, session.user.id),
            eq(orders.customerEmail, session.user.email),
          ),
        )
        .limit(1),
      db
        .select()
        .from(reviews)
        .where(eq(reviews.userId, session.user.id))
        .limit(1),
    ]);

    hasBought = orderRows.length > 0;
    currentReview = reviewForUserRows[0] ?? null;
  }

  return (
    <div className="space-y-8 py-8">
      <section className="rounded-2xl border border-white/10 bg-zinc-950/75 p-6 text-gray-100 backdrop-blur-sm md:p-10">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
            Avis clients
          </p>

          <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">
            Vos retours sur PokeDel
          </h1>

          <p className="mt-3 text-gray-300">
            Les avis sont réservés aux clients ayant déjà passé commande, pour
            garder des retours fiables sur la qualité des cartes, l'emballage et
            l'expérience d'achat.
          </p>
        </div>
      </section>

      {session?.user ? (
        hasBought ? (
          <ReviewForm
            initialRating={currentReview?.rating ?? 5}
            initialComment={currentReview?.comment ?? ""}
          />
        ) : (
          <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-5 text-yellow-100">
            Tu dois avoir au moins une commande sur ton compte pour laisser un
            avis.
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/75 p-5 text-gray-200">
          <div className="font-semibold text-white">
            Connecte-toi pour laisser un avis.
          </div>

          <Link
            href="/connexion?callbackUrl=/avis"
            className="mt-4 inline-flex rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Me connecter
          </Link>
        </div>
      )}

      {currentReview && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">
          Tu as déjà publié un avis. Tu peux le modifier depuis le formulaire
          ci-dessus.
        </div>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Avis clients</h2>
            <p className="mt-1 text-sm text-gray-400">
              {reviewRows.length} avis affiché{reviewRows.length > 1 ? "s" : ""}.
            </p>
          </div>
        </div>

        {reviewRows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950/75 p-6 text-gray-400">
            Aucun avis pour le moment.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reviewRows.map((review) => {
              const user = usersById.get(review.userId);

              return (
                <article
                  key={review.id}
                  className="rounded-2xl border border-white/10 bg-zinc-950/75 p-5 text-gray-200"
                >
                  <Stars rating={review.rating} />

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                    {review.comment}
                  </p>

                  <div className="mt-4 text-xs text-gray-500">
                    {user?.name || "Client PokeDel"} - {formatDate(review.createdAt)}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
