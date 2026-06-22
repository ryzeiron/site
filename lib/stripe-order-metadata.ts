import "server-only";

import type Stripe from "stripe";
import { deflateRawSync, inflateRawSync } from "zlib";

const META_VALUE_MAX = 450;
const COMPRESSED_ENCODING = "deflate64";

export function encodeCompactMetadata(
  key: "items" | "sleeves",
  value: unknown,
): Record<string, string> {
  const json = JSON.stringify(value);

  if (json.length <= META_VALUE_MAX) {
    return { [key]: json, [`${key}_parts`]: "1" };
  }

  const compressed = deflateRawSync(Buffer.from(json, "utf8")).toString(
    "base64",
  );
  const parts: Record<string, string> = {
    [`${key}_encoding`]: COMPRESSED_ENCODING,
  };

  let i = 0;
  for (
    let offset = 0;
    offset < compressed.length;
    offset += META_VALUE_MAX, i++
  ) {
    parts[`${key}_${i}`] = compressed.slice(offset, offset + META_VALUE_MAX);
  }

  parts[`${key}_parts`] = String(i);
  return parts;
}

export function decodeCompactMetadata(
  metadata: Stripe.Metadata | null,
  key: "items" | "sleeves",
): unknown[] {
  if (!metadata) return [];

  const partsCount = Number(metadata[`${key}_parts`] ?? "0");
  const encoding = metadata[`${key}_encoding`];
  let raw = metadata[key] ?? "";

  if (!raw && partsCount > 0) {
    for (let i = 0; i < partsCount; i++) {
      const chunk = metadata[`${key}_${i}`];
      if (!chunk) return [];
      raw += chunk;
    }
  }

  if (!raw) return [];

  try {
    const json =
      encoding === COMPRESSED_ENCODING
        ? inflateRawSync(Buffer.from(raw, "base64")).toString("utf8")
        : raw;
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
