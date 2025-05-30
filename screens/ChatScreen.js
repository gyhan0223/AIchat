import { OPENAI_API_KEY } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getMemories, saveMemory } from "../utils/memoryStore";
import { scheduleNotificationWithId } from "./HomeScreen";

export default function ChatScreen() {
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const screenW = Dimensions.get("window").width;
  const slideAnim = useRef(new Animated.Value(screenW)).current;
  const flatListRef = useRef();

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("chatMessages");
      if (saved) setMessages(JSON.parse(saved));
    })();
    (async () => {
      const all = await getMemories();
      const today = new Date().toISOString().split("T")[0];
      all.forEach((m) => {
        if (m.type === "todayTask" && m.timestamp.startsWith(today)) {
          m.tasks.forEach((task) => {
            const aiMsg = {
              sender: "ai",
              text: `오늘 "${task}" 한다고 했잖아. 지금 하고 있어?`,
              timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, aiMsg]);
          });
        }
      });
    })();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    const now = new Date().toISOString();

    const userMessage = { sender: "user", text: input, timestamp: now };
    const updated = [...messages, userMessage];
    setMessages(updated);
    await AsyncStorage.setItem("chatMessages", JSON.stringify(updated));
    setInput("");
    flatListRef.current?.scrollToEnd({ animated: true });

    const aiReply = await getAIResponse(input);
    const aiMessage = {
      sender: "ai",
      text: aiReply,
      timestamp: new Date().toISOString(),
    };
    const final = [...updated, aiMessage];
    setMessages(final);
    await AsyncStorage.setItem("chatMessages", JSON.stringify(final));
    flatListRef.current?.scrollToEnd({ animated: true });

    const tasks = await extractTodayTasks(input);
    const date = await extractDate(input);
    const time = await extractTime(input);
    const notifId = await scheduleNotificationWithId(input, date, time);
    const memory = {
      user: input,
      ai: aiReply,
      timestamp: new Date().toISOString(),
      type: tasks.length > 0 ? "todayTask" : "normal",
      tasks,
      meta: date
        ? { date, time, event: "알 수 없음", notificationId: notifId }
        : undefined,
    };
    await saveMemory(memory);
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ko-KR", {
      hour: "numeric",
      minute: "numeric",
    });
  };

  const getAIResponse = async (text) => {
    try {
      const past = await getMemories();
      const recent = past.slice(-5).flatMap((m) => [
        { role: "user", content: m.user },
        { role: "assistant", content: m.ai },
      ]);
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "너는 현실적인 조언을 해주는 AI야." },
            ...recent,
            { role: "user", content: text },
          ],
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content.trim() || "응답이 없습니다.";
    } catch {
      return "AI 요청 실패.";
    }
  };

  const extractTodayTasks = async (text) => {
    /* ... */ return [];
  };
  const extractDate = async (text) => {
    /* ... */ return null;
  };
  const extractTime = async (text) => {
    /* ... */ return null;
  };

  const toggleSettings = () => {
    if (!showSettings) {
      setShowSettings(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenW,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowSettings(false));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar backgroundColor="black" barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={30}
      >
        {/* Removed TouchableWithoutFeedback wrapper to allow FlatList touch events */}
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.headerButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>대화</Text>
            <TouchableOpacity onPress={toggleSettings}>
              <Text style={styles.headerButtonText}>☰</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.container}>
            <FlatList
              style={{ flex: 1 }}
              ref={flatListRef}
              data={messages}
              renderItem={({ item }) => {
                const isUser = item.sender === "user";
                const timeStr = formatTime(item.timestamp);
                return (
                  <View
                    style={[
                      styles.messageRow,
                      isUser ? styles.userRow : styles.aiRow,
                    ]}
                  >
                    {isUser ? (
                      <>
                        <Text style={styles.timeText}>{timeStr}</Text>
                        <View style={styles.userBubble}>
                          <Text style={styles.bubbleText}>{item.text}</Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.aiBubble}>
                          <Text style={styles.bubbleText}>{item.text}</Text>
                        </View>
                        <Text style={styles.timeText}>{timeStr}</Text>
                      </>
                    )}
                  </View>
                );
              }}
              keyExtractor={(_, i) => i.toString()}
              contentContainerStyle={styles.chatContainer}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onScrollBeginDrag={Keyboard.dismiss}
            />
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="메시지를 입력하세요"
                placeholderTextColor="#999"
                selectionColor="#007AFF"
                multiline
              />
              <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                <Text style={{ color: "white" }}>전송</Text>
              </TouchableOpacity>
            </View>
          </View>
          {showSettings && (
            <Animated.View
              style={[
                styles.settingsPanel,
                { transform: [{ translateX: slideAnim }] },
              ]}
            >
              <Text style={styles.settingsTitle}>설정</Text>
              <TouchableOpacity onPress={toggleSettings}>
                <Text style={styles.closeText}>닫기</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "black",
  },
  headerButtonText: { fontSize: 20, color: "white", padding: 10 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "white" },
  container: { flex: 1, backgroundColor: "#fff" },
  chatContainer: { padding: 10, paddingBottom: 10 },
  messageRow: { flexDirection: "row", alignItems: "center", marginVertical: 4 },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start" },
  timeText: { fontSize: 12, color: "#999", marginHorizontal: 6 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    padding: 12,
  },
  input: {
    flex: 1,
    borderColor: "#CCC",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
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
  userBubble: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 20,
    borderBottomRightRadius: 0,
    maxWidth: "80%",
  },
  aiBubble: {
    backgroundColor: "#ECECEC",
    padding: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    maxWidth: "80%",
  },
  bubbleText: { color: "#000", fontSize: 16 },
  settingsPanel: {
    position: "absolute",
    top: 60,
    right: 0,
    bottom: 0,
    width: "80%",
    backgroundColor: "#fff",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  settingsTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  closeText: { marginTop: 20, fontSize: 16, color: "#007AFF" },
});
