'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { create } from 'zustand';

type ToastKind = 'info' | 'error' | 'success';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastStore {
  items: ToastItem[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

/** 轻量 toast 存储,任何组件可直接调用 useToast().push(...) */
export const useToast = create<ToastStore>((set) => ({
  items: [],
  push: (kind, message) => {
    const id = ++seq;
    set((s) => ({ items: [...s.items, { id, kind, message }] }));
    // 自动消失
    setTimeout(() => {
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
    }, 3200);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

const KIND_STYLE: Record<ToastKind, string> = {
  info: 'bg-sky text-chalk',
  error: 'bg-bull text-chalk',
  success: 'bg-grass text-chalk',
};

const KIND_ICON: Record<ToastKind, string> = {
  info: '💬',
  error: '😖',
  success: '🎉',
};

/** 全局 toast 视口,挂在根布局即可 */
export function ToastViewport() {
  const items = useToast((s) => s.items);
  const dismiss = useToast((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {items.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, y: -24, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={() => dismiss(t.id)}
            className={`badge-cartoon pointer-events-auto max-w-md px-4 py-2 text-base ${KIND_STYLE[t.kind]}`}
          >
            <span aria-hidden>{KIND_ICON[t.kind]}</span>
            <span>{t.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
