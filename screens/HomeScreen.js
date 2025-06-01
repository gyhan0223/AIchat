// screens/HomeScreen.js
import { useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMemories } from "../utils/memoryStore";

export default function HomeScreen() {
  const navigation = useNavigation();
  const [todayTasks, setTodayTasks] = useState([]);
  const [futureEvents, setFutureEvents] = useState([]);
  const [worries, setWorries] = useState([]);
  const [emotions, setEmotions] = useState([]);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
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
    paddingBottom: Platform.OS === "ios" ? 140 : 120, // 버튼 공간 확보
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
  navContainer: {
    position: "absolute",
    bottom: 30, // 더 위쪽으로 띄움
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingVertical: 16, // 버튼 높이 확장
    borderTopWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    // 그림자 효과
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
    paddingVertical: 14, // 버튼 높이 확장
    borderRadius: 8,
    alignItems: "center",
  },
  navText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
