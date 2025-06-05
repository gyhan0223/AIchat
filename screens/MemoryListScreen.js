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
import {
  deleteMemories,
  deleteMemory,
  getMemories,
} from "../utils/memoryStore";

export default function MemoryListScreen() {
  const navigation = useNavigation();
  const [memories, setMemories] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  useFocusEffect(
    useCallback(() => {
      loadMemories();
    }, [])
  );

  const loadMemories = async () => {
    const all = await getMemories();
    setMemories(all);
  };
  const toggleSelectMode = () => {
    if (selectMode) {
      setSelected(new Set());
    }
    setSelectMode(!selectMode);
  };

  const toggleSelect = (index) => {
    const newSet = new Set(selected);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelected(newSet);
  };

  const toggleSelectAll = () => {
    if (selected.size === memories.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(memories.map((_, idx) => idx)));
    }
  };

  const deleteSelectedMemories = () => {
    const indices = Array.from(selected);
    if (indices.length === 0) return;
    Alert.alert("정말 삭제할까요?", `${indices.length}개 기억을 삭제합니다.`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await deleteMemories(indices);
          setSelected(new Set());
          setSelectMode(false);
          loadMemories();
        },
      },
    ]);
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

  const renderItem = ({ item, index }) => {
    if (selectMode) {
      const checked = selected.has(index);
      return (
        <TouchableOpacity
          style={[styles.item, styles.selectItem]}
          onPress={() => toggleSelect(index)}
        >
          <View style={styles.checkbox}>
            {checked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemText}>{item.user}</Text>
            <Text style={styles.timeText}>{item.timestamp.split("T")[0]}</Text>
          </View>
        </TouchableOpacity>
      );
    }
    return (
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
  };

  return (
    <SafeAreaView style={styles.container}>
      {selectMode && (
        <View style={styles.bulkActions}>
          <TouchableOpacity onPress={toggleSelectAll} style={styles.bulkButton}>
            <Text style={styles.bulkButtonText}>
              {selected.size === memories.length ? "전체 해제" : "전체 선택"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={deleteSelectedMemories}
            style={[styles.bulkButton, styles.bulkDeleteButton]}
          >
            <Text style={[styles.bulkButtonText, styles.bulkDeleteText]}>
              삭제
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
      <TouchableOpacity style={styles.selectButton} onPress={toggleSelectMode}>
        <Text style={styles.selectButtonText}>
          {selectMode ? "취소" : "선택"}
        </Text>
      </TouchableOpacity>
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
  selectButton: {
    position: "absolute",
    right: 20,
    bottom: 30,
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
