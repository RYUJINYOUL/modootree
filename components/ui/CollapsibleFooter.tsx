'use client';

import { useState } from 'react';
import { ChevronUp } from 'lucide-react';

export default function CollapsibleFooter() {
  return (
    <div className="w-full bg-white/70 backdrop-blur-sm py-2">
      <div className="w-full max-w-[1000px] mx-auto px-4">
        {/* 테스트 광고 */}
        <div className="w-full h-[100px]">
          <ins 
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-6697023128093217"
            data-ad-slot="1234567890"
            data-ad-format="auto"
            data-full-width-responsive="true"
            data-adtest="on"
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (adsbygoogle = window.adsbygoogle || []).push({});
              `
            }}
          />
        </div>
      </div>
    </div>
  );
}
