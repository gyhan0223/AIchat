import * as Notifications from "expo-notifications";

/**
 * Schedule a local notification and return its identifier.
 * @param {string} text - Notification body text.
 * @param {string|null} date - ISO date string (YYYY-MM-DD) or null.
 * @param {string|null} time - Time string (HH:mm) or null.
 * @returns {Promise<string|null>} Scheduled notification identifier or null.
 */
export async function scheduleNotificationWithId(text, date, time) {
  if (!date) {
    return null;
  }

  try {
    const triggerDate = new Date(date);
    if (time) {
      const [hour, minute] = time.split(":").map(Number);
      if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
        triggerDate.setHours(hour, minute, 0, 0);
      }
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "알림",
        body: text,
      },
      trigger: triggerDate,
    });

    return id;
  } catch (e) {
    console.warn("scheduleNotificationWithId 실패:", e);
    return null;
  }
}
