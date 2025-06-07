import React from 'react'

const Sidebar = ({ children }) => {
  return (
    <div
      className=
        "flex flex-row w-full h-full h-[calc(100vh-72px)]"
   
    >
    <div>
     {children}</div>
    </div>
  )
}

export default Sidebar
