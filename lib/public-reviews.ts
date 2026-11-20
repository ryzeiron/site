import "server-only";

import { desc, eq, inArray } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";
import { getDb } from "@/lib/db/client";
import { reviews, users } from "@/lib/db/schema";

export type LatestReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  userName: string;
};

const PUBLIC_REVIEWS_CACHE_SECONDS = 86_400;
const PUBLIC_REVIEWS_CACHE_TAG = "public-reviews";

// Pas de try/catch ici : une erreur n'est pas mise en cache par unstable_cache.
async function loadLatestReviews(limit = 3): Promise<LatestReview[]> {
  {
    const db = getDb();
    const reviewRows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.status, "approved"))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);

    if (reviewRows.length === 0) return [];

    const userIds = Array.from(new Set(reviewRows.map((review) => review.userId)));

    const userRows = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(inArray(users.id, userIds));

    const usersById = new Map(userRows.map((user) => [user.id, user]));

    return reviewRows.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      userName: usersById.get(review.userId)?.name || "Client PokeDel",
    }));
  }
}

const loadCachedLatestReviews = unstable_cache(
  loadLatestReviews,
  ["latest-public-reviews-v1"],
  {
    revalidate: PUBLIC_REVIEWS_CACHE_SECONDS,
    tags: [PUBLIC_REVIEWS_CACHE_TAG],
  },
);

export async function getLatestReviews(limit = 3): Promise<LatestReview[]> {
  try {
    return await loadCachedLatestReviews(limit);
  } catch {
    return [];
  }
}

export type PublicReview = LatestReview & { userId: string };

// Tous les avis de la page /avis (meme contenu qu'avant, mais en cache).
async function loadAllReviews(): Promise<PublicReview[]> {
  const db = getDb();
  const reviewRows = await db
    .select({
      id: reviews.id,
      userId: reviews.userId,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .orderBy(desc(reviews.createdAt));

  if (reviewRows.length === 0) return [];

  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, Array.from(new Set(reviewRows.map((r) => r.userId)))));
  const names = new Map(userRows.map((user) => [user.id, user.name]));

  return reviewRows.map((review) => ({
    ...review,
    userName: names.get(review.userId) || "Client PokeDel",
  }));
}

const loadCachedAllReviews = unstable_cache(loadAllReviews, ["all-public-reviews-v1"], {
  revalidate: PUBLIC_REVIEWS_CACHE_SECONDS,
  tags: [PUBLIC_REVIEWS_CACHE_TAG],
});

export async function getAllPublicReviews(): Promise<PublicReview[]> {
  try {
    return await loadCachedAllReviews();
  } catch {
    return [];
  }
}

export function revalidatePublicReviewsCache() {
  revalidateTag(PUBLIC_REVIEWS_CACHE_TAG);
}
