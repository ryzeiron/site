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

const PUBLIC_REVIEWS_CACHE_SECONDS = 3600;
const PUBLIC_REVIEWS_CACHE_TAG = "public-reviews";

async function loadLatestReviews(limit = 3): Promise<LatestReview[]> {
  try {
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
  } catch {
    return [];
  }
}

export const getLatestReviews = unstable_cache(
  loadLatestReviews,
  ["latest-public-reviews-v1"],
  {
    revalidate: PUBLIC_REVIEWS_CACHE_SECONDS,
    tags: [PUBLIC_REVIEWS_CACHE_TAG],
  },
);

export function revalidatePublicReviewsCache() {
  revalidateTag(PUBLIC_REVIEWS_CACHE_TAG);
}
