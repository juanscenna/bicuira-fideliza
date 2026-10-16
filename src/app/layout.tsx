import type { Metadata, Viewport } from "next";
import { Baloo_2, Sora } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({ variable: "--font-baloo", weight: "800", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });

export const metadata: Metadata = {
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
