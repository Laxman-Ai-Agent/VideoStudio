// One composition, "Scene". Template.jsx is the template's Composition.jsx, copied in by render.mjs.
// Size, fps and length come from the scene JSON, so the clip matches the HyperFrames clips exactly.
import { Composition } from "remotion";
import Template from "./Template";

export const Root = () => (
  <Composition id="Scene" component={Template} width={1280} height={720} fps={30} durationInFrames={1}
    defaultProps={{}}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, Math.round(props.duration * props.fps)),
      fps: props.fps, width: props.w, height: props.h,
    })} />
);
