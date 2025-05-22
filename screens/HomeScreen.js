import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { getMemories } from "../utils/memoryStore";

export default function HomeScreen() {
  const [todayTasks, setTodayTasks] = useState([]);
  const [futureEvents, setFutureEvents] = useState([]);
  const [worries, setWorries] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const loadMemories = async () => {
      const memories = await getMemories();
      const today = new Date().toISOString().split("T")[0];

      const todayTasksList = [];
      const futureEventsList = [];
      const worriesList = [];

      memories.forEach((memory) => {
        if (memory.type === "todayTask" && memory.timestamp.startsWith(today)) {
          todayTasksList.push(...(memory.tasks || []));
        } else if (memory.meta?.date > today) {
          futureEventsList.push({
            event: memory.meta?.event,
            date: memory.meta?.date,
          });
        } else if (
          memory.user.includes("걱정") ||
          memory.user.includes("불안") ||
          memory.user.includes("스트레스")
        ) {
          worriesList.push(memory.user);
        }
      });

      setTodayTasks(todayTasksList);
      setFutureEvents(futureEventsList);
      setWorries(worriesList);
    };

    loadMemories();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={styles.heading}>오늘 해야 할 일 📝</Text>
      {todayTasks.length > 0 ? (
        todayTasks.map((task, idx) => (
          <Text key={idx} style={styles.item}>
            - {task}
          </Text>
        ))
      ) : (
        <Text style={styles.empty}>아직 저장된 할 일이 없어요.</Text>
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
});
