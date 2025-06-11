import { OPENAI_API_KEY } from "@env";

/**
 * Generate a concise conversation title summarizing the overall topic.
 * @param {Array<{sender: string, text: string}>} conversation
 * @returns {Promise<string>} Short title string (max 30 chars)
 */
export async function generateTitle(conversation) {
  const history = conversation
    .map((m) => `${m.sender === "user" ? "User" : "AI"}: ${m.text}`)
    .join("\n");
  const systemPrompt = `다음 대화를 보고 전체적인 주제가 드러나는 간결한 제목을 10자 이내의 한글로 작성해. 다른 말은 하지 말고 제목만 답해.`;

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
        temperature: 0.5,
      }),
    });
    const data = await res.json();
    const title = data.choices?.[0]?.message?.content?.trim() || "";
    return title.replace(/\n/g, "").slice(0, 30);
  } catch (e) {
    console.warn("generateTitle error:", e);
    return "";
  }
}
