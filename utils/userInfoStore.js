import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_INFO_KEY = "user_info";

export async function getUserInfo() {
  const json = await AsyncStorage.getItem(USER_INFO_KEY);
  return json ? JSON.parse(json) : {};
}

export async function saveUserInfo(info) {
  try {
    const existing = await getUserInfo();
    const updated = { ...existing, ...info };
    await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("사용자 정보 저장 실패:", e);
  }
}
