import { apiGet, apiPost, apiPut } from "../auth";

export const proficiencyApi = {
  async getSession(level: number, count: number = 5) {
    return apiGet(
      `/api/proficiency/calibration/session?level=${level}&count=${count}`,
    );
  },

  async calibrate(sessionData: any) {
    return apiPost("/api/proficiency/calibrate", { session_data: sessionData });
  },

  async saveLevel(level: number) {
    return apiPut("/api/proficiency/calibration/level", { level });
  },

  async getLevel() {
    return apiGet("/api/proficiency/calibration/level");
  },

  async updateWordStatus(
    word: string,
    status: "mastered" | "known" | "learning",
  ) {
    return apiPut("/api/proficiency/word", { word, status });
  },

  async sweep(sweptWords: string[], inspectedWords: string[]) {
    return apiPost("/api/proficiency/sweep", {
      swept_words: sweptWords,
      inspected_words: inspectedWords,
    });
  },
};
