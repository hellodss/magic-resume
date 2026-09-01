import React from "react";
import { ResumeTemplate } from "@/types/template";
import { DEFAULT_TEMPLATES } from "@/config/templates";

// Import components
import ClassicTemplate from "./classic";
import ModernTemplate from "./modern";
import LeftRightTemplate from "./left-right";
import TimelineTemplate from "./timeline";
import MinimalistTemplate from "./minimalist";
import ElegantTemplate from "./elegant";
import CreativeTemplate from "./creative";
import EditorialTemplate from "./editorial";
import SwissTemplate from "./swiss";

export interface TemplateRegistryEntry {
  config: ResumeTemplate;
  Component: React.FC<{ data: any; template: ResumeTemplate }>;
}

/**
 * Unified template registry.
 * To add a new template, create a directory under `templates/` with config.ts + index.tsx,
 * then add one line here. No other files need to change.
 */
const TEMPLATE_COMPONENTS: Record<string, TemplateRegistryEntry["Component"]> = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  "left-right": LeftRightTemplate,
  timeline: TimelineTemplate,
  minimalist: MinimalistTemplate,
  elegant: ElegantTemplate,
  creative: CreativeTemplate,
  editorial: EditorialTemplate,
  swiss: SwissTemplate,
};

export const TEMPLATE_REGISTRY: TemplateRegistryEntry[] = DEFAULT_TEMPLATES.map(
  (config) => ({
    config,
    Component: TEMPLATE_COMPONENTS[config.layout] ?? ClassicTemplate,
  })
);

/** Look up a template component by layout id */
export function getTemplateComponent(
  layout: string
): React.FC<{ data: any; template: ResumeTemplate }> {
  return (
    TEMPLATE_REGISTRY.find((entry) => entry.config.layout === layout)
      ?.Component ?? ClassicTemplate
  );
}
