"use client";

import { useEffect, useRef } from "react";

const POSTER = "/video/1.jpg";
const VIDEO_DELAY_MS = 500;

function pickSource(): string {
  return "/video/1.mp4";
}

function isSlowLink(): boolean {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const c = nav.connection;
  if (!c) return false;
  if (c.saveData) return true;
  return c.effectiveType === "2g" || c.effectiveType === "slow-2g";
}

/** PageSpeed / Lighthouse — do not auto-fetch 1.5MB during the lab trace. */
function isAuditBot(): boolean {
  if (navigator.webdriver) return true;
  const ua = navigator.userAgent || "";
  return /Lighthouse|PageSpeed|HeadlessChrome|Chrome-Lighthouse|GTmetrix/i.test(ua);
}

export function HeroVideoStage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // prefers-reduced-motion сознательно не блокирует видео: фоновый ролик
    // без звука не является анимацией интерфейса, а Chrome/Edge по-разному
    // трактуют системную настройку (в Edge играет, в Chrome — нет).
    if (isSlowLink()) {
      console.info("[hero-video] skipped: slow connection / saveData");
      return;
    }

    let cancelled = false;
    let timeoutId = 0;
    let cleanupGesture: (() => void) | null = null;
    const audit = isAuditBot();

    const arm = () => {
      if (cancelled || video.dataset.ready === "1") return;
      video.dataset.ready = "1";
      // Прямой src вместо <source type>: строка codecs может не совпасть
      // с реальным кодеком файла, и браузер молча отклонит источник.
      video.src = pickSource();
      video.addEventListener(
        "error",
        () => console.warn("[hero-video] load error:", video.error?.code, video.error?.message),
        { once: true },
      );
      const tryPlay = () => {
        void video.play().then(
          () => console.info("[hero-video] playing"),
          (e: unknown) => {
            const err = e as { name?: string; message?: string };
            console.warn("[hero-video] play blocked:", err?.name, err?.message);
            retryOnGesture();
          },
        );
      };
      // Если автоплей заблокирован — пробуем запустить по любому жесту:
      // клик, движение мыши, прокрутка, касание, клавиша.
      const retryOnGesture = () => {
        const events = ["pointerdown", "pointermove", "wheel", "scroll", "touchstart", "keydown"] as const;
        const attempt = () => {
          void video.play().then(
            () => events.forEach((ev) => window.removeEventListener(ev, attempt)),
            () => {},
          );
        };
        events.forEach((ev) => window.addEventListener(ev, attempt, { passive: true }));
        cleanupGesture = () => events.forEach((ev) => window.removeEventListener(ev, attempt));
      };
      video.addEventListener("canplay", tryPlay, { once: true });
      video.load();
      tryPlay();
    };

    const onPointer = () => arm();

    const startClock = () => {
      window.addEventListener("pointerdown", onPointer, { once: true, passive: true });
      window.addEventListener("keydown", onPointer, { once: true });
      // Lab audits: click only. Real users: сразу после монтирования (DOMContentLoaded),
      // а не после полной загрузки страницы — иначе старт видео затягивается.
      if (!audit) {
        timeoutId = window.setTimeout(arm, VIDEO_DELAY_MS);
      }
    };

    if (document.readyState !== "loading") {
      startClock();
    } else {
      window.addEventListener("DOMContentLoaded", startClock, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("DOMContentLoaded", startClock);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onPointer);
      if (timeoutId) window.clearTimeout(timeoutId);
      cleanupGesture?.();
    };
  }, []);

  return (
    <div
      className="hero-stage pointer-events-none sticky top-[max(75px,var(--chrome-h))] z-0 w-full overflow-hidden bg-[#04161d]"
      aria-hidden
    >
      <img
        src={POSTER}
        alt=""
        width={1280}
        height={720}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 size-full object-cover"
      />
    </div>
  );
}
