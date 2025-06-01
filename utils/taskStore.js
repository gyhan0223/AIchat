// utils/taskStore.js
import AsyncStorage from "@react-native-async-storage/async-storage";
const TASKS_KEY = "storedTasks";

export async function getAllTasks() {
  const json = await AsyncStorage.getItem(TASKS_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveAllTasks(tasks) {
  await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export async function addTask(task) {
  const all = await getAllTasks();
  all.push(task);
  await saveAllTasks(all);
}

export async function updateTask(updated) {
  const all = await getAllTasks();
  const idx = all.findIndex((t) => t.id === updated.id);
  if (idx !== -1) {
    all[idx] = updated;
    await saveAllTasks(all);
  }
}

export async function deleteTask(id) {
  const all = await getAllTasks();
  const filtered = all.filter((t) => t.id !== id);
  await saveAllTasks(filtered);
}
