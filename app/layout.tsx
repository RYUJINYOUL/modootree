import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/themeProvider";
import ClientLayout from "@/components/ClientLayout";



const inter = Inter({ subsets: ["latin"] });


export const metadata: Metadata = {
  title: '모두트리 - 나의 특별한 페이지',
  description: '나만의 특별한 페이지를 만들어 가꾸어 보세요',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko"
     suppressHydrationWarning>
      <body className={inter.className}>
      <ClientLayout>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
            {/* <FabButton /> */}
        </ClientLayout>
          </body>
    </html>
  );
}
