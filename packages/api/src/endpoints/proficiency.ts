import { authFetch } from "../auth";

export const proficiencyApi = {
  async getSession(level: number, count: number = 5) {
    const res = await authFetch(
      `/api/proficiency/calibration/session?level=${level}&count=${count}`,
    );
    return res.json();
  },

  async calibrate(sessionData: any) {
    const res = await authFetch("/api/proficiency/calibrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_data: sessionData }),
    });
    return res.json();
  },

  async saveLevel(level: number) {
    const res = await authFetch("/api/proficiency/calibration/level", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    });
    return res.json();
  },

  async getLevel() {
    const res = await authFetch("/api/proficiency/calibration/level");
    return res.json();
  },

  async updateWordStatus(
    word: string,
    status: "mastered" | "known" | "learning",
  ) {
    const res = await authFetch("/api/proficiency/word", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, status }),
    });
    return res.json();
  },

  async sweep(sweptWords: string[], inspectedWords: string[]) {
    const res = await authFetch("/api/proficiency/sweep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        swept_words: sweptWords,
        inspected_words: inspectedWords,
      }),
    });
    return res.json();
  },
};
