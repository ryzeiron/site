import "server-only";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

// Stockage des photos de cartes sur Cloudflare R2, via son API compatible S3.
// Les anciennes images restent sur Vercel Blob : voir lib/media.ts pour la
// suppression, qui route vers le bon service selon l'URL.

let clientSingleton: S3Client | null = null;

function readEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

export function isR2Configured(): boolean {
  return Boolean(
    readEnv("R2_ACCOUNT_ID") &&
      readEnv("R2_ACCESS_KEY_ID") &&
      readEnv("R2_SECRET_ACCESS_KEY") &&
      readEnv("R2_BUCKET") &&
      readEnv("R2_PUBLIC_BASE_URL"),
  );
}

function getClient(): S3Client {
  const accountId = readEnv("R2_ACCOUNT_ID");
  const accessKeyId = readEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = readEnv("R2_SECRET_ACCESS_KEY");

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Configuration R2 incomplete.");
  }

  if (!clientSingleton) {
    clientSingleton = new S3Client({
      // R2 ignore la region mais le SDK S3 en exige une.
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  return clientSingleton;
}

export function getPublicBaseUrl(): string {
  const base = readEnv("R2_PUBLIC_BASE_URL");
  if (!base) throw new Error("R2_PUBLIC_BASE_URL manquante.");
  return base.replace(/\/+$/, "");
}

export function isR2Url(value: string | null | undefined): value is string {
  if (typeof value !== "string") return false;

  const base = readEnv("R2_PUBLIC_BASE_URL");
  if (!base) return false;

  return value.startsWith(base.replace(/\/+$/, ""));
}

// Retrouve la cle de l'objet a partir de son URL publique, pour la suppression.
export function keyFromR2Url(url: string): string | null {
  if (!isR2Url(url)) return null;

  const path = url.slice(getPublicBaseUrl().length).replace(/^\/+/, "");
  return path ? decodeURIComponent(path) : null;
}

export async function uploadToR2({
  key,
  body,
  contentType,
}: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  const bucket = readEnv("R2_BUCKET");
  if (!bucket) throw new Error("R2_BUCKET manquante.");

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Les visuels sont immuables : le nom porte deja un identifiant unique.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${getPublicBaseUrl()}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  const bucket = readEnv("R2_BUCKET");
  if (!bucket) throw new Error("R2_BUCKET manquante.");

  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key }),
  );
}
