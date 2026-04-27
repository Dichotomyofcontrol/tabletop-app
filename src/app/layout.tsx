import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Cinzel, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tabletop Scheduler",
  description: "Coordinate sessions, players, and campaigns for any tabletop RPG.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const c = await cookies();
  const theme = c.get('theme')?.value === 'light' ? 'light' : 'dark';
  return (
    <html lang="en" data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
