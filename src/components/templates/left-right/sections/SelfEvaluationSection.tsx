import StandardSelfEvaluationSection, { type SelfEvaluationSectionProps } from "../../shared/StandardSelfEvaluationSection";
import SectionTitle from "./SectionTitle";

export default function SelfEvaluationSection(props: Omit<SelfEvaluationSectionProps, "TitleComponent">) {
  return <StandardSelfEvaluationSection {...props} TitleComponent={SectionTitle} />;
}
