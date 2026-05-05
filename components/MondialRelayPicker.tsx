"use client";

import { useEffect, useRef, useState } from "react";

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
const WIDGET_SRC =
  "https://widget.mondialrelay.com/parcelshop-picker/v4_1/scripts/jquery.plugin.mondialrelay.parcelshoppicker.min.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if ((existing as HTMLScriptElement).dataset.loaded === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("script load failed")));
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
    s.onerror = () => reject(new Error("script load failed"));
    document.head.appendChild(s);
  });
}

export default function MondialRelayPicker({
  postcode,
  onSelect,
}: {
  postcode: string;
  onSelect: (relay: SelectedRelay | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        if (!window.jQuery) {
          await loadScript(JQUERY_SRC);
        }
        await loadScript(WIDGET_SRC);
        if (cancelled) return;
        const $ = (window.jQuery ?? window.$) as unknown as ((sel: HTMLElement) => {
          MR_ParcelShopPicker: (opts: Record<string, unknown>) => void;
        });
        if (!$ || !containerRef.current || !targetRef.current) return;
        $(containerRef.current).MR_ParcelShopPicker({
          Target: `#${targetRef.current.id}`,
          Brand: "BDTEST",
          Country: "FR",
          PostCode: postcode || "",
          ColLivMod: "24R",
          NbResults: "10",
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
        setError(e instanceof Error ? e.message : "Erreur");
        setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [postcode, onSelect]);

  return (
    <div className="rounded-lg border border-white/10 bg-white p-3">
      {loading && (
        <p className="text-sm text-gray-700">Chargement de la carte des points relais...</p>
      )}
      {error && (
        <p className="text-sm text-red-600">Impossible de charger : {error}</p>
      )}
      <input ref={targetRef} id="mr-relay-target" type="hidden" />
      <div ref={containerRef} className="mr-widget-container min-h-[400px]" />
    </div>
  );
}
