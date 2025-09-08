import React from 'react'
import LoginOutButton from '@/components/ui/LoginOutButton'

const layout = ({ children }) => {
  return (
  
      <div className="w-full min-h-screen bg-zinc-900">
        <div>
       <LoginOutButton />
       </div>
        <div className="px-4 py-8">
          {children}
        </div>
      </div>
    
  )
}

export default layout
