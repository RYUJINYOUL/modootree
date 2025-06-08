import React from 'react'
import Header2 from '@/components/Header2'
import Footer from '@/components/Footer'
import Link from 'next/link'
import LoginOutButton from '@/components/ui/LoginOutButton'

const layout = ({ children }) => {
  return (
  
      <div className="min-h-screen bg-zinc-900">
        <div>
       <LoginOutButton />
       </div>
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </div>
    
  )
}

export default layout
