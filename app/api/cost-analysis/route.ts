'use client';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function analyzeCost() {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-pro',
    generationConfig: {
      temperature: 0.1,  // 정확한 계산을 위해 낮은 temperature
      maxOutputTokens: 2048,
    }
  });

  const prompt = `[비용 분석 요청]
  당신은 Gemini API 비용 분석 전문가입니다. 다음 서비스의 예상 비용을 계산해주세요...`;  // 전체 프롬프트 내용

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();
    
    return analysis;
  } catch (error) {
    console.error('비용 분석 중 오류:', error);
    throw error;
  }
}




