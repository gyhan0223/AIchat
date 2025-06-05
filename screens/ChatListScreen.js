// screens/ChatListScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  Alert,
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
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

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
  const toggleSelectMode = () => {
    if (selectMode) {
      setSelected(new Set());
    }
    setSelectMode(!selectMode);
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelected(newSet);
  };

  const toggleSelectAll = () => {
    if (selected.size === sessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sessions.map((s) => s.id)));
    }
  };

  const deleteSelectedSessions = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    Alert.alert("정말 삭제할까요?", `${ids.length}개 대화를 삭제합니다.`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          const remaining = sessions.filter((s) => !selected.has(s.id));
          setSessions(remaining);
          await AsyncStorage.setItem("chatSessions", JSON.stringify(remaining));
          for (const id of ids) {
            await AsyncStorage.removeItem(`chatMessages:${id}`);
          }
          setSelected(new Set());
          setSelectMode(false);
        },
      },
    ]);
  };

  const selectSession = (id) => {
    navigation.navigate("Chat", { sessionId: id });
  };

  const renderItem = ({ item }) => {
    if (selectMode) {
      const checked = selected.has(item.id);
      return (
        <TouchableOpacity
          style={[styles.item, styles.selectItem]}
          onPress={() => toggleSelect(item.id)}
        >
          <View style={styles.checkbox}>
            {checked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.title}>
            {item.title || new Date(item.start).toLocaleString()}
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => selectSession(item.id)}
      >
        <Text style={styles.title}>
          {item.title || new Date(item.start).toLocaleString()}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {selectMode && (
        <View style={styles.bulkActions}>
          <TouchableOpacity onPress={toggleSelectAll} style={styles.bulkButton}>
            <Text style={styles.bulkButtonText}>
              {selected.size === sessions.length ? "전체 해제" : "전체 선택"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={deleteSelectedSessions}
            style={[styles.bulkButton, styles.bulkDeleteButton]}
          >
            <Text style={[styles.bulkButtonText, styles.bulkDeleteText]}>
              삭제
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
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
      <TouchableOpacity style={styles.selectButton} onPress={toggleSelectMode}>
        <Text style={styles.selectButtonText}>
          {selectMode ? "취소" : "선택"}
        </Text>
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
  selectButton: {
    position: "absolute",
    right: 20,
    bottom: 90,
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  selectButtonText: { color: "#fff", fontWeight: "bold" },
  bulkActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#f9f9f9",
  },
  bulkButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  bulkButtonText: { fontSize: 14, color: "#007AFF" },
  bulkDeleteButton: { backgroundColor: "#dc3545" },
  bulkDeleteText: { color: "#fff" },
  selectItem: { flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: { fontSize: 16, color: "#007AFF" },
});
