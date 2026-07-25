/**
 * 骰子表达式求值引擎。
 *
 * 负责将 parser 产出的 Token 序列转换为实际掷骰结果，支持：
 * - NdM 标准骰（含 d% 百分骰）
 * - kh/kl 取高/取低（keep highest / keep lowest）
 * - +/- 加减运算符
 * - * / × 乘法运算符（乘号优先级高于加减）
 * - 理论最大值计算（不实际掷骰，用于 San Check 大失败扣除等场景）
 *
 * 四则运算优先级规则：`*` > `+`/`-`，先按 `+`/`-` 切分成项（Term），
 * 每项内部再计算连乘积。不支持括号、除法、单目负号。
 */

import type { RandomSource } from '../types'

import { DiceExpressionError } from './parser.js'
import type { DiceToken, Token } from './parser.js'

/** 单次掷骰求值返回结构。 */
export interface DiceResult {
  /** 表达式最终计算结果（含所有加减修正） */
  total: number
  /** 人类可读的掷骰明细（如 "3D6=[4,2,6]=12+2=14"） */
  detail: string
  /** 本次表达式产生的所有骰子原始面值（含被 kh/kl 丢弃的骰子） */
  rolls: number[]
}

/**
 * 掷一次 N 面骰的原子操作。
 *
 * @param sides - 骰子面数
 * @param rng - 随机数源，默认 `Math.random`
 * @returns [1, sides] 区间内的随机整数
 */
function rollOnce(sides: number, rng: RandomSource): number {
  return Math.floor(rng() * sides) + 1
}

/**
 * 掷一枚 N 面骰子的原语，供业务层（如 CoC 优势/劣势骰）直接调用。
 *
 * 与 {@link rollExpression} 不同，此函数不解析表达式字符串，
 * 仅执行一次掷骰并返回面值。
 *
 * @param sides - 骰子面数，必须为正整数
 * @param rng - 随机数源，默认 `Math.random`
 * @returns [1, sides] 区间内的随机整数
 * @throws {DiceExpressionError} 面数不是正整数时抛出
 */
export function rollDie(sides: number, rng: RandomSource = Math.random): number {
  if (!Number.isInteger(sides) || sides < 1) {
    throw new DiceExpressionError(`骰子面数必须是正整数：${String(sides)}`)
  }
  return rollOnce(sides, rng)
}

/**
 * 对单个骰子 Token 求值，执行掷骰并应用 kh/kl 筛选。
 *
 * @param token - 骰子 Token，包含 count、sides、可选的 keep 规则
 * @param rng - 随机数源
 * @returns 包含求和值、明细字符串和全部原始面值的对象
 */
function evaluateDiceToken(
  token: DiceToken,
  rng: RandomSource,
): { value: number; detail: string; rolls: number[] } {
  const sides = token.sides === 'percent' ? 100 : token.sides
  const rolls: number[] = []
  for (let i = 0; i < token.count; i++) rolls.push(rollOnce(sides, rng))

  let kept = rolls
  if (token.keep) {
    const sorted = [...rolls].sort((a, b) => a - b)
    kept =
      token.keep.mode === 'h' ? sorted.slice(-token.keep.count) : sorted.slice(0, token.keep.count)
  }
  const value = kept.reduce((sum, n) => sum + n, 0)

  const notation = `${String(token.count)}D${token.sides === 'percent' ? '%' : String(token.sides)}`
  const detail =
    token.count === 1 && !token.keep
      ? `${notation}=${String(value)}`
      : `${notation}=[${rolls.join(',')}]=${String(value)}`

  return { value, detail, rolls }
}

/** 求值项（Term）：由同符号的一组操作数通过 `*` 连接而成。 */
interface Term {
  /** 该项的正负号 */
  sign: 1 | -1
  /** 该项内部的操作数序列（数字 / 骰子 token，由 `*` 分隔） */
  parts: Token[]
}

