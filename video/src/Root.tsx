import React from "react";
import { Composition } from "remotion";
import { NoutDemo, TOTAL_FRAMES } from "./Video";
import { FPS, HEIGHT, WIDTH } from "./theme";

export const Root: React.FC = () => (
  <Composition
    id="NoutDemo"
    component={NoutDemo}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
