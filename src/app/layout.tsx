import type { Metadata } from "next";
import { Titillium_Web, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const titillium = Titillium_Web({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-titillium",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "APEX // F1 Second-Screen Telemetry & Fantasy Hub",
  description:
    "Dual-mode F1 Fan Telemetry Dashboard and Private Friends Fantasy League",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${titillium.variable} ${jetbrainsMono.variable} antialiased selection:bg-[#E10600] selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}