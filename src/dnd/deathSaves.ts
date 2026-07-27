/**
 * D&D 5e 死亡豁免状态机。
 *
 * HP 降为 0 时进入昏迷，每回合投 d20：
 * 1 → 失败+2；2-9 → 失败+1；10-19 → 成功+1；20 → 恢复 1HP 并清空计数。
 * 累计成功 3 次则稳定，累计失败 3 次则死亡。
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
 * 调用方应按返回的 outcome 决定后续：
 * stabilized → 稳定退出；dead → 死亡；critical_success → 恢复 1HP 苏醒；其他 → 继续。
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
 * 判断昏迷状态下受到的伤害是否直接致死。
 * 溢出伤害 ≥ 最大 HP 时触发即死，无需经过死亡豁免流程。
 */
export function isInstantDeath(overkillDamage: number, hpMax: number): boolean {
  return overkillDamage >= hpMax
}

/**
 * 昏迷状态下受到未致死的过量伤害，自动折算为一次死亡豁免失败。
 * 若失败累计 ≥3 则角色死亡。
 */
export function applyDamageWhileUnconscious(state: DeathSaveState): {
  state: DeathSaveState
  dead: boolean
} {
  const failure = state.failure + 1
  return { state: { success: state.success, failure }, dead: failure >= 3 }
}
