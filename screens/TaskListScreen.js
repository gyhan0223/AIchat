// screens/TaskListScreen.js
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { format } from "date-fns"; // 날짜 형식 맞추기용 (설치 필요: yarn add date-fns)
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RectButton, Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context"; // SafeAreaView 추가
import {
  deleteTask,
  deleteTasks,
  getAllTasks,
  updateTask,
} from "../utils/taskStore";

export default function TaskListScreen() {
  const navigation = useNavigation();
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all"); // 'all' | 'today' | 'completed'
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  // Swipeable refs and open directions
  const swipeRefs = useRef({});
  const openDirections = useRef({});
  const blockOpen = useRef({});

  // 오늘 날짜 문자열: '2025-06-01' 같은 형식
  const todayString = new Date().toISOString().split("T")[0];

  // 포커스 될 때마다(뒤로 돌아왔을 때 등) 태스크 목록 불러오기
  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [])
  );

  const loadTasks = async () => {
    const all = await getAllTasks();
    setTasks(all);
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
    if (selected.size === filteredTasks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredTasks.map((t) => t.id)));
    }
  };

  const deleteSelectedTasks = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    Alert.alert(
      "정말 삭제하시겠습니까?",
      `${ids.length}개 할 일을 삭제합니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            await deleteTasks(ids);
            setSelected(new Set());
            setSelectMode(false);
            loadTasks();
          },
        },
      ]
    );
  };

  // 필터링된 목록 계산
  const filteredTasks = tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "today") return t.dueDate === todayString;
    if (filter === "completed") return t.completed === true;
    return true;
  });
  const handleWillOpen = (id, direction) => {
    const current = openDirections.current[id];
    if (current && current !== direction) {
      blockOpen.current[id] = true;

      swipeRefs.current[id]?.close();
    }
  };

  const handleOpen = (id, direction) => {
    if (blockOpen.current[id]) {
      swipeRefs.current[id]?.close();
      blockOpen.current[id] = false;
      return;
    }
    openDirections.current[id] = direction;
  };

  const handleClose = (id) => {
    openDirections.current[id] = null;
    blockOpen.current[id] = false;
  };

  // 왼쪽(완료/취소) 버튼
  const renderLeftActions = (item) => {
    return (
      <RectButton
        style={[
          styles.actionButton,
          item.completed ? styles.undoButton : styles.completeButton,
        ]}
        onPress={async () => {
          const updated = { ...item, completed: !item.completed };
          await updateTask(updated);
          loadTasks();
        }}
      >
        <Text style={styles.actionText}>
          {item.completed ? "취소" : "완료"}
        </Text>
      </RectButton>
    );
  };

  // 오른쪽(삭제) 버튼
  const renderRightActions = (item) => {
    return (
      <RectButton
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => {
          Alert.alert(
            "정말 삭제하시겠습니까?",
            `"${item.content}" 항목을 삭제합니다.`,
            [
              { text: "취소", style: "cancel" },
              {
                text: "삭제",
                style: "destructive",
                onPress: async () => {
                  await deleteTask(item.id);
                  loadTasks();
                },
              },
            ]
          );
        }}
      >
        <Text style={styles.actionText}>삭제</Text>
      </RectButton>
    );
  };

  // 각 태스크 행 렌더링
  const renderItem = ({ item }) => {
    if (selectMode) {
      const checked = selected.has(item.id);
      return (
        <TouchableOpacity
          style={[styles.taskRow, styles.selectItem]}
          onPress={() => toggleSelect(item.id)}
        >
          <View style={styles.checkbox}>
            {checked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.taskContent,
                item.completed && styles.completedText,
              ]}
            >
              {item.content}
            </Text>
            {item.dueDate && (
              <Text style={styles.dueDate}>
                마감: {format(new Date(item.dueDate), "yyyy-MM-dd")}
              </Text>
            )}
          </View>
          {item.priority && (
            <View style={styles.priorityBadge(item.priority)}>
              <Text style={styles.priorityText}>{item.priority}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }
    return (
      <Swipeable
        ref={(ref) => (swipeRefs.current[item.id] = ref)}
        renderLeftActions={() => renderLeftActions(item)}
        renderRightActions={() => renderRightActions(item)}
        leftThreshold={30}
        rightThreshold={40}
        onSwipeableWillOpen={(dir) => handleWillOpen(item.id, dir)}
        onSwipeableOpen={(dir) => handleOpen(item.id, dir)}
        onSwipeableClose={() => handleClose(item.id)}
      >
        <TouchableOpacity
          style={[styles.taskRow, item.completed && styles.completedRow]}
          onPress={() => navigation.navigate("TaskDetail", { taskId: item.id })}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.taskContent,
                item.completed && styles.completedText,
              ]}
            >
              {item.content}
            </Text>
            {item.dueDate && (
              <Text style={styles.dueDate}>
                마감: {format(new Date(item.dueDate), "yyyy-MM-dd")}
              </Text>
            )}
          </View>
          {item.priority && (
            <View style={styles.priorityBadge(item.priority)}>
              <Text style={styles.priorityText}>{item.priority}</Text>
            </View>
          )}
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
              {selected.size === filteredTasks.length
                ? "전체 해제"
                : "전체 선택"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={deleteSelectedTasks}
            style={[styles.bulkButton, styles.bulkDeleteButton]}
          >
            <Text style={[styles.bulkButtonText, styles.bulkDeleteText]}>
              삭제
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {/* 필터 버튼 */}
      <View style={styles.filterContainer}>
        {["all", "today", "completed"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterButton,
              filter === f && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === "all" ? "전체" : f === "today" ? "오늘" : "완료됨"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 태스크 목록 */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "ios" ? 100 : 80, // 하단 + 버튼 공간 확보
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>등록된 할 일이 없습니다.</Text>
          </View>
        }
      />

      {/* 하단에 + 버튼을 두어 새 태스크를 추가할 수 있도록 안내 */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("TaskDetail", { taskId: null })}
      >
        <Text style={styles.addButtonText}>＋</Text>
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
  container: { flex: 1, backgroundColor: "#fff" },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff", // SafeAreaView 아래로 내려오도록
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f2f2f2",
  },
  filterButtonActive: {
    backgroundColor: "#007AFF",
  },
  filterText: {
    fontSize: 14,
    color: "#555",
  },
  filterTextActive: {
    color: "#fff",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },
  completedRow: {
    backgroundColor: "#f9f9f9",
  },
  taskContent: {
    fontSize: 16,
    color: "#333",
  },
  completedText: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  dueDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  priorityBadge: (priority) => ({
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor:
      priority === "high"
        ? "#dc3545"
        : priority === "medium"
        ? "#ff9900"
        : "#28a745",
  }),
  priorityText: {
    color: "#fff",
    fontSize: 12,
  },
  actionButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginVertical: 4,
    borderRadius: 4,
  },
  completeButton: {
    backgroundColor: "#28a745",
  },
  undoButton: {
    backgroundColor: "#6c757d",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
  },
  actionText: {
    color: "#fff",
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  addButton: {
    position: "absolute",
    right: 20,
    bottom: 30,
    backgroundColor: "#007AFF",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 28,
    lineHeight: 30,
  },
  selectButton: {
    position: "absolute",
    left: 20,
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
