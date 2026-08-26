import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ground Control",
    short_name: "Ground Control",
    description: "Family life. One place.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f7f3",
    theme_color: "#6d4aff",
  };
}
