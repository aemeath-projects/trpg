/**
 * CoC 房规判定引擎。
 *
 * 实现克苏鲁的呼唤（Call of Cthulhu）d100 技能检定的结果等级判定，
 * 支持 8 种大成功/大失败边界规则变体。
 *
 * ## 背景
 *
 * CoC 核心规则中，"大成功"和"大失败"的定义在不同版本和社区规则中存在分歧。
 * 本模块提供 C0~C6（社区约定编号）以及 DeltaGreen 共 8 种边界规则的完整实现。
 * 困难成功 / 极难成功的阈值在所有规则下统一采用标准 CoC7 嵌套三档判定：
 * `roll ≤ skill/5 → extreme_success`，`roll ≤ skill/2 → hard_success`，`roll ≤ skill → success`。
 */

import type { CheckResult } from '../types'

/**
 * CoC 大成功/大失败房规标识。
 *
 * | 规则 | 大成功条件 | 大失败条件 |
 * |------|-----------|-----------|
 * | C0   | roll === 1 | skill≥50 时 roll=100, 否则 roll≥96 |
 * | C1   | skill≥50 时 roll∈[1,5], 否则 roll=1 | skill≥50 时 roll=100, 否则 roll≥96 |
 * | C2   | roll∈[1,5] 且 roll≤skill | roll=100 或 (roll∈[96,99] 且 roll>skill) |
 * | C3   | roll∈[1,5] | roll≥96 |
 * | C4   | roll∈[1,5] 且 roll≤floor(skill/10) | skill≥50 时 roll=100, 否则 roll≥96+floor(skill/10) |
 * | C5   | roll∈[1,2] 且 roll<floor(skill/5) | skill≥50 时 roll≥99, 否则 roll≥96 |
 * | C6   | roll∈[1,3] | roll≥98 |
 * | DeltaGreen | roll 是 11 的倍数且 roll≤skill | roll 是 11 的倍数且 roll>skill |
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
 * 判定优先级（从高到低）：
 * 1. 大成功（按房规边界）
 * 2. 大失败（按房规边界）
 * 3. 失败（roll > skillValue）
 * 4. 极难成功（roll ≤ skillValue / 5）
 * 5. 困难成功（roll ≤ skillValue / 2）
 * 6. 普通成功
 *
 * 注：`骰娘常见指令.md` 的 `.ra` 结果表格原文对"困难成功/普通成功"的阈值描述互相矛盾
 * （字面意思是两个重叠区间），本实现按标准 CoC7 规则澄清为三档嵌套：
 * `roll ≤ skillValue/5 → extreme_success`；`roll ≤ skillValue/2 → hard_success`；
 * `roll ≤ skillValue → success`。大成功/大失败边界完全按房规表格实现，与该表格无冲突。
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
