/**
 * D&D 5e 死亡豁免（Death Saving Throws）状态机。
 *
 * 当角色 HP 降为 0 时进入昏迷状态，每回合投一次 d20 进行死亡豁免检定。
 * 累计 3 次成功 → 稳定（stabilized），累计 3 次失败 → 死亡。
 *
 * ## 掷骰映射
 *
 * | d20 结果 | 效果 |
 * |----------|------|
 * | 1        | 大失败：失败 +2 |
 * | 2–9      | 失败：失败 +1 |
 * | 10–19    | 成功：成功 +1 |
 * | 20       | 大成功：恢复 1 HP，清空所有成功/失败计数 |
 */

import { rollDie } from '../dice'
import type { RandomSource } from '../types'

/** 死亡豁免状态：当前累计的成功/失败次数。 */
export interface DeathSaveState {
  /** 累计成功次数（0~3） */
  success: number
  /** 累计失败次数（0~3） */
  failure: number
}

/** 单次死亡豁免检定可能产生的所有结果类型。 */
export type DeathSaveOutcome =
  | 'critical_failure' // d20=1，失败+2
  | 'failure' // d20∈[2,9]，失败+1
  | 'success' // d20∈[10,19]，成功+1
  | 'critical_success' // d20=20，恢复1HP并清除状态
  | 'stabilized' // 累计成功≥3，稳定
  | 'dead' // 累计失败≥3，死亡

/** 单次死亡豁免掷骰的完整结果。 */
export interface DeathSaveRollResult {
  /** 更新后的死亡豁免状态 */
  state: DeathSaveState
  /** d20 掷骰结果 */
  roll: number
  /** 本次检定的结果类型 */
  outcome: DeathSaveOutcome
  /** 人类可读的掷骰明细 */
  detail: string
}

/**
 * 执行一次死亡豁免掷骰并更新状态。
 *
 * 调用方应在每次掷骰后检查返回的 `outcome`：
 * - `'stabilized'` → 角色稳定，退出死亡豁免流程
 * - `'dead'` → 角色死亡
 * - `'critical_success'` → 角色恢复 1 HP 并苏醒
 * - 其他 → 继续下一轮死亡豁免
 *
 * @param state - 当前的死亡豁免状态
 * @param rng - 随机数源，默认 `Math.random`
 * @returns 掷骰结果和更新后的状态
 */
export function applyDeathSaveRoll(
  state: DeathSaveState,
  rng: RandomSource = Math.random,
): DeathSaveRollResult {
  const roll = rollDie(20, rng)

  if (roll === 20) {
    return {
      state: { success: 0, failure: 0 },
      roll,
      outcome: 'critical_success',
      detail: `D20=${String(roll)}`,
    }
  }

  let next: DeathSaveState
  let baseOutcome: 'critical_failure' | 'failure' | 'success'
  if (roll === 1) {
    next = { success: state.success, failure: state.failure + 2 }
    baseOutcome = 'critical_failure'
  } else if (roll <= 9) {
    next = { success: state.success, failure: state.failure + 1 }
    baseOutcome = 'failure'
  } else {
    next = { success: state.success + 1, failure: state.failure }
    baseOutcome = 'success'
  }

  if (next.success >= 3) {
    return {
      state: { success: 0, failure: 0 },
      roll,
      outcome: 'stabilized',
      detail: `D20=${String(roll)}`,
    }
  }
  if (next.failure >= 3) {
    return { state: next, roll, outcome: 'dead', detail: `D20=${String(roll)}` }
  }
  return { state: next, roll, outcome: baseOutcome, detail: `D20=${String(roll)}` }
}

/**
 * 判断昏迷（HP=0）状态下受到的伤害是否直接致死。
 *
 * D&D 5e 规则：当单次攻击造成的溢出伤害 ≥ 角色最大 HP 时，
 * 角色直接死亡，无需经过死亡豁免流程。
 *
 * @param overkillDamage - 溢出伤害量（将 HP 从 0 打到负值的那部分伤害）
 * @param hpMax - 角色最大 HP
 * @returns 是否触发即死
 */
export function isInstantDeath(overkillDamage: number, hpMax: number): boolean {
  return overkillDamage >= hpMax
}

/**
 * 昏迷状态下受到未致死的过量伤害，自动折算为一次死亡豁免失败。
 *
 * D&D 5e 规则：昏迷角色受到伤害时，自动获得一次死亡豁免失败。
 * 如果该次失败导致累计失败 ≥ 3，角色死亡。
 *
 * @param state - 当前的死亡豁免状态
 * @returns 更新后的状态及是否死亡
 */
export function applyDamageWhileUnconscious(state: DeathSaveState): {
  state: DeathSaveState
  dead: boolean
} {
  const failure = state.failure + 1
  return { state: { success: state.success, failure }, dead: failure >= 3 }
}
