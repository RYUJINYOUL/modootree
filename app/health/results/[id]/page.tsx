import { Suspense } from 'react';
import HealthResultContent from './HealthResultContent';

type Props = {
  params: { id: string }
}

export default async function HealthResultPage({ params }: Props) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse bg-blue-900/30 h-96 rounded-xl" />
        </div>
      </div>
    }>
      <HealthResultContent id={params.id} />
    </Suspense>
  );
}