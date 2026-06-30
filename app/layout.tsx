import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CV Tailor — Tailored CVs & Cover Letters",
  description: "Paste a job description, upload your CV, get a tailored application in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${geist.className} min-h-full bg-gray-50 text-gray-900`}>
        {children}
      </body>
    </html>
  );
}
