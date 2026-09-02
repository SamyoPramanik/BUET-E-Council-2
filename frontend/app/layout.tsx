import type { Metadata } from "next";
import { Inter, Noto_Sans_Bengali, Tiro_Bangla } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-bengali",
  display: "swap",
});

const tiroBangla = Tiro_Bangla({
  subsets: ["bengali"],
  weight: ["400"],
  variable: "--font-tiro-bangla",
  display: "swap",
  style: "normal",
});

export const metadata: Metadata = {
  title: "BUET E-COUNCIL",
  description: "BUET E-Council Management System",
};

import { ThemeProvider } from "../components/ThemeProvider";
import BijoyGlobalPasteProvider from "../components/BijoyGlobalPasteProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSansBengali.variable} ${tiroBangla.variable} font-sans antialiased`}>
        <ThemeProvider>
          <BijoyGlobalPasteProvider>
            {children}
          </BijoyGlobalPasteProvider>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
