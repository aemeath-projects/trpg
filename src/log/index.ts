/**
 * 跑团日志时间戳状态机。
 *
 * 这是一个纯 reducer 模块——不感知"群"、"日志名"等业务概念，
 * 消费方负责把持久化字段映射成 {@link LogState}，调用对应函数后写回数据库。
 *
 * ## 状态转换
 *
 * ```
 * recording ──pause()──▶ paused ──resume()──▶ recording
 *      │                                      │
 *      └────────── end() ──────▶ ended ◀──────┘
 * ```
 *
 * ## accumulatedMs 语义
 *
 * `accumulatedMs` 是"已确认结算的累计记录时长"：
 * - `pause()` 时结算当前 recording 区间并累加
 * - `end()` 时结算当前 recording 区间并累加
 * - 仍处于 `recording` 状态时的"进行中"时长只在 {@link computeDuration} 里临时计算，不写回持久化字段
 */

/** 日志状态标识。 */
export type LogStatus = 'recording' | 'paused' | 'ended'

/** 日志持久化状态——消费方自行决定如何存储（数据库字段 / JSON 等）。 */
export interface LogState {
  /** 当前状态 */
  status: LogStatus
  /** 日志首次启动的时间戳（ms） */
  startedAt: number
  /** 最近一次从暂停恢复的时间戳（ms） */
  lastResumedAt: number
  /** 已确认结算的累计有效记录时长（ms） */
  accumulatedMs: number
  /** 日志结束时间戳（ms），仅 status=ended 时有值 */
  endedAt?: number
}

/**
 * 启动新日志。
 *
 * 初始状态为 `recording`，`lastResumedAt` 和 `startedAt` 均设为当前时间。
 *
 * @param now - 当前时间戳（ms）
 * @returns 初始日志状态
 */
export function start(now: number): LogState {
  return { status: 'recording', startedAt: now, lastResumedAt: now, accumulatedMs: 0 }
}

/**
 * 暂停日志记录。
 *
 * 结算当前 recording 区间（`now - lastResumedAt`）并累加到 `accumulatedMs`。
 *
 * @param state - 当前日志状态
 * @param now - 当前时间戳（ms）
 * @returns 更新后的日志状态
 * @throws {RangeError} 当前状态不是 `recording` 时抛出
 */
export function pause(state: LogState, now: number): LogState {
  if (state.status !== 'recording') {
    throw new RangeError(`日志当前状态为 ${state.status}，无法暂停`)
  }
  return {
    ...state,
    status: 'paused',
    accumulatedMs: state.accumulatedMs + (now - state.lastResumedAt),
  }
}

/**
 * 恢复日志记录。
 *
 * 将 `lastResumedAt` 重置为当前时间，状态切回 `recording`。
 *
 * @param state - 当前日志状态
 * @param now - 当前时间戳（ms）
 * @returns 更新后的日志状态
 * @throws {RangeError} 当前状态不是 `paused` 时抛出
 */
export function resume(state: LogState, now: number): LogState {
  if (state.status !== 'paused') {
    throw new RangeError(`日志当前状态为 ${state.status}，无法恢复`)
  }
  return { ...state, status: 'recording', lastResumedAt: now }
}

/**
 * 结束日志记录。
 *
 * 如果当前为 `recording` 状态，先结算当前区间后再结束。
 * 如果当前为 `paused` 状态，直接结束（无需额外结算）。
 *
 * @param state - 当前日志状态
 * @param now - 当前时间戳（ms）
 * @returns 更新后的日志状态
 * @throws {RangeError} 日志已经处于 `ended` 状态时抛出
 */
export function end(state: LogState, now: number): LogState {
  if (state.status === 'ended') {
    throw new RangeError('日志已经结束')
  }
  const accumulatedMs =
    state.status === 'recording'
      ? state.accumulatedMs + (now - state.lastResumedAt)
      : state.accumulatedMs
  return { ...state, status: 'ended', accumulatedMs, endedAt: now }
}

/**
 * 计算截至 now 的累计有效记录时长。
 *
 * 若当前为 `recording` 状态，会将进行中区间也计入（但**不**修改持久化字段）。
 * 若已暂停或结束，直接返回 `accumulatedMs`。
 *
 * @param state - 当前日志状态
 * @param now - 当前时间戳（ms）
 * @returns 累计有效记录时长（ms）
 */
export function computeDuration(state: LogState, now: number): number {
  if (state.status === 'recording') return state.accumulatedMs + (now - state.lastResumedAt)
  return state.accumulatedMs
}
