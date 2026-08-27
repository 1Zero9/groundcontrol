import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ground Control",
    short_name: "Ground Control",
    description: "Your family mission control.",
    start_url: "/",
    display: "standalone",
    background_color: "#F3F0FF",
    theme_color: "#2C2255",
  };
}
