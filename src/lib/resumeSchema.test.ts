import { describe, expect, it } from "vitest";
import { resumeDataSchema } from "./resumeSchema";

const validResume = {
  id: "resume-1",
  title: "Resume",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  templateId: "classic",
  basic: {
    birthDate: "",
    name: "Test",
    title: "Engineer",
    email: "",
    phone: "",
    location: "",
    icons: {},
    employementStatus: "",
    photo: "",
    photoConfig: {
      width: 90,
      height: 120,
      aspectRatio: "1:1",
      borderRadius: "none",
      customBorderRadius: 0,
    },
    customFields: [],
    githubKey: "",
    githubUseName: "",
    githubContributionsVisible: false,
  },
  education: [],
  experience: [],
  projects: [],
  certificates: [],
  customData: {},
  skillContent: "",
  selfEvaluationContent: "",
  activeSection: "basic",
  draggingProjectId: null,
  menuSections: [
    { id: "basic", title: "Basic", icon: "user", enabled: true, order: 0 },
  ],
  globalSettings: {},
};

describe("resumeDataSchema", () => {
  it("accepts a valid exported resume", () => {
    expect(resumeDataSchema.safeParse(validResume).success).toBe(true);
  });

  it("rejects malformed nested resume data", () => {
    const malformed = {
      ...validResume,
      experience: [{ id: "1", company: 42 }],
    };
    expect(resumeDataSchema.safeParse(malformed).success).toBe(false);
  });

  it("rejects oversized collections", () => {
    const oversized = {
      ...validResume,
      menuSections: Array.from({ length: 101 }, (_, order) => ({
        id: String(order),
        title: "Section",
        icon: "item",
        enabled: true,
        order,
      })),
    };
    expect(resumeDataSchema.safeParse(oversized).success).toBe(false);
  });
});
