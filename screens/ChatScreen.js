import { OPENAI_API_KEY } from "@env";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { getMemories, saveMemory } from "../utils/memoryStore";

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const checkTodayTasks = async () => {
      const allMemories = await getMemories();
      const today = new Date().toISOString().split("T")[0];

      allMemories.forEach((memory) => {
        if (memory.type === "todayTask" && memory.timestamp.startsWith(today)) {
          memory.tasks?.forEach((task) => {
            const aiMessage = {
              sender: "ai",
              text: `오늘 \"${task}\" 한다고 했잖아. 지금 하고 있어?`,
            };
            setMessages((prev) => [...prev, aiMessage]);
          });
        }
      });
    };

    checkTodayTasks();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input;
    const userMessage = { sender: "user", text: userText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const aiReply = await getAIResponse(userText);
    const aiMessage = { sender: "ai", text: aiReply };
    setMessages((prev) => [...prev, aiMessage]);

    const todayTasks = await extractTodayTasks(userText);
    const extractedDate = await extractDate(userText);

    const memory = {
      user: userText,
      ai: aiReply,
      timestamp: new Date().toISOString(),
      type: todayTasks.length > 0 ? "todayTask" : "normal",
      tasks: todayTasks,
      meta: extractedDate
        ? { date: extractedDate, event: "알 수 없음" }
        : undefined,
    };
    await saveMemory(memory);
  };

  const getAIResponse = async (text) => {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content:
                  "너는 현실적인 조언을 잘 해주는 AI야. 고민, 귀찮음, 불안함 같은 상황에 현실적인 조언을 해줘.",
              },
              { role: "user", content: text },
            ],
          }),
        }
      );

      const data = await response.json();
      return (
        data.choices?.[0]?.message?.content.trim() || "AI 응답이 비어 있어."
      );
    } catch (err) {
      console.error("GPT 요청 실패:", err);
      return "AI 응답에 실패했어. 인터넷 연결이나 API 키를 확인해줘.";
    }
  };

  const extractTodayTasks = async (text) => {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: `너는 사용자의 계획 중 '오늘 할 일'만 뽑아주는 도우미야. 간단히 JSON 배열로만 대답해줘. 예: \"오늘은 공부 3시간 하고 운동도 할 거야\" -> [\"공부 3시간\", \"운동\"]`,
              },
              { role: "user", content: text },
            ],
          }),
        }
      );

      const data = await response.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("계획 추출 실패:", err);
      return [];
    }
  };

  const extractDate = async (text) => {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: `너는 사용자의 문장에서 약속, 일정, 시험 같은 날짜를 찾아서 YYYY-MM-DD 형식으로 추출해주는 도우미야. 오늘 날짜는 ${
                  new Date().toISOString().split("T")[0]
                }이고, 날짜가 없다면 null이라고만 응답해.`,
              },
              { role: "user", content: text },
            ],
          }),
        }
      );

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content.trim();
      if (content === "null") return null;
      return content; // ex: "2025-06-05"
    } catch (err) {
      console.error("날짜 추출 실패:", err);
      return null;
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      enableOnAndroid={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.chatContainer}>
        {messages.map((msg, index) => (
          <Text
            key={index}
            style={msg.sender === "user" ? styles.userText : styles.aiText}
          >
            {msg.sender === "user" ? "👤 " : "🤖 "} {msg.text}
          </Text>
        ))}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="메시지를 입력하세요"
          placeholderTextColor="#999"
          selectionColor="#007AFF"
          color="#000"
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={{ color: "white" }}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 10,
  },
  chatContainer: {
    flex: 1,
  },
  userText: {
    alignSelf: "flex-end",
    margin: 5,
    backgroundColor: "#DCF8C6",
    padding: 10,
    borderRadius: 10,
  },
  aiText: {
    alignSelf: "flex-start",
    margin: 5,
    backgroundColor: "#EEE",
    padding: 10,
    borderRadius: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  input: {
    flex: 1,
    borderColor: "#CCC",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
    color: "#000",
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 10,
  },
});
