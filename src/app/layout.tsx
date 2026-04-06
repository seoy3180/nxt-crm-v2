import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'NXT CRM v2',
  description: 'NXT CRM - Customer Relationship Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={cn("h-full", "font-sans", geist.variable)}>
      <body className="min-h-full bg-bg-page text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
