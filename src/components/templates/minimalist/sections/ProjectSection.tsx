import StandardProjectSection, { type ProjectSectionProps } from "../../shared/StandardProjectSection";
import SectionTitle from "./SectionTitle";

export default function ProjectSection(props: Omit<ProjectSectionProps, "TitleComponent">) {
  return <StandardProjectSection {...props} TitleComponent={SectionTitle} />;
}
