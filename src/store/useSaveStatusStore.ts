import { create } from "zustand";

export type SaveStatus = "saved" | "saving" | "error";

interface SaveStatusStore {
  status: SaveStatus;
  lastSavedAt: number | null;
  pendingResumeIds: string[];
  markPending: (resumeId: string) => void;
  markSaved: (resumeId: string) => void;
  markError: (resumeId: string) => void;
}

export const useSaveStatusStore = create<SaveStatusStore>((set) => ({
  status: "saved",
  lastSavedAt: null,
  pendingResumeIds: [],
  markPending: (resumeId) =>
    set((state) => ({
      status: "saving",
      pendingResumeIds: state.pendingResumeIds.includes(resumeId)
        ? state.pendingResumeIds
        : [...state.pendingResumeIds, resumeId],
    })),
  markSaved: (resumeId) =>
    set((state) => {
      const pendingResumeIds = state.pendingResumeIds.filter(
        (id) => id !== resumeId
      );
      return {
        pendingResumeIds,
        status: pendingResumeIds.length > 0 ? "saving" : "saved",
        lastSavedAt: Date.now(),
      };
    }),
  markError: (resumeId) =>
    set((state) => ({
      status: "error",
      pendingResumeIds: state.pendingResumeIds.filter((id) => id !== resumeId),
    })),
}));

export const markResumeSavePending = (resumeId: string) =>
  useSaveStatusStore.getState().markPending(resumeId);

export const markResumeSaved = (resumeId: string) =>
  useSaveStatusStore.getState().markSaved(resumeId);

export const markResumeSaveError = (resumeId: string) =>
  useSaveStatusStore.getState().markError(resumeId);
