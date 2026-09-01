import StandardEducationSection, { type EducationSectionProps } from "../../shared/StandardEducationSection";
import SectionTitle from "./SectionTitle";

export default function EducationSection(props: Omit<EducationSectionProps, "TitleComponent">) {
  return <StandardEducationSection {...props} TitleComponent={SectionTitle} />;
}
