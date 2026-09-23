import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),

  title: {
    default: "The Rally",
    template: "%s | The Rally",
  },

  description:
    "Find students to play sports with, create games, and join rallies at the University of Auckland.",

  applicationName: "The Rally",

  keywords: [
    "The Rally",
    "University of Auckland",
    "UoA",
    "student sports",
    "sports",
    "games",
    "badminton",
    "football",
    "tennis",
    "cricket",
    "basketball",
    "volleyball",
  ],

  authors: [
    {
      name: "The Rally",
    },
  ],

  creator: "The Rally",

  openGraph: {
    type: "website",
    siteName: "The Rally",
    title: "The Rally",
    description:
      "Find students to play sports with, create games, and join rallies at the University of Auckland.",
  },

  twitter: {
    card: "summary_large_image",
    title: "The Rally",
    description:
      "Find students to play sports with, create games, and join rallies at the University of Auckland.",
  },

  robots: {
    index: false,
    follow: false,
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}