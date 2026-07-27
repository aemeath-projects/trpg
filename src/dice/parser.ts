/**
 * 骰子表达式词法分析器。
 *
 * 手写字符扫描器，将骰子表达式字符串解析为 Token 序列。
 *
 * 支持语法：NdM 标准骰、d% 百分骰、+/- 加减、* 乘法（含中文乘号 ×）、
 * kh/kl 取高取低。不支持括号、除法、单目负号、Fudge/Fate 骰。
 */

/** 骰子表达式解析/求值过程中抛出的错误类型。 */
export class DiceExpressionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DiceExpressionError'
  }
}

/**
 * 骰子 Token：表示一次掷骰操作。
 *
 * 示例：{ type: 'dice', count: 3, sides: 6 } 即 3d6；
 * { type: 'dice', count: 4, sides: 6, keep: { mode: 'h', count: 3 } } 即 4d6kh3；
 * { type: 'dice', count: 1, sides: 'percent' } 即 d%。
 */
export interface DiceToken {
  type: 'dice'
  /** 骰子数量 */
  count: number
  /** 骰子面数；`'percent'` 表示百分骰（d%） */
  sides: number | 'percent'
  /** 可选：取高/取低规则 */
  keep?: { mode: 'h' | 'l'; count: number }
}

/** 数字 Token：表示一个常量整数值。 */
export interface NumberToken {
  type: 'number'
  /** 整数值 */
  value: number
}

/** 运算符 Token：+、-、*（含中文乘号 ×）。 */
export interface OpToken {
  type: 'plus' | 'minus' | 'star'
}

/** 所有 Token 类型的联合。 */
export type Token = DiceToken | NumberToken | OpToken

/**
 * 判断字符是否为十进制数字。
 */
function isDigit(c: string): boolean {
  return c >= '0' && c <= '9'
}

/**
 * 将骰子表达式字符串解析为 Token 序列。
 *
 * 解析流程：跳过空白 → 识别运算符 + - * × → 识别数字前缀，若紧跟 d/D 则为骰子 Token，
 * 否则为数字 Token → 骰子后可选 kh/kl + 数字作为取高取低修饰 → d% 识别为百分骰。
 *
 * @param expr - 骰子表达式字符串
 * @returns 解析后的 Token 序列
 * @throws {DiceExpressionError} 表达式为空、语法不合法或遇到无法识别字符时抛出
 */
export function tokenize(expr: string): Token[] {
  const src = expr.trim()
  if (src.length === 0) {
    throw new DiceExpressionError('骰子表达式不能为空')
  }

  const tokens: Token[] = []
  let i = 0

  while (i < src.length) {
    const c = src[i]

    if (c === ' ' || c === '\t') {
      i++
      continue
    }
    if (c === '+') {
      tokens.push({ type: 'plus' })
      i++
      continue
    }
    if (c === '-') {
      tokens.push({ type: 'minus' })
      i++
      continue
    }
    if (c === '*' || c === '×') {
      tokens.push({ type: 'star' })
      i++
      continue
    }

    const numStart = i
    while (i < src.length && isDigit(src[i])) i++
    const leadingDigits = src.slice(numStart, i)

    if (i < src.length && (src[i] === 'd' || src[i] === 'D')) {
      i++
      let sides: number | 'percent'
      if (src[i] === '%') {
        sides = 'percent'
        i++
      } else {
        const sidesStart = i
        while (i < src.length && isDigit(src[i])) i++
        if (i === sidesStart) {
          throw new DiceExpressionError(`骰子表达式不合法："${expr}"（d 后缺少面数）`)
        }
        sides = Number(src.slice(sidesStart, i))
      }

      const count = leadingDigits.length > 0 ? Number(leadingDigits) : 1
      if (count < 1 || count > 999) {
        throw new DiceExpressionError(`骰子数量必须在 1~999 之间："${expr}"`)
      }

      const token: DiceToken = { type: 'dice', count, sides }

      const keepMarker = src.slice(i, i + 2).toLowerCase()
      if (keepMarker === 'kh' || keepMarker === 'kl') {
        i += 2
        const keepStart = i
        while (i < src.length && isDigit(src[i])) i++
        if (i === keepStart) {
          throw new DiceExpressionError(`骰子表达式不合法："${expr}"（kh/kl 后缺少数量）`)
        }
        token.keep = {
          mode: keepMarker === 'kh' ? 'h' : 'l',
          count: Number(src.slice(keepStart, i)),
        }
      }

      tokens.push(token)
      continue
    }

    if (leadingDigits.length > 0) {
      tokens.push({ type: 'number', value: Number(leadingDigits) })
      continue
    }

    throw new DiceExpressionError(`骰子表达式不合法："${expr}"（无法识别字符 "${c}"）`)
  }

  return tokens
}
