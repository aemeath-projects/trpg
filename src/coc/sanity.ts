/**
 * CoC 理智检定（Sanity Check）。
 *
 * 投 d100 vs 当前 SAN 值判定成功/失败等级，按结果扣除对应理智值，
 * 并结合神话淬炼状态计算实际损失。
 */

import { maxOfExpression, rollDie, rollExpression } from '../dice'
import type { CheckResult, RandomSource } from '../types'

import { judgeCoCResult } from './houserules.js'
import type { Houserule } from './houserules.js'

/** 单次理智检定的完整结果。 */
export interface SanityCheckOutcome {
  /** 检定后的新 SAN 值（不低于 0） */
  newSan: number
  /** 检定结果等级 */
  result: CheckResult
  /** 实际扣除的 SAN 值（已考虑神话淬炼减半） */
  loss: number
  /** 掷骰明细 */
  rollDetail: string
  /** 本次检定后是否处于神话淬炼状态 */
  mythosHardened: boolean
}

/**
 * 执行一次理智检定。
 *
 * 流程：投 d100 判定结果等级 → 根据等级计算原始 SAN 损失（成功扣 successExpr 结果，
 * 失败扣 failExpr 结果，大失败扣 failExpr 理论最大值）→ 检查神话淬炼
 * （mythosValue > currentSan 则触发，永久生效）→ 淬炼状态下损失减半 → SAN 不低于 0。
 *
 * @param currentSan - 检定前的 SAN 值
 * @param successExpr - 成功时扣除的骰子表达式，如 "1d3"、"0"
 * @param failExpr - 失败时扣除的骰子表达式，如 "1d6+1"
 * @param houserule - 大成功/大失败房规标识
 * @param mythosValue - 当前克苏鲁神话技能值
 * @param wasMythosHardened - 检定前是否已处于神话淬炼状态
 * @param rng - 随机数源，默认 Math.random
 * @returns 理智检定结果
 */
export function applySanityCheck(
  currentSan: number,
  successExpr: string,
  failExpr: string,
  houserule: Houserule,
  mythosValue: number,
  wasMythosHardened: boolean,
  rng: RandomSource = Math.random,
): SanityCheckOutcome {
  const roll = rollDie(100, rng)
  const result = judgeCoCResult(roll, currentSan, houserule)
  const isSuccess =
    result === 'great_success' ||
    result === 'extreme_success' ||
    result === 'hard_success' ||
    result === 'success'

  const loss =
    result === 'great_fail'
      ? maxOfExpression(failExpr)
      : rollExpression(isSuccess ? successExpr : failExpr, rng).total

  const mythosHardened = wasMythosHardened || mythosValue > currentSan
  const effectiveLoss = mythosHardened ? Math.floor(loss / 2) : loss
  const newSan = Math.max(0, currentSan - effectiveLoss)

  return {
    newSan,
    result,
    loss: effectiveLoss,
    rollDetail: `D100=${String(roll)}/${String(currentSan)}`,
    mythosHardened,
  }
}
