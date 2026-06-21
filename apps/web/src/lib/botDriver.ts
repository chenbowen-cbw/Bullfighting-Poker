import {
  applyAction,
  isBotSeatId,
  makeBotDecision,
  type BotDifficulty,
  type GamePlayer,
  type GameState,
} from '@bullfighting/game';

/** 单局机器人最多连续行动的步数上限(防御性,远超任何真实对局所需) */
const MAX_BOT_STEPS = 1000;

/**
 * 在「当前阶段」判断某机器人玩家是否仍需行动:
 * - rob_banker:未抢庄(robMultiplier == null)
 * - betting:非庄家且未下注
 * - reveal:未亮牌
 * - 其他阶段:无需行动
 */
function botMustAct(state: GameState, player: GamePlayer): boolean {
  if (!isBotSeatId(player.seatId)) return false;
  switch (state.phase) {
    case 'rob_banker':
      return player.robMultiplier === null;
    case 'betting':
      return !player.isBanker && player.betMultiplier === null;
    case 'reveal':
      return !player.revealed;
    default:
      return false;
  }
}

/** 找到当前阶段下第一个仍需行动的机器人(无则返回 undefined) */
function nextActingBot(state: GameState): GamePlayer | undefined {
  return state.players.find((p) => botMustAct(state, p));
}

/**
 * 纯函数:在不涉及任何 I/O 的前提下,把所有「当前应由机器人完成的操作」一次性推进完。
 *
 * 设计:
 * - 机器人为 100% 服务端驱动,无需 QStash 定时;每次人类动作后调用本函数即可让机器人补齐其义务。
 * - 循环条件为「当前阶段仍存在需行动的机器人」。reducer 在所有人完成某阶段后会自动切换阶段
 *   (如 betting 全部下注后进入 reveal 并发牌),因此本函数会跨越自动阶段切换继续驱动,
 *   直至唯一未完成者是人类、或对局已结算/进入等待。
 * - 绝不替人类行动:botMustAct 只对 `bot:` 前缀座位返回 true。
 * - 设步数上限防御意外死循环(理论上不会触发)。
 *
 * @returns final 为驱动后的最终状态;steps 为每一步机器人动作后的中间状态快照(便于逐步广播/动画)。
 */
export function driveBots(
  state: GameState,
  difficulty: BotDifficulty,
): { state: GameState; steps: GameState[] } {
  let current = state;
  const steps: GameState[] = [];

  for (let i = 0; i < MAX_BOT_STEPS; i++) {
    const bot = nextActingBot(current);
    if (!bot) break;

    const action = makeBotDecision(current, bot.seatId, difficulty);
    current = applyAction(current, action).state;
    steps.push(current);
  }

  return { state: current, steps };
}
