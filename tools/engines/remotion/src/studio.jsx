// Remotion twin of tools/templates/_shared/studio.js|css: units, safe areas, brand, captions.
// Keep the numbers in step with the HyperFrames side so both engines look the same.
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export function layout(S) {
  const portrait = S.h > S.w;
  const u = Math.min(S.w, S.h) / 100;
  const sf = portrait ? { t: 0.14, b: 0.22, l: 0.07, r: 0.07 } : { t: 0.08, b: 0.08, l: 0.06, r: 0.06 };
  const caps = (S.captions || []).length > 0;
  const c = S.colors || {}, f = S.fonts || {};
  return {
    u, portrait, caps,
    bg: c.background || "#0E0E10", accent: c.accent || "#FFC400", text: c.text || "#FFFFFF",
    font: `"${f.latin || "Inter"}", "${f.telugu || "Noto Sans Telugu"}", "Nirmala UI", sans-serif`,
    sideL: sf.l * S.w, sideR: sf.r * S.w, bottom: sf.b * S.h,
    // template content box; lifted above the captions like `.has-captions .safe`
    safe: { position: "absolute", top: sf.t * S.h, bottom: sf.b * S.h + (caps ? u * 16 : 0),
            left: sf.l * S.w, right: sf.r * S.w, display: "flex", flexDirection: "column" },
  };
}

export function Captions({ S }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = layout(S), pages = S.captions || [], t = frame / fps;
  const i = pages.findIndex((p, k) => t >= p[0].s && t < (k + 1 < pages.length ? pages[k + 1][0].s : Infinity));
  if (i < 0) return null;
  const sh = `0 0 ${L.u * 0.6}px #000, 0 ${L.u * 0.3}px ${L.u * 1.2}px rgba(0,0,0,.9)`;
  return (
    <div style={{ position: "absolute", left: L.sideL, right: L.sideR, bottom: L.bottom, textAlign: "center",
                  fontFamily: L.font, fontWeight: 800, fontSize: L.u * (L.portrait ? 6.4 : 5.2), lineHeight: 1.3,
                  color: L.text, textShadow: sh }}>
      {pages[i].map((w, j) => {
        const on = t >= w.s && t < Math.max(w.e, w.s + 0.1);
        return <span key={j} style={{ display: "inline-block", color: on ? L.accent : L.text,
                                      transform: `scale(${on ? 1.08 : 1})`, transformOrigin: "50% 70%",
                                      marginRight: "0.28em" }}>{w.t}</span>;
      })}
    </div>
  );
}

export function Frame({ S, children }) {
  const L = layout(S);
  return (
    <AbsoluteFill style={{ background: L.bg, color: L.text, fontFamily: L.font, overflow: "hidden" }}>
      {children}
      <Captions S={S} />
    </AbsoluteFill>
  );
}
