import { MEMO_ANALYSIS_PROMPTS } from '../prompts/memo-analysis';

export interface AnalysisResult {
  todos: string[];
  schedules: string[];
  info: string[];
  general: string[];
  links: string[];
}

export async function analyzeMemoWithAI(text: string): Promise<AnalysisResult> {
  try {
    const response = await fetch('/api/analyze-memo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text,
        systemPrompt: MEMO_ANALYSIS_PROMPTS.system,
        userPrompt: MEMO_ANALYSIS_PROMPTS.user(text)
      })
    });

    if (!response.ok) {
      throw new Error(`AI 분석 API 호출 실패: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'AI 분석 실패');
    }

    // 링크 추출 (정규식으로 별도 처리)
    const linkMatches = text.match(/https?:\/\/[^\s]+/g) || [];
    
    return {
      todos: result.analysis.todos || [],
      schedules: result.analysis.schedules || [],
      info: result.analysis.info || [],
      general: result.analysis.general || [],
      links: linkMatches
    };
  } catch (error) {
    console.error('AI 분석 오류:', error);
    
    // 실패 시 기본 링크 추출만 수행
    const linkMatches = text.match(/https?:\/\/[^\s]+/g) || [];
    
    return {
      ...MEMO_ANALYSIS_PROMPTS.fallback,
      links: linkMatches
    };
  }
}

// 분석 결과를 UI용 형태로 변환하는 헬퍼 함수
export function convertAnalysisToUIFormat(analysis: AnalysisResult) {
  const generateId = (type: string, index: number) => 
    `${type}-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    todos: analysis.todos.map((text, index) => ({
      id: generateId('todo', index),
      text,
      saved: false
    })),
    schedules: analysis.schedules.map((text, index) => ({
      id: generateId('schedule', index),
      text,
      saved: false
    })),
    info: analysis.info.map((text, index) => ({
      id: generateId('info', index),
      text,
      saved: false
    })),
    links: analysis.links.map((url, index) => ({
      id: generateId('link', index),
      url,
      saved: false
    })),
    general: analysis.general.map((text, index) => ({
      id: generateId('general', index),
      text,
      saved: false
    }))
  };
}
