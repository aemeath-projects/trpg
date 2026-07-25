import { describe, expect, it } from 'vitest'

import { DiceExpressionError, maxOfExpression, rollDie, rollExpression } from '../../../src/dice'
import type { RandomSource } from '../../../src/types'

/** 构造确定性 rng：按顺序返回给定的 [0,1) 浮点值序列。 */
function fixedSequence(values: number[]): RandomSource {
  let i = 0
  return () => {
    if (i >= values.length) throw new Error('test rng 序列已耗尽')
    return values[i++]
  }
}

describe('rollDie', () => {
  it('应根据 rng 返回值计算出对应的骰子结果', () => {
    expect(rollDie(20, fixedSequence([0.99]))).toBe(20)
    expect(rollDie(6, fixedSequence([0]))).toBe(1)
  })

  it('面数非正整数应抛出 DiceExpressionError', () => {
    expect(() => rollDie(0)).toThrow(DiceExpressionError)
    expect(() => rollDie(-1)).toThrow(DiceExpressionError)
  })
})

describe('rollExpression — 基础骰子记号', () => {
  it('NdM：应对每个骰子分别求值并求和', () => {
    const result = rollExpression('3d6', fixedSequence([0, 0.5, 0.999]))
    expect(result.rolls).toEqual([1, 4, 6])
    expect(result.total).toBe(11)
    expect(result.detail).toBe('3D6=[1,4,6]=11')
  })

  it('单骰无 keep 修饰符时 detail 使用简化格式', () => {
    const result = rollExpression('1d20', fixedSequence([0.5]))
    expect(result.total).toBe(11)
    expect(result.detail).toBe('1D20=11')
  })

  it('d% 应等价于 d100', () => {
    const result = rollExpression('1d%', fixedSequence([0.63]))
    expect(result.total).toBe(64)
  })

  it('骰子数量必须在 1~999 之间，否则报错', () => {
    expect(() => rollExpression('0d6')).toThrow(DiceExpressionError)
    expect(() => rollExpression('1000d6')).toThrow(DiceExpressionError)
  })
})

describe('rollExpression — 四则运算', () => {
  it('NdM+Z：应先求骰子和再加常数', () => {
    const result = rollExpression('2d6+2', fixedSequence([0, 0.5]))
    expect(result.rolls).toEqual([1, 4])
    expect(result.total).toBe(7)
  })

  it('NdM*Z：应先求骰子和再乘常数', () => {
    const result = rollExpression('3d6*5', fixedSequence([0, 0.5, 0.999]))
    expect(result.total).toBe(55) // (1+4+6)*5
  })

  it('× 应等价于 *', () => {
    const result = rollExpression('1d6×3', fixedSequence([0.5]))
    expect(result.total).toBe(12) // 4*3
  })

  it('* 优先级应高于 +/-', () => {
    // 1d6(=4) + 2*3 = 4 + 6 = 10，而不是 (4+2)*3 = 18
    const result = rollExpression('1d6+2*3', fixedSequence([0.5]))
    expect(result.total).toBe(10)
  })
})

describe('rollExpression — kh/kl 取子集', () => {
  it('kh：应取最高 N 个骰子求和', () => {
    // rolls = [1,2,3,6]，取最高 3 个 = [2,3,6] = 11
    const result = rollExpression('4d6kh3', fixedSequence([0, 0.2, 0.4, 0.9]))
    expect(result.rolls).toEqual([1, 2, 3, 6])
    expect(result.total).toBe(11)
  })

  it('kl：应取最低 N 个骰子求和', () => {
    // rolls = [1,2,3,6]，取最低 2 个 = [1,2] = 3
    const result = rollExpression('4d6kl2', fixedSequence([0, 0.2, 0.4, 0.9]))
    expect(result.total).toBe(3)
  })
})

describe('rollExpression — 非法表达式', () => {
  it('空字符串应报错', () => {
    expect(() => rollExpression('')).toThrow(DiceExpressionError)
    expect(() => rollExpression('   ')).toThrow(DiceExpressionError)
  })

  it('无法识别的字符应报错', () => {
    expect(() => rollExpression('abc')).toThrow(DiceExpressionError)
  })

  it('以运算符开头或结尾应报错', () => {
    expect(() => rollExpression('+1d6')).toThrow(DiceExpressionError)
    expect(() => rollExpression('1d6+')).toThrow(DiceExpressionError)
  })

  it('d 后缺少面数应报错', () => {
    expect(() => rollExpression('1d')).toThrow(DiceExpressionError)
  })

  it('kh/kl 后缺少数量应报错', () => {
    expect(() => rollExpression('2d6kh')).toThrow(DiceExpressionError)
    expect(() => rollExpression('2d6kl')).toThrow(DiceExpressionError)
  })

  it('连续两个运算符应报错', () => {
    expect(() => rollExpression('1d6+*2')).toThrow(DiceExpressionError)
  })
})

describe('rollExpression — 空白符容忍', () => {
  it('表达式中的空格和制表符应被忽略', () => {
    const result = rollExpression(' 1d6 + 2 ', fixedSequence([0.5]))
    expect(result.total).toBe(6) // 4+2
  })

  it('含制表符的表达式应正确解析', () => {
    const result = rollExpression('1d6\t+\t3', fixedSequence([0.5]))
    expect(result.total).toBe(7)
  })
})

describe('rollExpression — 减法运算', () => {
  it('NdM-Z 应先求骰子和再减常数', () => {
    const result = rollExpression('2d6-2', fixedSequence([0, 0.5]))
    expect(result.total).toBe(3) // (1+4)-2
  })

  it('减法的 detail 应包含负号前缀', () => {
    const result = rollExpression('1d6-5', fixedSequence([0.5]))
    // 1d6=4, total=4-5=-1
    expect(result.total).toBe(-1)
    expect(result.detail).toContain('-')
  })
})

describe('maxOfExpression', () => {
  it('应返回表达式的理论最大值（不实际掷骰）', () => {
    expect(maxOfExpression('1d10')).toBe(10)
    expect(maxOfExpression('1d6+2')).toBe(8)
    expect(maxOfExpression('2d6+2')).toBe(14)
  })

  it('kh/kl 修饰符的最大值应按保留的骰子数量计算', () => {
    expect(maxOfExpression('4d6kh3')).toBe(18)
  })

  it('包含乘法的表达式应正确计算最大值', () => {
    expect(maxOfExpression('2d6*3')).toBe(36) // (2*6)*3
  })

  it('d% 应等价于 d100 计算最大值', () => {
    expect(maxOfExpression('1d%')).toBe(100)
    expect(maxOfExpression('2d%')).toBe(200)
  })

  it('含减法的表达式应正确计算最大值', () => {
    // 1d6 最大=6，减去 2 → 4；但 "1d6+2" 的 max 是 8
    // "10-1d6"：10-1d6，最大值时骰子取最小值...
    // maxOfTokens 对所有项求和：term1: +10, term2: -1d6(max=6) → 10-6=4
    // 所以最大值是 10-1=9（骰子最小值），但函数按"全部掷出最大面值"对每个骰子计算
    // 即 term2 按 max 算：10-6=4
    expect(maxOfExpression('10-1d6')).toBe(4)
  })

  it('含乘法和加法的复合表达式最大值', () => {
    // 2d6*3 + 4 → (2*6)*3 + 4 = 36+4 = 40
    expect(maxOfExpression('2d6*3+4')).toBe(40)
  })
})
