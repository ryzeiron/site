import Link from "next/link";
import BlocTile from "@/components/BlocTile";
import CardTile from "@/components/CardTile";
import { BLOCS, type Rarity } from "@/lib/catalog";
import { shouldUseLivePublicData } from "@/lib/public-live-data";
import { getLatestReviews } from "@/lib/public-reviews";
import { formatRecentDate, getRecentCards } from "@/lib/recent-cards";

export const dynamic = "force-dynamic";

const FEATURED_NEW_RARITIES: Rarity[] = ["Ultra Rare", "Secrete"];

function formatReviewDate(value: Date) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="text-lg tracking-wide text-yellow-200">
      {"★".repeat(rating)}
      <span className="text-gray-600">{"★".repeat(5 - rating)}</span>
    </div>
  );
}

export default async function HomePage() {
  const blocsLoop = [...BLOCS, ...BLOCS];
  const useLiveData = await shouldUseLivePublicData();
  const [latestReviews, recentCards] = useLiveData
    ? await Promise.all([
        getLatestReviews(),
        getRecentCards(4, { rarities: FEATURED_NEW_RARITIES }),
      ])
    : [[], []];

  return (
    <div className="space-y-12">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 text-gray-100 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-500/15 text-violet-200 ring-1 ring-violet-300/25">
              <VerifiedIcon />
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-violet-300">
              Cartes vérifiées
            </div>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-white">
            Chaque carte contrôlée
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-300">
            Langue, rareté et visuel sont vérifiés avant la mise en vente.
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 text-gray-100 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-500/15 text-sky-200 ring-1 ring-sky-300/25">
              <StockIcon />
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
              Stock en temps réel
            </div>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold text-white">
            Disponibilités à jour
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-300">
            Les quantités sont suivies automatiquement pour éviter les doubles ventes.
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 text-gray-100 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-300/25">
              <TruckIcon />
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Livraison suivie
            </div>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold text-white">
            Expédition avec suivi
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-300">
            Chaque commande est préparée avec soin et suivie jusqu&apos;au point relais.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-900/60 via-purple-900/50 to-zinc-950/70 p-6 text-gray-100 backdrop-blur-sm md:p-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Les blocs
            </h1>
            <p className="mt-2 text-gray-300">
              Explorez les séries par bloc.
            </p>
          </div>
          <Link
            href="/blocs"
            className="hidden rounded-full bg-violet-600 px-5 py-2.5 font-medium text-white transition hover:bg-violet-700 sm:inline-flex"
          >
            Tout parcourir
          </Link>
        </div>

        <div className="marquee-container relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
          <div className="marquee-track flex gap-4">
            {blocsLoop.map((b, i) => (
              <div
                key={`${b.id}-${i}`}
                className={`w-72 shrink-0 sm:w-80 ${i >= BLOCS.length ? "marquee-duplicate" : ""}`}
              >
                <BlocTile bloc={b} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-violet-300/20 bg-gradient-to-br from-zinc-950 via-violet-950/70 to-fuchsia-950/50 p-6 text-gray-100 backdrop-blur-sm md:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
              Accessoires
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Sleeves
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300 md:text-base">
              Sleeves de collection à l'unité.
            </p>
            <Link
              href="/sleeve"
              className="mt-5 inline-flex rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              Voir les sleeves
            </Link>
          </div>

          <div className="relative mx-auto h-44 w-56">
            <div className="absolute left-6 top-5 h-36 w-24 rotate-[-12deg] rounded-lg border border-violet-200/40 bg-violet-500/20 shadow-xl shadow-violet-950/40" />
            <div className="absolute left-20 top-2 h-36 w-24 rotate-[5deg] rounded-lg border border-fuchsia-200/40 bg-fuchsia-500/20 shadow-xl shadow-fuchsia-950/30" />
            <div className="absolute left-28 top-7 flex h-36 w-24 rotate-[15deg] items-center justify-center rounded-lg border border-white/30 bg-white/10 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-xl shadow-black/40 backdrop-blur-sm">
              Sleeve
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/75 p-6 text-gray-100 backdrop-blur-sm md:p-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
              Nouveautés
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Derniers ajouts
            </h2>
            <p className="mt-2 text-gray-300">
              Les dernières cartes rares ajoutées à la boutique.
            </p>
          </div>
          <Link
            href="/nouveautes"
            className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Voir toutes les nouveautés
          </Link>
        </div>

        {recentCards.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-300">
            Aucune nouveauté en stock pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recentCards.map(({ card, variant, updatedAt }) => {
              const date = formatRecentDate(updatedAt);

              return (
                <div key={`${card.id}-${variant}`} className="relative">
                  <div className="absolute left-2 top-2 z-10 rounded-full bg-violet-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                    {date ? `Nouveau ${date}` : "Nouveau"}
                  </div>
                  <CardTile card={card} variantKey={variant} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/75 p-6 text-gray-100 backdrop-blur-sm md:p-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
              Avis clients
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Les derniers retours
            </h2>
            <p className="mt-2 text-gray-300">
              Les avis publiés par les clients après leur commande.
            </p>
          </div>
          <Link
            href="/avis"
            className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Voir les avis
          </Link>
        </div>

        {latestReviews.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-300">
            Aucun avis pour le moment.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {latestReviews.map((review) => (
              <article
                key={review.id}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-300/70 hover:shadow-[0_0_18px_rgba(139,92,246,0.35)]"
              >
                <ReviewStars rating={review.rating} />
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-gray-300">
                  {review.comment}
                </p>
                <div className="mt-4 text-xs text-gray-500">
                  {review.userName} - {formatReviewDate(review.createdAt)}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/75 p-6 text-gray-100 backdrop-blur-sm md:p-10">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            FAQ
          </h2>
          <p className="mt-2 text-gray-300">
            Les réponses aux questions les plus fréquentes avant de commander.
          </p>
        </div>

        <div className="space-y-3">
          <details className="group rounded-lg border border-white/10 bg-white/[0.03] transition hover:border-violet-300/90 hover:shadow-[0_0_18px_rgba(139,92,246,0.55),0_0_4px_rgba(216,180,254,0.7)] open:border-violet-300/80 open:shadow-[0_0_18px_rgba(139,92,246,0.45)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-semibold text-white">
              <span>Le stock affiché est-il vraiment disponible ?</span>
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-300/30 bg-violet-500/15 text-violet-200 transition group-open:rotate-45 group-hover:border-violet-300/70 group-hover:bg-violet-500/25">
                <span className="absolute left-1/2 top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
                <span className="absolute left-1/2 top-1/2 h-0.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
              </span>
            </summary>
            <p className="px-4 pb-4 text-sm leading-6 text-gray-300">
              Oui. Les quantités sont mises à jour automatiquement après les paiements
              validés pour limiter les doubles ventes.
            </p>
          </details>

          <details className="group rounded-lg border border-white/10 bg-white/[0.03] transition hover:border-violet-300/90 hover:shadow-[0_0_18px_rgba(139,92,246,0.55),0_0_4px_rgba(216,180,254,0.7)] open:border-violet-300/80 open:shadow-[0_0_18px_rgba(139,92,246,0.45)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-semibold text-white">
              <span>Comment se passe la livraison ?</span>
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-300/30 bg-violet-500/15 text-violet-200 transition group-open:rotate-45 group-hover:border-violet-300/70 group-hover:bg-violet-500/25">
                <span className="absolute left-1/2 top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
                <span className="absolute left-1/2 top-1/2 h-0.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
              </span>
            </summary>
            <p className="px-4 pb-4 text-sm leading-6 text-gray-300">
              Les commandes sont préparées avec soin puis expédiées en point relais.
              Un numéro de suivi est envoyé dès que le colis est expédié.
            </p>
          </details>

          <details className="group rounded-lg border border-white/10 bg-white/[0.03] transition hover:border-violet-300/90 hover:shadow-[0_0_18px_rgba(139,92,246,0.55),0_0_4px_rgba(216,180,254,0.7)] open:border-violet-300/80 open:shadow-[0_0_18px_rgba(139,92,246,0.45)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-semibold text-white">
              <span>Comment suivre ma commande ?</span>
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-300/30 bg-violet-500/15 text-violet-200 transition group-open:rotate-45 group-hover:border-violet-300/70 group-hover:bg-violet-500/25">
                <span className="absolute left-1/2 top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
                <span className="absolute left-1/2 top-1/2 h-0.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
              </span>
            </summary>
            <p className="px-4 pb-4 text-sm leading-6 text-gray-300">
              Le lien de suivi est envoyé par email après le paiement. Tu peux aussi
              retrouver le suivi avec le numéro de commande reçu par mail.
            </p>
          </details>

          <details className="group rounded-lg border border-white/10 bg-white/[0.03] transition hover:border-violet-300/90 hover:shadow-[0_0_18px_rgba(139,92,246,0.55),0_0_4px_rgba(216,180,254,0.7)] open:border-violet-300/80 open:shadow-[0_0_18px_rgba(139,92,246,0.45)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-semibold text-white">
              <span>Les cartes sont-elles vérifiées ?</span>
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-300/30 bg-violet-500/15 text-violet-200 transition group-open:rotate-45 group-hover:border-violet-300/70 group-hover:bg-violet-500/25">
                <span className="absolute left-1/2 top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
                <span className="absolute left-1/2 top-1/2 h-0.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
              </span>
            </summary>
            <p className="px-4 pb-4 text-sm leading-6 text-gray-300">
              Oui. L&apos;état, la langue, la rareté et le visuel sont contrôlés avant
              la mise en vente.
            </p>
          </details>

          <details className="group rounded-lg border border-white/10 bg-white/[0.03] transition hover:border-violet-300/90 hover:shadow-[0_0_18px_rgba(139,92,246,0.55),0_0_4px_rgba(216,180,254,0.7)] open:border-violet-300/80 open:shadow-[0_0_18px_rgba(139,92,246,0.45)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-semibold text-white">
              <span>Les cartes vendues sont-elles authentiques ?</span>
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-300/30 bg-violet-500/15 text-violet-200 transition group-open:rotate-45 group-hover:border-violet-300/70 group-hover:bg-violet-500/25">
                <span className="absolute left-1/2 top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
                <span className="absolute left-1/2 top-1/2 h-0.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
              </span>
            </summary>
            <p className="px-4 pb-4 text-sm leading-6 text-gray-300">
              Oui. Nous ne vendons aucune contrefaçon : toutes les cartes proposées
              sur le site sont 100 % authentiques et contrôlées avant leur mise en
              vente.
            </p>
          </details>

          <details className="group rounded-lg border border-white/10 bg-white/[0.03] transition hover:border-violet-300/90 hover:shadow-[0_0_18px_rgba(139,92,246,0.55),0_0_4px_rgba(216,180,254,0.7)] open:border-violet-300/80 open:shadow-[0_0_18px_rgba(139,92,246,0.45)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-semibold text-white">
              <span>Puis-je poser une question avant d&apos;acheter ?</span>
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-300/30 bg-violet-500/15 text-violet-200 transition group-open:rotate-45 group-hover:border-violet-300/70 group-hover:bg-violet-500/25">
                <span className="absolute left-1/2 top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
                <span className="absolute left-1/2 top-1/2 h-0.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
              </span>
            </summary>
            <p className="px-4 pb-4 text-sm leading-6 text-gray-300">
              Oui, tu peux utiliser la page contact pour une question sur une carte,
              une commande ou une demande précise.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}

function VerifiedIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M12 3 4.5 6v5.5c0 4.7 3.2 7.8 7.5 9.5 4.3-1.7 7.5-4.8 7.5-9.5V6L12 3Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function StockIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M3 6h11v10H3z" />
      <path d="M14 9h4l3 3v4h-7z" />
      <path d="M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M17 19a2 2 0 1 0 0-4 2 2 0 1 0 0 4Z" />
    </svg>
  );
}
