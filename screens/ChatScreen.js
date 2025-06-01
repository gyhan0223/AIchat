import { OPENAI_API_KEY } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
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
import { extractTasks } from "../utils/taskExtractor";
import { addTask } from "../utils/taskStore";
import { scheduleNotificationWithId } from "./HomeScreen";

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { sessionId } = route.params;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState([]);

  const screenW = Dimensions.get("window").width;
  const slideAnim = useRef(new Animated.Value(screenW)).current;
  const flatListRef = useRef();

  const [sessionTitle, setSessionTitle] = useState("");

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(`chatMessages:${sessionId}`);
      let msgs = saved ? JSON.parse(saved) : [];

      const sessionsJson = await AsyncStorage.getItem("chatSessions");
      if (sessionsJson) {
        const sessions = JSON.parse(sessionsJson);
        const target = sessions.find((s) => s.id === sessionId);
        if (target) setSessionTitle(target.title);
      }

      if (msgs.length === 0) {
        const welcomeText = "안녕! 만나서 반가워. 너 이름이 뭐야?";
        const now = new Date().toISOString();
        const aiMsg = { sender: "ai", text: welcomeText, timestamp: now };
        msgs = [aiMsg];
        await AsyncStorage.setItem(
          `chatMessages:${sessionId}`,
          JSON.stringify(msgs)
        );
      }

      setMessages(msgs);

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
  }, [sessionId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const now = new Date().toISOString();

    if (sessionTitle === "새 대화") {
      const newTitle =
        input.length > 20 ? input.slice(0, 20).trim() + "…" : input.trim();
      setSessionTitle(newTitle);

      const json = await AsyncStorage.getItem("chatSessions");
      if (json) {
        const sessions = JSON.parse(json);
        const updated = sessions.map((s) =>
          s.id === sessionId ? { ...s, title: newTitle } : s
        );
        await AsyncStorage.setItem("chatSessions", JSON.stringify(updated));
      }
    }

    const userMessage = { sender: "user", text: input, timestamp: now };
    const updated = [...messages, userMessage];
    setMessages(updated);
    await AsyncStorage.setItem(
      `chatMessages:${sessionId}`,
      JSON.stringify(updated)
    );
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
    await AsyncStorage.setItem(
      `chatMessages:${sessionId}`,
      JSON.stringify(final)
    );
    flatListRef.current?.scrollToEnd({ animated: true });

    try {
      const tasks = await extractTasks(
        final.map((m) => ({ sender: m.sender, text: m.text }))
      );
      if (tasks.length > 0) {
        setExtractedTasks(tasks);
        for (const task of tasks) {
          await addTask(task);
        }
      }
    } catch (e) {
      console.warn("extractTasks 오류:", e);
    }

    const tasksForToday = [];
    const date = await extractDate(input);
    const time = await extractTime(input);
    const notifId = await scheduleNotificationWithId(input, date, time);
    const memory = {
      user: input,
      ai: aiReply,
      timestamp: new Date().toISOString(),
      type: tasksForToday.length > 0 ? "todayTask" : "normal",
      tasks: tasksForToday,
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

      const systemPrompt = `
        너는 사용자의 ‘친근한 전문 코치’야.
        언제나 편하게 구어체로 말하면서,
        다음과 같은 방식으로 답해 줘:

        1) 짧게 먼저 격려나 맞장구를 건네듯 시작한다. (예: "와, 멋진 목표야!", "좋아, 한번 해보자!")
        2) 그 뒤에는 반드시 “구조화된 단계(step)” 형태로 설명한다. (예: “첫째, ~; 둘째, ~; 셋째, ~”)
        3) 각 단계마다 구체적인 팁이나 주의사항을 덧붙인다. (예: “이렇게 하면 좋아요”, “이 부분을 신경써 주세요”)
        4) 너무 길게 늘어놓지 말고, 3~4단계 내외로 간결하게 작성한다.
        5) 구어체 어투를 유지하되, 부드러운 표현을 섞어준다.

        예시:
        "첫째, 오늘 할 일 목록을 노트에 적어봐. 이렇게 하면 머릿속이 정리돼. 둘째, 중요한 일부터 순서대로 타이머를 25분으로 맞추고 집중해. 셋째, 5분 휴식 타임을 꼭 가져. 요렇게 하면 효율이 확 올라갈 거야!"
      `;

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

  const onTasksPress = () => {
    const list = extractedTasks
      .map((t) => `• ${t.content}${t.dueDate ? ` (Due: ${t.dueDate})` : ""}`)
      .join("\n");
    Alert.alert("추출된 할 일 목록", list, [
      {
        text: "확인",
        onPress: () => setExtractedTasks([]),
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar backgroundColor="black" barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={30}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.headerButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{sessionTitle}</Text>
            <TouchableOpacity onPress={toggleSettings}>
              <Text style={styles.headerButtonText}>☰</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.container}>
            <FlatList
              style={{ flex: 1 }}
              ref={flatListRef}
              data={messages}
              renderItem={({ item, index }) => {
                const isUser = item.sender === "user";
                const timeStr = formatTime(item.timestamp);
                const isLastAI =
                  !isUser &&
                  index === messages.length - 1 &&
                  extractedTasks.length > 0;
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
                      <View style={{ width: "100%" }}>
                        <View style={styles.aiBubble}>
                          <Text style={styles.bubbleText}>{item.text}</Text>
                        </View>
                        <Text style={styles.timeText}>{timeStr}</Text>
                        {isLastAI && (
                          <TouchableOpacity
                            onPress={onTasksPress}
                            style={styles.taskNoticeContainer}
                          >
                            <Text style={styles.taskNoticeText}>
                              📝 할 일이 감지되었습니다. 확인하기
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
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
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 4,
  },
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
  taskNoticeContainer: {
    marginTop: 4,
    marginLeft: 8,
  },
  taskNoticeText: {
    fontSize: 14,
    color: "#007AFF",
    textDecorationLine: "underline",
  },
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
