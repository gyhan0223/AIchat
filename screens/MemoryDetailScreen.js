import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteMemory, getMemories, updateMemory } from "../utils/memoryStore";

export default function MemoryDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { index } = route.params;
  const [infoText, setInfoText] = useState("");
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");

  useEffect(() => {
    (async () => {
      const all = await getMemories();
      if (index != null && index < all.length) {
        const item = all[index];
        if (item.info) {
          setInfoText(item.info);
        } else {
          setUserText(item.user || "");
          setAiText(item.ai || "");
        }
      }
    })();
  }, [index]);

  const save = async () => {
    if (infoText) {
      await updateMemory(index, { info: infoText });
    } else {
      await updateMemory(index, { user: userText, ai: aiText });
    }
    Alert.alert("저장됨", "", [
      { text: "확인", onPress: () => navigation.goBack() },
    ]);
  };

  const onDelete = () => {
    Alert.alert("정말 삭제할까요?", "", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await deleteMemory(index);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {infoText ? (
        <>
          <Text style={styles.label}>정보</Text>
          <TextInput
            style={styles.input}
            value={infoText}
            onChangeText={setInfoText}
            multiline
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>사용자 메시지</Text>
          <TextInput
            style={styles.input}
            value={userText}
            onChangeText={setUserText}
            multiline
          />
          <Text style={styles.label}>AI 응답</Text>
          <TextInput
            style={styles.input}
            value={aiText}
            onChangeText={setAiText}
            multiline
          />
        </>
      )}
      <TouchableOpacity style={styles.saveButton} onPress={save}>
        <Text style={styles.saveButtonText}>저장</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Text style={styles.deleteButtonText}>삭제</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  label: { fontSize: 16, fontWeight: "bold", marginTop: 12, color: "#333" },
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
  saveButton: {
    marginTop: 20,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  deleteButton: {
    marginTop: 12,
    backgroundColor: "#dc3545",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
