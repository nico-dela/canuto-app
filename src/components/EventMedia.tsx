"use client";

import { useState } from "react";
import type { EventTypeId } from "@/lib/constants";
import {
  TYPE_COVER,
  coverLabel,
  detectMediaKind,
  vimeoEmbedUrl,
  youtubeEmbedUrl,
} from "@/lib/events/media";

function GenericCover({
  eventType,
  title,
  size,
}: {
  eventType: EventTypeId;
  title?: string;
  size: "sm" | "lg";
}) {
  const palette = TYPE_COVER[eventType] ?? TYPE_COVER.otro;
  const label = coverLabel(eventType);

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-end overflow-hidden ${
        size === "lg" ? "p-5" : "p-2.5"
      }`}
      style={{
        background: `linear-gradient(145deg, ${palette.from} 0%, ${palette.to} 100%)`,
      }}
      aria-hidden={!title}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.25), transparent 50%)",
        }}
      />
      <svg
        className={`pointer-events-none absolute ${
          size === "lg" ? "right-4 top-4 h-16 w-16" : "right-2 top-2 h-8 w-8"
        } opacity-25`}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden
      >
        <circle cx="32" cy="32" r="28" stroke={palette.accent} strokeWidth="3" />
        <path
          d="M20 36c4-10 20-10 24 0"
          stroke={palette.accent}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="26" cy="26" r="2.5" fill={palette.accent} />
        <circle cx="38" cy="26" r="2.5" fill={palette.accent} />
      </svg>
      <p
        className={`relative font-extrabold uppercase tracking-[0.14em] text-white/80 ${
          size === "lg" ? "text-[12px]" : "text-[9px]"
        }`}
      >
        {label}
      </p>
      {title && size === "lg" && (
        <p className="relative mt-1 line-clamp-2 font-[family-name:var(--font-display)] text-[1.35rem] font-bold leading-tight text-white">
          {title}
        </p>
      )}
    </div>
  );
}

export function EventMedia({
  coverUrl,
  eventType,
  title,
  size = "lg",
  className = "",
  alt,
}: {
  coverUrl?: string | null;
  eventType: EventTypeId;
  title?: string;
  size?: "sm" | "lg";
  className?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = coverUrl?.trim() || null;
  const kind = url ? detectMediaKind(url) : null;
  // Cards: only show direct images/GIFs; video embeds need the detail view
  const useAsThumb = size === "sm" && kind != null && kind !== "image";
  const showGeneric = !url || failed || useAsThumb;

  const frame =
    size === "lg"
      ? "aspect-[16/10] w-full overflow-hidden rounded-2xl"
      : "h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl";

  if (showGeneric) {
    return (
      <div className={`${frame} ${className}`}>
        <GenericCover eventType={eventType} title={size === "lg" ? title : undefined} size={size} />
      </div>
    );
  }

  if (kind === "youtube") {
    const embed = youtubeEmbedUrl(url!);
    if (!embed) {
      return (
        <div className={`${frame} ${className}`}>
          <GenericCover eventType={eventType} title={title} size={size} />
        </div>
      );
    }
    return (
      <div className={`${frame} bg-black ${className}`}>
        <iframe
          src={embed}
          title={alt || title || "Video del plan"}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  if (kind === "vimeo") {
    const embed = vimeoEmbedUrl(url!);
    if (!embed) {
      return (
        <div className={`${frame} ${className}`}>
          <GenericCover eventType={eventType} title={title} size={size} />
        </div>
      );
    }
    return (
      <div className={`${frame} bg-black ${className}`}>
        <iframe
          src={embed}
          title={alt || title || "Video del plan"}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className={`${frame} bg-black ${className}`}>
        <video
          src={url!}
          className="h-full w-full object-cover"
          controls={size === "lg"}
          muted={size === "sm"}
          playsInline
          loop={size === "sm"}
          autoPlay={size === "sm"}
          onError={() => setFailed(true)}
          aria-label={alt || title || "Video del plan"}
        />
      </div>
    );
  }

  return (
    <div className={`${frame} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url!}
        alt={alt || title || "Imagen del plan"}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
