import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AdminCatalogTabs from "@/components/AdminCatalogTabs";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { BLOCS, SERIES } from "@/lib/catalog";
import { DEFAULT_WHATNOT_OPTIONS } from "@/lib/whatnot-export";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white";

export default async function AdminWhatnotPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const d = DEFAULT_WHATNOT_OPTIONS;
  const blocsWithSeries = BLOCS.map((bloc) => ({
    bloc,
    series: SERIES.filter((serie) => serie.blocId === bloc.id),
  })).filter((group) => group.series.length > 0);

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Export Whatnot</h1>
          <p className="mt-1 text-sm text-gray-400">
            Télécharge ton inventaire au format CSV de Whatnot pour l'importer en
            une fois au lieu de tout créer à la main.
          </p>
        </div>
        <LogoutButton />
      </div>

      <AdminCatalogTabs active="whatnot" />

      <form
        action="/api/admin/export/whatnot"
        method="get"
        className="grid gap-6 rounded-2xl border border-white/10 bg-zinc-950/70 p-5 lg:grid-cols-2"
      >
        <input type="hidden" name="submitted" value="1" />

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">Cartes à exporter</h2>

          <Field label="Série ou bloc" hint="Commence par une seule série pour tester l'import.">
            <select name="scope" defaultValue="" className={inputClass}>
              <option value="">Tout l'inventaire en stock</option>
              {blocsWithSeries.map(({ bloc, series }) => (
                <optgroup key={bloc.id} label={bloc.name}>
                  <option value={`bloc:${bloc.id}`}>Tout le bloc {bloc.name}</option>
                  {series.map((serie) => (
                    <option key={serie.id} value={`serie:${serie.id}`}>
                      {serie.code} - {serie.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          <Field label="Prix minimum (€)" hint="0 = toutes les cartes. Ex. 2 pour ignorer les petites cartes.">
            <input name="minPrice" inputMode="decimal" defaultValue={d.minPrice} className={inputClass} />
          </Field>

          <Field
            label="Quantité max par carte"
            hint="0 = tout le stock. Ex. 1 pour garder le reste en vente sur le site."
          >
            <input name="maxQuantity" inputMode="numeric" defaultValue={d.maxQuantity} className={inputClass} />
          </Field>

          <Field
            label="Ajustement du prix (%)"
            hint="0 = prix du site. Ex. 10 pour +10 % (frais Whatnot), -5 pour -5 %."
          >
            <input
              name="priceAdjustPercent"
              inputMode="decimal"
              defaultValue={d.priceAdjustPercent}
              className={inputClass}
            />
          </Field>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">Champs Whatnot</h2>
          <p className="text-xs text-amber-200">
            Ces valeurs doivent correspondre exactement à celles du modèle CSV de ton
            compte Whatnot (Seller Hub, Inventaire, Importer, Télécharger le modèle).
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Catégorie">
              <input name="category" defaultValue={d.category} className={inputClass} />
            </Field>
            <Field label="Sous-catégorie">
              <input name="subCategory" defaultValue={d.subCategory} className={inputClass} />
            </Field>
            <Field label="Type de vente">
              <select name="type" defaultValue={d.type} className={inputClass}>
                <option value="Buy it Now">Achat immédiat (Buy it Now)</option>
                <option value="Auction">Enchère (Auction)</option>
              </select>
            </Field>
            <Field label="Profil d'expédition">
              <input name="shippingProfile" defaultValue={d.shippingProfile} className={inputClass} />
            </Field>
            <Field label="Produits dangereux">
              <input name="hazmat" defaultValue={d.hazmat} className={inputClass} />
            </Field>
            <Field label="État">
              <input name="condition" defaultValue={d.condition} className={inputClass} />
            </Field>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-gray-200">
            <input
              type="checkbox"
              name="offerable"
              value="1"
              defaultChecked={d.offerable}
              className="accent-emerald-500"
            />
            Accepter les offres
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-emerald-400"
          >
            Télécharger le CSV Whatnot
          </button>
          <p className="text-xs text-gray-400">
            Une ligne par carte et par variante en stock (Normale, Reverse…). Le SKU
            reprend l'identifiant du site pour retrouver la carte.
          </p>
        </div>
      </form>

      <div className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
        Le stock n'est pas synchronisé : une carte vendue sur Whatnot reste en vente
        sur le site. Pense à baisser le stock dans l'admin après le live, ou utilise
        « Quantité max par carte » pour ne mettre qu'une partie du stock sur Whatnot.
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold text-gray-200">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-gray-400">{hint}</span> : null}
    </label>
  );
}
