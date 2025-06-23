import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/themeProvider";
import ClientLayout from "@/components/ClientLayout";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  display: "swap",
});

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
      <body className={notoSansKr.className}>
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
