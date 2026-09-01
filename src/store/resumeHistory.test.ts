import { describe, expect, it } from "vitest";
import type { ResumeData } from "@/types/resume";
import { getHistoryKey, HISTORY_LIMIT, pushHistory } from "./resumeHistory";

const snapshot = { id: "resume-1", title: "Resume" } as ResumeData;

describe("resume history", () => {
  it("ignores transient-only updates", () => {
    expect(getHistoryKey({ activeSection: "skills" })).toBeNull();
    expect(getHistoryKey({ draggingProjectId: "p1" })).toBeNull();
  });

  it("keeps the configured history limit", () => {
    let history: Record<string, ResumeData[]> = {};
    for (let index = 0; index < HISTORY_LIMIT + 5; index += 1) {
      history = pushHistory(history, snapshot.id, {
        ...snapshot,
        title: `Resume ${index}`,
      });
    }

    expect(history[snapshot.id]).toHaveLength(HISTORY_LIMIT);
    expect(history[snapshot.id][0].title).toBe("Resume 5");
  });
});
