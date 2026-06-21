/**
 * @bullfighting/game — 抢庄斗牛对局状态机(框架无关)
 *
 * 纯函数 reducer:抢庄 → 下注 → 发牌 → 亮牌 → 结算。
 * 副作用(发牌结算、定时器)以数据形式返回,由适配层执行。
 */
export * from './config';
export * from './errors';
export * from './types';
export * from './state';
export * from './reducer';
