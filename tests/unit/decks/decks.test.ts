import { describe, expect, it } from 'vitest'

import { draw } from '../../../src/decks'
import type { RandomSource } from '../../../src/types'

function fixedSequence(values: number[]): RandomSource {
  let i = 0
  return () => {
    if (i >= values.length) throw new Error('test rng 序列已耗尽')
    return values[i++]
  }
}

describe('draw', () => {
  it('应无放回地按 rng 顺序抽取指定数量的元素', () => {
    const deck = ['a', 'b', 'c', 'd']
    const result = draw(deck, 2, fixedSequence([0, 0]))
    expect(result).toEqual(['a', 'b'])
  })

  it('count 为 0 应返回空数组', () => {
    expect(draw(['a', 'b'], 0)).toEqual([])
  })

  it('count 超过牌堆大小应抛出 RangeError', () => {
    expect(() => draw(['a'], 2)).toThrow(RangeError)
  })

  it('count 为负数应抛出 RangeError', () => {
    expect(() => draw(['a'], -1)).toThrow(RangeError)
  })
})
