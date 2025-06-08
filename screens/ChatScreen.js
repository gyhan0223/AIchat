import { OPENAI_API_KEY } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
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
import { scheduleNotificationWithId } from "../utils/notifications";
import { extractTasks } from "../utils/taskExtractor";
import { addTask } from "../utils/taskStore";
import { getUserInfo, saveUserInfo } from "../utils/userInfoStore";

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { sessionId } = route.params;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState([]);
  const [sessionTitle, setSessionTitle] = useState("");
  const [nameStored, setNameStored] = useState(false);
  const [nameJustStored, setNameJustStored] = useState(false);
  const [occupationAsked, setOccupationAsked] = useState(false);
  const [awaitingStudentLevel, setAwaitingStudentLevel] = useState(false);

  useEffect(() => {
    if (nameJustStored) {
      const t = setTimeout(() => setNameJustStored(false), 3000);
      return () => clearTimeout(t);
    }
  }, [nameJustStored]);

  const screenW = Dimensions.get("window").width;
  const slideAnim = useRef(new Animated.Value(screenW)).current;
  const flatListRef = useRef();

  useEffect(() => {
    (async () => {
      // 저장된 사용자 이름 로드
      const storedName = await AsyncStorage.getItem("userName");
      if (storedName) {
        setNameStored(true);
        setSessionTitle(storedName);
      }

      const info = await getUserInfo();

      // 해당 세션 메시지 불러오기
      const saved = await AsyncStorage.getItem(`chatMessages:${sessionId}`);
      let msgs = saved ? JSON.parse(saved) : [];
      msgs = msgs.map((m, idx) => ({
        id: m.id ?? `${m.timestamp}-${idx}`,
        ...m,
      }));

      // 세션 제목 로드
      const sessionsJson = await AsyncStorage.getItem("chatSessions");
      if (sessionsJson) {
        const sessions = JSON.parse(sessionsJson);
        const target = sessions.find((s) => s.id === sessionId);
        if (target) setSessionTitle(target.title);
      }

      // 새 세션이라면 초기 메시지 추가
      if (msgs.length === 0) {
        let welcomeText =
          "안녕하세요! 만나서 반가워요. 이름이 어떻게 되시나요?";
        if (storedName) {
          if (info.job) {
            welcomeText = `${storedName}님, 다시 오셨군요!`;
          } else {
            welcomeText = `${storedName}님, 반갑습니다. 혹시 학생이신가요, 직장인이신가요?`;
            setOccupationAsked(true);
          }
        }
        const now = new Date().toISOString();
        const aiMsg = {
          id: `${Date.now()}-${Math.random()}`,
          sender: "ai",
          text: welcomeText,
          timestamp: now,
        };
        msgs = [aiMsg];
        await AsyncStorage.setItem(
          `chatMessages:${sessionId}`,
          JSON.stringify(msgs)
        );
      }

      setMessages(msgs);

      // 기존 메모리 기반 오늘 할 일 알림
      const all = await getMemories();
      const today = new Date().toISOString().split("T")[0];
      all.forEach((m) => {
        if (m.type === "todayTask" && m.timestamp.startsWith(today)) {
          m.tasks.forEach((task) => {
            const aiMsg = {
              id: `${Date.now()}-${Math.random()}`,
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
    const trimmed = input.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();

    // 첫 메시지 이후, 이름이 아직 저장되지 않았다면 사용자 입력을 이름으로 저장
    if (!nameStored && messages.length >= 1 && messages[0].sender === "ai") {
      const userName = trimmed;
      await AsyncStorage.setItem("userName", userName);
      setNameStored(true);
      setNameJustStored(true);
      setSessionTitle(userName);

      // 세션 제목도 사용자 이름으로 업데이트
      const sessionsJson = await AsyncStorage.getItem("chatSessions");
      if (sessionsJson) {
        const sessions = JSON.parse(sessionsJson);
        const updated = sessions.map((s) =>
          s.id === sessionId ? { ...s, title: userName } : s
        );
        await AsyncStorage.setItem("chatSessions", JSON.stringify(updated));
        {
          const sessionsJson = await AsyncStorage.getItem("chatSessions");
          if (sessionsJson) {
            const sessions = JSON.parse(sessionsJson);
            const idx = sessions.findIndex((s) => s.id === sessionId);
            if (idx !== -1) {
              const session = sessions[idx];
              if (session.title === "새 대화") {
                session.title = input.trim().slice(0, 20);
                setSessionTitle(session.title);
              }
              session.last = now;
              sessions[idx] = session;
              await AsyncStorage.setItem(
                "chatSessions",
                JSON.stringify(sessions)
              );
            }
          }
        }
      }
    }

    // 유저 메시지 추가
    const userMessage = {
      id: `${Date.now()}-${Math.random()}`,
      sender: "user",
      text: input,
      timestamp: now,
    };
    let updated = [...messages, userMessage];
    setMessages(updated);
    await AsyncStorage.setItem(
      `chatMessages:${sessionId}`,
      JSON.stringify(updated)
    );
    setInput("");
    flatListRef.current?.scrollToEnd({ animated: true });
    if (occupationAsked) {
      if (awaitingStudentLevel) {
        let level = "학생";
        if (trimmed.includes("중")) level = "중학생";
        else if (trimmed.includes("고")) level = "고등학생";
        else if (trimmed.includes("대")) level = "대학생";
        await saveUserInfo({ job: level });
        const aiMsg = {
          id: `${Date.now()}-${Math.random()}`,
          sender: "ai",
          text: `${level}이시군요! 반가워요.`,
          timestamp: new Date().toISOString(),
        };
        updated = [...updated, aiMsg];
        setMessages(updated);
        await AsyncStorage.setItem(
          `chatMessages:${sessionId}`,
          JSON.stringify(updated)
        );
        setOccupationAsked(false);
        setAwaitingStudentLevel(false);

        const memory = {
          user: "사용자의 직업",
          ai: level,
          timestamp: new Date().toISOString(),
          type: "userInfo",
        };
        await saveMemory(memory);
        return;
      } else {
        if (trimmed.includes("학생")) {
          await saveUserInfo({ job: "학생" });
          const aiMsg = {
            id: `${Date.now()}-${Math.random()}`,
            sender: "ai",
            text: "중학생인가요, 고등학생인가요, 대학생인가요?",
            timestamp: new Date().toISOString(),
          };
          updated = [...updated, aiMsg];
          setMessages(updated);
          await AsyncStorage.setItem(
            `chatMessages:${sessionId}`,
            JSON.stringify(updated)
          );
          setAwaitingStudentLevel(true);
          return;
        } else if (trimmed.includes("직장")) {
          await saveUserInfo({ job: "직장인" });
          const aiMsg = {
            id: `${Date.now()}-${Math.random()}`,
            sender: "ai",
            text: "어떤 분야에서 일하고 계신가요?",
            timestamp: new Date().toISOString(),
          };
          updated = [...updated, aiMsg];
          setMessages(updated);
          await AsyncStorage.setItem(
            `chatMessages:${sessionId}`,
            JSON.stringify(updated)
          );
          setOccupationAsked(false);
          const memory = {
            user: "사용자의 직업",
            ai: "직장인",
            timestamp: new Date().toISOString(),
            type: "userInfo",
          };
          await saveMemory(memory);
          return;
        }
      }
    }

    // AI 응답
    const aiReply = await getAIResponse(trimmed);
    const aiMessage = {
      id: `${Date.now()}-${Math.random()}`,
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
    {
      const sessionsJson = await AsyncStorage.getItem("chatSessions");
      if (sessionsJson) {
        const sessions = JSON.parse(sessionsJson);
        const idx = sessions.findIndex((s) => s.id === sessionId);
        if (idx !== -1) {
          sessions[idx] = { ...sessions[idx], last: aiMessage.timestamp };
          await AsyncStorage.setItem("chatSessions", JSON.stringify(sessions));
        }
      }
    }
    flatListRef.current?.scrollToEnd({ animated: true });

    // 할 일 추출
    try {
      const tasks = await extractTasks(
        final.map((m) => ({ sender: m.sender, text: m.text }))
      );
      if (tasks.length > 0) {
        setExtractedTasks(tasks);
        for (const task of tasks) {
          await addTask({
            ...task,
            id: `${Date.now()}-${Math.random()}`,
          });
        }
      }
    } catch (e) {
      console.warn("extractTasks 오류:", e);
    }

    // 메모리 저장
    const tasksForToday = [];
    const date = await extractDate(trimmed);
    const time = await extractTime(trimmed);
    const notifId = await scheduleNotificationWithId(trimmed, date, time);
    const memory = {
      user: trimmed,
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
  const copyToClipboard = async (text) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("복사됨", "메시지가 복사되었습니다.");
  };

  const getAIResponse = async (text) => {
    try {
      const past = await getMemories();
      const recent = past.slice(-5).flatMap((m) => [
        { role: "user", content: m.user },
        { role: "assistant", content: m.ai },
      ]);
      const info = await getUserInfo();
      let infoIntro = "";
      if (info.job) {
        infoIntro += `사용자의 직업은 ${info.job}입니다.`;
      }

      const systemPrompt = `
               ${infoIntro}

         너는 사용자의 친근한 전문 코치야. 사용자의 정보를 파악하기 위해 질문을 단계적으로 이어 가야 해.
        한 번에 여러 질문을 하지 말고, 직업이나 나이 등은 하나씩 차근차근 물어본다.
        사용자의 이전 답에 따라 다음 질문을 결정하라.
        예를 들어 학생이라고 하면 꿈이나 진학 목표를 묻고, 좋은 대학을 원한다면 내신 또는 모의고사 성적을 물어보는 식으로 이어 간다.
        직장인이라면 현재 일하는 분야와 경력, 앞으로의 목표를 순서대로 물어본다.

        답변은 다음 형식을 따른다:
        1) 먼저 짧은 격려나 맞장구로 시작한다. (예: "와, 멋진 목표네요!", "좋아요, 한번 해보죠!")
        2) 이어서 반드시 "구조화된 단계(step)" 형태로 설명한다. (예: "첫째, ~; 둘째, ~; 셋째, ~")
        3) 각 단계마다 구체적인 팁이나 주의사항을 덧붙인다. (예: "이렇게 하면 좋아요", "이 부분을 신경써 주세요")
        4) 너무 길지 않게 3~4단계로 간결하게 작성한다.

        예시:
        "첫째, 오늘 할 일 목록을 노트에 적어보세요. 이렇게 하면 머릿속이 정리돼요. 둘째, 중요한 일부터 순서대로 타이머를 25분으로 맞추고 집중해 보세요. 셋째, 5분 휴식 시간을 꼭 가져 주세요. 이렇게 하면 효율이 확 올라갈 거예요!"
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
                const isNameAskAI = index === 0 && item.sender === "ai";
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
                        <TouchableOpacity
                          onLongPress={() => copyToClipboard(item.text)}
                        >
                          <View style={styles.userBubble}>
                            <Text style={styles.bubbleText}>{item.text}</Text>
                          </View>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={{ width: "100%" }}>
                        <TouchableOpacity
                          onLongPress={() => copyToClipboard(item.text)}
                        >
                          <View style={styles.aiBubble}>
                            <Text style={styles.bubbleText}>{item.text}</Text>
                          </View>
                        </TouchableOpacity>
                        <Text style={styles.timeText}>{timeStr}</Text>

                        {/* 이름 물어보는 AI 메시지 아래에 이름 저장 알림 */}
                        {isNameAskAI && nameJustStored && (
                          <View style={styles.nameConfirmContainer}>
                            <Text style={styles.nameConfirmText}>
                              🎉 AI가 사용자의 이름을 기억했습니다!
                            </Text>
                          </View>
                        )}

                        {/* 마지막 AI 메시지 아래에 할 일 알림 */}
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
              keyExtractor={(item) => item.id}
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
  nameConfirmContainer: {
    marginTop: 4,
    marginLeft: 8,
  },
  nameConfirmText: {
    fontSize: 14,
    color: "#28a745",
  },
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
