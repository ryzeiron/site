import "server-only";
import { neon } from "@neondatabase/serverless";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { VariantKey } from "@/lib/catalog";

export type StockReservationItem = {
  cardId: string;
  variant: VariantKey;
  quantity: number;
  initialStock: number;
};

let sqlSingleton: NeonQueryFunction<false, false> | null = null;

function getReservationSql() {
  if (!sqlSingleton) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL manquante. Ajoute-la dans .env.local ou sur Vercel.",
      );
    }
    sqlSingleton = neon(url);
  }

  return sqlSingleton!;
}

export async function reserveStockItems(
  reservationId: string,
  items: StockReservationItem[],
  status: "cart" | "reserved" = "reserved",
) {
  if (items.length === 0) return;

  const sql = getReservationSql();

  type DoneItem = { cardId: string; variant: string; quantity: number };
  const done: DoneItem[] = [];

  async function rollback() {
    for (const it of done) {
      try {
        await sql`
          UPDATE stock_overrides
          SET stock = stock_overrides.stock + ${it.quantity}, updated_at = now()
          WHERE card_id = ${it.cardId} AND variant = ${it.variant}
        `;
        await sql`
          DELETE FROM stock_reservations
          WHERE reservation_id = ${reservationId}
            AND card_id = ${it.cardId}
            AND variant = ${it.variant}
        `;
      } catch {
        // best-effort
      }
    }
  }

  for (const item of items) {
    const variant = String(item.variant);
    let inserted: { reservation_id: string }[] = [];
    try {
      inserted = (await sql`
        WITH upsert AS (
          INSERT INTO stock_overrides (card_id, variant, stock, updated_at)
          VALUES (
            ${item.cardId},
            ${variant},
            ${item.initialStock - item.quantity},
            now()
          )
          ON CONFLICT (card_id, variant) DO UPDATE
            SET stock = stock_overrides.stock - ${item.quantity},
                updated_at = now()
            WHERE stock_overrides.stock >= ${item.quantity}
          RETURNING card_id, variant
        )
        INSERT INTO stock_reservations (
          reservation_id, card_id, variant, quantity, status, created_at, updated_at
        )
        SELECT
          ${reservationId},
          upsert.card_id,
          upsert.variant,
          ${item.quantity},
          ${status},
          now(),
          now()
        FROM upsert
        RETURNING reservation_id
      `) as { reservation_id: string }[];
    } catch (e) {
      await rollback();
      throw e instanceof Error
        ? e
        : new Error("Erreur lors de la réservation du stock.");
    }

    if (inserted.length === 0) {
      await rollback();
      throw new Error(
        "Stock insuffisant : une carte du panier vient peut-être d'être réservée par un autre client.",
      );
    }

    done.push({ cardId: item.cardId, variant, quantity: item.quantity });
  }
}

/**
 * Reconcile a cart's reservations with new items.
 * Releases everything currently reserved as 'cart' for the given cartId,
 * then re-reserves the new items as 'cart'.
 * If insufficient stock, the previous cart reservation is restored.
 */
export async function syncCartReservation(
  cartId: string,
  items: StockReservationItem[],
) {
  const sql = getReservationSql();

  // Get current cart reservations to be able to restore on failure
  const previous = (await sql`
    SELECT card_id, variant, quantity FROM stock_reservations
    WHERE reservation_id = ${cartId} AND status = 'cart'
  `) as { card_id: string; variant: string; quantity: number }[];

  // Release current cart reservations
  await releaseCartReservation(cartId);

  if (items.length === 0) return;

  try {
    await reserveStockItems(cartId, items, "cart");
  } catch (e) {
    // Restore previous cart reservation
    if (previous.length > 0) {
      const restoreItems = previous.map((p) => ({
        cardId: p.card_id,
        variant: p.variant,
        quantity: p.quantity,
        // initialStock unused since the row already exists in stock_overrides
        initialStock: p.quantity,
      }));
      try {
        await reserveStockItems(cartId, restoreItems, "cart");
      } catch {
        // best-effort
      }
    }
    throw e;
  }
}

