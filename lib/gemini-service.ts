import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY!);

interface TestPrompt {
  concept: string;
  targetAudience: string;
  resultCount: number;
  additionalInfo?: string;
}

export class GeminiService {
  private model = genAI.getGenerativeModel({ model: "gemini-pro" });

  private generatePrompt(data: TestPrompt): string {
    return `당신은 심리테스트 전문가입니다. 다음 정보를 바탕으로 재미있고 통찰력 있는 심리테스트를 만들어주세요.

테스트 컨셉: ${data.concept}
대상: ${data.targetAudience}
결과 유형 수: ${data.resultCount}개
추가 설명: ${data.additionalInfo || '없음'}

다음 형식으로 JSON 응답을 제공해주세요:

{
  "questions": [
    {
      "text": "질문 내용",
      "options": [
        {
          "text": "선택지 내용",
          "score": {
            "type1": 2,  // 각 선택지가 어떤 결과 유형에 얼마나 영향을 미치는지
            "type2": 1,
            ...
          }
        },
        ...
      ]
    },
    ...
  ],
  "resultTypes": [
    {
      "id": "type1",
      "title": "결과 유형 제목",
      "description": "상세 설명",
      "details": [
        "특징 1",
        "특징 2",
        ...
      ],
      "advice": "조언이나 팁"
    },
    ...
  ]
}

주의사항:
1. 질문은 5-7개로 구성
2. 각 질문은 3-4개의 선택지 포함
3. 선택지는 명확하고 구체적으로
4. 결과는 요청한 ${data.resultCount}개의 유형으로 구성
5. 각 결과 유형은 긍정적이고 건설적인 내용 포함
6. 전체적으로 재미있고 공감할 수 있는 내용으로 구성`;
  }

  async generateTest(data: TestPrompt) {
    try {
      const prompt = this.generatePrompt(data);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // JSON 부분 추출 (텍스트에서 {...} 부분만)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('유효한 JSON 응답을 받지 못했습니다.');
      }

      // JSON 파싱
      const testData = JSON.parse(jsonMatch[0]);

      // 데이터 검증
      this.validateTestData(testData);

      return testData;
    } catch (error) {
      console.error('테스트 생성 실패:', error);
      throw new Error('테스트 생성에 실패했습니다.');
    }
  }

  private validateTestData(data: any) {
    // 기본 구조 확인
    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error('질문 데이터가 올바르지 않습니다.');
    }
    if (!data.resultTypes || !Array.isArray(data.resultTypes)) {
      throw new Error('결과 유형 데이터가 올바르지 않습니다.');
    }

    // 질문 데이터 검증
    data.questions.forEach((q: any, i: number) => {
      if (!q.text || !q.options || !Array.isArray(q.options)) {
        throw new Error(`질문 ${i + 1}의 구조가 올바르지 않습니다.`);
      }
      q.options.forEach((o: any, j: number) => {
        if (!o.text || !o.score || typeof o.score !== 'object') {
          throw new Error(`질문 ${i + 1}의 선택지 ${j + 1}이 올바르지 않습니다.`);
        }
      });
    });

    // 결과 유형 검증
    data.resultTypes.forEach((r: any, i: number) => {
      if (!r.id || !r.title || !r.description || !Array.isArray(r.details)) {
        throw new Error(`결과 유형 ${i + 1}의 구조가 올바르지 않습니다.`);
      }
    });
  }
}




