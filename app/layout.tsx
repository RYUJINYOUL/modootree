import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/redux/provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ModooTree',
  description: '모두의 트리 - 나만의 링크 페이지를 만들어보세요',
  other: {
    'naver-site-verification': '9f741f94681059d45853466618ab08aecdc3852c',
    'google-site-verification': 'NJ5c04i2wKHQlFMfQK5_Ln-qYwjvbzDVUkyzaNXQXbQ'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <meta name="naver-site-verification" content="9f741f94681059d45853466618ab08aecdc3852c" />
        <meta name="google-site-verification" content="NJ5c04i2wKHQlFMfQK5_Ln-qYwjvbzDVUkyzaNXQXbQ" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}