/**
 * D&D 5e 人物属性生成器。
 *
 * 采用 4d6kh3（4d6 取最高 3 个）掷骰法生成 6 项基础属性。
 * 提供自由分配模式（.dnd，返回数值数组）和预设模式（.dndx，按力敏体智感魅标注属性名）。
 */

import { rollExpression } from '../dice'
import type { RandomSource } from '../types'

/** D&D 5e 六项基础属性名称（按顺序）。 */
const ABILITY_NAMES = ['力量', '敏捷', '体质', '智力', '感知', '魅力'] as const

/** 自由分配模式的属性值组。 */
export interface AbilityScoreSet {
  /** 6 项属性值（顺序与 {@link ABILITY_NAMES} 一致） */
  values: number[]
  /** 6 项属性值总和 */
  total: number
}

/** 预设模式的属性值组，每项值附带属性名。 */
export interface NamedAbilityScoreSet {
  /** 属性名 → 属性值的映射 */
  values: Record<string, number>
  /** 6 项属性值总和 */
  total: number
}

/**
 * 自由分配模式：生成 count 组属性值，不标注属性名。
 * 每组投 6 次 4d6kh3，顺序固定为力敏体智感魅。
 */
export function rollAbilityScoreSets(
  count: number,
  rng: RandomSource = Math.random,
): AbilityScoreSet[] {
  const sets: AbilityScoreSet[] = []
  for (let i = 0; i < count; i++) {
    const values = ABILITY_NAMES.map(() => rollExpression('4d6kh3', rng).total)
    sets.push({ values, total: values.reduce((a, b) => a + b, 0) })
  }
  return sets
}

/**
 * 预设模式：生成 count 组属性值，每组按固定属性顺序标注属性名。
 */
export function rollNamedAbilityScoreSets(
  count: number,
  rng: RandomSource = Math.random,
): NamedAbilityScoreSet[] {
  const sets: NamedAbilityScoreSet[] = []
  for (let i = 0; i < count; i++) {
    const values: Record<string, number> = {}
    for (const name of ABILITY_NAMES) values[name] = rollExpression('4d6kh3', rng).total
    sets.push({ values, total: Object.values(values).reduce((a, b) => a + b, 0) })
  }
  return sets
}
