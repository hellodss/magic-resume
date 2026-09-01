import { beforeEach, describe, expect, it } from "vitest";
import { useSaveStatusStore } from "./useSaveStatusStore";

describe("save status store", () => {
  beforeEach(() => {
    useSaveStatusStore.setState({
      status: "saved",
      lastSavedAt: null,
      pendingResumeIds: [],
    });
  });

  it("stays saving until every pending resume is complete", () => {
    const store = useSaveStatusStore.getState();
    store.markPending("resume-a");
    store.markPending("resume-b");
    useSaveStatusStore.getState().markSaved("resume-a");

    expect(useSaveStatusStore.getState().status).toBe("saving");

    useSaveStatusStore.getState().markSaved("resume-b");
    expect(useSaveStatusStore.getState().status).toBe("saved");
    expect(useSaveStatusStore.getState().lastSavedAt).toEqual(expect.any(Number));
  });

  it("reports a failed save and clears that pending operation", () => {
    const store = useSaveStatusStore.getState();
    store.markPending("resume-a");
    useSaveStatusStore.getState().markError("resume-a");

    expect(useSaveStatusStore.getState()).toMatchObject({
      status: "error",
      pendingResumeIds: [],
    });
  });
});
