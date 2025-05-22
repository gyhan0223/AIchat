import { OPENAI_API_KEY } from "@env";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { saveMemory } from "../utils/memoryStore";

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input;
    const userMessage = { sender: "user", text: userText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const aiReply = await getAIResponse(userText);
    const aiMessage = { sender: "ai", text: aiReply };
    setMessages((prev) => [...prev, aiMessage]);

    // ✅ 여기서 저장
    const memory = {
      user: userText,
      ai: aiReply,
      timestamp: new Date().toISOString(),
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
