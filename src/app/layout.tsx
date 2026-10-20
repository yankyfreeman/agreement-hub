import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Body text of documents: reads like a printed page.
const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agreement Hub",
  description: "Share a scope document with your client and keep a record of what was agreed.",
  // Document links are secret: keep them out of search engines and never send
  // them to other sites as a referrer. ("no-referrer" would also blank the
  // Origin header on form posts, which Next.js rejects for server actions.)
  robots: { index: false, follow: false },
  referrer: "same-origin",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
