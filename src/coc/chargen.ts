/**
 * CoC 人物生成器。
 *
 * 生成调查员的基础属性：8 项特征（STR/CON/SIZ/DEX/APP/EDU/INT/POW）
 * 采用标准 CoC 掷骰公式（3d6×5 或 2d6×5+30），并派生 HP、体格、伤害加值、MOV 等属性。
 *
 * ## 规则差异
 *
 * - **CoC 7 版**：完整属性集（HP + 体格 + 伤害加值 + MOV=8 固定）
 * - **CoC 6 版**：仅生成 8 项基础属性和 HP
 * - STR/SIZ/EDU 的派生规则在两版间完全一致
 */

import { rollExpression } from '../dice'
import type { RandomSource } from '../types'

/** CoC 核心规则书版本标识。 */
export type CocRuleset = 'coc6' | 'coc7'

/** 人物生成结果。 */
export interface CocCharacterResult {
  /** 8 项基础属性（STR/CON/SIZ/DEX/APP/EDU/INT/POW），值域 15~90 */
  attributes: Record<string, number>
  /** 生命值 = floor((CON + SIZ) / 10) */
  hp: number
  /** 体格（仅 coc7），由 STR+SIZ 区间查表得出 */
  build?: number
  /** 伤害加值（仅 coc7），由 STR+SIZ 区间查表得出的骰子表达式 */
  damageBonus?: string
  /** 移动速度（仅 coc7），固定为 8 */
  mov?: number
}

/** 使用 3d6×5 公式的属性名集合（STR/CON/DEX/APP/POW）。 */
const MULTIPLY_3D6_5 = new Set(['STR', 'CON', 'DEX', 'APP', 'POW'])

/**
 * 掷一次属性值。
 *
 * STR/CON/DEX/APP/POW 使用 `3d6×5`（值域 15~90），
 * SIZ/INT/EDU 使用 `(2d6+6)×5` 等价展开为 `2d6×5+30`（值域 40~90）。
 *
 * @param name - 属性名缩写（STR/CON/SIZ/DEX/APP/EDU/INT/POW）
 * @param rng - 随机数源
 * @returns 属性值（3d6×5 或 2d6×5+30 的结果）
 */
function rollAttribute(name: string, rng: RandomSource): number {
  // SIZ/INT/EDU 使用 (2D6+6)*5，等价展开为 2d6*5+30
  const expr = MULTIPLY_3D6_5.has(name) ? '3d6*5' : '2d6*5+30'
  return rollExpression(expr, rng).total
}

/**
 * STR+SIZ 数值区间 → [体格, 伤害加值] 静态映射。
 *
 * 数值区间为公开规则事实，措辞自撰。
 *
 * | STR+SIZ | 体格 | 伤害加值 |
 * |---------|------|----------|
 * | 2–64    | -2   | -2       |
 * | 65–84   | -1   | -1       |
 * | 85–124  | 0    | 0        |
 * | 125–164 | 1    | +1D4     |
 * | 165–204 | 2    | +1D6     |
 * | 205+    | 3    | +2D6     |
 *
 * @param strPlusSiz - STR + SIZ 的总和
 * @returns 体格值和伤害加值表达式
 */
export function lookupBuildAndDamageBonus(strPlusSiz: number): {
  build: number
  damageBonus: string
} {
  if (strPlusSiz <= 64) return { build: -2, damageBonus: '-2' }
  if (strPlusSiz <= 84) return { build: -1, damageBonus: '-1' }
  if (strPlusSiz <= 124) return { build: 0, damageBonus: '0' }
  if (strPlusSiz <= 164) return { build: 1, damageBonus: '+1D4' }
  if (strPlusSiz <= 204) return { build: 2, damageBonus: '+1D6' }
  return { build: 3, damageBonus: '+2D6' }
}

/**
 * 生成一名 CoC 调查员。
 *
 * 按顺序生成 STR/CON/SIZ/DEX/APP/EDU/INT/POW 八项属性，
 * 根据规则版本派生 HP 和可选属性（体格/伤害加值/MOV）。
 *
 * @param ruleset - 规则版本：`'coc6'` 仅生成基础属性+HP，`'coc7'` 额外生成体格/伤害加值/MOV
 * @param rng - 随机数源，默认 `Math.random`
 * @returns 人物生成结果
 *
 * @example
 * ```ts
 * const char = generateCharacter('coc7')
 * console.log(char.attributes.STR) // 如 65
 * console.log(char.hp)            // 如 12
 * console.log(char.damageBonus)   // 如 '+1D4'
 * ```
 */
export function generateCharacter(
  ruleset: CocRuleset,
  rng: RandomSource = Math.random,
): CocCharacterResult {
  const names = ['STR', 'CON', 'SIZ', 'DEX', 'APP', 'EDU', 'INT', 'POW']
  const attributes: Record<string, number> = {}
  for (const name of names) attributes[name] = rollAttribute(name, rng)

  const hp = Math.floor((attributes.CON + attributes.SIZ) / 10)
  if (ruleset === 'coc6') return { attributes, hp }

  const { build, damageBonus } = lookupBuildAndDamageBonus(attributes.STR + attributes.SIZ)
  return { attributes, hp, build, damageBonus, mov: 8 }
}
