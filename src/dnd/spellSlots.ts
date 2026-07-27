/**
 * D&D 5e 法术位纯计算模块。
 *
 * 管理各环级法术位的当前数量和上限，支持初始化、调整上限、长休恢复、消耗/恢复。
 * 纯函数式状态管理，不涉及施法者等级计算（等级→法术位的映射由消费方负责）。
 */

/** 法术位状态：按环级（如 "1"、"2"…"9"）记录当前数量和上限。 */
export type SpellSlotState = Record<string, { current: number; max: number }>

/**
 * 按每环上限初始化法术位状态。
 *
 * 所有环级的当前数量初始化为对应上限值（即视为刚完成长休）。
 *
 * @param maxByLevel - 环级 → 上限的映射，如 `{ '1': 4, '2': 3, '3': 2 }`
 * @returns 初始化后的法术位状态
 */
export function initSlots(maxByLevel: Record<string, number>): SpellSlotState {
  const state: SpellSlotState = {}
  for (const [level, max] of Object.entries(maxByLevel)) state[level] = { current: max, max }
  return state
}

/**
 * 调整某个环级的法术位上限。
 * 常用于升级场景。当前使用量超过新上限时会被截断。
 */
export function setSlotMax(state: SpellSlotState, level: string, max: number): SpellSlotState {
  const existingCurrent = state[level].current
  return { ...state, [level]: { current: Math.min(existingCurrent, max), max } }
}

/**
 * 长休：将所有环级的法术位恢复至上限。
 */
export function restSlots(state: SpellSlotState): SpellSlotState {
  const next: SpellSlotState = {}
  for (const [level, slot] of Object.entries(state))
    next[level] = { current: slot.max, max: slot.max }
  return next
}

/**
 * 消耗或恢复指定环级的法术位。
 * delta < 0 消耗（施法），delta > 0 恢复（特殊能力）。结果夹在 [0, max] 区间内。
 *
 * @throws {RangeError} 指定的环级未设置上限时抛出
 */
export function adjustSlot(state: SpellSlotState, level: string, delta: number): SpellSlotState {
  if (!Object.prototype.hasOwnProperty.call(state, level)) {
    throw new RangeError(`未设置 ${level} 环法术位上限`)
  }
  const slot = state[level]
  const current = Math.max(0, Math.min(slot.max, slot.current + delta))
  return { ...state, [level]: { current, max: slot.max } }
}
