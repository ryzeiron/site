"use client";

import { useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    jQuery?: unknown;
    $?: unknown;
  }
}

export type SelectedRelay = {
  code: string;
  name: string;
  address: string;
  postcode: string;
  city: string;
};

const JQUERY_SRC = "https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js";
const LEAFLET_SRC = "https://unpkg.com/leaflet/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet/dist/leaflet.css";
const WIDGET_SRC =
  "https://widget.mondialrelay.com/parcelshop-picker/jquery.plugin.mondialrelay.parcelshoppicker.min.js";
const DEFAULT_BRAND = "BDTEST";

function getMondialRelayBrand() {
  const brand = process.env.NEXT_PUBLIC_MONDIAL_RELAY_BRAND?.trim() || DEFAULT_BRAND;
  return brand.padEnd(8, " ").slice(0, 8);
}

function loadStylesheet(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`link[href="${href}"]`);
    if (existing) {
      resolve();
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Impossible de charger ${href}`));
    document.head.appendChild(link);
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if ((existing as HTMLScriptElement).dataset.loaded === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error(`Impossible de charger ${src}`)),
          { once: true },
        );
      }
      return;
    }

    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => {
      s.dataset.loaded = "true";
      resolve();
    };
    s.onerror = () => reject(new Error(`Impossible de charger ${src}`));
    document.head.appendChild(s);
  });
}

type MondialRelayJQuery = (sel: HTMLElement) => {
  MR_ParcelShopPicker: (opts: Record<string, unknown>) => void;
};

export default function MondialRelayPicker({
  postcode,
  country = "FR",
  onSelect,
}: {
  postcode: string;
  country?: string;
  onSelect: (relay: SelectedRelay | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetId = `mr-relay-target-${useId().replace(/:/g, "")}`;
  const normalizedPostcode = postcode.trim();
  const normalizedCountry = country.trim().toUpperCase() || "FR";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);

      try {
        await loadStylesheet(LEAFLET_CSS);
        if (!window.jQuery) {
          await loadScript(JQUERY_SRC);
        }
        await loadScript(LEAFLET_SRC);
        await loadScript(WIDGET_SRC);

        if (cancelled) return;

        const $ = (window.jQuery ?? window.$) as unknown as MondialRelayJQuery;
        if (!$ || !containerRef.current) {
          throw new Error("Le widget Mondial Relay n'est pas disponible.");
        }

        containerRef.current.innerHTML = "";
        $(containerRef.current).MR_ParcelShopPicker({
          Target: `#${targetId}`,
          Brand: getMondialRelayBrand(),
          Country: normalizedCountry,
          PostCode: normalizedPostcode,
          ColLivMod: "24R",
          NbResults: "10",
          Responsive: true,
          ShowResultsOnMap: true,
          Theme: "mondialrelay",
          OnNoResultReturned: () => {
            onSelect(null);
            setError("Aucun point relais trouve pour ce code postal.");
          },
          OnSearchSuccess: () => {
            setError(null);
          },
          OnParcelShopSelected: (data: {
            ID?: string;
            Nom?: string;
            Adresse1?: string;
            CP?: string;
            Ville?: string;
          }) => {
            if (data && data.ID) {
              onSelect({
                code: data.ID,
                name: data.Nom ?? "",
                address: data.Adresse1 ?? "",
                postcode: data.CP ?? "",
                city: data.Ville ?? "",
              });
            }
          },
        });
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Erreur");
        setLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [normalizedCountry, normalizedPostcode, onSelect, targetId]);

  return (
    <div className="rounded-lg border border-white/10 bg-white p-3">
      {loading && (
        <p className="text-sm text-gray-700">Chargement de la carte des points relais...</p>
      )}
      {error && (
        <p className="text-sm text-red-600">Impossible de charger : {error}</p>
      )}
      <input id={targetId} type="hidden" />
      <div ref={containerRef} className="mr-widget-container min-h-[400px]" />
    </div>
  );
}
