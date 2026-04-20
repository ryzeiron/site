"use client";

import { useEffect, useState } from "react";

export default function SplashIntro() {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const alreadyShown = sessionStorage.getItem("splashShown");
    if (alreadyShown) {
      setVisible(false);
      return;
    }
    sessionStorage.setItem("splashShown", "1");
    const t1 = setTimeout(() => setFadingOut(true), 1800);
    const t2 = setTimeout(() => setVisible(false), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-500 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.jpg"
        alt=""
        className="w-[50vmin] h-[50vmin] object-contain splash-spin"
      />
    </div>
  );
}
