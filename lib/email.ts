import { normalizeSiteUrl } from "@/lib/site-url";

type SendOrderShippedEmailInput = {
  to: string;
  customerName: string | null;
  orderId: string;
  trackingNumber: string;
  labelUrl: string | null;
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
  const from = process.env.EMAIL_FROM;

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

export async function sendRestockEmail({
  to,
  cardName,
  cardNumber,
  variantLabel,
  cardUrl,
}: SendRestockEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

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
      subject: `${cardName} est de retour en stock`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h1 style="font-size:22px;margin:0 0 16px">Bonne nouvelle : une carte est de retour en stock</h1>
          <p>Bonjour,</p>
          <p>
            La carte <strong>${safeCardName}</strong>
            (${safeCardNumber}, ${safeVariantLabel}) est de nouveau disponible sur PokeDel.
          </p>
          <p>
            Tu peux la retrouver ici :
            <a href="${safeCardUrl}">${safeCardUrl}</a>
          </p>
          <p>Merci pour ta confiance.</p>
          <p>L'équipe PokeDel</p>
        </div>
      `,
      text: [
        "Bonjour,",
        "",
        `Bonne nouvelle : ${cardName} (${cardNumber}, ${variantLabel}) est de retour en stock sur PokeDel.`,
        `Voir la carte : ${cardUrl}`,
        "",
        "Merci pour ta confiance.",
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
