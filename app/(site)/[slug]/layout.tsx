import type { Metadata } from "next";
import { getPublished } from "@/lib/data";
import "../../globals.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SiteLayout({ children, params }: LayoutProps<"/[slug]">) {
  const { slug } = await params;
  const p = await getPublished(slug);
  return (
    <html lang="en" data-palette={p?.state.palette === "hex" ? "hex" : undefined}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
