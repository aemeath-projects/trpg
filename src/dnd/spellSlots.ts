/**
 * D&D 5e 法术位（Spell Slots）纯计算模块。
 *
 * 管理各环级法术位的当前可使用数量和上限，支持：
 * - 初始化（按每环上限设置）
 * - 调整上限（如升级获得新法术位）
 * - 长休恢复（所有法术位恢复至上限）
 * - 消耗/恢复法术位（单环增减，受上限和 0 下界约束）
 *
 * 这是一个纯函数式状态管理模块，不涉及施法者等级计算（等级→法术位数量的映射由消费方负责）。
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
 *
 * 常用于升级场景（如从 2 环法术位变成 3 环法术位）。
 * 如果当前使用量超过新上限，会被截断到新上限值。
 *
 * @param state - 当前法术位状态
 * @param level - 环级标识（如 "1"、"2"）
 * @param max - 新的上限值
 * @returns 更新后的法术位状态（新对象，不修改原状态）
 */
export function setSlotMax(state: SpellSlotState, level: string, max: number): SpellSlotState {
  const existingCurrent = state[level].current
  return { ...state, [level]: { current: Math.min(existingCurrent, max), max } }
}

/**
 * 长休：将所有环级的法术位恢复至上限。
 *
 * @param state - 当前法术位状态
 * @returns 更新后的法术位状态（所有 current = max）
 */
export function restSlots(state: SpellSlotState): SpellSlotState {
  const next: SpellSlotState = {}
  for (const [level, slot] of Object.entries(state))
    next[level] = { current: slot.max, max: slot.max }
  return next
}

/**
 * 消耗或恢复指定环级的法术位。
 *
 * - `delta < 0`：消耗法术位（施法）
 * - `delta > 0`：恢复法术位（如特殊能力）
 * - 结果夹在 `[0, max]` 区间内
 *
 * @param state - 当前法术位状态
 * @param level - 环级标识（如 "1"、"2"）
 * @param delta - 变化量（正数为恢复，负数为消耗）
 * @returns 更新后的法术位状态（新对象，不修改原状态）
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
