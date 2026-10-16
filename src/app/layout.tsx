import type { Metadata, Viewport } from "next";
import { Baloo_2, Sora } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({ variable: "--font-baloo", weight: "800", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });

export const metadata: Metadata = {
  // ícone da Bicuíra (entrada e admin); as páginas de cada restaurante trocam pela logo dele
  icons: {
    icon: [
      { url: "/bicuira/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/bicuira/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/bicuira/apple-touch-icon.png",
  },
  title: { default: "Bicuíra Fideliza", template: "%s · Bicuíra Fideliza" },
  description: "Cartão fidelidade digital para restaurantes e bares.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#25433D",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${baloo.variable} ${sora.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-base">{children}</body>
    </html>
  );
}
