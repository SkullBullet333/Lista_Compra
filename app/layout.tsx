import type {Metadata, Viewport} from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { PwaRegistration } from '@/components/PwaRegistration';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  applicationName: 'Minhas Listas',
  title: 'Minhas Listas',
  description: 'Crie e manuseie listas de compras com cálculo automático de totais, controle de carrinho, imagens e categorias.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Minhas Listas',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: '/icons/icon-192.svg',
  },
  openGraph: {
    title: 'Fresh Market - Lista de Compras Inteligente',
    description: 'Crie e manuseie listas de compras com cálculo automático de totais, controle de carrinho, imagens e categorias.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fresh Market - Lista de Compras Inteligente',
    description: 'Crie e manuseie listas de compras com cálculo automático de totais, controle de carrinho, imagens e categorias.',
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={plusJakartaSans.variable}>
      <body className="font-sans antialiased bg-[#f8fafc] text-[#0f172a] min-h-screen selection:bg-emerald-100 selection:text-emerald-900" suppressHydrationWarning>
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
