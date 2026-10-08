import type {Metadata} from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Fresh Market - Lista de Compras Inteligente',
  description: 'Crie e manuseie listas de compras com cálculo automático de totais, controle de carrinho, imagens e categorias.',
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

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={plusJakartaSans.variable}>
      <body className="font-sans antialiased bg-[#f8fafc] text-[#0f172a] min-h-screen selection:bg-emerald-100 selection:text-emerald-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
