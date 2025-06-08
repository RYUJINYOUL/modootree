"use client"
import Link from 'next/link'
import UseCaseCarousel from '@/components/UseCaseCarousel'
import { useSelector } from 'react-redux';

export default function page() {
  const { currentUser } = useSelector((state) => state.user);
  const username = currentUser?.displayName

  
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">모두트리</h1>
        <p className="text-lg text-white/80 mb-10">나만의 특별한 한페이지를 만들어보세요</p>
        
        <div className="grid gap-3 w-full max-w-sm mx-auto mb-16">
          <Link href={`/editor/${username}`}
            className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-center text-[15px] hover:bg-blue-700 transition-colors backdrop-blur-sm border border-blue-500/30">
            새로운 사이트 만들기
          </Link>
          
          <Link href={`/${username}`} 
            className="bg-sky-500 text-white px-6 py-3.5 rounded-2xl text-center text-[15px] hover:bg-sky-600 transition-colors backdrop-blur-sm border border-sky-400/30">
            내 사이트 보기
          </Link>
        </div>

        <h2 className="text-2xl font-medium text-white/90 mb-12 leading-relaxed">
          모두트리는 대한민국 5,500만명에게<br />
          작지만 의미 있는 한페이지를 선물합니다.
        </h2>
      </div>

      <UseCaseCarousel />
    </div>
  )
}
