import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type Stripe from "stripe";
import AdminCatalogTabs from "@/components/AdminCatalogTabs";
import AdminPromoCreator from "@/components/AdminPromoCreator";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type PromoRow = {
  id: string;
  code: string;
  discount: string;
  active: boolean;
  redemptions: string;
  expiresAt: string;
  customer: string;
};

export default async function AdminPromosPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const promoResult = await getRecentPromos();

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Codes promo</h1>
          <p className="mt-1 text-sm text-gray-400">
            Cree des bons directement dans Stripe, utilisables dans le panier.
          </p>
        </div>

        <LogoutButton />
      </div>

      <AdminCatalogTabs active="promos" />

      <div className="mb-6 flex flex-wrap gap-3">
        <AdminLink href="/admin/dashboard">Accueil admin</AdminLink>
        <AdminLink href="/admin/commandes">Commandes</AdminLink>
        <AdminLink href="/admin/analyse">Analyse</AdminLink>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminPromoCreator />

        <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
          <h2 className="mb-4 text-xl font-bold text-white">Derniers codes Stripe</h2>

          {!promoResult.ready ? (
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
              Impossible de lire Stripe pour le moment. Verifie la cle secrete Stripe.
            </div>
          ) : promoResult.rows.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun code promo trouve.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-gray-500">
                  <tr className="border-b border-white/10">
                    <th className="py-3 pr-4">Code</th>
                    <th className="py-3 pr-4">Reduction</th>
                    <th className="py-3 pr-4">Client</th>
                    <th className="py-3 pr-4">Utilisations</th>
                    <th className="py-3 pr-4">Fin</th>
                    <th className="py-3">Etat</th>
                  </tr>
                </thead>
                <tbody>
                  {promoResult.rows.map((promo) => (
                    <tr key={promo.id} className="border-b border-white/5 text-gray-200">
                      <td className="py-3 pr-4 font-bold text-white">{promo.code}</td>
                      <td className="py-3 pr-4">{promo.discount}</td>
                      <td className="py-3 pr-4">{promo.customer}</td>
                      <td className="py-3 pr-4">{promo.redemptions}</td>
                      <td className="py-3 pr-4">{promo.expiresAt}</td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            promo.active
                              ? "bg-emerald-500/15 text-emerald-200"
                              : "bg-white/10 text-gray-400"
                          }`}
                        >
                          {promo.active ? "actif" : "inactif"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

async function getRecentPromos() {
  try {
    const stripe = getStripe();
    const promotionCodes = await stripe.promotionCodes.list({
      active: true,
      expand: ["data.promotion.coupon", "data.customer"],
      limit: 30,
    });

    return {
      ready: true,
      rows: promotionCodes.data.map(formatPromotionCode),
    };
  } catch {
    return { ready: false, rows: [] as PromoRow[] };
  }
}

function formatPromotionCode(promo: Stripe.PromotionCode): PromoRow {
  const coupon = getCoupon(promo);
  const customer = promo.customer;
  const customerEmail =
    customer && typeof customer !== "string" && !("deleted" in customer)
      ? customer.email
      : null;

  return {
    id: promo.id,
    code: promo.code,
    discount: coupon ? formatCoupon(coupon) : "-",
    active: promo.active && Boolean(coupon?.valid),
    redemptions: `${promo.times_redeemed ?? 0}/${
      promo.max_redemptions ?? "illimite"
    }`,
    expiresAt: promo.expires_at ? formatDate(promo.expires_at) : "-",
    customer: customerEmail || "Tous",
  };
}

function getCoupon(promo: Stripe.PromotionCode) {
  const coupon = promo.promotion.coupon;
  return typeof coupon === "string" ? null : coupon;
}

function formatCoupon(coupon: Stripe.Coupon) {
  if (coupon.percent_off) return `-${coupon.percent_off}%`;
  if (coupon.amount_off && coupon.currency?.toLowerCase() === "eur") {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(coupon.amount_off / 100);
  }

  return "-";
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function AdminLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
    >
      {children}
    </Link>
  );
}
