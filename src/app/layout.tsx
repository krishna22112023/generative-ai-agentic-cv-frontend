import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import "~/styles/globals.css";

export const metadata: Metadata = {
  title: "🦜🤖 AgenticVision",
  description:
    "An agentic automation framework to build CV models in production",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body className="bg-body flex min-h-screen min-w-screen">{children}</body>
    </html>
  );
}
