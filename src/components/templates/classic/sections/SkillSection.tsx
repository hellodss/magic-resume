import StandardSkillSection, { type SkillSectionProps } from "../../shared/StandardSkillSection";
import SectionTitle from "./SectionTitle";

export default function SkillSection(props: Omit<SkillSectionProps, "TitleComponent">) {
  return <StandardSkillSection {...props} TitleComponent={SectionTitle} />;
}
