import { apiFetch } from "./client";

export type ProgressReportDto = {
  id: string;
  gameSessionId: string;
  userId: string;
  status: string;
  report: string | null;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
};

export const ProgressReportsApi = {
  async list() {
    return apiFetch("/progress-reports", {
      method: "GET",
    });
  },

  async getById(progressReportId: string) {
    return apiFetch(`/progress-reports/${progressReportId}`, {
      method: "GET",
    });
  },
};

