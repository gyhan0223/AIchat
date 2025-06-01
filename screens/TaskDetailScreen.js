// screens/TaskDetailScreen.js
import DateTimePicker from "@react-native-community/datetimepicker"; // 설치 필요: yarn add @react-native-community/datetimepicker
import { useNavigation, useRoute } from "@react-navigation/native";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // SafeAreaView 추가
import {
  addTask,
  deleteTask,
  getAllTasks,
  updateTask,
} from "../utils/taskStore";

export default function TaskDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { taskId } = route.params; // null 이면 새 태스크 생성 모드

  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState(null); // ISO 문자열 저장
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState("medium"); // 'high' | 'medium' | 'low'
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (taskId) {
      // 기존 태스크 가져오기
      (async () => {
        const all = await getAllTasks();
        const task = all.find((t) => t.id === taskId);
        if (task) {
          setContent(task.content);
          setDueDate(task.dueDate || null);
          setPriority(task.priority || "medium");
          setCompleted(task.completed || false);
        }
      })();
    }
  }, [taskId]);

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // 선택된 날을 ISO 문자열로 저장
      const iso = new Date(selectedDate).toISOString().split("T")[0];
      setDueDate(iso);
    }
  };

  const saveOrUpdate = async () => {
    if (!content.trim()) {
      Alert.alert("오류", "내용을 입력하세요.");
      return;
    }

    // 수정 모드
    if (taskId) {
      const updated = {
        id: taskId,
        content: content.trim(),
        dueDate,
        priority,
        completed,
        createdAt: new Date().toISOString(), // 실제론 createdAt 유지해도 무방
      };
      await updateTask(updated);
      Alert.alert("저장됨", "태스크가 업데이트되었습니다.", [
        { text: "확인", onPress: () => navigation.goBack() },
      ]);
    } else {
      // 신규 생성 모드
      const newTask = {
        id: `${Date.now()}`, // 간단히 timestamp 기반 unique id
        content: content.trim(),
        dueDate,
        priority,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      await addTask(newTask);
      Alert.alert("저장됨", "새 태스크가 추가되었습니다.", [
        { text: "확인", onPress: () => navigation.goBack() },
      ]);
    }
  };

  const onDelete = () => {
    if (!taskId) {
      // 새 생성 모드일 때는 뒤로 가기
      navigation.goBack();
      return;
    }
    Alert.alert("정말 삭제하시겠습니까?", `"${content}"을(를) 삭제합니다.`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await deleteTask(taskId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.label}>내용</Text>
      <TextInput
        style={styles.input}
        value={content}
        onChangeText={setContent}
        placeholder="할 일 내용을 입력하세요"
        multiline
      />

      <Text style={styles.label}>마감일</Text>
      <TouchableOpacity
        style={styles.dateInput}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.dateText}>
          {dueDate ? format(new Date(dueDate), "yyyy-MM-dd") : "선택 안 됨"}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={dueDate ? new Date(dueDate) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "calendar"}
          onChange={onChangeDate}
        />
      )}

      <Text style={styles.label}>우선순위</Text>
      <View style={styles.priorityContainer}>
        {["high", "medium", "low"].map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.priorityButton,
              priority === p && styles.priorityButtonActive(p),
            ]}
            onPress={() => setPriority(p)}
          >
            <Text
              style={[
                styles.priorityButtonText,
                priority === p && styles.priorityTextActive,
              ]}
            >
              {p === "high" ? "높음" : p === "medium" ? "중간" : "낮음"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 완료 여부 토글 (수정 모드일 때만 표시) */}
      {taskId && (
        <>
          <Text style={styles.label}>완료 여부</Text>
          <TouchableOpacity
            style={[
              styles.completeToggle,
              completed ? styles.completedToggleOn : styles.completedToggleOff,
            ]}
            onPress={() => setCompleted((prev) => !prev)}
          >
            <Text style={styles.completeToggleText}>
              {completed ? "완료됨" : "미완료"}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* 저장 버튼 */}
      <TouchableOpacity style={styles.saveButton} onPress={saveOrUpdate}>
        <Text style={styles.saveButtonText}>
          {taskId ? "업데이트" : "추가"}
        </Text>
      </TouchableOpacity>

      {/* 삭제 버튼 */}
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Text style={styles.deleteButtonText}>{taskId ? "삭제" : "취소"}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
    color: "#333",
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlignVertical: "top",
    backgroundColor: "#f9f9f9",
  },
  dateInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: "#f9f9f9",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  priorityContainer: {
    flexDirection: "row",
    marginTop: 6,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#f9f9f9",
    alignItems: "center",
  },
  priorityButtonActive: (p) => ({
    borderColor:
      p === "high" ? "#dc3545" : p === "medium" ? "#ff9900" : "#28a745",
    backgroundColor:
      p === "high"
        ? "rgba(220,53,69,0.1)"
        : p === "medium"
        ? "rgba(255,153,0,0.1)"
        : "rgba(40,167,69,0.1)",
  }),
  priorityButtonText: {
    fontSize: 14,
    color: "#555",
  },
  priorityTextActive: {
    color: "#000",
    fontWeight: "bold",
  },
  completeToggle: {
    marginTop: 6,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  completedToggleOn: {
    borderColor: "#28a745",
    backgroundColor: "rgba(40,167,69,0.1)",
  },
  completedToggleOff: {
    borderColor: "#dc3545",
    backgroundColor: "rgba(220,53,69,0.1)",
  },
  completeToggleText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  deleteButton: {
    marginTop: 12,
    backgroundColor: "#dc3545",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
