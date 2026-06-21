'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { NiuType } from '@/lib/client/types';
import { NIU_LABEL, isSpecialNiu, niuBadgeClass } from '@/lib/client/cards';

interface NiuBadgeProps {
  type: NiuType;
  className?: string;
}

/** 牛型徽章:特殊牌型(牛牛/五花/五小/四炸)带弹性闪现。 */
export function NiuBadge({ type, className }: NiuBadgeProps) {
  const special = isSpecialNiu(type);
  return (
    <motion.span
      initial={{ scale: 0, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      className={clsx('badge-cartoon', niuBadgeClass(type), className)}
    >
      {special && <span aria-hidden>✨</span>}
      {NIU_LABEL[type]}
    </motion.span>
  );
}
