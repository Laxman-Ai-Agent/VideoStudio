// Remotion version of the headline template (index.html is the HyperFrames one; template.json
// "engine" picks which runs). Same look: grid, glow, kinetic words (last word accent), bar, sub.
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Frame, layout } from "./studio";

export default function Headline(S) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = layout(S), u = L.u, t = frame / fps, p = S.params || {};
  const words = (S.text || "").split(/\s+/).filter(Boolean), n = words.length;
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };
  const glow = interpolate(t, [0, S.duration], [0.6, 1.2], clamp);
  const bar = interpolate(t, [0.2 + n * 0.18, 0.6 + n * 0.18], [0, 1], clamp);
  const sub = interpolate(t, [0.4 + n * 0.18, 0.7 + n * 0.18], [0, 0.8], clamp);
  const grid = `linear-gradient(${L.text} 1px, transparent 1px), linear-gradient(90deg, ${L.text} 1px, transparent 1px)`;
  return (
    <Frame S={S}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.07, backgroundImage: grid,
                    backgroundSize: `${u * 8}px ${u * 8}px` }} />
      <div style={{ position: "absolute", width: u * 90, height: u * 90, left: "50%", top: "50%",
                    marginLeft: -u * 45, marginTop: -u * 45, borderRadius: "50%",
                    opacity: interpolate(t, [0, S.duration], [0, 1], clamp), transform: `scale(${glow})`,
                    background: "radial-gradient(circle, rgba(255,196,0,.18), rgba(255,196,0,0) 65%)" }} />
      <div style={L.safe}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center",
                      justifyContent: "center", textAlign: "center", gap: u * 3 }}>
          <div style={{ fontWeight: 900, fontSize: u * (L.portrait ? 14 : 13), lineHeight: 1.15, maxWidth: "90%" }}>
            {words.map((w, i) => {
              const k = spring({ frame: frame - Math.round((0.1 + i * 0.18) * fps), fps,
                                 config: { damping: 11, stiffness: 160 } });
              return <span key={i} style={{ display: "inline-block", opacity: Math.min(1, k * 1.5),
                                            transform: `translateY(${(1 - k) * u * 4}px) scale(${0.9 + 0.1 * k})`,
                                            color: n > 1 && i === n - 1 ? L.accent : L.text,
                                            marginRight: i < n - 1 ? "0.28em" : 0 }}>{w}</span>;
            })}
          </div>
          <div style={{ width: u * 22, height: u * 1.1, background: L.accent, transform: `scaleX(${bar})`,
                        transformOrigin: "left" }} />
          <div style={{ fontSize: u * 4.5, opacity: sub }}>{p.sub || ""}</div>
        </div>
      </div>
    </Frame>
  );
}
