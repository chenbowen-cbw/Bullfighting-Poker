/**
 * @bullfighting/stats — 结算落库纯逻辑
 *
 * 从一局结算上下文推导出 rounds / round_players / user_stats 的写入载荷。
 * 纯函数、零运行时依赖,可在服务端 Serverless、Node、浏览器中运行,便于单测。
 */
export * from './types';
export * from './persistence';
export * from './context';
