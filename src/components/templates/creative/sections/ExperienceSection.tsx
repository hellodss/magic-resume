import StandardExperienceSection, { type ExperienceSectionProps } from "../../shared/StandardExperienceSection";
import SectionTitle from "./SectionTitle";

export default function ExperienceSection(props: Omit<ExperienceSectionProps, "TitleComponent">) {
  return <StandardExperienceSection {...props} TitleComponent={SectionTitle} />;
}
