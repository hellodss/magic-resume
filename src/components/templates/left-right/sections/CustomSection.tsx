import StandardCustomSection, { type CustomSectionProps } from "../../shared/StandardCustomSection";
import SectionTitle from "./SectionTitle";

export default function CustomSection(props: Omit<CustomSectionProps, "TitleComponent">) {
  return <StandardCustomSection {...props} TitleComponent={SectionTitle} />;
}
