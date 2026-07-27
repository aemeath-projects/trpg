/**
 * 通用无放回随机抽取。
 *
 * 从数组中随机抽取指定数量的元素，每次抽取后从候选池中移除。
 * 实现为 Fisher-Yates 变体的部分抽取。
 */

import type { RandomSource } from '../types'

/**
 * 从数组中无放回随机抽取 count 个元素。不修改原始数组。
 *
 * @throws {RangeError} count 为负数或超过 deck 长度时抛出
 */
export function draw<T>(deck: readonly T[], count: number, rng: RandomSource = Math.random): T[] {
  if (count < 0) throw new RangeError(`抽取数量不能为负数：${String(count)}`)
  if (count > deck.length) {
    throw new RangeError(`抽取数量（${String(count)}）不能超过牌堆大小（${String(deck.length)}）`)
  }
  const pool = [...deck]
  const result: T[] = []
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * pool.length)
    result.push(pool[idx])
    pool.splice(idx, 1)
  }
  return result
}
