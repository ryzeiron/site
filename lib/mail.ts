import "server-only";
import { Resend } from "resend";

let resendSingleton: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resendSingleton) {
    resendSingleton = new Resend(key);
  }
  return resendSingleton;
}

function getFromAddress(): string {
  return (
    process.env.RESEND_FROM ?? "PokeDel <onboarding@resend.dev>"
  );
}

function getAdminEmail(): string | null {
  return process.env.ADMIN_EMAIL ?? null;
}

export type SendArgs = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
};

export async function sendMail(args: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY manquante" };
  }
  try {
    const res = await resend.emails.send({
      from: getFromAddress(),
      to: args.to,
      subject: args.subject,
      text: args.text ?? "",
      html: args.html,
      replyTo: args.replyTo,
    });
    if (res.error) {
      return { ok: false, error: res.error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function sendToAdmin(args: Omit<SendArgs, "to">): Promise<{ ok: boolean; error?: string }> {
  const admin = getAdminEmail();
  if (!admin) return { ok: false, error: "ADMIN_EMAIL manquante" };
  return sendMail({ ...args, to: admin });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function ticketAdminEmail(opts: {
  id: string;
  subject: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  message: string;
}) {
  const text = `Nouveau ticket recu sur PokeDel

Sujet : ${opts.subject}
De : ${opts.name ? `${opts.name} <${opts.email}>` : opts.email}
${opts.phone ? `Telephone : ${opts.phone}\n` : ""}
Message :
${opts.message}

---
Repondre depuis : /admin/tickets
ID : ${opts.id}
`;
  const html = `
<div style="font-family: system-ui, sans-serif; line-height: 1.5;">
  <h2 style="color: #6d28d9;">Nouveau ticket sur PokeDel</h2>
  <table style="border-collapse: collapse;">
    <tr><td style="color: #666;">Sujet :</td><td><strong>${escapeHtml(opts.subject)}</strong></td></tr>
    <tr><td style="color: #666;">De :</td><td>${escapeHtml(opts.name ? `${opts.name} <${opts.email}>` : opts.email)}</td></tr>
    ${opts.phone ? `<tr><td style="color: #666;">Telephone :</td><td>${escapeHtml(opts.phone)}</td></tr>` : ""}
  </table>
  <h3 style="margin-top: 1em;">Message :</h3>
  <blockquote style="border-left: 3px solid #c4b5fd; padding-left: 12px; color: #333; white-space: pre-wrap;">${escapeHtml(opts.message)}</blockquote>
  <p style="font-size: 12px; color: #888; margin-top: 2em;">
    ID : ${opts.id}<br/>
    Repondre depuis le panneau admin /admin/tickets
  </p>
</div>`;
  return { text, html };
}

export function orderAdminEmail(opts: {
  orderId: string;
  amount: string;
  customerEmail?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  country?: string | null;
  relayName?: string | null;
  relayAddress?: string | null;
  relayPostcode?: string | null;
  relayCity?: string | null;
  relayCode?: string | null;
}) {
  const lines = [
    `Nouvelle commande payee sur PokeDel`,
    ``,
    `Montant : ${opts.amount}`,
    `Client : ${opts.customerName ?? ""} <${opts.customerEmail ?? "?"}>`,
    opts.customerPhone ? `Telephone : ${opts.customerPhone}` : null,
    opts.country ? `Pays : ${opts.country}` : null,
    ``,
    `Point relais Mondial Relay :`,
    `  ${opts.relayName ?? ""}`,
    `  ${opts.relayAddress ?? ""}`,
    `  ${opts.relayPostcode ?? ""} ${opts.relayCity ?? ""}`,
    `  Code : ${opts.relayCode ?? "?"}`,
    ``,
    `ID : ${opts.orderId}`,
  ]
    .filter((x) => x !== null)
    .join("\n");
  return { text: lines };
}

export function passwordResetEmail(opts: {
  resetUrl: string;
  email: string;
}) {
  const text = `Bonjour,

Une demande de reinitialisation de mot de passe a ete faite pour le compte ${opts.email} sur PokeDel.

Pour choisir un nouveau mot de passe, ouvre ce lien (valide 1h) :
${opts.resetUrl}

Si tu n'as pas demande cette reinitialisation, ignore cet email.

L'equipe PokeDel
`;
  const html = `
<div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #333;">
  <h2 style="color: #6d28d9;">Reinitialisation de ton mot de passe PokeDel</h2>
  <p>Une demande de reinitialisation a ete faite pour le compte <strong>${escapeHtml(opts.email)}</strong>.</p>
  <p>
    <a href="${opts.resetUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
      Choisir un nouveau mot de passe
    </a>
  </p>
  <p style="font-size: 12px; color: #888;">Ce lien est valide pendant 1 heure.<br/>Si tu n'as pas demande cette reinitialisation, ignore cet email.</p>
</div>`;
  return { text, html };
}

export function customerOrderEmail(opts: {
  orderId: string;
  amount: string;
  relayName?: string | null;
  relayAddress?: string | null;
  relayPostcode?: string | null;
  relayCity?: string | null;
  trackUrl?: string;
}) {
  const text = `Merci pour votre commande PokeDel !

Montant : ${opts.amount}
Numero de commande : ${opts.orderId}

${opts.relayName ? `Point relais : ${opts.relayName}\n${opts.relayAddress ?? ""}\n${opts.relayPostcode ?? ""} ${opts.relayCity ?? ""}\n` : ""}
Vous recevrez un nouvel email avec le numero de suivi des l'expedition.
${opts.trackUrl ? `\nSuivi de votre commande : ${opts.trackUrl}` : ""}

A bientot,
L'equipe PokeDel
`;
  return { text };
}
