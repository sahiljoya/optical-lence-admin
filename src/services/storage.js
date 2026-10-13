// Admin panel keeps everything in sessionStorage (not localStorage) so a
// session doesn't silently persist across browser restarts / shared machines.

export const setItem = (key, value) => {
  try {
    const data = typeof value === "string" ? value : JSON.stringify(value);
    sessionStorage.setItem(key, data);
  } catch (error) {
    console.error("Storage setItem error:", error);
  }
};

export const getItem = (key) => {
  try {
    const data = sessionStorage.getItem(key);
    if (data === null) return null;
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  } catch (error) {
    console.error("Storage getItem error:", error);
    return null;
  }
};

export const removeItem = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error("Storage removeItem error:", error);
  }
};
