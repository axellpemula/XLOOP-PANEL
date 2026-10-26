"use client";

import { motion, useReducedMotion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

/** Judul halaman 20px + deskripsi muted, muncul per kata (stagger 40ms). */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  const reduce = useReducedMotion();
  const words = title.split(" ");

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="flex flex-wrap gap-x-1.5 text-title font-semibold text-text">
          {words.map((word, index) => (
            <motion.span
              key={`${word}-${index}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0.1 : 0.25, delay: reduce ? 0 : index * 0.04 }}
            >
              {word}
            </motion.span>
          ))}
        </h1>
        <p className="mt-1 text-body text-muted">{description}</p>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
