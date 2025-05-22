// screens/ChatScreen.js
import { OPENAI_API_KEY } from "@env";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages([...messages, userMessage]);
    setInput("");

    // GPT 응답 시뮬레이션
    const aiReply = await getAIResponse(input);

    const aiMessage = { sender: "ai", text: aiReply };
    setMessages((prev) => [...prev, aiMessage]);
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <ScrollView
        style={styles.chatContainer}
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, index) => (
          <Text
            key={index}
            style={msg.sender === "user" ? styles.userText : styles.aiText}
          >
            {msg.sender === "user" ? "👤 " : "🤖 "} {msg.text}
          </Text>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="메시지를 입력하세요"
          placeholderTextColor="#999" // 추가: placeholder 색상
          selectionColor="#007AFF"
          color="white"
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={{ color: "white" }}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, paddingTop: 50 },
  chatContainer: { flex: 1 },
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
  inputContainer: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    borderColor: "#CCC",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 10,
  },
});
