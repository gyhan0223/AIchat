import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import React, { useEffect } from "react";
import ChatScreen from "./screens/ChatScreen";
import HomeScreen from "./screens/HomeScreen";
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
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
