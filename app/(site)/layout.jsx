import React from 'react'
import Header2 from '@/components/Header2'
import Footer from '@/components/Footer'

const layout = ({ children }) => {
  return (
    <div className="w-screen h-full">
    <Header2>
      {children}
    </Header2>
      {/* <Footer /> */}
    </div>
  )
}

export default layout
