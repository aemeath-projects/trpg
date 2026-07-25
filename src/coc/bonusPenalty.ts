/**
 * CoC 优势骰（bonus）/ 劣势骰（penalty）机制。
 *
 * 这是 CoC 特有的"不是标准骰子记号能表达"的机制：
 * 投 1 个 d100 + N 个额外 d10 作为候选十位数，
 * 优势取最小十位、劣势取最大十位，替换原十位数形成最终结果。
 *
 * 用 0~99（其中 0 代表 "00" 即 100）的展示值做十位/个位拆分，
 * 避免 100 的边界特殊处理散落各处。
 */

import { rollDie } from '../dice'
import type { DiceResult } from '../dice'
import type { RandomSource } from '../types'

/**
 * 执行 CoC 优势骰 / 劣势骰掷骰。
 *
 * ## 机制说明
 *
 * 1. 投基础 d100 + N 个额外 d10
 * 2. 将基础结果拆分为十位数和个位数
 * 3. **优势**：取所有候选十位数中的最小值作为新十位数
 * 4. **劣势**：取所有候选十位数中的最大值作为新十位数
 * 5. 重新组合为最终结果（0 → 100 特殊处理）
 *
 * 额外 d10 的 d10=10 在此场景下被视为十位数 0（即 d10 的 10→"10 位为 0"）。
 *
 * @param extraD10Count - 额外 d10 的数量（优势骰/劣势骰的等级，如 1 个、2 个）
 * @param mode - `'bonus'`（优势）或 `'penalty'`（劣势）
 * @param rng - 随机数源，默认 `Math.random`
 * @returns 掷骰结果，包含最终值、明细和所有原始骰面
 *
 * @example
 * ```ts
 * // 一个优势骰：投 1d100 + 1d10，取最小的十位数
 * const result = rollBonusPenaltyD100(1, 'bonus')
 * console.log(result.total)  // 1~100
 * console.log(result.detail) // "D100=73，额外D10=[2]，优势取最小十位=23"
 * ```
 */
export function rollBonusPenaltyD100(
  extraD10Count: number,
  mode: 'bonus' | 'penalty',
  rng: RandomSource = Math.random,
): DiceResult {
  const base = rollDie(100, rng)
  const extraRolls = Array.from({ length: extraD10Count }, () => rollDie(10, rng))

  const displayValue = base === 100 ? 0 : base
  const baseTens = Math.floor(displayValue / 10)
  const units = displayValue % 10
  const candidateTensDigits = [baseTens, ...extraRolls.map((r) => (r === 10 ? 0 : r))]

  const finalTens =
    mode === 'bonus' ? Math.min(...candidateTensDigits) : Math.max(...candidateTensDigits)
  const finalDisplay = finalTens * 10 + units
  const total = finalDisplay === 0 ? 100 : finalDisplay

  const modeLabel = mode === 'bonus' ? '优势' : '劣势'
  const pickLabel = mode === 'bonus' ? '最小' : '最大'
  const detail = `D100=${String(base)}，额外D10=[${extraRolls.join(',')}]，${modeLabel}取${pickLabel}十位=${String(total)}`

  return { total, detail, rolls: [base, ...extraRolls] }
}
