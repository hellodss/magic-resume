import { AnimatePresence, motion } from "framer-motion";
import type { ComponentType } from "react";
import { Education, GlobalSettings } from "@/types/resume";
import SectionWrapper from "./SectionWrapper";
import { useLocale } from "@/i18n/compat/client";
import { hasMeaningfulRichTextContent, normalizeRichTextContent } from "@/lib/richText";
import { formatDateRange } from "@/lib/utils";
import type { StandardSectionTitleProps } from "./StandardSkillSection";

export interface EducationSectionProps {
    education?: Education[];
    globalSettings?: GlobalSettings;
    showTitle?: boolean;
    TitleComponent: ComponentType<StandardSectionTitleProps>;
}

const StandardEducationSection = ({ education, globalSettings, showTitle = true, TitleComponent }: EducationSectionProps) => {
    const locale = useLocale();
    const visibleEducation = education?.filter((edu) => edu.visible);
    const centerSubtitle = globalSettings?.centerSubtitle;
    const flexLayout = globalSettings?.flexibleHeaderLayout;

    return (
        <SectionWrapper sectionId="education" style={{ marginTop: `${globalSettings?.sectionSpacing || 24}px` }}>
            <TitleComponent type="education" globalSettings={globalSettings} showTitle={showTitle} />
            <AnimatePresence mode="popLayout">
                {visibleEducation?.map((edu) => (
                    <motion.div key={edu.id} layout="position" style={{ marginTop: `${globalSettings?.paragraphSpacing}px` }}>
                        <motion.div layout="position" className="flex items-center gap-2">
                            <div className={`font-bold ${flexLayout ? "" : "flex-[1.5]"}`} style={{ fontSize: `${globalSettings?.subheaderSize || 16}px` }}>
                                {edu.school}
                            </div>
                            {centerSubtitle && (
                                <motion.div layout="position" className={`text-subtitleFont ${flexLayout ? "ml-[16px]" : "flex-1"}`} style={{ fontSize: `${globalSettings?.subheaderSize || 16}px` }}>
                                    {[edu.major, edu.degree].filter(Boolean).join(" · ")}
                                    {edu.gpa && ` · GPA ${edu.gpa}`}
                                </motion.div>
                            )}
                            <span className={`text-subtitleFont shrink-0 ${flexLayout ? "ml-auto" : "flex-1 text-right"}`} suppressHydrationWarning
                                style={{ fontSize: `${globalSettings?.subheaderSize || 16}px` }}>
                                {formatDateRange(edu.startDate, edu.endDate, locale)}
                            </span>
                        </motion.div>
                        {!centerSubtitle && (
                            <motion.div layout="position" className="text-subtitleFont mt-1" style={{ fontSize: `${globalSettings?.subheaderSize || 16}px` }}>
                                {[edu.major, edu.degree].filter(Boolean).join(" · ")}
                                {edu.gpa && ` · GPA ${edu.gpa}`}
                            </motion.div>
                        )}
                        {hasMeaningfulRichTextContent(edu.description) && (
                            <motion.div layout="position" className="mt-1 text-baseFont"
                                style={{ fontSize: `${globalSettings?.baseFontSize || 14}px`, lineHeight: globalSettings?.lineHeight || 1.6 }}
                                dangerouslySetInnerHTML={{ __html: normalizeRichTextContent(edu.description) }}
                            />
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </SectionWrapper>
    );
};

export default StandardEducationSection;
