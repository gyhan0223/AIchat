import { OPENAI_API_KEY } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { StatusBar } from "expo-status-bar";
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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { summarizeUserInfo } from "../utils/infoSummarizer";
import { getMemories, saveMemory } from "../utils/memoryStore";
import { scheduleNotificationWithId } from "../utils/notifications";
import { extractTasks } from "../utils/taskExtractor";
import { generateTitle } from "../utils/titleGenerator";
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
  const initialMessagesLoaded = useRef(false);
  const [titleGenerated, setTitleGenerated] = useState(false);

  const updateSessionTitle = async (msgs) => {
    const base = msgs.slice(0, 10);
    const title = await generateTitle(base);
    if (!title) return;
    setSessionTitle(title);
    const sessionsJson = await AsyncStorage.getItem("chatSessions");
    if (sessionsJson) {
      const sessions = JSON.parse(sessionsJson);
      const idx = sessions.findIndex((s) => s.id === sessionId);
      if (idx !== -1) {
        sessions[idx] = { ...sessions[idx], title, titleGenerated: true };
        await AsyncStorage.setItem("chatSessions", JSON.stringify(sessions));
      }
    }
    setTitleGenerated(true);
  };

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
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
    const willShowSub = Keyboard.addListener("keyboardWillShow", () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
    return () => {
      showSub.remove();
      willShowSub.remove();
    };
  }, []);

  useEffect(() => {
    initialMessagesLoaded.current = false;
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
        if (target) {
          setSessionTitle(target.title);
          if (target.titleGenerated) setTitleGenerated(true);
        }
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
      initialMessagesLoaded.current = true;
    })();
  }, [sessionId]);

  // 초기 대화 내용으로 제목을 한 번만 생성한다
  useEffect(() => {
    if (!initialMessagesLoaded.current) return;
    if (titleGenerated) return;
    if (messages.length < 10) return;
    (async () => {
      await updateSessionTitle(
        messages.slice(0, 10).map((m) => ({ sender: m.sender, text: m.text }))
      );
    })();
  }, [messages, titleGenerated]);

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
          info: `사용자의 직업은 ${level}입니다.`,
          timestamp: new Date().toISOString(),
          type: "userInfo",
          sessionId,
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
            info: "사용자의 직업은 직장인입니다.",
            timestamp: new Date().toISOString(),
            type: "userInfo",
            sessionId,
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
        // 바로 추가하지 않고 사용자 확인을 위해 보류 상태로 저장

        setExtractedTasks(tasks);
      }
    } catch (e) {
      console.warn("extractTasks 오류:", e);
    }

    // 메모리 저장 - 사용자 정보만 요약하여 기록
    const summary = await summarizeUserInfo(trimmed);
    if (
      summary &&
      summary !== "빈 문자열" &&
      summary.replace(/\s|"|'/g, "") !== ""
    ) {
      const date = await extractDate(trimmed);
      const time = await extractTime(trimmed);
      const notifId = await scheduleNotificationWithId(trimmed, date, time);
      const memory = {
        info: summary,
        timestamp: new Date().toISOString(),
        type: "userInfo",
        sessionId,
        meta: date
          ? { date, time, event: "알 수 없음", notificationId: notifId }
          : undefined,
      };
      await saveMemory(memory);
    }

    // 제목 업데이트는 messages 상태 변화를 통해 처리한다
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
  const copyAllMessages = async () => {
    const history = messages
      .map((m) => `${m.sender === "ai" ? "ai" : "사용자"} : ${m.text}`)
      .join("\n");
    await Clipboard.setStringAsync(history);
    Alert.alert("복사됨", "전체 대화가 복사되었습니다.");
  };

  const getAIResponse = async (text) => {
    try {
      const past = await getMemories();
      const recent = past
        .slice(-5)
        .map((m) => ({ role: "system", content: m.info || m.user }))
        .filter((m) => m.content);
      const info = await getUserInfo();
      let infoIntro = "";
      if (info.job) {
        infoIntro += `사용자의 직업은 ${info.job}입니다.`;
      }

      const systemPrompt = `
               ${infoIntro}

         너는 사용자의 친근한 전문 코치야. 사용자의 정보를 파악하기 위해 질문을 단계적으로 이어 가야 해.
        한 번에 여러 질문을 하지 말고, 직업이나 나이 등은 하나씩 차근차근 물어본다.
        사용자의 이전 답을 요약해 이해했음을 보여주고 그에 맞춰 다음 질문을 이어 간다.
        예를 들어 사용자가 "앱 개발 중"이라고 하면 어떤 기능을 구현 중인지, 프론트엔드·백엔드·기획 중 어디가 궁금한지 등 구체적인 선택지를 제시한다.


        직장인이라면 현재 일하는 분야와 경력, 앞으로의 목표를 순서대로 물어본다.
        사용자가 특별히 조언을 요구하지 않았다면 어떤 부분에서 도움이 필요한지 먼저 확인한다.
        "도와줘", "어떻게", "조언"과 같은 명확한 요청이 있을 때만 구체적인 단계 제안을 한다.
        사용자의 메시지에 그런 표현이 없다면 바로 조언하지 말고,
        단순히 "사업을 준비하고 있어"처럼 상황만 말한 경우에는 어떤 부분에서 지원이 필요한지, 목표가 무엇인지 먼저 물어본다.
        
        충분한 정보를 얻은 뒤에야 상황에 맞는 조언을 제공한다.
        감탄사로만 반응하지 말고, 사용자의 발화를 요약한 뒤 맥락에 맞는 실질적 리액션을 하라.


        답변은 다음 형식을 따른다:
        1) 먼저 짧은 맞장구로 시작한 뒤 사용자의 마지막 발화를 한두 문장으로 요약한다.
        2) 이어서 사용자가 선택하거나 대답하기 쉬운 구체적인 예시나 선택지를 제시한다.
        3) 필요 시 "구조화된 단계(step)" 형태로 설명하며 각 단계에 구체적인 팁을 덧붙인다.
        4) 너무 길지 않게 3~4단계 정도로 간결하게 작성한다.

        예시:
        앱 개발 중이라고 하셨죠? 첫째, 구현하려는 핵심 기능을 정리해 보세요. 둘째, 프론트엔드와 백엔드 중 어느 쪽이 더 어렵게 느껴지시는지도 알려 주세요. 셋째, 필요한 기술 스택이나 자료가 있으면 말씀해 주세요."
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
    Alert.alert("추출된 할 일 목록", `${list}\n\n추가할까요?`, [
      {
        text: "아니오",
        style: "cancel",
        onPress: () => setExtractedTasks([]),
      },
      {
        text: "예",
        onPress: async () => {
          for (const task of extractedTasks) {
            await addTask({
              ...task,
              id: `${Date.now()}-${Math.random()}`,
            });
          }
          setExtractedTasks([]);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" backgroundColor="black" />
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
                      <View style={{ width: "100%", alignItems: "flex-end" }}>
                        <TouchableOpacity
                          onLongPress={() => copyToClipboard(item.text)}
                        >
                          <View style={styles.userBubble}>
                            <Text style={styles.bubbleText}>{item.text}</Text>
                          </View>
                        </TouchableOpacity>
                        <Text style={styles.timeText}>{timeStr}</Text>
                      </View>
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
                              📝 할 일이 감지되었습니다. 추가할까요?
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
                onFocus={() =>
                  flatListRef.current?.scrollToEnd({ animated: true })
                }
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
              <TouchableOpacity onPress={copyAllMessages}>
                <Text style={styles.copyAllText}>전체 대화 복사하기</Text>
              </TouchableOpacity>
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
    width: "100%",
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
  copyAllText: { fontSize: 16, color: "#007AFF", marginBottom: 12 },

  closeText: { marginTop: 20, fontSize: 16, color: "#007AFF" },
});