/**
 * 将 Token 序列按 +/- 切分成若干项（Term）。
 *
 * 每项内部只包含由 `*` 连接的操作数（数字或骰子 token），
 * 乘号优先级高于加减——求值时每项先算连乘积，再按符号累加。
 *
 * @param tokens - 词法分析后的 Token 序列
 * @returns 按 +/- 切分后的 Term 列表
 * @throws {DiceExpressionError} 表达式语法不合法时抛出（运算符位置错误等）
 */
function splitIntoTerms(tokens: Token[]): Term[] {
  const terms: Term[] = []
  let currentSign: 1 | -1 = 1
  let currentParts: Token[] = []
  let expectOperand = true

  for (const token of tokens) {
    if (token.type === 'plus' || token.type === 'minus') {
      if (expectOperand) throw new DiceExpressionError('骰子表达式不合法：运算符位置错误')
      terms.push({ sign: currentSign, parts: currentParts })
      currentSign = token.type === 'plus' ? 1 : -1
      currentParts = []
      expectOperand = true
      continue
    }
    if (token.type === 'star') {
      if (expectOperand) throw new DiceExpressionError('骰子表达式不合法：运算符位置错误')
      currentParts.push(token)
      expectOperand = true
      continue
    }
    if (!expectOperand) throw new DiceExpressionError('骰子表达式不合法：缺少运算符')
    currentParts.push(token)
    expectOperand = false
  }

  if (expectOperand) throw new DiceExpressionError('骰子表达式不合法：以运算符结尾')
  terms.push({ sign: currentSign, parts: currentParts })
  return terms
}

/**
 * 对 Token 序列求值，实际掷骰并返回结果。
 *
 * 求值流程：
 * 1. 按 +/- 切分为 Term
 * 2. 每个 Term 内部计算连乘积
 * 3. 按 Term 符号累加得到最终结果
 *
 * @param tokens - 词法分析后的 Token 序列
 * @param rng - 随机数源，默认 `Math.random`
 * @returns 掷骰结果（total、detail、rolls）
 * @throws {DiceExpressionError} Token 序列为空时抛出
 */
export function evaluateTokens(tokens: Token[], rng: RandomSource): DiceResult {
  if (tokens.length === 0) throw new DiceExpressionError('骰子表达式不能为空')

  const terms = splitIntoTerms(tokens)
  let total = 0
  const termDetails: string[] = []
  const allRolls: number[] = []

  for (const term of terms) {
    let product = 1
    const partDetails: string[] = []
    for (const part of term.parts) {
      if (part.type === 'star') {
        partDetails.push('*')
        continue
      }
      let value = 0
      if (part.type === 'dice') {
        const evaluated = evaluateDiceToken(part, rng)
        value = evaluated.value
        partDetails.push(evaluated.detail)
        allRolls.push(...evaluated.rolls)
      } else if (part.type === 'number') {
        value = part.value
        partDetails.push(String(value))
      }
      product *= value
    }
    total += term.sign * product
    const prefix = term.sign === -1 ? '-' : termDetails.length > 0 ? '+' : ''
    termDetails.push(prefix + partDetails.join(''))
  }

  return { total, detail: termDetails.join(''), rolls: allRolls }
}

/**
 * 计算 Token 序列的理论最大值，不实际掷骰。
 *
 * 骰子项按"全部掷出最大面值"计算（考虑 kh/kl 规则），
 * 用于 CoC 大失败扣除失败表达式最大值等场景。
 *
 * @param tokens - 词法分析后的 Token 序列
 * @returns 表达式在最佳情况下的理论最大值
 */
export function maxOfTokens(tokens: Token[]): number {
  const terms = splitIntoTerms(tokens)
  let total = 0
  for (const term of terms) {
    let product = 1
    for (const part of term.parts) {
      if (part.type === 'star') continue
      if (part.type === 'dice') {
        const sides = part.sides === 'percent' ? 100 : part.sides
        const keepCount = part.keep?.count ?? part.count
        product *= keepCount * sides
      } else if (part.type === 'number') {
        product *= part.value
      }
    }
    total += term.sign * product
  }
  return total
}
