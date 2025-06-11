import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteMemories, getMemories } from "../utils/memoryStore";

export default function SessionDeleteScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { sessionIds } = route.params;
  const [memories, setMemories] = useState([]);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    (async () => {
      const all = await getMemories();
      const idSet = new Set(sessionIds);
      const filtered = all
        .map((m, idx) => ({ ...m, index: idx }))
        .filter((m) => idSet.has(m.sessionId));
      setMemories(filtered);
      setSelected(new Set(filtered.map((m) => m.index)));
    })();
  }, [sessionIds]);

  const toggleSelect = (index) => {
    const newSet = new Set(selected);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelected(newSet);
  };

  const deleteConversationsAndMemories = async () => {
    // delete sessions
    const sessionsJson = await AsyncStorage.getItem("chatSessions");
    const sessions = sessionsJson ? JSON.parse(sessionsJson) : [];
    const remaining = sessions.filter((s) => !sessionIds.includes(s.id));
    await AsyncStorage.setItem("chatSessions", JSON.stringify(remaining));
    for (const id of sessionIds) {
      await AsyncStorage.removeItem(`chatMessages:${id}`);
    }
    // delete memories
    const indices = Array.from(selected);
    if (indices.length > 0) {
      await deleteMemories(indices);
    }
    navigation.goBack();
  };

  const renderItem = ({ item }) => {
    const checked = selected.has(item.index);
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => toggleSelect(item.index)}
      >
        <View style={styles.checkbox}>{checked && <Text>✓</Text>}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemText}>{item.info || item.user}</Text>
          <Text style={styles.timeText}>{item.timestamp.split("T")[0]}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {memories.length === 0 ? (
        <View style={styles.empty}>
          \n <Text style={styles.emptyText}>삭제할 기억이 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(item) => String(item.index)}
          renderItem={renderItem}
          contentContainerStyle={memories.length === 0 && { flex: 1 }}
        />
      )}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={deleteConversationsAndMemories}
      >
        <Text style={styles.deleteText}>대화와 선택한 기억 삭제</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelText}>취소</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
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
  itemText: { fontSize: 16, color: "#333" },
  timeText: { fontSize: 12, color: "#999" },
  deleteButton: {
    margin: 16,
    backgroundColor: "#dc3545",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteText: { color: "#fff", fontWeight: "bold" },
  cancelButton: {
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#ccc",
  },
  cancelText: { color: "#333" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 14, color: "#999" },
});
