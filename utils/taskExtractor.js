import { OPENAI_API_KEY } from "@env";

export async function extractTasks(conversation) {
  /**
   * conversation: [{ sender: "user"|"ai", text: "..." }, ... ]
   * 최종적으로 [{ id: "1", content: "할 일 내용", dueDate: "YYYY-MM-DD" }, ...] 형태의 배열을 반환해야 함
   */
  // 1) 대화 전체를 문자열 형태로 합치기
  const history = conversation
    .map((m) => `${m.sender === "user" ? "User" : "AI"}: ${m.text}`)
    .join("\n");

  // 2) AI에게 JSON 배열 형태로만 응답 요청
  const systemPrompt = `
너는 이제 아래 대화 내용에서 사용자의 할 일을 찾아서,
반드시 **순수 JSON 배열**만 반환해야 해. (절대로 다른 설명을 덧붙이지 마.)

각 할 일 객체는 다음 필드를 가져야 해:
- id: 유니크 식별자 (예: "1", "2", "3" …)
- content: 할 일 문장 (예: "옷걸이 사기")
- dueDate: 만약 마감일이 있으면 "YYYY-MM-DD" 형태, 없으면 빈 문자열

예시 응답 형식 (아래 반드시 따르기):
[
  {
    "id": "1",
    "content": "옷걸이 사기",
    "dueDate": "2025-06-05"
  },
  {
    "id": "2",
    "content": "내일 회의 준비",
    "dueDate": ""
  }
]

어떤 이유로도 JSON 배열 바깥에 텍스트(“Here are your tasks…”, “할 일이 없습니다” 등)를 넣지 말고,
딱 JSON 배열만 순수하게 응답해야 해.
`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: history },
        ],
        temperature: 0.0,
      }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";

    // 3) 파싱 단계: JSON.parse가 실패하면 빈 배열 반환
    try {
      const tasks = JSON.parse(text);
      // 형식 검증: 배열이어야 하고, 각 항목에 필수 키(id, content, dueDate)가 존재해야 함
      if (Array.isArray(tasks)) {
        return tasks.map((t, i) => {
          return {
            id: t.id?.toString() || `${i + 1}`,
            content: t.content || "",
            dueDate: t.dueDate || "",
          };
        });
      } else {
        // JSON은 배열 형식이지만, 배열이 아닌 경우
        console.warn("extractTasks: JSON 형태는 배열이지만, 배열이 아님", text);
        return [];
      }
    } catch (parseErr) {
      console.warn("extractTasks: JSON 파싱 오류", parseErr, text);
      return [];
    }
  } catch (err) {
    console.warn("extractTasks 오류:", err);
    return [];
  }
}
