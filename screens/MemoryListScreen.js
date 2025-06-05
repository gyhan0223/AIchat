import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RectButton, Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteMemory, getMemories } from "../utils/memoryStore";

export default function MemoryListScreen() {
  const navigation = useNavigation();
  const [memories, setMemories] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadMemories();
    }, [])
  );

  const loadMemories = async () => {
    const all = await getMemories();
    setMemories(all);
  };

  const renderLeftActions = (index) => (
    <RectButton
      style={[styles.actionButton, styles.editButton]}
      onPress={() => navigation.navigate("MemoryDetail", { index })}
    >
      <Text style={styles.actionText}>수정</Text>
    </RectButton>
  );

  const renderRightActions = (index) => (
    <RectButton
      style={[styles.actionButton, styles.deleteButton]}
      onPress={() => {
        Alert.alert("정말 삭제할까요?", "", [
          { text: "취소", style: "cancel" },
          {
            text: "삭제",
            style: "destructive",
            onPress: async () => {
              await deleteMemory(index);
              loadMemories();
            },
          },
        ]);
      }}
    >
      <Text style={styles.actionText}>삭제</Text>
    </RectButton>
  );

  const renderItem = ({ item, index }) => (
    <Swipeable
      renderLeftActions={() => renderLeftActions(index)}
      renderRightActions={() => renderRightActions(index)}
      leftThreshold={30}
      rightThreshold={40}
    >
      <TouchableOpacity
        style={styles.item}
        onPress={() => navigation.navigate("MemoryDetail", { index })}
      >
        <Text style={styles.itemText}>{item.user}</Text>
        <Text style={styles.timeText}>{item.timestamp.split("T")[0]}</Text>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={memories}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>저장된 기억이 없습니다.</Text>
          </View>
        }
        contentContainerStyle={memories.length === 0 && { flex: 1 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  itemText: { fontSize: 16, color: "#333" },
  timeText: { fontSize: 12, color: "#999", marginTop: 4 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 14, color: "#999" },
  actionButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginVertical: 4,
    borderRadius: 4,
  },
  editButton: { backgroundColor: "#28a745" },
  deleteButton: { backgroundColor: "#dc3545" },
  actionText: { color: "#fff", fontWeight: "bold" },
});
