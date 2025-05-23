import { OPENAI_API_KEY } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMemories, saveMemory } from "../utils/memoryStore";
import { scheduleNotificationWithId } from "./HomeScreen";

export default function ChatScreen() {
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const flatListRef = useRef();

  useEffect(() => {
    const loadChat = async () => {
      const saved = await AsyncStorage.getItem("chatMessages");
      if (saved) setMessages(JSON.parse(saved));
    };

    const checkTodayTasks = async () => {
      const allMemories = await getMemories();
      const today = new Date().toISOString().split("T")[0];

      allMemories.forEach((memory) => {
        if (memory.type === "todayTask" && memory.timestamp.startsWith(today)) {
          memory.tasks?.forEach((task) => {
            const aiMessage = {
              sender: "ai",
              text: `오늘 "${task}" 한다고 했잖아. 지금 하고 있어?`,
            };
            setMessages((prev) => {
              const updated = [...prev, aiMessage];
              AsyncStorage.setItem("chatMessages", JSON.stringify(updated));
              return updated;
            });
          });
        }
      });
    };

    loadChat();
    checkTodayTasks();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input;
    const userMessage = { sender: "user", text: userText };
    const updated = [...messages, userMessage];
    setMessages(updated);
    await AsyncStorage.setItem("chatMessages", JSON.stringify(updated));
    setInput("");
    scrollToBottom();

    const aiReply = await getAIResponse(userText);
    const aiMessage = { sender: "ai", text: aiReply };
    const final = [...updated, aiMessage];
    setMessages(final);
    await AsyncStorage.setItem("chatMessages", JSON.stringify(final));
    scrollToBottom();

    const todayTasks = await extractTodayTasks(userText);
    const extractedDate = await extractDate(userText);
    const extractedTime = await extractTime(userText);

    const notificationId = await scheduleNotificationWithId(
      userText,
      extractedDate,
      extractedTime
    );

    const memory = {
      user: userText,
      ai: aiReply,
      timestamp: new Date().toISOString(),
      type: todayTasks.length > 0 ? "todayTask" : "normal",
      tasks: todayTasks,
      meta: extractedDate
        ? {
            date: extractedDate,
            time: extractedTime,
            event: "알 수 없음",
            notificationId,
          }
        : undefined,
    };

    await saveMemory(memory);
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const extractTime = async (text) => {
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
                content: `사용자의 문장에서 시간 정보를 HH:mm 형식(24시간)으로 추출해줘. 시간 없으면 "null"만 응답.`,
              },
              { role: "user", content: text },
            ],
          }),
        }
      );
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content.trim();
      return content === "null" ? null : content;
    } catch (err) {
      console.error("시간 추출 실패:", err);
      return null;
    }
  };

  const getAIResponse = async (text) => {
    try {
      const memories = await getMemories();
      const recent = memories
        .slice(-5)
        .map((m) => [
          { role: "user", content: m.user },
          { role: "assistant", content: m.ai },
        ])
        .flat();

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
              ...recent,
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
                content: `너는 사용자의 계획 중 '오늘 할 일'만 뽑아주는 도우미야. JSON 배열로만 대답해줘.`,
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
                content: `너는 사용자의 문장에서 날짜를 YYYY-MM-DD 형식으로 추출해주는 도우미야. 오늘 날짜는 ${
                  new Date().toISOString().split("T")[0]
                }이고, 없으면 null이라고만 응답해.`,
              },
              { role: "user", content: text },
            ],
          }),
        }
      );

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content.trim();
      return content === "null" ? null : content;
    } catch (err) {
      console.error("날짜 추출 실패:", err);
      return null;
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
        <SafeAreaView style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.headerButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>대화</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate("Settings")}
          >
            <Text style={styles.headerButtonText}>☰</Text>
          </TouchableOpacity>
        </SafeAreaView>

        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={10}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }) => (
              <View
                style={
                  item.sender === "user" ? styles.userBubble : styles.aiBubble
                }
              >
                <Text style={styles.bubbleText}>{item.text}</Text>
              </View>
            )}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={styles.chatContainer}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="메시지를 입력하세요"
              placeholderTextColor="#999"
              selectionColor="#007AFF"
              color="#000"
              multiline
            />
            <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
              <Text style={{ color: "white" }}>전송</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.spacer} />
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "black",
  },
  headerButton: {
    padding: 10,
  },
  headerButtonText: {
    fontSize: 20,
    color: "white",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  chatContainer: {
    padding: 10,
    paddingBottom: 10,
  },
  spacer: {
    height: 20,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
    padding: 12,
    marginVertical: 5,
    borderRadius: 20,
    borderBottomRightRadius: 0,
    maxWidth: "80%",
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#ECECEC",
    padding: 12,
    marginVertical: 5,
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    maxWidth: "80%",
  },
  bubbleText: {
    color: "#000",
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderColor: "#CCC",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#000",
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
});
