import "server-only";
import { getSql } from "@/lib/db/client";
import type { VariantKey } from "@/lib/catalog";

export type StockReservationItem = {
  cardId: string;
  variant: VariantKey;
  quantity: number;
  initialStock: number;
};

export async function reserveStockItems(
  reservationId: string,
  items: StockReservationItem[],
) {
  if (items.length === 0) return;

  const sql = getSql();

  try {
    await sql.transaction((tx) =>
      items.map((item) => {
        const variant = String(item.variant);

        return tx`
          WITH ensure_stock_row AS (
            INSERT INTO stock_overrides (card_id, variant, stock)
            VALUES (${item.cardId}, ${variant}, ${item.initialStock})
            ON CONFLICT (card_id, variant) DO NOTHING
          ),
          updated_stock AS (
            UPDATE stock_overrides
            SET stock = stock - ${item.quantity}, updated_at = now()
            WHERE card_id = ${item.cardId}
              AND variant = ${variant}
              AND stock >= ${item.quantity}
            RETURNING card_id, variant
          ),
          guard AS (
            SELECT CASE
              WHEN EXISTS (SELECT 1 FROM updated_stock) THEN 1
              ELSE 1 / 0
            END AS ok
          )
          INSERT INTO stock_reservations (
            reservation_id,
            card_id,
            variant,
            quantity,
            status,
            created_at,
            updated_at
          )
          SELECT
            ${reservationId},
            ${item.cardId},
            ${variant},
            ${item.quantity},
            'reserved',
            now(),
            now()
          FROM guard
          RETURNING reservation_id
        `;
      }),
    );
  } catch {
    throw new Error(
      "Stock insuffisant : une carte du panier vient peut-etre d'etre reservee par un autre client.",
    );
  }
}

export async function confirmStockReservation(
  reservationId: string,
  stripeSessionId: string,
) {
  const sql = getSql();

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
  const sql = getSql();

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
