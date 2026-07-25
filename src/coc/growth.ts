/**
 * CoC 成长检定（Skill Improvement Check）。
 *
 * 在冒险幕间（或适用房规的场景中），调查员可对在冒险中成功使用过的技能
 * 进行一次成长检定：投 d100，若 **大于当前技能值** 或 **≥ 96** 则成长成功，
 * 技能值增加 1d10。
 */

import { rollDie, rollExpression } from '../dice'
import type { RandomSource } from '../types'

/** 单次成长检定的结果。 */
export interface GrowthCheckOutcome {
  /** 是否成功成长 */
  grew: boolean
  /** 成长后的技能值（未成长时与原始值相同） */
  newValue: number
  /** 人类可读的检定明细 */
  detail: string
}

/**
 * 对指定技能值执行一次成长检定。
 *
 * ## 成长条件
 *
 * 投 d100，满足以下任一条件即成长成功：
 * - 掷骰结果 **大于** 当前技能值（即 d100 > skillValue）
 * - 掷骰结果 **≥ 96**（高技能值调查员的最低成长保障）
 *
 * 成功后技能值增加 1d10。
 *
 * @param skillValue - 当前技能值（检定前的值）
 * @param rng - 随机数源，默认 `Math.random`
 * @returns 成长检定结果
 *
 * @example
 * ```ts
 * const result = applyGrowthCheck(65)
 * if (result.grew) {
 *   console.log(`技能成长至 ${result.newValue}`)
 * }
 * ```
 */
export function applyGrowthCheck(
  skillValue: number,
  rng: RandomSource = Math.random,
): GrowthCheckOutcome {
  const roll = rollDie(100, rng)
  if (roll > skillValue || roll >= 96) {
    const gain = rollExpression('1d10', rng).total
    return {
      grew: true,
      newValue: skillValue + gain,
      detail: `D100=${String(roll)}/${String(skillValue)}，成长成功 +${String(gain)}`,
    }
  }
  return {
    grew: false,
    newValue: skillValue,
    detail: `D100=${String(roll)}/${String(skillValue)}，未成长`,
  }
}
