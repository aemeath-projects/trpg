/**
 * CoC 理智检定（Sanity Check / San Check）。
 *
 * 调查员遭遇神话事件时需进行理智检定：投 d100 vs 当前 SAN 值判定成功/失败等级，
 * 按结果扣除对应的理智表达式（成功时扣少量，失败时扣大量，大失败扣最大值），
 * 并结合"神话淬炼"状态计算实际损失。
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
 * ## 检定流程
 *
 * 1. 投 d100，调用 {@link judgeCoCResult} 判定结果等级
 * 2. 根据结果等级计算原始 SAN 损失：
 *    - 大成功 / 极难成功 / 困难成功 / 普通成功：扣除成功表达式（`successExpr`）的掷骰结果
 *    - 失败：扣除失败表达式（`failExpr`）的掷骰结果
 *    - 大失败：扣除失败表达式的**理论最大值**（不掷骰，直接取最坏情况）
 * 3. 检查神话淬炼：`神话技能值 > 当前 SAN` 则触发，之后永久生效
 * 4. 淬炼状态下实际损失减半（向下取整）
 * 5. SAN 值不会低于 0
 *
 * ## 神话淬炼
 *
 * 一次触发即永久生效（`wasMythosHardened` 从 `false` 变为 `true` 后不会回退）。
 * 淬炼状态下所有后续 San Check 的 SAN 损失减半。
 *
 * @param currentSan - 检定前的 SAN 值
 * @param successExpr - 成功时扣除的骰子表达式（如 `"1d3"`、`"0"`）
 * @param failExpr - 失败时扣除的骰子表达式（如 `"1d6+1"`）
 * @param houserule - 大成功/大失败房规标识
 * @param mythosValue - 当前克苏鲁神话技能值，用于判定本次检定后是否新触发淬炼
 * @param wasMythosHardened - 检定前是否已处于神话淬炼状态
 * @param rng - 随机数源，默认 `Math.random`
 * @returns 理智检定结果
 *
 * @example
 * ```ts
 * const outcome = applySanityCheck(
 *   45,           // 当前 SAN
 *   '1d3',        // 成功扣 1d3
 *   '1d6+1',      // 失败扣 1d6+1
 *   'C3',         // C3 房规
 *   10,           // 神话 10
 *   false,        // 未淬炼
 * )
 * console.log(outcome.newSan)     // 检定后 SAN
 * console.log(outcome.loss)       // 实际损失
 * ```
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
