import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getMemories } from "../utils/memoryStore";

export default function HomeScreen() {
  const [todayTasks, setTodayTasks] = useState([]);
  const [taskCompletion, setTaskCompletion] = useState([]);
  const [futureEvents, setFutureEvents] = useState([]);
  const [worries, setWorries] = useState([]);
  const [emotions, setEmotions] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const loadMemories = async () => {
      const memories = await getMemories();
      const today = new Date().toISOString().split("T")[0];

      const todayTasksList = [];
      const futureEventsList = [];
      const worriesList = [];
      const emotionList = [];

      memories.forEach((memory) => {
        if (memory.type === "todayTask" && memory.timestamp.startsWith(today)) {
          todayTasksList.push(...(memory.tasks || []));
        } else if (memory.meta?.date > today) {
          futureEventsList.push({
            event: memory.meta?.event,
            date: memory.meta?.date,
          });
        }

        if (
          memory.user.includes("걱정") ||
          memory.user.includes("불안") ||
          memory.user.includes("스트레스")
        ) {
          worriesList.push(memory.user);
        }

        const emotionTags = [
          "우울",
          "불안",
          "슬픔",
          "짜증",
          "외로움",
          "무기력",
        ];
        if (emotionTags.some((tag) => memory.user.includes(tag))) {
          const tag = emotionTags.find((t) => memory.user.includes(t));
          if (tag) emotionList.push(tag);
        }
      });

      setTodayTasks(todayTasksList);
      setFutureEvents(futureEventsList);
      setWorries(worriesList);
      setEmotions(emotionList);

      const stored = await AsyncStorage.getItem("taskCompletion");
      if (stored) {
        const parsed = JSON.parse(stored);
        setTaskCompletion(parsed);
      } else {
        setTaskCompletion(Array(todayTasksList.length).fill(false));
      }
    };

    loadMemories();
  }, []);

  const toggleTaskCompletion = async (index) => {
    const updated = [...taskCompletion];
    updated[index] = !updated[index];
    setTaskCompletion(updated);
    await AsyncStorage.setItem("taskCompletion", JSON.stringify(updated));
  };

  const getCompletionRate = () => {
    const total = taskCompletion.length;
    const done = taskCompletion.filter(Boolean).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={styles.heading}>오늘 해야 할 일 📝</Text>
      {todayTasks.length > 0 ? (
        todayTasks.map((task, idx) => (
          <Pressable
            key={idx}
            onPress={() => toggleTaskCompletion(idx)}
            style={styles.taskRow}
          >
            <View
              style={[
                styles.checkbox,
                taskCompletion[idx] && styles.checkedBox,
              ]}
            />
            <Text
              style={[styles.item, taskCompletion[idx] && styles.checkedText]}
            >
              {task}
            </Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.empty}>아직 저장된 할 일이 없어요.</Text>
      )}

      {todayTasks.length > 0 && (
        <Text style={styles.completionMessage}>
          🎉 오늘 할 일 완료율: {getCompletionRate()}%
          {getCompletionRate() === 100
            ? "! 완벽해! 👏"
            : getCompletionRate() >= 50
            ? " 잘하고 있어! 👍"
            : " 조금만 더 힘내보자! 💪"}
        </Text>
      )}

      <Text style={styles.heading}>다가오는 일정 📅</Text>
      {futureEvents.length > 0 ? (
        futureEvents.map((event, idx) => (
          <Text key={idx} style={styles.item}>
            - {event.event} ({event.date})
          </Text>
        ))
      ) : (
        <Text style={styles.empty}>등록된 일정이 없어요.</Text>
      )}

      <Text style={styles.heading}>최근 걱정거리 😟</Text>
      {worries.length > 0 ? (
        worries.map((worry, idx) => (
          <Text key={idx} style={styles.item}>
            - {worry}
          </Text>
        ))
      ) : (
        <Text style={styles.empty}>최근 고민도 잘 없었네요 :)</Text>
      )}

      <Text style={styles.heading}>감정 요약 🧠</Text>
      {emotions.length > 0 ? (
        <Text style={styles.item}>
          최근 자주 느낀 감정: {Array.from(new Set(emotions)).join(", ")}
        </Text>
      ) : (
        <Text style={styles.empty}>감정 표현이 감지되지 않았어요.</Text>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Chat")}
      >
        <Text style={styles.buttonText}>💬 대화하러 가기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  item: {
    fontSize: 16,
    marginBottom: 5,
  },
  empty: {
    fontSize: 15,
    color: "#999",
    marginBottom: 10,
  },
  button: {
    marginTop: 30,
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "#007AFF",
    marginRight: 10,
    borderRadius: 4,
  },
  checkedBox: {
    backgroundColor: "#007AFF",
  },
  checkedText: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  completionMessage: {
    fontSize: 16,
    marginTop: 5,
    marginBottom: 10,
    color: "#444",
  },
});
