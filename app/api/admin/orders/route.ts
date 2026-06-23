import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { orderPreparationItems, orders, stockReservations } from "@/lib/db/schema";
import { discordAdminUrl, sendDiscordNotification } from "@/lib/discord";
import {
  sendOrderReviewRequestEmail,
  sendOrderShippedEmail,
} from "@/lib/email";

type OrderStatus =
  | "paid"
  | "label_to_create"
  | "label_created"
  | "shipped"
  | "picked_up";

type Body = {
  orderId?: string;
  status?: string;
  expeditionNumber?: string;
  labelUrl?: string;
  sendShippingEmail?: boolean;
  sendReviewEmail?: boolean;
};

const ALLOWED_STATUSES: OrderStatus[] = [
  "paid",
  "label_to_create",
  "label_created",
  "shipped",
  "picked_up",
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  paid: "Commande payee",
  label_to_create: "A preparer",
  label_created: "Prete a deposer",
  shipped: "Colis a retirer",
  picked_up: "Colis retire",
};

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: Body;

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const status = body.status?.trim();
  const expeditionNumber = cleanOptional(body.expeditionNumber);
  const labelUrl = cleanOptional(body.labelUrl);

  if (!orderId) {
    return NextResponse.json({ error: "Commande invalide." }, { status: 400 });
  }

  if (!status || !isOrderStatus(status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  if (labelUrl && !isValidUrl(labelUrl)) {
    return NextResponse.json(
      { error: "Lien de bordereau invalide." },
      { status: 400 },
    );
  }

  try {
    const db = getDb();

    const existingRows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    const existingOrder = existingRows[0];

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Commande introuvable." },
        { status: 404 },
      );
    }

    const shouldSendShippingEmail =
      status === "shipped" &&
      (body.sendShippingEmail === true || existingOrder.status !== "shipped");
    const shouldSendReviewEmail =
      status === "picked_up" && body.sendReviewEmail === true;

    if (shouldSendShippingEmail || shouldSendReviewEmail) {
      if (!existingOrder.customerEmail) {
        return NextResponse.json(
          { error: "Email client introuvable pour cette commande." },
          { status: 400 },
        );
      }
    }

    if (shouldSendShippingEmail) {
      if (!expeditionNumber) {
        return NextResponse.json(
          { error: "Numéro de suivi obligatoire pour passer la commande en colis à retirer." },
          { status: 400 },
        );
      }

      await sendOrderShippedEmail({
        to: existingOrder.customerEmail!,
        customerName: existingOrder.customerName,
        orderId: existingOrder.stripeSessionId,
        trackingNumber: expeditionNumber,
        labelUrl,
      });
    }

    if (shouldSendReviewEmail) {
      await sendOrderReviewRequestEmail({
        to: existingOrder.customerEmail!,
        customerName: existingOrder.customerName,
        orderId: existingOrder.stripeSessionId,
      });
    }

    await db
      .update(orders)
      .set({
        status,
        mondialRelayExpeditionNumber: expeditionNumber,
        mondialRelayLabelUrl: labelUrl,
        mondialRelayError: null,
      })
      .where(eq(orders.id, orderId));

    if (existingOrder.status !== status) {
      const channel =
        status === "paid" || status === "label_to_create"
          ? "preparation"
          : "orders";

      await sendDiscordNotification(channel, {
        title:
          status === "picked_up"
            ? "Colis retire par le client"
            : "Statut de commande modifie",
        description:
          status === "picked_up"
            ? `Le colis est bien dans les mains du destinataire. [Ouvrir les commandes admin](${discordAdminUrl("/admin/commandes")})`
            : `[Ouvrir les commandes admin](${discordAdminUrl("/admin/commandes")})`,
        fields: [
          { name: "Commande", value: orderId, inline: false },
          {
            name: "Ancien statut",
            value: STATUS_LABELS[existingOrder.status as OrderStatus] ?? existingOrder.status,
            inline: true,
          },
          { name: "Nouveau statut", value: STATUS_LABELS[status], inline: true },
          { name: "Client", value: existingOrder.customerEmail, inline: false },
        ],
      }).catch(() => false);
    }

    return NextResponse.json({
      ok: true,
      emailSent: shouldSendShippingEmail,
      reviewEmailSent: shouldSendReviewEmail,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: Pick<Body, "orderId">;

  try {
    body = (await request.json()) as Pick<Body, "orderId">;
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const orderId = body.orderId?.trim();

  if (!orderId) {
    return NextResponse.json({ error: "Commande invalide." }, { status: 400 });
  }

  try {
    const db = getDb();
    const existingRows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    const existingOrder = existingRows[0];

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Commande introuvable." },
        { status: 404 },
      );
    }

    await db
      .delete(orderPreparationItems)
      .where(eq(orderPreparationItems.orderId, orderId))
      .catch(() => undefined);

    await db
      .delete(stockReservations)
      .where(eq(stockReservations.stripeSessionId, existingOrder.stripeSessionId))
      .catch(() => undefined);

    await db.delete(orders).where(eq(orders.id, orderId));

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function cleanOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isOrderStatus(value: string): value is OrderStatus {
  return ALLOWED_STATUSES.includes(value as OrderStatus);
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
