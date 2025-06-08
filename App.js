// App.js
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler"; // 추가
import { SafeAreaProvider } from "react-native-safe-area-context";

import ChatListScreen from "./screens/ChatListScreen";
import ChatScreen from "./screens/ChatScreen";
import HomeScreen from "./screens/HomeScreen";
import MemoryDetailScreen from "./screens/MemoryDetailScreen";
import MemoryListScreen from "./screens/MemoryListScreen";
import NameChangeScreen from "./screens/NameChangeScreen";
import TaskDetailScreen from "./screens/TaskDetailScreen";
import TaskListScreen from "./screens/TaskListScreen";

import { getMemories } from "./utils/memoryStore";

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    const requestPermissionsAndCheckReminders = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }

      const memories = await getMemories();
      const today = new Date().toISOString().split("T")[0];

      memories.forEach((memory) => {
        if (memory.meta?.date === today) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: "📌 오늘 일정",
              body: `"${memory.user}" 기억나? 오늘 그날이야!`,
            },
            trigger: null,
          });
        }
      });
    };

    requestPermissionsAndCheckReminders();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="black" />

        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="ChatList" component={ChatListScreen} />
            <Stack.Screen name="Tasks" component={TaskListScreen} />
            <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
            <Stack.Screen name="Memories" component={MemoryListScreen} />
            <Stack.Screen name="MemoryDetail" component={MemoryDetailScreen} />
            <Stack.Screen name="ChangeName" component={NameChangeScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
