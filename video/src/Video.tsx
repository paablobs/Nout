import React from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import markers from "../public/markers.json";
import { colors, fontFamily, FPS } from "./theme";

const sec = (s: number) => Math.round(s * FPS);

/* ---------- timing ---------- */
const INTRO = sec(3);
const OUTRO = sec(3.5);
const DESKTOP_TRIM = markers.desktop.start;
const DESKTOP_LEN = sec(markers.desktop.end - markers.desktop.start + 0.5);
const PHONE_TRIM = markers.phone.start;
const PHONE_LEN = sec(markers.phone.end - markers.phone.start + 0.5);
const XFADE = sec(0.4);

export const TOTAL_FRAMES = INTRO + DESKTOP_LEN + PHONE_LEN + OUTRO - 3 * XFADE;

type Chapter = { at: number; title: string; sub: string };
const desktopChapters: Chapter[] = [
  {
    at: markers.desktop.write,
    title: "Write in a rich-text editor",
    sub: "Headings, bold, lists, code blocks and emoji, with simple Markdown shortcuts",
  },
  {
    at: markers.desktop.favorite,
    title: "Star your favorites",
    sub: "One click to pin what matters, then find it in Favorites",
  },
  {
    at: markers.desktop.folders,
    title: "Organize with folders",
    sub: "Create a folder and move any note into it",
  },
  {
    at: markers.desktop.search,
    title: "Search instantly",
    sub: "Plain-text search across your notes as you type",
  },
  {
    at: markers.desktop.hide,
    title: "Hide sensitive notes",
    sub: "Out of the main list, still inside their folder",
  },
  {
    at: markers.desktop.trash,
    title: "Trash and restore",
    sub: "Deleted notes can come back, and are purged after 30 days",
  },
  {
    at: markers.desktop.scratchpad,
    title: "Scratchpad",
    sub: "A quick note that saves automatically",
  },
];
const phoneChapters: Chapter[] = [
  {
    at: markers.phone.list,
    title: "Built for your phone too",
    sub: "Compact list with a bottom tab bar",
  },
  {
    at: markers.phone.editor,
    title: "Tap a note to edit",
    sub: "Drill-down navigation, and Back walks you back",
  },
  {
    at: markers.phone.folders,
    title: "Folders on the go",
    sub: "Everything stays organized on a small screen",
  },
  {
    at: markers.phone.fab,
    title: "Capture ideas fast",
    sub: "The floating button starts a new note",
  },
];

/* ---------- shared bits ---------- */
const Background: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(1200px 700px at 50% 0%, #14202e 0%, ${colors.bg} 70%)`,
    }}
  />
);

