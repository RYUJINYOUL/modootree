import { useState, useEffect } from 'react';

export const AIGenerationProgress = ({ initialSeconds = 80 }) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const steps = [
    { text: "업로드 중...", duration: 15 },
    { text: "AI가 분석 중...", duration: 25 },
    { text: "투표 옵션 생성 중...", duration: 30 },
    { text: "최종 저장 중...", duration: 10 }
  ];

  const getCurrentStep = () => {
    if (seconds > 65) return 0;
    if (seconds > 40) return 1;
    if (seconds > 10) return 2;
    return 3;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const progress = ((initialSeconds - seconds) / initialSeconds) * 100;
  const currentStep = getCurrentStep();

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60">
      <div className="space-y-6 p-8 bg-gray-900 rounded-xl border border-blue-500/20 shadow-2xl max-w-md w-full mx-4">
      {/* 진행 단계 표시 */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div 
            key={index}
            className={`flex items-center gap-3 transition-colors duration-300 ${
              index === currentStep ? 'text-blue-400' : 
              index < currentStep ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm
              ${index === currentStep ? 'bg-blue-500 animate-pulse' : 
                index < currentStep ? 'bg-green-500' : 'bg-gray-700'}`}
            >
              {index < currentStep ? '✓' : index + 1}
            </div>
            <span className="text-sm">{step.text}</span>
          </div>
        ))}
      </div>

      {/* 프로그레스 바 */}
      <div className="relative pt-1">
        <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-700">
          <div
            style={{ width: `${progress}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
          />
        </div>
        <div className="flex mt-2 items-center justify-between text-xs">
          <span className="text-blue-400 font-medium">진행중...</span>
          <span className="text-blue-400 font-medium">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* 예상 시간 */}
      <div className="text-center text-sm text-gray-400">
        예상 소요 시간: {seconds}초
      </div>
    </div>
    </div>
  );
};
