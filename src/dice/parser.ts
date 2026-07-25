/**
 * 骰子表达式词法分析器。
 *
 * 手写字符扫描器，将骰子表达式字符串（如 `"3d6+2"`、`"4d6kh3+1d%"`）解析为 Token 序列。
 *
 * ## 支持的语法
 *
 * | 语法 | 示例 | 说明 |
 * |------|------|------|
 * | NdM | `3d6`, `1d20` | 投 N 个 M 面骰 |
 * | d% | `1d%`, `d%` | 百分骰（等价 1d100） |
 * | + | `3d6+2` | 加法 |
 * | - | `2d6-1` | 减法 |
 * | * | `2*3d6` | 乘法（中文乘号也支持） |
 * | kh | `4d6kh3` | 取最高的 N 个（keep highest） |
 * | kl | `4d6kl3` | 取最低的 N 个（keep lowest） |
 *
 * ## 不支持
 *
 * - 括号分组
 * - 除法
 * - 单目负号（如 `-3d6`）
 * - Fudge/Fate 骰子（dF）
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
 * @example `{ type: 'dice', count: 3, sides: 6 }` 表示 `3d6`
 * @example `{ type: 'dice', count: 4, sides: 6, keep: { mode: 'h', count: 3 } }` 表示 `4d6kh3`
 * @example `{ type: 'dice', count: 1, sides: 'percent' }` 表示 `d%`
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

/** 运算符 Token：`+`、`-`、`*`（含中文乘号）。 */
export interface OpToken {
  type: 'plus' | 'minus' | 'star'
}

/** 所有 Token 类型的联合。 */
export type Token = DiceToken | NumberToken | OpToken

/**
 * 判断字符是否为十进制数字（'0'~'9'）。
 *
 * @param c - 待检查的字符
 * @returns 是数字字符则返回 `true`
 */
function isDigit(c: string): boolean {
  return c >= '0' && c <= '9'
}

/**
 * 将骰子表达式字符串解析为 Token 序列。
 *
 * ## 解析流程
 *
 * 1. 跳过空白字符（空格/制表符）
 * 2. 识别运算符 `+` `-` `*` (U+00D7)
 * 3. 识别数字前缀 → 若紧跟 `d`/`D` 则为骰子 Token，否则为数字 Token
 * 4. 骰子 Token 后可选 `kh`/`kl` + 数字 作为取高/取低修饰
 * 5. `d%` 识别为百分骰
 *
 * ## 错误处理
 *
 * 遇到无法识别的字符或语法错误时抛出 {@link DiceExpressionError}。
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