const useFade = (durationInFrames: number, fadeIn = XFADE, fadeOut = XFADE) => {
  const frame = useCurrentFrame();
  const inV = interpolate(frame, [0, fadeIn], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (fadeOut === 0) return inV;
  const outV = interpolate(
    frame,
    [durationInFrames - fadeOut, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return Math.min(inV, outV);
};

const Caption: React.FC<{
  chapters: Chapter[];
  trim: number;
  len: number;
  align?: "center" | "left";
}> = ({ chapters, trim, len, align = "center" }) => {
  const frame = useCurrentFrame();
  const t = trim + frame / FPS;
  let idx = 0;
  chapters.forEach((c, i) => {
    if (t >= c.at) idx = i;
  });
  const c = chapters[idx];
  const local = (t - c.at) * FPS;
  const enter = interpolate(local, [0, 14], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  void len;
  return (
    <div
      style={{
        textAlign: align,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 16}px)`,
      }}
    >
      <div
        style={{
          fontSize: align === "center" ? 46 : 56,
          fontWeight: 700,
          color: colors.text,
          letterSpacing: -1,
        }}
      >
        {c.title}
      </div>
      <div
        style={{
          fontSize: align === "center" ? 25 : 28,
          color: colors.muted,
          marginTop: 10,
          lineHeight: 1.35,
        }}
      >
        {c.sub}
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 22,
          justifyContent: align === "center" ? "center" : "flex-start",
        }}
      >
        {chapters.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === idx ? 34 : 10,
              height: 10,
              borderRadius: 5,
              background: i === idx ? colors.accent : "#2b3846",
            }}
          />
        ))}
      </div>
    </div>
  );
};

/* ---------- scenes ---------- */
const Logo: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: size * 0.28,
      color: colors.text,
      fontWeight: 700,
      fontSize: size,
    }}
  >
    <svg
      width={size * 1.1}
      height={size * 0.85}
      viewBox="0 0 44 34"
      fill="none"
      stroke={colors.text}
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 4 L3 17 L14 30" />
      <path d="M30 4 L41 17 L30 30" />
    </svg>
    <span style={{ letterSpacing: -2 }}>Nout</span>
  </div>
);

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pop = interpolate(frame, [0, 22], [0, 1], {
    easing: Easing.out(Easing.back(1.4)),
    extrapolateRight: "clamp",
  });
  const tag = interpolate(frame, [18, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const out = interpolate(
    frame,
    [durationInFrames - XFADE, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", opacity: out }}
    >
      <div style={{ transform: `scale(${0.8 + 0.2 * pop})`, opacity: pop }}>
        <Logo size={150} />
      </div>
      <div
        style={{
          marginTop: 34,
          fontSize: 40,
          color: colors.muted,
          opacity: tag,
          transform: `translateY(${(1 - tag) * 14}px)`,
        }}
      >
        Offline-first rich-text notes
      </div>
    </AbsoluteFill>
  );
};

const Desktop: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const opacity = useFade(durationInFrames);
  const scale = 1.2;
  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ position: "absolute", top: 42, left: 0, right: 0 }}>
        <Caption
          chapters={desktopChapters}
          trim={DESKTOP_TRIM}
          len={durationInFrames}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: (1920 - 1280 * scale) / 2,
          top: 190,
          width: 1280 * scale,
          height: 720 * scale,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow:
            "0 30px 90px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.08)",
        }}
      >
        <OffthreadVideo
          src={staticFile("desktop.webm")}
          trimBefore={Math.round(DESKTOP_TRIM * FPS)}
          muted
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </AbsoluteFill>
  );
};

const Phone: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const opacity = useFade(durationInFrames);
  const w = 412 * 1.0;
  const h = 915 * 1.0;
  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: "absolute",
          left: 220,
          top: 0,
          bottom: 0,
          width: 820,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Caption
          chapters={phoneChapters}
          trim={PHONE_TRIM}
          len={durationInFrames}
          align="left"
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 1240,
          top: (1080 - h) / 2,
          width: w,
          height: h,
          borderRadius: 46,
          overflow: "hidden",
          boxShadow:
            "0 30px 90px rgba(0,0,0,.7), 0 0 0 10px #1b2430, 0 0 0 11px rgba(255,255,255,.12)",
        }}
      >
        <OffthreadVideo
          src={staticFile("phone.webm")}
          trimBefore={Math.round(PHONE_TRIM * FPS)}
          muted
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = useFade(durationInFrames, XFADE, 0);
  const rise = interpolate(frame, [0, 24], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });
  const pill = (text: string) => (
    <div
      style={{
        padding: "12px 26px",
        borderRadius: 999,
        border: "1px solid #2b3846",
        color: colors.text,
        fontSize: 28,
        background: "rgba(255,255,255,.03)",
      }}
    >
      {text}
    </div>
  );
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", opacity }}
    >
      <div
        style={{
          transform: `translateY(${(1 - rise) * 20}px)`,
          textAlign: "center",
        }}
      >
        <Logo size={96} />
        <div
          style={{
            marginTop: 34,
            display: "flex",
            gap: 16,
            justifyContent: "center",
          }}
        >
          {pill("Works offline")}
          {pill("Optional Google sync")}
          {pill("Phone and desktop")}
        </div>
        <div style={{ marginTop: 44, fontSize: 34, color: colors.accent }}>
          nout.it
        </div>
        <div style={{ marginTop: 10, fontSize: 24, color: colors.muted }}>
          github.com/paablobs/Nout
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const NoutDemo: React.FC = () => {
  const d0 = 0;
  const d1 = d0 + INTRO - XFADE;
  const d2 = d1 + DESKTOP_LEN - XFADE;
  const d3 = d2 + PHONE_LEN - XFADE;
  return (
    <AbsoluteFill style={{ fontFamily, background: colors.bg }}>
      <Background />
      <Sequence from={d0} durationInFrames={INTRO}>
        <Intro />
      </Sequence>
      <Sequence from={d1} durationInFrames={DESKTOP_LEN}>
        <Desktop />
      </Sequence>
      <Sequence from={d2} durationInFrames={PHONE_LEN}>
        <Phone />
      </Sequence>
      <Sequence from={d3} durationInFrames={OUTRO}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
