import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSE Assistant",
  description: "AI medical research assistant with cited sources",
  icons: {
    icon: [{ url: "/icon/simeye.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#212121" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-dvh bg-white font-sans text-zinc-900 antialiased dark:bg-[#212121] dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
