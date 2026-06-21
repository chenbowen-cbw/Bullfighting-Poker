'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface CartoonModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** 卡通弹窗:遮罩 + 弹性入场卡片。 */
export function CartoonModal({ open, title, onClose, children }: CartoonModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="cartoon-card w-full max-w-md p-6"
            initial={{ scale: 0.8, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold text-ink">{title}</h2>
              <button
                onClick={onClose}
                aria-label="关闭"
                className="flex h-9 w-9 items-center justify-center rounded-full border-4 border-ink bg-bull text-lg font-extrabold text-chalk shadow-cartoon-sm transition-transform active:translate-y-1 active:shadow-none"
              >
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
