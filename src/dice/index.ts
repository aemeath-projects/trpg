/**
 * 掷骰引擎对外入口。
 *
 * 提供完整的骰子表达式解析与求值能力：
 * - **表达式求值**：解析 `"3d6+2"` 等字符串并实际掷骰返回结果
 * - **理论最大值**：不掷骰直接计算表达式上限
 * - **单骰原语**：掷一枚 N 面骰的底层操作
 *
 * 支持的语法详见 {@link tokenize} 的文档。
 *
 * @module dice
 */

export { DiceExpressionError } from './parser.js'
export { rollDie } from './evaluator.js'
export type { DiceResult } from './evaluator.js'

import type { RandomSource } from '../types'

import { evaluateTokens, maxOfTokens } from './evaluator.js'
import type { DiceResult } from './evaluator.js'
import { tokenize } from './parser.js'

/**
 * 解析并求值一个骰子表达式。
 *
 * 完整的 pipeline：字符串 → tokenize → evaluateTokens → 带明细的结果。
 *
 * @param expr - 骰子表达式字符串（如 `"3d6+2"`、`"4d6kh3"`、`"1d%"`）
 * @param rng - 随机数源，默认 `Math.random`
 * @returns 掷骰结果（total、detail、rolls）
 *
 * @example
 * ```ts
 * const result = rollExpression('3d6+2')
 * console.log(result.total)   // 如 14
 * console.log(result.detail)  // "3D6=[4,2,6]=12+2=14"
 * ```
 */
export function rollExpression(expr: string, rng: RandomSource = Math.random): DiceResult {
  const tokens = tokenize(expr)
  return evaluateTokens(tokens, rng)
}

/**
 * 计算表达式理论最大值，不实际掷骰。
 *
 * 骰子项按"全部掷出最大面值"计算（考虑 kh/kl 取高取低规则），
 * 用于 CoC 大失败扣除失败表达式最大值等只需要理论上限的场景。
 *
 * @param expr - 骰子表达式字符串
 * @returns 表达式在最佳情况下的理论最大值
 *
 * @example
 * ```ts
 * maxOfExpression('3d6')   // → 18
 * maxOfExpression('4d6kh3') // → 18（取最高的3个，即 3×6=18）
 * ```
 */
export function maxOfExpression(expr: string): number {
  const tokens = tokenize(expr)
  return maxOfTokens(tokens)
}
