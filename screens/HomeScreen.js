// screens/HomeScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMemories } from "../utils/memoryStore";
import { splitKoreanName } from "../utils/nameUtils";

export default function HomeScreen() {
  const navigation = useNavigation();
  const [userName, setUserName] = useState("");
  const [todayTasks, setTodayTasks] = useState([]);
  const [futureEvents, setFutureEvents] = useState([]);
  const [worries, setWorries] = useState([]);
  const [emotions, setEmotions] = useState([]);

  // 화면 포커스 시마다 userName 갱신
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const storedName = await AsyncStorage.getItem("userName");
        if (storedName) {
          setUserName(storedName);
        }
      })();
    }, [])
  );

  useEffect(() => {
    (async () => {
      const all = await getMemories();
      const today = new Date().toISOString().split("T")[0];

      // 오늘 일정
      const todayList = all.filter(
        (m) => m.type === "todayTask" && m.timestamp.startsWith(today)
      );
      setTodayTasks(todayList);

      // 미래 이벤트
      const futureList = all.filter((m) => m.meta?.date && m.meta.date > today);
      setFutureEvents(futureList);

      // 걱정거리
      const worriesList = all.filter((m) => m.type === "worry");
      setWorries(worriesList);

      // 감정 요약
      const emotionList = all.filter((m) => m.type === "emotion");
      setEmotions(emotionList);
    })();
  }, []);

  useEffect(() => {
    const requestPermissionsAndCheckReminders = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
    };
    requestPermissionsAndCheckReminders();
  }, []);

  // AI가 기억 중인 사용자 정보 보기
  const viewUserInfo = async () => {
    const storedName = await AsyncStorage.getItem("userName");
    const memories = await getMemories();
    let infoText = "";

    // 이름
    infoText += storedName ? `이름: ${storedName}\n\n` : "";

    // 메모리 항목들
    if (memories.length === 0) {
      infoText += "기억된 정보가 없습니다.";
    } else {
      infoText += "저장된 기억:\n";
      memories.forEach((m, idx) => {
        const time = m.timestamp.split("T")[0];
        infoText += `${idx + 1}. [${m.type}] ${time} - "${m.user}"\n`;
      });
    }

    Alert.alert("AI가 기억 중인 정보", infoText);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 사용자 인사말 */}
        {userName ? (
          <Text style={styles.greeting}>
            {`${splitKoreanName(userName).firstName}님, 반가워요!`}
          </Text>
        ) : null}

        {/* 오늘 할 일 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 할 일</Text>
          {todayTasks.length === 0 ? (
            <Text style={styles.emptyText}>오늘 일정이 없습니다.</Text>
          ) : (
            todayTasks.map((m, idx) => (
              <Text key={idx} style={styles.itemText}>
                • {m.tasks.join(", ")}
              </Text>
            ))
          )}
        </View>

        {/* 미래 일정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>미래 이벤트</Text>
          {futureEvents.length === 0 ? (
            <Text style={styles.emptyText}>등록된 미래 일정이 없습니다.</Text>
          ) : (
            futureEvents.map((m, idx) => (
              <Text key={idx} style={styles.itemText}>
                • {m.meta?.date} – {m.user}
              </Text>
            ))
          )}
        </View>

        {/* 걱정거리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>걱정거리</Text>
          {worries.length === 0 ? (
            <Text style={styles.emptyText}>걱정거리가 없습니다.</Text>
          ) : (
            worries.map((m, idx) => (
              <Text key={idx} style={styles.itemText}>
                • {m.user}
              </Text>
            ))
          )}
        </View>

        {/* 감정 요약 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>감정 요약</Text>
          {emotions.length === 0 ? (
            <Text style={styles.emptyText}>감정 기록이 없습니다.</Text>
          ) : (
            emotions.map((m, idx) => (
              <Text key={idx} style={styles.itemText}>
                • {m.ai}
              </Text>
            ))
          )}
        </View>
      </ScrollView>

      {/* 사용자 정보 보기 버튼 */}
      <TouchableOpacity style={styles.infoButton} onPress={viewUserInfo}>
        <Text style={styles.infoButtonText}>내 정보 보기</Text>
      </TouchableOpacity>

      {/* 이름 변경 버튼 */}
      <TouchableOpacity
        style={styles.nameButton}
        onPress={() => navigation.navigate("ChangeName")}
      >
        <Text style={styles.nameButtonText}>이름 변경</Text>
      </TouchableOpacity>

      {/* 기억 관리 버튼 */}
      <TouchableOpacity
        style={styles.manageButton}
        onPress={() => navigation.navigate("Memories")}
      >
        <Text style={styles.manageButtonText}>기억 관리</Text>
      </TouchableOpacity>

      {/* 하단 네비게이션 버튼들 */}
      <View style={styles.navContainer}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("ChatList")}
        >
          <Text style={styles.navText}>💬 대화</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("Tasks")}
        >
          <Text style={styles.navText}>📝 할 일 목록</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("TaskDetail", { taskId: null })}
        >
          <Text style={styles.navText}>＋ 새 할 일</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 220 : 200, // 버튼 공간 추가 확보
  },
  greeting: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  itemText: {
    fontSize: 16,
    color: "#444",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  infoButton: {
    position: "absolute",
    bottom: 110, // 네비게이션 버튼 위에 위치
    left: 16,
    right: 16,
    backgroundColor: "#28a745",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
  },
  infoButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  nameButton: {
    position: "absolute",
    bottom: 160,
    left: 16,
    right: 16,
    backgroundColor: "#6c63ff",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
  },
  nameButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  manageButton: {
    position: "absolute",
    bottom: 210,
    left: 16,
    right: 16,
    backgroundColor: "#ff9900",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
  },
  manageButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  navContainer: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navButton: {
    flex: 1,
    marginHorizontal: 6,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  navText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
