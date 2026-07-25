/**
 * 通用无放回随机抽取（Draw Without Replacement）。
 *
 * 从数组中随机抽取指定数量的元素，每次抽取后从候选池中移除。
 * 可供 coc/madness、dnd/names 等需要随机抽取不重复项目的场景复用。
 *
 * 实现为 Fisher-Yates 变体的部分抽取，时间复杂度 O(count × n)。
 */

import type { RandomSource } from '../types'

/**
 * 从数组中无放回随机抽取 count 个元素。
 *
 * 内部执行 count 次随机索引选取，每次选取后从候选池中移除已抽取项。
 * 不会修改原始数组（先浅拷贝再操作）。
 *
 * @param deck - 候选数组（只读，不会被修改）
 * @param count - 需要抽取的数量
 * @param rng - 随机数源，默认 `Math.random`
 * @returns 抽取结果数组（长度 = count）
 * @throws {RangeError} count 为负数或超过 deck 长度时抛出
 *
 * @example
 * ```ts
 * const cards = ['A', 'B', 'C', 'D']
 * draw(cards, 2) // → e.g. ['C', 'A']
 * ```
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
