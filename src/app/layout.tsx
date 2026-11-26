import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "GIFTORIA", description: "A new world of digital gifts." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, themeColor: "#f7f6f2" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}