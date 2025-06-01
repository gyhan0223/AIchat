import { OPENAI_API_KEY } from "@env";

/**
 * Chat 기록에서 할 일을 자동 추출하는 함수
 * @param {{ sender: 'user' | 'assistant', text: string }[]} chatHistory
 * @returns {Promise<{ id: string; content: string; dueDate?: string; priority?: string; }[]>}
 */
export async function extractTasks(chatHistory) {
  // 시스템 메시지: 할 일을 JSON 형식으로만 반환하도록 지시
  const systemPrompt = `너는 유저의 대화에서 "할 일"만 추출하는 역할이야.
출력 형식은 JSON 배열이고, 각 아이템은 다음 속성을 가져야 해:
- id: 고유 식별자 (uuid 형태)
- content: 할 일 내용(문장)
- dueDate: 사용자가 언급한 예정일(없으면 omit)
- priority: 우선순위(high, medium, low; 언급 없으면 medium)

예시:
[
  { "id": "1", "content": "내일 아침 9시에 프로젝트 회의 준비", "dueDate": "2025-06-01", "priority": "high" },
  { "id": "2", "content": "팀원에게 피드백 공유", "priority": "medium" }
]`;

  // OpenAI Chat API 호출용 메시지 구성
  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory.map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text,
    })),
  ];

  // API 요청
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0,
    }),
  });

  const json = await response.json();
  const text = json.choices[0].message.content;

  try {
    // JSON 파싱
    const tasks = JSON.parse(text);
    return tasks;
  } catch (e) {
    console.error("extractTasks: JSON 파싱 오류", e, text);
    throw new Error("할 일 추출 중 오류가 발생했습니다.");
  }
}
