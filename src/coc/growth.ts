/**
 * CoC 成长检定（Skill Improvement Check）。
 *
 * 幕间对成功使用过的技能进行成长检定：投 d100，大于当前技能值或 ≥96 则成功，
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
 * 投 d100，满足 d100 > skillValue 或 d100 ≥ 96 任一条件即成功，技能值 +1d10。
 *
 * @param skillValue - 当前技能值
 * @param rng - 随机数源，默认 Math.random
 * @returns 成长检定结果
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
