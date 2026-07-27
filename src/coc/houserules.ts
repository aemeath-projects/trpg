/**
 * CoC 房规判定引擎。
 *
 * 实现 d100 技能检定的结果等级判定，困难成功/极难成功阈值统一采用标准 CoC7 三档嵌套：
 * roll ≤ skill/5 → extreme_success，roll ≤ skill/2 → hard_success，roll ≤ skill → success。
 */

import type { CheckResult } from '../types'

/**
 * CoC 大成功/大失败房规标识。
 *
 * C0: 大成功 roll=1，大失败 skill≥50 时 roll=100 否则 roll≥96
 * C1: 大成功 skill≥50 时 roll∈[1,5] 否则 roll=1，大失败 skill≥50 时 roll=100 否则 roll≥96
 * C2: 大成功 roll∈[1,5] 且 roll≤skill，大失败 roll=100 或 (roll∈[96,99] 且 roll>skill)
 * C3: 大成功 roll∈[1,5]，大失败 roll≥96
 * C4: 大成功 roll∈[1,5] 且 roll≤floor(skill/10)，大失败 skill≥50 时 roll=100 否则 roll≥96+floor(skill/10)
 * C5: 大成功 roll∈[1,2] 且 roll<floor(skill/5)，大失败 skill≥50 时 roll≥99 否则 roll≥96
 * C6: 大成功 roll∈[1,3]，大失败 roll≥98
 * DeltaGreen: 大成功 roll 是 11 的倍数且 roll≤skill，大失败 roll 是 11 的倍数且 roll>skill
 */
export type Houserule = 'C0' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'DeltaGreen'

/**
 * 判断一次 d100 检定是否触发大成功。
 *
 * @param roll - d100 掷骰结果（1~100）
 * @param skillValue - 技能/属性值
 * @param rule - 房规标识
 * @returns 是否为大成功
 */
function isGreatSuccess(roll: number, skillValue: number, rule: Houserule): boolean {
  switch (rule) {
    case 'C0':
      return roll === 1
    case 'C1':
      return skillValue >= 50 ? roll >= 1 && roll <= 5 : roll === 1
    case 'C2':
      return roll >= 1 && roll <= 5 && roll <= skillValue
    case 'C3':
      return roll >= 1 && roll <= 5
    case 'C4':
      return roll >= 1 && roll <= 5 && roll <= Math.floor(skillValue / 10)
    case 'C5':
      return roll >= 1 && roll <= 2 && roll < Math.floor(skillValue / 5)
    case 'C6':
      return roll >= 1 && roll <= 3
    case 'DeltaGreen':
      return roll % 11 === 0 && roll <= skillValue
  }
}

/**
 * 判断一次 d100 检定是否触发大失败。
 *
 * @param roll - d100 掷骰结果（1~100）
 * @param skillValue - 技能/属性值
 * @param rule - 房规标识
 * @returns 是否为大失败
 */
function isGreatFail(roll: number, skillValue: number, rule: Houserule): boolean {
  switch (rule) {
    case 'C0':
    case 'C1':
      return skillValue >= 50 ? roll === 100 : roll >= 96
    case 'C2':
      return roll === 100 || (roll >= 96 && roll <= 99 && roll > skillValue)
    case 'C3':
      return roll >= 96
    case 'C4':
      return skillValue >= 50 ? roll === 100 : roll >= 96 + Math.floor(skillValue / 10)
    case 'C5':
      return skillValue >= 50 ? roll >= 99 : roll >= 96
    case 'C6':
      return roll >= 98
    case 'DeltaGreen':
      return roll % 11 === 0 && roll > skillValue
  }
}

/**
 * 判定一次 d100 检定的结果等级。
 *
 * 优先级从高到低：大成功 → 大失败 → 失败 → 极难成功 → 困难成功 → 普通成功。
 * 大成功/大失败边界按房规表格实现。
 *
 * @param roll - d100 掷骰结果（1~100）
 * @param skillValue - 技能/属性值
 * @param houserule - 房规标识
 * @returns 检定结果等级
 */
export function judgeCoCResult(
  roll: number,
  skillValue: number,
  houserule: Houserule,
): CheckResult {
  if (isGreatSuccess(roll, skillValue, houserule)) return 'great_success'
  if (isGreatFail(roll, skillValue, houserule)) return 'great_fail'
  if (roll > skillValue) return 'fail'
  if (roll <= Math.floor(skillValue / 5)) return 'extreme_success'
  if (roll <= Math.floor(skillValue / 2)) return 'hard_success'
  return 'success'
}
