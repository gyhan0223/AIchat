// utils/memoryStore.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "chat_memories";

export const saveMemory = async (memory) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const memories = existing ? JSON.parse(existing) : [];
    const newMemories = [...memories, memory];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMemories));
  } catch (e) {
    console.error("기억 저장 실패:", e);
  }
};

export const getMemories = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("기억 불러오기 실패:", e);
    return [];
  }
};

export const updateMemory = async (index, updated) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const memories = existing ? JSON.parse(existing) : [];
    if (index < 0 || index >= memories.length) {
      return;
    }
    memories[index] = { ...memories[index], ...updated };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  } catch (e) {
    console.error("기억 업데이트 실패:", e);
  }
};

export const deleteMemory = async (index) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const memories = existing ? JSON.parse(existing) : [];
    if (index < 0 || index >= memories.length) {
      return;
    }
    memories.splice(index, 1);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  } catch (e) {
    console.error("기억 삭제 실패:", e);
  }
};

export const deleteMemories = async (indices) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const memories = existing ? JSON.parse(existing) : [];
    if (!Array.isArray(indices) || indices.length === 0) {
      return;
    }
    const indexSet = new Set(indices);
    const filtered = memories.filter((_, idx) => !indexSet.has(idx));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("다중 기억 삭제 실패:", e);
  }
};
