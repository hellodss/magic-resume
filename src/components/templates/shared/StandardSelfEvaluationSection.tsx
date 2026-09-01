import { motion } from "framer-motion";
import type { ComponentType } from "react";
import SectionWrapper from "./SectionWrapper";
import { GlobalSettings } from "@/types/resume";
import { normalizeRichTextContent } from "@/lib/richText";
import type { StandardSectionTitleProps } from "./StandardSkillSection";

export interface SelfEvaluationSectionProps {
    content?: string;
    globalSettings?: GlobalSettings;
    showTitle?: boolean;
    TitleComponent: ComponentType<StandardSectionTitleProps>;
}

const StandardSelfEvaluationSection = ({ content, globalSettings, showTitle = true, TitleComponent }: SelfEvaluationSectionProps) => {
    return (
        <SectionWrapper sectionId="selfEvaluation" style={{ marginTop: `${globalSettings?.sectionSpacing || 24}px` }}>
            <TitleComponent type="selfEvaluation" globalSettings={globalSettings} showTitle={showTitle} />
            <motion.div style={{ marginTop: `${globalSettings?.paragraphSpacing}px` }}>
                <motion.div className="text-baseFont" layout="position"
                    style={{ fontSize: `${globalSettings?.baseFontSize || 14}px`, lineHeight: globalSettings?.lineHeight || 1.6 }}
                    dangerouslySetInnerHTML={{ __html: normalizeRichTextContent(content) }}
                />
            </motion.div>
        </SectionWrapper>
    );
};

export default StandardSelfEvaluationSection;
