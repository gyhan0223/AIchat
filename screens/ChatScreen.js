// screens/ChatScreen.js
import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function ChatScreen() {
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const flatListRef = useRef();

  useEffect(() => {
    // ... loadChat, checkTodayTasks 정의
  }, []);

  const handleSend = async () => {
    // ... handleSend 로직
  };

  // extractTime, getAIResponse, extractTodayTasks, extractDate 등

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* 상태바 */}
      <StatusBar backgroundColor="black" barStyle="light-content" />

      {/* 키보드 외부 터치 시 닫기 */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          {/* 커스텀 헤더 */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.headerButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>대화</Text>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate("Settings")}
            >
              <Text style={styles.headerButtonText}>☰</Text>
            </TouchableOpacity>
          </View>

          {/* 채팅 리스트 + 입력창 */}
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={10}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={({ item }) => (
                <View
                  style={
                    item.sender === "user" ? styles.userBubble : styles.aiBubble
                  }
                >
                  <Text style={styles.bubbleText}>{item.text}</Text>
                </View>
              )}
              keyExtractor={(_, i) => i.toString()}
              contentContainerStyle={styles.chatContainer}
            />

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="메시지를 입력하세요"
                placeholderTextColor="#999"
                selectionColor="#007AFF"
                color="#000"
                multiline
              />
              <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                <Text style={{ color: "white" }}>전송</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.spacer} />
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "black",
    zIndex: 1,
    elevation: 1, // Android
  },
  headerButton: {
    padding: 10,
  },
  headerButtonText: {
    fontSize: 20,
    color: "white",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  chatContainer: {
    padding: 10,
    paddingBottom: 10,
  },
  spacer: {
    height: 20,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
    padding: 12,
    marginVertical: 5,
    borderRadius: 20,
    borderBottomRightRadius: 0,
    maxWidth: "80%",
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#ECECEC",
    padding: 12,
    marginVertical: 5,
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    maxWidth: "80%",
  },
  bubbleText: {
    color: "#000",
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderColor: "#CCC",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#000",
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
});
