import Link from "next/link";
import BlocTile from "@/components/BlocTile";
import { BLOCS } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const blocsLoop = [...BLOCS, ...BLOCS];

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
            État, langue, rareté et visuel sont vérifiés avant la mise en vente.
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
            Les quantités sont suivies automatiquement pour éviter les doubles
            ventes.
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
            Chaque commande est préparée avec soin et suivie jusqu&apos;au point
            relais.
          </p>
        </div>
      </section>

      <section className="rounded-2xl bg-gradient-to-br from-violet-900/60 via-purple-900/50 to-zinc-950/70 backdrop-blur-sm border border-white/10 p-6 md:p-10 text-gray-100">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Les blocs
            </h1>
            <p className="mt-2 text-gray-300">
              Explorez les séries par bloc.
            </p>
          </div>
          <Link
            href="/blocs"
            className="hidden sm:inline-flex rounded-full bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 font-medium transition"
          >
            Tout parcourir
          </Link>
        </div>

        <div className="marquee-container relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
          <div className="marquee-track flex gap-4">
            {blocsLoop.map((b, i) => (
              <div
                key={`${b.id}-${i}`}
                className={`w-72 sm:w-80 shrink-0 ${
                  i >= BLOCS.length ? "marquee-duplicate" : ""
                }`}
              >
                <BlocTile bloc={b} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-zinc-950/75 backdrop-blur-sm border border-white/10 p-6 md:p-10 text-gray-100">
        <div className="mb-6">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            FAQ
          </h2>
          <p className="mt-2 text-gray-300">
            Les réponses aux questions les plus fréquentes avant de commander.
          </p>
        </div>

        <div className="space-y-3">
          <details className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <summary className="cursor-pointer list-none font-semibold text-white">
              Le stock affiché est-il vraiment disponible ?
            </summary>
            <p className="mt-3 text-sm leading-6 text-gray-300">
              Oui. Les quantités sont mises à jour automatiquement après les
              paiements validés pour limiter les doubles ventes.
            </p>
          </details>

          <details className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <summary className="cursor-pointer list-none font-semibold text-white">
              Comment se passe la livraison ?
            </summary>
            <p className="mt-3 text-sm leading-6 text-gray-300">
              Les commandes sont préparées avec soin puis expédiées en point
              relais. Un numéro de suivi est envoyé dès que le colis est expédié.
            </p>
          </details>

          <details className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <summary className="cursor-pointer list-none font-semibold text-white">
              Comment suivre ma commande ?
            </summary>
            <p className="mt-3 text-sm leading-6 text-gray-300">
              Le lien de suivi est envoyé par email après le paiement. Tu peux
              aussi retrouver le suivi avec le numéro de commande reçu par mail.
            </p>
          </details>

          <details className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <summary className="cursor-pointer list-none font-semibold text-white">
              Les cartes sont-elles vérifiées ?
            </summary>
            <p className="mt-3 text-sm leading-6 text-gray-300">
              Oui. L&apos;état, la langue, la rareté et le visuel sont contrôlés
              avant la mise en vente.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}

function VerifiedIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M12 3 4.5 6v5.5c0 4.7 3.2 7.8 7.5 9.5 4.3-1.7 7.5-4.8 7.5-9.5V6L12 3Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function StockIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M3 6h11v10H3z" />
      <path d="M14 9h4l3 3v4h-7z" />
      <path d="M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </svg>
  );
}
