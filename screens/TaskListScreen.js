// screens/TaskListScreen.js
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { format } from "date-fns"; // 날짜 형식 맞추기용 (설치 필요: yarn add date-fns)
import { useCallback, useState } from "react";
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
import { deleteTask, getAllTasks, updateTask } from "../utils/taskStore";

export default function TaskListScreen() {
  const navigation = useNavigation();
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all"); // 'all' | 'today' | 'completed'

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

  // 필터링된 목록 계산
  const filteredTasks = tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "today") return t.dueDate === todayString;
    if (filter === "completed") return t.completed === true;
    return true;
  });

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
    return (
      <Swipeable
        renderLeftActions={() => renderLeftActions(item)}
        renderRightActions={() => renderRightActions(item)}
        leftThreshold={30}
        rightThreshold={40}
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
});
