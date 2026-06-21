import type { Config } from 'tailwindcss';

/**
 * 卡通风格设计令牌(Cartoon Design Tokens)
 * - 圆润大圆角、明快活泼配色、厚边框/厚阴影、可爱
 * - 给整套休闲手游观感(而非严肃赌场)
 */
const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 主题色:活泼的橙黄(公牛/草原)+ 薄荷绿(牌桌)
        cream: '#fff7e6', // 奶油背景
        sunny: '#ffc83d', // 阳光黄(主按钮)
        tangerine: '#ff8a3d', // 橘子橙(强调/庄家)
        bull: '#ff5a5f', // 公牛红(警示/红牌)
        grass: '#2ecc71', // 草地绿
        felt: '#1aa37a', // 牌桌绒布(深薄荷)
        feltDark: '#0f7a5a', // 牌桌边缘
        sky: '#4dabf7', // 天空蓝(信息/蓝牌按钮)
        grape: '#9b6bff', // 葡萄紫(次强调)
        ink: '#3a2e2a', // 文字/描边(暖黑而非纯黑)
        chalk: '#fffdf7', // 卡片白
      },
      borderRadius: {
        // 大圆角让一切变圆润
        cartoon: '1.5rem',
        blob: '2.25rem',
        card: '0.9rem',
      },
      boxShadow: {
        // 厚实的"贴纸"投影
        cartoon: '0 6px 0 0 rgba(58,46,42,0.85)',
        'cartoon-sm': '0 4px 0 0 rgba(58,46,42,0.85)',
        'cartoon-lg': '0 10px 0 0 rgba(58,46,42,0.85)',
        pop: '0 8px 24px rgba(58,46,42,0.25)',
        card: '0 4px 10px rgba(58,46,42,0.22)',
      },
      fontFamily: {
        // 圆体优先,凑不齐就退回系统无衬线
        cartoon: [
          'Baloo 2',
          '"Comic Sans MS"',
          '"Chalkboard SE"',
          'system-ui',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      keyframes: {
        // 弹性弹入
        'pop-in': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '70%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // 漂浮的吉祥物
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        // 轻微摇摆
        wiggle: {
          '0%,100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        // 倒计时进度条流动
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        float: 'float 3s ease-in-out infinite',
        wiggle: 'wiggle 0.6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
