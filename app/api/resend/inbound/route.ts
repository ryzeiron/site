import { Resend } from "resend";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ResendReceivedEvent = {
  type?: string;
  data?: {
    email_id?: string;
    id?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    message_id?: string;
    attachments?: ReceivedAttachment[];
  };
};

type ReceivedAttachment = {
  id?: string;
  filename?: string;
  content_type?: string;
  size?: number;
};

type ReceivedEmail = {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string[];
  subject: string | null;
  html?: string | null;
  text?: string | null;
  message_id?: string | null;
  attachments?: ReceivedAttachment[];
  raw?: {
    download_url?: string;
    expires_at?: string;
  } | null;
};

export async function POST(request: Request) {
  const expectedToken = process.env.RESEND_INBOUND_TOKEN;
  const token = new URL(request.url).searchParams.get("token");

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!apiKey || !from || !adminEmail) {
    return NextResponse.json(
      {
        error:
          "Configuration email manquante. Ajoute RESEND_API_KEY, EMAIL_FROM et ADMIN_EMAIL.",
      },
      { status: 500 },
    );
  }

  let event: ResendReceivedEvent;

  try {
    event = (await request.json()) as ResendReceivedEvent;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const emailId = event.data?.email_id ?? event.data?.id;

  if (!emailId) {
    return NextResponse.json(
      { error: "email_id manquant dans le webhook Resend." },
      { status: 400 },
    );
  }

  const receivedEmail = await getReceivedEmail(apiKey, emailId);
  const fallback = event.data ?? {};
  const originalFrom =
    receivedEmail?.from ?? fallback.from ?? "Expediteur inconnu";
  const originalTo = receivedEmail?.to ?? fallback.to ?? [];
  const originalCc = receivedEmail?.cc ?? fallback.cc ?? [];
  const subject = receivedEmail?.subject ?? fallback.subject ?? "Sans objet";
  const textContent = receivedEmail?.text?.trim() || "";
  const htmlContent = receivedEmail?.html?.trim() || "";
  const rawContent =
    !textContent && !htmlContent && receivedEmail?.raw?.download_url
      ? await getRawEmailContent(receivedEmail.raw.download_url)
      : "";
  const plainContent =
    textContent ||
    stripHtml(htmlContent) ||
    extractReadableRawEmail(rawContent) ||
    `Le contenu du mail n'a pas pu etre recupere automatiquement. ID Resend : ${emailId}`;

  const attachments = receivedEmail?.attachments ?? fallback.attachments ?? [];
  const rawUrl = receivedEmail?.raw?.download_url;
  const replyTo = extractEmail(receivedEmail?.reply_to?.[0] ?? originalFrom);

  const forwardSubject = `Nouveau mail PokeDel : ${subject}`;

  const attachmentText =
    attachments.length > 0
      ? attachments
          .map((file) => {
            const size = file.size ? ` - ${file.size} octets` : "";
            return `- ${file.filename ?? "Piece jointe"}${size}`;
          })
          .join("\n")
      : "Aucune piece jointe.";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h1 style="font-size:20px;margin:0 0 16px">Nouveau mail reçu sur PokeDel</h1>
      <p><strong>De :</strong> ${escapeHtml(originalFrom)}</p>
      <p><strong>À :</strong> ${escapeHtml(originalTo.join(", ") || "-")}</p>
      ${
        originalCc.length > 0
          ? `<p><strong>CC :</strong> ${escapeHtml(originalCc.join(", "))}</p>`
          : ""
      }
      <p><strong>Sujet :</strong> ${escapeHtml(subject)}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0" />
      <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px">${escapeHtml(
        plainContent,
      )}</pre>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0" />
      <p><strong>Pièces jointes :</strong></p>
      <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px">${escapeHtml(
        attachmentText,
      )}</pre>
      ${
        rawUrl
          ? `<p><strong>Email original :</strong> <a href="${escapeHtml(rawUrl)}">Télécharger l'email brut</a></p>`
          : ""
      }
      <p style="font-size:12px;color:#6b7280">
        Pour répondre au client, réponds directement à cet email.
      </p>
    </div>
  `;

  const text = [
    "Nouveau mail recu sur PokeDel",
    "",
    `De : ${originalFrom}`,
    `A : ${originalTo.join(", ") || "-"}`,
    originalCc.length > 0 ? `CC : ${originalCc.join(", ")}` : "",
    `Sujet : ${subject}`,
    "",
    "Message :",
    plainContent,
    "",
    "Pieces jointes :",
    attachmentText,
    "",
    rawUrl ? `Email original : ${rawUrl}` : "",
    "",
    "Pour repondre au client, reponds directement a cet email.",
  ]
    .filter(Boolean)
    .join("\n");

  const sendBody: Record<string, unknown> = {
    from,
    to: adminEmail,
    subject: forwardSubject,
    html,
    text,
  };

  if (replyTo) {
    sendBody.reply_to = replyTo;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sendBody),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return NextResponse.json(
      { error: message || "Impossible de transferer le mail." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

async function getReceivedEmail(
  apiKey: string,
  emailId: string,
): Promise<ReceivedEmail | null> {
  const resend = new Resend(apiKey);
  const result = await resend.emails.receiving.get(emailId);

  if (result.error || !result.data) return null;

  return result.data as ReceivedEmail;
}

async function getRawEmailContent(downloadUrl: string): Promise<string> {
  try {
    const response = await fetch(downloadUrl, { cache: "no-store" });
    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  }
}

function extractReadableRawEmail(value: string): string {
  if (!value) return "";

  const textPart = value.match(
    /Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/i,
  );

  if (textPart?.[1]) {
    return decodeQuotedPrintable(textPart[1]).trim();
  }

  const htmlPart = value.match(
    /Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/i,
  );

  if (htmlPart?.[1]) {
    return stripHtml(decodeQuotedPrintable(htmlPart[1])).trim();
  }

  return "";
}

function decodeQuotedPrintable(value: string): string {
  return value
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/gi, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEmail(value: string | null | undefined): string | null {
  if (!value) return null;

  const match = value.match(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>/);
  if (match?.[1]) return match[1];

  const plain = value.match(/[^<>\s]+@[^<>\s]+\.[^<>\s]+/);
  return plain?.[0] ?? null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
