import { z } from "zod";
import type { ResumeData } from "@/types/resume";

const shortText = z.string().max(500);
const richText = z.string().max(200_000);
const imageValue = z.string().max(8 * 1024 * 1024);

const photoConfigSchema = z.object({
  width: z.number().finite().min(1).max(2_000),
  height: z.number().finite().min(1).max(2_000),
  aspectRatio: z.enum(["1:1", "4:3", "3:4", "16:9", "custom"]),
  borderRadius: z.enum(["none", "medium", "full", "custom"]),
  customBorderRadius: z.number().finite().min(0).max(1_000),
  visible: z.boolean().optional(),
});

const basicFieldSchema = z.object({
  id: shortText,
  key: z.enum([
    "birthDate",
    "name",
    "title",
    "email",
    "phone",
    "location",
    "employementStatus",
    "photo",
    "photoConfig",
    "fieldOrder",
    "customFields",
    "icons",
    "githubKey",
    "githubUseName",
    "githubContributionsVisible",
    "layout",
  ]),
  label: shortText,
  type: z.enum(["date", "textarea", "text", "editor"]).optional(),
  visible: z.boolean(),
  custom: z.boolean().optional(),
});

const customFieldSchema = z.object({
  id: shortText,
  label: shortText,
  value: z.string().max(5_000),
  icon: shortText.optional(),
  visible: z.boolean().optional(),
  custom: z.boolean().optional(),
  displayLabel: z.boolean().optional(),
});

const basicInfoSchema = z.object({
  birthDate: shortText,
  name: shortText,
  title: shortText,
  email: shortText,
  phone: shortText,
  location: shortText,
  icons: z.record(z.string(), shortText),
  employementStatus: shortText,
  photo: imageValue,
  photoConfig: photoConfigSchema,
  fieldOrder: z.array(basicFieldSchema).max(100).optional(),
  customFields: z.array(customFieldSchema).max(100),
  githubKey: z.string().max(5_000),
  githubUseName: shortText,
  githubContributionsVisible: z.boolean(),
  layout: z.enum(["left", "center", "right"]).optional(),
});

const educationSchema = z.object({
  id: shortText,
  school: shortText,
  major: shortText,
  degree: shortText,
  startDate: shortText,
  endDate: shortText,
  gpa: shortText.optional(),
  description: richText.optional(),
  visible: z.boolean().optional(),
});

const experienceSchema = z.object({
  id: shortText,
  company: shortText,
  position: shortText,
  date: shortText,
  details: richText,
  visible: z.boolean().optional(),
});

const projectSchema = z.object({
  id: shortText,
  name: shortText,
  role: shortText,
  date: shortText,
  description: richText,
  visible: z.boolean(),
  link: z.string().max(5_000).optional(),
  linkLabel: shortText.optional(),
});

const certificateSchema = z.object({
  id: shortText,
  url: imageValue,
  width: z.number().finite().min(1).max(100),
});

const customItemSchema = z.object({
  id: shortText,
  title: shortText,
  subtitle: shortText,
  dateRange: shortText,
  description: richText,
  visible: z.boolean(),
});

const menuSectionSchema = z.object({
  id: shortText,
  title: shortText,
  icon: shortText,
  enabled: z.boolean(),
  order: z.number().int().min(0).max(1_000),
});

const globalSettingsSchema = z.object({
  themeColor: shortText.optional(),
  fontFamily: shortText.optional(),
  baseFontSize: z.number().finite().min(6).max(72).optional(),
  pagePadding: z.number().finite().min(0).max(200).optional(),
  paragraphSpacing: z.number().finite().min(0).max(200).optional(),
  lineHeight: z.number().finite().min(0.5).max(5).optional(),
  sectionSpacing: z.number().finite().min(0).max(200).optional(),
  headerSize: z.number().finite().min(6).max(100).optional(),
  subheaderSize: z.number().finite().min(6).max(100).optional(),
  useIconMode: z.boolean().optional(),
  centerSubtitle: z.boolean().optional(),
  flexibleHeaderLayout: z.boolean().optional(),
  autoOnePage: z.boolean().optional(),
});

export const resumeDataSchema = z.object({
  id: z.string().min(1).max(500),
  title: shortText,
  createdAt: z.string().max(100),
  updatedAt: z.string().max(100),
  templateId: shortText.nullish(),
  basic: basicInfoSchema,
  education: z.array(educationSchema).max(100),
  experience: z.array(experienceSchema).max(100),
  projects: z.array(projectSchema).max(100),
  certificates: z.array(certificateSchema).max(100),
  customData: z.record(z.string(), z.array(customItemSchema).max(100)),
  skillContent: richText,
  selfEvaluationContent: richText,
  activeSection: shortText,
  draggingProjectId: shortText.nullable(),
  menuSections: z.array(menuSectionSchema).max(100),
  globalSettings: globalSettingsSchema,
});

const resumeImportSchema = resumeDataSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial();

export function parseResumeFile(value: unknown): ResumeData {
  return resumeDataSchema.parse(value) as ResumeData;
}

export function createResumeFromImport(
  value: unknown,
  defaults: Omit<ResumeData, "id" | "createdAt" | "updatedAt">,
  identity: Pick<ResumeData, "id" | "createdAt" | "updatedAt">
): ResumeData {
  const parsed = resumeImportSchema.parse(value);

  return resumeDataSchema.parse({
    ...structuredClone(defaults),
    ...parsed,
    ...identity,
    basic: {
      ...structuredClone(defaults.basic),
      ...parsed.basic,
      photoConfig: {
        ...structuredClone(defaults.basic.photoConfig),
        ...parsed.basic?.photoConfig,
      },
    },
    globalSettings: {
      ...structuredClone(defaults.globalSettings),
      ...parsed.globalSettings,
    },
  }) as ResumeData;
}
