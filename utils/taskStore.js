// utils/taskStore.js
import AsyncStorage from "@react-native-async-storage/async-storage";
const TASKS_KEY = "storedTasks";

export async function getAllTasks() {
  const json = await AsyncStorage.getItem(TASKS_KEY);
  if (!json) return [];
  try {
    const tasks = JSON.parse(json);
    const seen = new Set();
    let changed = false;
    const fixed = tasks.map((t, idx) => {
      if (seen.has(t.id)) {
        changed = true;
        const newId = `${t.id}-${idx}-${Date.now()}`;
        seen.add(newId);
        return { ...t, id: newId };
      }
      seen.add(t.id);
      return t;
    });
    if (changed) {
      await saveAllTasks(fixed);
    }
    return fixed;
  } catch {
    return [];
  }
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

export async function deleteTasks(ids) {
  const all = await getAllTasks();
  const idSet = new Set(ids);
  const filtered = all.filter((t) => !idSet.has(t.id));
  await saveAllTasks(filtered);
}
