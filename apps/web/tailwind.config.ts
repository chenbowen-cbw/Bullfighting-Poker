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

        // ===== 暗黑像素风令牌(门户首页专用,独立命名空间,与卡通令牌零冲突)=====
        // 深色背景层次(最深 → 抬升面)
        'pixel-void': '#07070d', // 最底:近黑带靛(门户 body)
        'pixel-bg': '#0d0e1a', // 主背景层
        'pixel-surface': '#161830', // 卡片/面板表面
        'pixel-raised': '#1f2240', // 抬升态(hover 面板/输入框)
        'pixel-grid': '#272a4d', // 网格线/分隔线/弱边框
        // 霓虹强调(青为主、品红为辅、黄点缀)
        'neon-cyan': '#00f0ff',
        'neon-magenta': '#ff2e97',
        'neon-yellow': '#ffe600',
        'neon-lime': '#7cff4f', // 在线/成功状态点
        // 文字
        'pixel-text': '#e6e8ff', // 主文字(冷白)
        'pixel-dim': '#8a8fc0', // 次要文字
        'pixel-faint': '#4a4f7a', // 最弱/禁用
        // 边框
        'pixel-border': '#3a3f6e',
      },
      borderRadius: {
        // 大圆角让一切变圆润
        cartoon: '1.5rem',
        blob: '2.25rem',
        card: '0.9rem',
        // 像素风一律直角;需要切角用 .pixel-corner-cut(clip-path)
        pixel: '0px',
      },
      boxShadow: {
        // 厚实的"贴纸"投影
        cartoon: '0 6px 0 0 rgba(58,46,42,0.85)',
        'cartoon-sm': '0 4px 0 0 rgba(58,46,42,0.85)',
        'cartoon-lg': '0 10px 0 0 rgba(58,46,42,0.85)',
        pop: '0 8px 24px rgba(58,46,42,0.25)',
        card: '0 4px 10px rgba(58,46,42,0.22)',
        // ===== 像素风阴影:硬像素投影(无模糊)+ 霓虹发光(多层模糊)=====
        pixel: '4px 4px 0 0 #07070d',
        'pixel-sm': '2px 2px 0 0 #07070d',
        'neon-cyan': '0 0 4px #00f0ff, 0 0 12px rgba(0,240,255,0.6), 0 0 28px rgba(0,240,255,0.35)',
        'neon-magenta':
          '0 0 4px #ff2e97, 0 0 12px rgba(255,46,151,0.6), 0 0 28px rgba(255,46,151,0.35)',
        'neon-yellow':
          '0 0 4px #ffe600, 0 0 12px rgba(255,230,0,0.55), 0 0 26px rgba(255,230,0,0.3)',
        'pixel-inset-cyan': 'inset 0 0 0 2px #00f0ff, 0 0 10px rgba(0,240,255,0.4)',
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
        // 像素大标题/数字/角标(英数为主,中文回退黑体)
        pixel: [
          'var(--font-press-start)',
          'ui-monospace',
          'PingFang SC',
          'Microsoft YaHei',
          'monospace',
        ],
        // 像素正文/说明(可读性优先的像素体)
        'pixel-body': [
          'var(--font-vt323)',
          'ui-monospace',
          'Menlo',
          'PingFang SC',
          'Microsoft YaHei',
          'monospace',
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

        // ===== 暗黑像素风动效 =====
        // CRT 扫描线缓慢滚动
        'crt-scan': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 4px' },
        },
        // 霓虹文字辉光呼吸
        'neon-breath': {
          '0%,100%': {
            textShadow: '0 0 6px rgba(0,240,255,0.55), 0 0 14px rgba(0,240,255,0.3)',
          },
          '50%': {
            textShadow: '0 0 10px rgba(0,240,255,1), 0 0 26px rgba(0,240,255,0.6)',
          },
        },
        // 卡片 hover 像素抖动(整数像素位移)
        'pixel-jitter': {
          '0%,100%': { transform: 'translate(0,0)' },
          '25%': { transform: 'translate(-1px,1px)' },
          '50%': { transform: 'translate(1px,-1px)' },
          '75%': { transform: 'translate(-1px,-1px)' },
        },
        // 高光带掠过封面
        'scan-sweep': {
          '0%': { transform: 'translateX(-120%) skewX(-20deg)' },
          '100%': { transform: 'translateX(220%) skewX(-20deg)' },
        },
        // LED/角标脉冲
        'led-pulse': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        float: 'float 3s ease-in-out infinite',
        wiggle: 'wiggle 0.6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        // 像素风动效
        'crt-scan': 'crt-scan 0.5s steps(2) infinite',
        'neon-breath': 'neon-breath 2.4s ease-in-out infinite',
        'pixel-jitter': 'pixel-jitter 0.18s steps(2) infinite',
        'scan-sweep': 'scan-sweep 2.8s ease-in-out infinite',
        'led-pulse': 'led-pulse 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
