import { AnimatePresence, motion } from "framer-motion";
import type { ComponentType } from "react";
import SectionWrapper from "./SectionWrapper";
import { GlobalSettings, CustomItem } from "@/types/resume";
import { normalizeRichTextContent } from "@/lib/richText";
import { formatDateString } from "@/lib/utils";
import { useLocale } from "@/i18n/compat/client";
import type { StandardSectionTitleProps } from "./StandardSkillSection";

export interface CustomSectionProps {
    sectionId: string;
    title: string;
    items: CustomItem[];
    globalSettings?: GlobalSettings;
    showTitle?: boolean;
    TitleComponent: ComponentType<StandardSectionTitleProps>;
}

const StandardCustomSection = ({ sectionId, title, items, globalSettings, showTitle = true, TitleComponent }: CustomSectionProps) => {
    const locale = useLocale();
    const visibleItems = items?.filter((item) => item.visible && (item.title || item.description));
    const centerSubtitle = globalSettings?.centerSubtitle;
    const flexLayout = globalSettings?.flexibleHeaderLayout;

    return (
        <SectionWrapper sectionId={sectionId} style={{ marginTop: `${globalSettings?.sectionSpacing || 24}px` }}>
            <TitleComponent title={title} type="custom" globalSettings={globalSettings} showTitle={showTitle} />
            <AnimatePresence mode="popLayout">
                {visibleItems.map((item) => (
                    <motion.div key={item.id} layout="position" style={{ marginTop: `${globalSettings?.paragraphSpacing}px` }}>
                        <motion.div layout="position" className="flex items-center gap-2">
                            <div className={`flex items-center gap-2 ${flexLayout ? "" : "flex-[1.5]"}`}>
                                <h4 className="font-bold" style={{ fontSize: `${globalSettings?.subheaderSize || 16}px` }}>{item.title}</h4>
                            </div>
                            {centerSubtitle && (
                                <motion.div layout="position" className={`text-subtitleFont ${flexLayout ? "ml-[16px]" : "flex-1"}`} style={{ fontSize: `${globalSettings?.subheaderSize || 16}px` }}>
                                    {item.subtitle}
                                </motion.div>
                            )}
                            <span className={`text-subtitleFont shrink-0 ${flexLayout ? "ml-auto" : "flex-1 text-right"}`} style={{ fontSize: `${globalSettings?.subheaderSize || 16}px` }}>
                                {formatDateString(item.dateRange, locale)}
                            </span>
                        </motion.div>
                        {!centerSubtitle && item.subtitle && (
                            <motion.div layout="position" className="text-subtitleFont mt-1" style={{ fontSize: `${globalSettings?.subheaderSize || 16}px` }}>{item.subtitle}</motion.div>
                        )}
                        {item.description && (
                            <motion.div layout="position" className="mt-1 text-baseFont"
                                style={{ fontSize: `${globalSettings?.baseFontSize || 14}px`, lineHeight: globalSettings?.lineHeight || 1.6 }}
                                dangerouslySetInnerHTML={{ __html: normalizeRichTextContent(item.description) }}
                            />
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </SectionWrapper>
    );
};

export default StandardCustomSection;
