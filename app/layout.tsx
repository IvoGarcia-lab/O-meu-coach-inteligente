import type {Metadata} from 'next';
import { Literata, Nunito_Sans } from 'next/font/google';
import './globals.css'; // Global styles

const literata = Literata({
  subsets: ['latin'],
  variable: '--font-headline',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'O Meu Coach Inteligente',
  description: 'Seu assistente virtual de nutrição e treino personalizado por IA',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt" className={`${literata.variable} ${nunitoSans.variable}`}>
      <body suppressHydrationWarning className="bg-background text-on-surface antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
