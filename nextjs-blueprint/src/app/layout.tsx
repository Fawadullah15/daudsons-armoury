import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DAUDSONS ARMOURY (PVT.) LTD. — Defense, Small Arms & Aerospace Precision',
  description:
    "Pakistan's premier defense manufacturer and exporter since 1953. Certified AS9100 Rev D, ISO 9001:2015, and ISO 14001:2015.",
  keywords: [
    'Daudsons Armoury',
    'Defense Pakistan',
    'DSA Trushot 9mm',
    'Aerospace Precision AS9100',
    'Peshawar Gunsmithing',
    'Military Ordnance',
  ],
  metadataBase: new URL('https://www.daudsons.com'),
  openGraph: {
    title: 'DAUDSONS ARMOURY (PVT.) LTD. — Made in Pakistan Since 1953',
    description: 'Precision engineering for sovereign defense, small arms, and aerospace hardware.',
    siteName: 'Daudsons Armoury',
    locale: 'en_PK',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0A0B0D] text-[#F2F0EB] antialiased selection:bg-[#C8A24A] selection:text-[#0A0B0D]">
        {children}
      </body>
    </html>
  );
}
