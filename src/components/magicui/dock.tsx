import { cn } from "@/lib/utils";
import React, { PropsWithChildren } from "react";
import { motion } from "framer-motion";

interface DockProps
  extends PropsWithChildren<React.HTMLAttributes<HTMLDivElement>> {
  className?: string;
}

export function Dock({ children, className, ...props }: DockProps) {
  return (
    <div
      {...props}
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl bg-white/[0.7] p-2 shadow-lg backdrop-blur-md dark:bg-slate-800/[0.7] dark:shadow-slate-900/20",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">{children}</div>
    </div>
  );
}

interface DockIconProps extends PropsWithChildren {
  className?: string;
  onClick?: () => void;
}

export function DockIcon({ children, className, onClick }: DockIconProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "flex size-8 items-center justify-center rounded-sm bg-white text-neutral-700 shadow-sm transition-colors hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:shadow-slate-900/20",
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
