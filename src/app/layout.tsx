import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Playlist Progress Tracker",
  description: "Track your progress through a long Spotify playlist",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Script
          src="https://sdk.scdn.co/spotify-player.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
