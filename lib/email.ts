import { normalizeSiteUrl } from "@/lib/site-url";

type SendOrderShippedEmailInput = {
  to: string;
  customerName: string | null;
  orderId: string;
  trackingNumber: string;
  labelUrl: string | null;
};

type SendOrderReviewRequestEmailInput = {
  to: string;
  customerName: string | null;
  orderId: string;
};

type SendRestockEmailInput = {
  to: string;
  cardName: string;
  cardNumber: string;
  variantLabel: string;
  cardUrl: string;
};

export async function sendOrderShippedEmail({
  to,
  customerName,
  orderId,
  trackingNumber,
  labelUrl,
}: SendOrderShippedEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getFromAddress();

  if (!apiKey || !from) {
    throw new Error(
      "Email non configure. Ajoute RESEND_API_KEY et EMAIL_FROM dans les variables d'environnement.",
    );
  }

  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );
  const trackingUrl = `${siteUrl}/commande/${orderId}`;
  const firstName = customerName?.trim() || "Client";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Votre commande PokeDel est expédiée",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h1 style="font-size:22px;margin:0 0 16px">Votre commande est expédiée</h1>
          <p>Bonjour ${escapeHtml(firstName)},</p>
          <p>Votre commande PokeDel a été expédiée.</p>
          <p>
            Numéro de suivi Mondial Relay :
            <strong>${escapeHtml(trackingNumber)}</strong>
          </p>
          <p>
            Vous pouvez suivre votre commande ici :
            <a href="${trackingUrl}">${trackingUrl}</a>
          </p>
          ${
            labelUrl
              ? `<p>Bordereau / suivi : <a href="${escapeHtml(labelUrl)}">${escapeHtml(labelUrl)}</a></p>`
              : ""
          }
          <p>Merci pour votre confiance.</p>
          <p>L'équipe PokeDel</p>
        </div>
      `,
      text: [
        `Bonjour ${firstName},`,
        "",
        "Votre commande PokeDel a été expédiée.",
        `Numéro de suivi Mondial Relay : ${trackingNumber}`,
        `Suivi de commande : ${trackingUrl}`,
        labelUrl ? `Bordereau / suivi : ${labelUrl}` : "",
        "",
        "Merci pour votre confiance.",
        "L'équipe PokeDel",
      ]
        .filter(Boolean)
        .join("\n"),
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message || "Le service email a refusé l'envoi du message.",
    );
  }
}

export async function sendOrderReviewRequestEmail({
  to,
  customerName,
  orderId,
}: SendOrderReviewRequestEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getFromAddress();

  if (!apiKey || !from) {
    throw new Error(
      "Email non configure. Ajoute RESEND_API_KEY et EMAIL_FROM dans les variables d'environnement.",
    );
  }

  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );
  const reviewUrl = `${siteUrl}/avis`;
  const orderUrl = `${siteUrl}/commande/${orderId}`;
  const firstName = customerName?.trim() || "Client";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Votre avis compte pour PokeDel",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h1 style="font-size:22px;margin:0 0 16px">Merci pour votre commande</h1>
          <p>Bonjour ${escapeHtml(firstName)},</p>
          <p>Votre colis a bien été retiré. J'espère que votre commande vous plaît.</p>
          <p>Si vous avez une minute, votre avis aide beaucoup la boutique.</p>
          <p>
            <a href="${reviewUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">
              Laisser un avis
            </a>
          </p>
          <p style="font-size:13px;color:#4b5563">
            Vous pouvez aussi retrouver votre commande ici :
            <a href="${orderUrl}">${orderUrl}</a>
          </p>
          <p>Merci encore pour votre confiance.</p>
          <p>L'équipe PokeDel</p>
        </div>
      `,
      text: [
        `Bonjour ${firstName},`,
        "",
        "Votre colis a bien été retiré. J'espère que votre commande vous plaît.",
        "Si vous avez une minute, votre avis aide beaucoup la boutique.",
        "",
        `Laisser un avis : ${reviewUrl}`,
        `Suivi de commande : ${orderUrl}`,
        "",
        "Merci encore pour votre confiance.",
        "L'équipe PokeDel",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message || "Le service email a refusé l'envoi du message.",
    );
  }
}

export async function sendRestockEmail({
  to,
  cardName,
  cardNumber,
  variantLabel,
  cardUrl,
}: SendRestockEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getFromAddress();

  if (!apiKey || !from) {
    throw new Error(
      "Email non configure. Ajoute RESEND_API_KEY et EMAIL_FROM dans les variables d'environnement.",
    );
  }

  const safeCardName = escapeHtml(cardName);
  const safeCardNumber = escapeHtml(cardNumber);
  const safeVariantLabel = escapeHtml(variantLabel);
  const safeCardUrl = escapeHtml(cardUrl);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Votre alerte PokeDel",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <p>Bonjour,</p>
          <p>Vous aviez demandé à être prévenu pour cette carte :</p>
          <p>
            <strong>${safeCardName}</strong><br />
            ${safeCardNumber} - ${safeVariantLabel}
          </p>
          <p>Elle est maintenant disponible sur PokeDel.</p>
          <p>
            Voir la carte :
            <a href="${safeCardUrl}">${safeCardUrl}</a>
          </p>
          <p>L'équipe PokeDel</p>
        </div>
      `,
      text: [
        "Bonjour,",
        "",
        "Vous aviez demandé à être prévenu pour cette carte :",
        `${cardName} - ${cardNumber} - ${variantLabel}`,
        "",
        "Elle est maintenant disponible sur PokeDel.",
        "",
        `Voir la carte : ${cardUrl}`,
        "",
        "L'équipe PokeDel",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message || "Le service email a refusé l'envoi du message.",
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFromAddress(): string | undefined {
  return process.env.EMAIL_FROM ?? process.env.RESEND_FROM;
}
