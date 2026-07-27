/**
 * 掷骰引擎入口。
 *
 * 解析与求值骰子表达式（如 3d6+2、4d6kh3、1d%）。
 * 支持 +/- 加减、* 乘法、kh/kl 取高取低。
 */

export { DiceExpressionError, tokenize } from './parser.js'
export { evaluateTokens, rollDie } from './evaluator.js'
export type { DiceResult } from './evaluator.js'

import type { RandomSource } from '../types'

import { evaluateTokens, maxOfTokens } from './evaluator.js'
import type { DiceResult } from './evaluator.js'
import { tokenize } from './parser.js'

/**
 * 解析并求值骰子表达式。
 *
 * @param expr - 骰子表达式字符串，如 "3d6+2"、"4d6kh3"、"1d%"
 * @param rng - 随机数源，默认 Math.random
 * @returns 掷骰结果（total、detail、rolls）
 */
export function rollExpression(expr: string, rng: RandomSource = Math.random): DiceResult {
  const tokens = tokenize(expr)
  return evaluateTokens(tokens, rng)
}

/**
 * 计算表达式理论最大值，不实际掷骰。
 * 骰子项按全部掷出最大面值计算（考虑 kh/kl 规则），用于 San Check 大失败扣除等场景。
 *
 * @param expr - 骰子表达式字符串
 * @returns 表达式理论最大值
 */
export function maxOfExpression(expr: string): number {
  const tokens = tokenize(expr)
  return maxOfTokens(tokens)
}
