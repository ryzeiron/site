"use client";

import { useEffect, useState } from "react";

const SPLASH_LOGO_SRC = "/logo.jpg";
const SPLASH_DURATION_MS = 5600;
const SPLASH_FADE_DELAY_MS = 5100;

export default function SplashIntro() {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadyShown = sessionStorage.getItem("splashShown");
    if (alreadyShown) {
      setVisible(false);
      return;
    }

    sessionStorage.setItem("splashShown", "1");

    const startedAt = performance.now();
    let animationFrame = 0;

    const updateProgress = (now: number) => {
      const elapsed = now - startedAt;
      const nextProgress = Math.min(
        100,
        Math.round((elapsed / SPLASH_FADE_DELAY_MS) * 100),
      );

      setProgress(nextProgress);

      if (elapsed < SPLASH_FADE_DELAY_MS) {
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };

    animationFrame = requestAnimationFrame(updateProgress);

    const fadeTimer = setTimeout(() => {
      setProgress(100);
      setFadingOut(true);
    }, SPLASH_FADE_DELAY_MS);

    const hideTimer = setTimeout(() => setVisible(false), SPLASH_DURATION_MS);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-500 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex w-[min(94vw,680px)] flex-col items-center gap-7 rounded-[2rem] border border-white/10 bg-zinc-950/80 px-6 py-10 shadow-2xl shadow-violet-950/40 backdrop-blur-md sm:px-10">
        <div className="relative flex h-40 w-[min(82vw,520px)] items-center justify-center sm:h-56 sm:w-[560px]">
          <div className="absolute inset-0 rounded-[999px] bg-violet-500/20 blur-3xl" />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SPLASH_LOGO_SRC}
            alt=""
            className="relative h-full w-full object-contain splash-logo"
          />
        </div>

        <div className="w-full space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-200">
            Chargement
          </p>

          <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-white/10 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-brand-400 transition-[width] duration-150 ease-out splash-progress"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-gray-400">{progress}%</p>
        </div>
      </div>
    </div>
  );
}
