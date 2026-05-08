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
          'reserved',
          now(),
          now()
        FROM upsert
        RETURNING reservation_id
      `) as { reservation_id: string }[];
    } catch (e) {
      await rollback();
      throw e instanceof Error
        ? e
        : new Error("Erreur lors de la reservation du stock.");
    }

    if (inserted.length === 0) {
      // Stock insuffisant : rollback les precedents et erreur claire
      await rollback();
      throw new Error(
        "Stock insuffisant : une carte du panier vient peut-etre d'etre reservee par un autre client.",
      );
    }

    done.push({ cardId: item.cardId, variant, quantity: item.quantity });
  }
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

  await sql`
    WITH released AS (
      UPDATE stock_reservations
      SET status = 'released',
          updated_at = now()
      WHERE reservation_id = ${reservationId}
        AND status = 'reserved'
      RETURNING card_id, variant, quantity
    )
    UPDATE stock_overrides
    SET stock = stock_overrides.stock + released.quantity,
        updated_at = now()
    FROM released
    WHERE stock_overrides.card_id = released.card_id
      AND stock_overrides.variant = released.variant
  `;
}
