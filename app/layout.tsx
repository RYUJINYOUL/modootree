import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import Footer from '@/components/ui/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '모두트리 - 나의 특별한 페이지',
  description: '나만의 특별한 페이지를 만들어 가꾸어 보세요',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={cn(
          inter.className,
          'min-h-screen bg-background antialiased transition-colors duration-300'
        )}
        suppressHydrationWarning
      >
        <Providers>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1">
            {children}
          </main>
            <Footer />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