export async function releaseCartReservation(cartId: string) {
  const sql = getReservationSql();
  // Libère aussi les réservations 'reserved' avec stripe_session_id='pending'
  // (cas : l'utilisateur a clique sur "passer au paiement" puis est revenu
  // en arrière sans payer). On ne touche pas aux réservations confirmées
  // (status='confirmed') ni aux 'reserved' avec un vrai session_id.
  const released = (await sql`
    DELETE FROM stock_reservations
    WHERE reservation_id = ${cartId}
      AND (
        status = 'cart'
        OR (status = 'reserved' AND stripe_session_id = 'pending')
      )
    RETURNING card_id, variant, quantity
  `) as { card_id: string; variant: string; quantity: number }[];

  for (const r of released) {
    await sql`
      UPDATE stock_overrides
      SET stock = stock_overrides.stock + ${r.quantity},
          updated_at = now()
      WHERE card_id = ${r.card_id} AND variant = ${r.variant}
    `;
  }
}

/**
 * Libère les réservations 'cart' inactives depuis plus de N minutes.
 * Retourne le nombre de lignes libérées.
 */
export async function cleanupExpiredCartReservations(
  olderThanMinutes = 30,
): Promise<number> {
  const sql = getReservationSql();
  const rows = (await sql`
    WITH expired AS (
      DELETE FROM stock_reservations
      WHERE status = 'cart'
        AND updated_at < now() - (${olderThanMinutes} || ' minutes')::interval
      RETURNING card_id, variant, quantity
    ),
    restored AS (
      UPDATE stock_overrides
      SET stock = stock_overrides.stock + expired.quantity,
          updated_at = now()
      FROM expired
      WHERE stock_overrides.card_id = expired.card_id
        AND stock_overrides.variant = expired.variant
      RETURNING 1
    )
    SELECT count(*)::int AS n FROM expired
  `) as { n: number }[];
  return rows[0]?.n ?? 0;
}

/**
 * Upgrade an existing cart reservation to a checkout-grade 'reserved' status.
 * Used at checkout to lock the stock for the Stripe session without
 * double-decrementing.
 */
export async function upgradeCartToReserved(
  cartId: string,
  stripeSessionId: string,
): Promise<number> {
  const sql = getReservationSql();
  // Idempotent : upgrade 'cart' OU rafraîchit une 'reserved'+'pending' existante
  // (cas : utilisateur revenu de Stripe sans payer puis re-clique sur paiement).
  const updated = (await sql`
    UPDATE stock_reservations
    SET status = 'reserved',
        stripe_session_id = ${stripeSessionId},
        updated_at = now()
    WHERE reservation_id = ${cartId}
      AND (
        status = 'cart'
        OR (status = 'reserved' AND stripe_session_id = 'pending')
      )
    RETURNING card_id
  `) as { card_id: string }[];
  return updated.length;
}

export async function confirmStockReservation(
  reservationId: string,
  stripeSessionId: string,
) {
  const sql = getReservationSql();

  await sql`
    UPDATE stock_reservations
    SET status = 'confirmed',
        stripe_session_id = ${stripeSessionId},
        updated_at = now()
    WHERE reservation_id = ${reservationId}
      AND status = 'reserved'
  `;
}

export async function releaseStockReservation(reservationId: string) {
  const sql = getReservationSql();

  const released = (await sql`
    UPDATE stock_reservations
    SET status = 'released',
        updated_at = now()
    WHERE reservation_id = ${reservationId}
      AND status = 'reserved'
    RETURNING card_id, variant, quantity
  `) as { card_id: string; variant: string; quantity: number }[];

  for (const r of released) {
    await sql`
      UPDATE stock_overrides
      SET stock = stock_overrides.stock + ${r.quantity},
          updated_at = now()
      WHERE card_id = ${r.card_id} AND variant = ${r.variant}
    `;
  }
}

/**
 * Lit les réservations actives du panier de l'utilisateur (statut 'cart' ou
 * 'reserved'+'pending' pour le cas ou il est revenu de Stripe sans payer).
 * Sert au checkout pour ne pas voir comme "stock 0" ce que l'utilisateur a déjà
 * dans son propre panier.
 */
export async function getCartReservations(
  cartId: string,
): Promise<{ cardId: string; variant: string; quantity: number }[]> {
  const sql = getReservationSql();
  const rows = (await sql`
    SELECT card_id, variant, quantity
    FROM stock_reservations
    WHERE reservation_id = ${cartId}
      AND (
        status = 'cart'
        OR (status = 'reserved' AND stripe_session_id = 'pending')
      )
  `) as { card_id: string; variant: string; quantity: number }[];
  return rows.map((r) => ({
    cardId: r.card_id,
    variant: r.variant,
    quantity: r.quantity,
  }));
}
