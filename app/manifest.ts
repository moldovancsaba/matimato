import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Matimato",
    short_name: "Matimato",
    description: "A signed-number strategy board game.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7ef",
    theme_color: "#15211f",
    orientation: "any",
    categories: ["games", "strategy"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
