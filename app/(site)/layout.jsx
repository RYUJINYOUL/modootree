import React from 'react'
import Header2 from '@/components/Header2'
import Footer from '@/components/Footer'
import Link from 'next/link'

const layout = ({ children }) => {
  return (
  
      <div className="min-h-screen bg-zinc-900">
        <nav className="bg-zinc-900 shadow-lg border-b border-zinc-800">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-white hover:text-zinc-200 transition-colors">모두트리</Link>
            <div className="flex gap-4 items-center">
              <Link 
                href="/login" 
                className="text-sm text-zinc-300 hover:text-white transition-colors"
              >
                로그인
              </Link>
              <Link 
                href="/register" 
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors font-medium"
              >
                회원가입
              </Link>
            </div>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </div>
    
  )
}

export default layout
