import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-body", subsets: ["latin"] });
const interTight = Inter_Tight({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Phone-a-factory",
  description: "Every ask gets built. Your rules decide who has to look before it ships.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before the page paints. */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}` }} />
      </head>
      <body className={`${inter.variable} ${interTight.variable} antialiased`}>{children}</body>
    </html>
  );
}
