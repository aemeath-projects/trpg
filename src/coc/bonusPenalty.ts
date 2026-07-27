/**
 * CoC 优势骰（bonus）/ 劣势骰（penalty）机制。
 *
 * 投 1 个 d100 + N 个额外 d10 作为候选十位数，优势取最小十位、劣势取最大十位，
 * 替换原十位数形成最终结果。内部用 0~99 展示值（0 代表 100）做十位/个位拆分。
 */

import { rollDie } from '../dice'
import type { DiceResult } from '../dice'
import type { RandomSource } from '../types'

/**
 * 执行 CoC 优势骰/劣势骰掷骰。
 *
 * 投基础 d100 + N 个额外 d10，拆分十位/个位后，优势取最小十位数、劣势取最大十位数，
 * 重新组合为最终结果（0 视为 100）。额外 d10 掷出 10 视为十位数 0。
 *
 * @param extraD10Count - 额外 d10 的数量
 * @param mode - 'bonus'（优势）或 'penalty'（劣势）
 * @param rng - 随机数源，默认 Math.random
 * @returns 掷骰结果
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
