import { createHash } from "crypto";

type CreateMondialRelayLabelInput = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  customerPostcode?: string;
  customerCity?: string;
  country: string;
  relayCode: string;
  relayName?: string;
  weightGrams: number;
};

type MondialRelayLabelResult = {
  expeditionNumber: string;
  labelUrl: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} manquante.`);
  }
  return value;
}

function md5(value: string): string {
  return createHash("md5").update(value, "utf8").digest("hex").toUpperCase();
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildSecurityKey(fields: string[], privateKey: string): string {
  return md5(fields.join("") + privateKey);
}

function readXmlTag(xml: string, tag: string): string {
  return xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, "s"))?.[1] ?? "";
}

export async function createMondialRelayLabel(
  input: CreateMondialRelayLabelInput,
): Promise<MondialRelayLabelResult> {
  const brand = requireEnv("MONDIAL_RELAY_BRAND").padEnd(8, " ").slice(0, 8);
  const privateKey = requireEnv("MONDIAL_RELAY_PRIVATE_KEY");
  const apiUrl =
    process.env.MONDIAL_RELAY_API_URL ??
    "https://api.mondialrelay.fr/WebService.asmx";

  const senderName = requireEnv("MONDIAL_RELAY_SENDER_NAME");
  const senderAddress = requireEnv("MONDIAL_RELAY_SENDER_ADDRESS");
  const senderPostcode = requireEnv("MONDIAL_RELAY_SENDER_POSTCODE");
  const senderCity = requireEnv("MONDIAL_RELAY_SENDER_CITY");
  const senderCountry = process.env.MONDIAL_RELAY_SENDER_COUNTRY ?? "FR";
  const senderPhone = requireEnv("MONDIAL_RELAY_SENDER_PHONE");
  const senderEmail = requireEnv("MONDIAL_RELAY_SENDER_EMAIL");

  const collectionMode = process.env.MONDIAL_RELAY_COLLECTION_MODE ?? "CCC";
  const deliveryMode = process.env.MONDIAL_RELAY_DELIVERY_MODE ?? "24R";
  const labelFormat = process.env.MONDIAL_RELAY_LABEL_FORMAT ?? "PDF_A4";
  const weightGrams = Math.max(1, Math.round(input.weightGrams));

  const security = buildSecurityKey(
    [
      brand,
      collectionMode,
      deliveryMode,
      input.relayCode,
      String(weightGrams),
      input.country,
      input.customerName,
      input.customerEmail,
      input.customerPhone,
    ],
    privateKey,
  );

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <WSI2_CreationEtiquette xmlns="http://www.mondialrelay.fr/webservice/">
      <Enseigne>${escapeXml(brand)}</Enseigne>
      <ModeCol>${escapeXml(collectionMode)}</ModeCol>
      <ModeLiv>${escapeXml(deliveryMode)}</ModeLiv>
      <NDossier>${escapeXml(input.orderId)}</NDossier>
      <NClient>${escapeXml(input.orderId)}</NClient>
      <Expe_Langage>FR</Expe_Langage>
      <Expe_Ad1>${escapeXml(senderName)}</Expe_Ad1>
      <Expe_Ad3>${escapeXml(senderAddress)}</Expe_Ad3>
      <Expe_Ville>${escapeXml(senderCity)}</Expe_Ville>
      <Expe_CP>${escapeXml(senderPostcode)}</Expe_CP>
      <Expe_Pays>${escapeXml(senderCountry)}</Expe_Pays>
      <Expe_Tel1>${escapeXml(senderPhone)}</Expe_Tel1>
      <Expe_Mail>${escapeXml(senderEmail)}</Expe_Mail>
      <Dest_Langage>FR</Dest_Langage>
      <Dest_Ad1>${escapeXml(input.customerName)}</Dest_Ad1>
      <Dest_Ad3>${escapeXml(input.customerAddress ?? input.relayName ?? "")}</Dest_Ad3>
      <Dest_Ville>${escapeXml(input.customerCity ?? "")}</Dest_Ville>
      <Dest_CP>${escapeXml(input.customerPostcode ?? "")}</Dest_CP>
      <Dest_Pays>${escapeXml(input.country)}</Dest_Pays>
      <Dest_Tel1>${escapeXml(input.customerPhone)}</Dest_Tel1>
      <Dest_Mail>${escapeXml(input.customerEmail)}</Dest_Mail>
      <Poids>${weightGrams}</Poids>
      <Longueur>10</Longueur>
      <Taille></Taille>
      <NbColis>1</NbColis>
      <CRT_Valeur>0</CRT_Valeur>
      <CRT_Devise>EUR</CRT_Devise>
      <Exp_Valeur>0</Exp_Valeur>
      <Exp_Devise>EUR</Exp_Devise>
      <COL_Rel_Pays>${escapeXml(senderCountry)}</COL_Rel_Pays>
      <COL_Rel></COL_Rel>
      <LIV_Rel_Pays>${escapeXml(input.country)}</LIV_Rel_Pays>
      <LIV_Rel>${escapeXml(input.relayCode)}</LIV_Rel>
      <TAvisage></TAvisage>
      <TReprise></TReprise>
      <Montage></Montage>
      <TRDV></TRDV>
      <Assurance>0</Assurance>
      <Instructions></Instructions>
      <Texte>${escapeXml(input.orderId)}</Texte>
      <Format>${escapeXml(labelFormat)}</Format>
      <Security>${security}</Security>
    </WSI2_CreationEtiquette>
  </soap:Body>
</soap:Envelope>`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "http://www.mondialrelay.fr/webservice/WSI2_CreationEtiquette",
    },
    body: soapBody,
  });

  const xml = await response.text();
  if (!response.ok) {
    throw new Error(`Erreur Mondial Relay HTTP ${response.status}: ${xml}`);
  }

  const stat = readXmlTag(xml, "STAT");
  if (stat && stat !== "0") {
    throw new Error(`Erreur Mondial Relay STAT ${stat}: ${xml}`);
  }

  const expeditionNumber =
    readXmlTag(xml, "ExpeditionNum") || readXmlTag(xml, "Expedition");
  const labelPath = readXmlTag(xml, "URL_Etiquette") || readXmlTag(xml, "URL");

  if (!expeditionNumber || !labelPath) {
    throw new Error(`Reponse Mondial Relay incomplete: ${xml}`);
  }

  return {
    expeditionNumber,
    labelUrl: labelPath.startsWith("http")
      ? labelPath
      : `https://www.mondialrelay.fr${labelPath}`,
  };
}
