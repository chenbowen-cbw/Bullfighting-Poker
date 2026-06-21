import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 仅跑纯函数工具的单测;React 组件不在此处覆盖
    include: ['test/**/*.test.ts'],
  },
});
