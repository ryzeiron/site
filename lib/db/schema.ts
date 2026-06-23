import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userDeliveryProfiles = pgTable("user_delivery_profiles", {
  userId: text("user_id").primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  address: text("address"),
  postcode: text("postcode"),
  city: text("city"),
  country: text("country").notNull().default("FR"),
  relayCode: text("relay_code"),
  relayName: text("relay_name"),
  relayAddress: text("relay_address"),
  relayPostcode: text("relay_postcode"),
  relayCity: text("relay_city"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResets = pgTable("password_resets", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockOverrides = pgTable(
  "stock_overrides",
  {
    cardId: text("card_id").notNull(),
    variant: text("variant").notNull(),
    stock: integer("stock").notNull(),
    priceCents: integer("price_cents"),
    rarity: text("rarity"),
    condition: text("condition"),
    image: text("image"),
    imageBack: text("image_back"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.variant] })],
);

export const hiddenVariants = pgTable(
  "hidden_variants",
  {
    cardId: text("card_id").notNull(),
    variant: text("variant").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.variant] })],
);

export const processedEvents = pgTable("processed_events", {
  eventId: text("event_id").primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockReservations = pgTable(
  "stock_reservations",
  {
    reservationId: text("reservation_id").notNull(),
    stripeSessionId: text("stripe_session_id"),
    cardId: text("card_id").notNull(),
    variant: text("variant").notNull(),
    quantity: integer("quantity").notNull(),
    status: text("status").notNull().default("reserved"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.reservationId, t.cardId, t.variant] })],
);

export const favoriteCards = pgTable(
  "favorite_cards",
  {
    userId: text("user_id").notNull(),
    cardId: text("card_id").notNull(),
    variant: text("variant").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.cardId, t.variant] })],
);

export const favoriteSleeves = pgTable(
  "favorite_sleeves",
  {
    userId: text("user_id").notNull(),
    sleeveId: text("sleeve_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.sleeveId] })],
);

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  status: text("status").notNull().default("approved"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cardOverrides = pgTable("card_overrides", {
  cardId: text("card_id").primaryKey(),
  name: text("name"),
  condition: text("condition"),
  image: text("image"),
  imageBack: text("image_back"),
  description: text("description"),
  weightGrams: integer("weight_grams"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  stripeSessionId: text("stripe_session_id").notNull(),
  userId: text("user_id"),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  country: text("country"),
  relayCode: text("relay_code"),
  relayName: text("relay_name"),
  relayAddress: text("relay_address"),
  relayPostcode: text("relay_postcode"),
  relayCity: text("relay_city"),
  mondialRelayExpeditionNumber: text("mondial_relay_expedition_number"),
  mondialRelayLabelUrl: text("mondial_relay_label_url"),
  mondialRelayError: text("mondial_relay_error"),
  status: text("status").notNull().default("paid"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderAnalytics = pgTable("order_analytics", {
  orderId: text("order_id").primaryKey(),
  stripeSessionId: text("stripe_session_id").notNull(),
  amountSubtotalCents: integer("amount_subtotal_cents"),
  amountTotalCents: integer("amount_total_cents"),
  shippingTotalCents: integer("shipping_total_cents"),
  discountTotalCents: integer("discount_total_cents"),
  currency: text("currency").notNull().default("eur"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activeVisitors = pgTable("active_visitors", {
  visitorId: text("visitor_id").primaryKey(),
  userId: text("user_id"),
  userEmail: text("user_email"),
  path: text("path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CartSnapshotItem = {
  type: "card" | "sleeve";
  id: string;
  variant?: string;
  name: string;
  number?: string;
  serieName?: string;
  image?: string | null;
  rarity?: string;
  condition?: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  href: string;
};

export const cartSnapshots = pgTable("cart_snapshots", {
  cartId: text("cart_id").primaryKey(),
  userId: text("user_id"),
  userEmail: text("user_email"),
  userName: text("user_name"),
  itemCount: integer("item_count").notNull().default(0),
  totalCents: integer("total_cents").notNull().default(0),
  items: jsonb("items").notNull().$type<CartSnapshotItem[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderPreparationItems = pgTable(
  "order_preparation_items",
  {
    orderId: text("order_id").notNull(),
    itemKey: text("item_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.orderId, t.itemKey] })],
);

export const sleeveOverrides = pgTable("sleeve_overrides", {
  sleeveId: text("sleeve_id").primaryKey(),
  priceCents: integer("price_cents").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  active: boolean("active").notNull().default(true),
  image: text("image"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: text("id").primaryKey(),
  subject: text("subject").notNull(),
  email: text("email").notNull(),
  name: text("name"),
  phone: text("phone"),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  adminResponse: text("admin_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
