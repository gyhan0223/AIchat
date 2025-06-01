// screens/ChatListScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatListScreen() {
  const navigation = useNavigation();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const loadSessions = async () => {
      const json = await AsyncStorage.getItem("chatSessions");
      if (json) setSessions(JSON.parse(json));
    };
    loadSessions();
  }, []);

  const startNewSession = async () => {
    const id = Date.now().toString();
    const start = new Date().toISOString();
    // title을 "새 대화"로 초기화
    const newSession = { id, start, title: "새 대화" };
    const updated = [...sessions, newSession];
    setSessions(updated);
    await AsyncStorage.setItem("chatSessions", JSON.stringify(updated));
    // 빈 배열로 초기화된 채팅 메시지 저장
    await AsyncStorage.setItem(`chatMessages:${id}`, JSON.stringify([]));
    navigation.navigate("Chat", { sessionId: id });
  };

  const selectSession = (id) => {
    navigation.navigate("Chat", { sessionId: id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => selectSession(item.id)}
          >
            <Text style={styles.title}>
              {item.title || new Date(item.start).toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>진행 중인 대화가 없습니다.</Text>
          </View>
        }
        contentContainerStyle={sessions.length === 0 && { flex: 1 }}
      />
      <TouchableOpacity style={styles.newButton} onPress={startNewSession}>
        <Text style={styles.newButtonText}>새 대화 시작</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  title: {
    fontSize: 16,
    color: "#333",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
  newButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  newButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
