import { OPENAI_API_KEY } from "@env";

export async function summarizeUserInfo(text) {
  const systemPrompt = `너는 사용자의 발화에서 개인 정보를 추출해 한 문장으로 정리하는 도우미야.
사용자가 자기소개를 하거나 신상 정보를 제공하면 "사용자는 ..." 형식으로 간결하게 요약해.
발화에 그런 정보가 없다면 빈 문자열만 반환해.`;
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
          { role: "user", content: text },
        ],
        temperature: 0.2,
      }),
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content.trim() || "";
    if (
      text === "빈 문자열" ||
      text === '""' ||
      text.replace(/\s|"/g, "") === ""
    ) {
      return "";
    }
    return text;
  } catch (e) {
    console.warn("summarizeUserInfo error:", e);
    return "";
  }
}
