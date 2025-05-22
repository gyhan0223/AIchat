// screens/ChatScreen.js
import React, { useState } from "react";
import {
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
    // 나중에 GPT 연동할 부분
    if (text.includes("공부") || text.includes("시험")) {
      return "시험 준비하기 힘들지! 작은 목표부터 시작해보는 건 어때?";
    }
    return "응! 내가 기억해둘게. 또 이야기해줘.";
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.chatContainer}>
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
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={{ color: "white" }}>전송</Text>
        </TouchableOpacity>
      </View>
    </View>
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
