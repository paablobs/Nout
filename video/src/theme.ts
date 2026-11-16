import { loadFont } from "@remotion/google-fonts/JetBrainsMono";

export const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

export const colors = {
  bg: "#07090c",
  bgAlt: "#0f1620",
  text: "#f3f5f7",
  muted: "#9aa7b4",
  accent: "#4fc3f7",
  green: "#8fd694",
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
