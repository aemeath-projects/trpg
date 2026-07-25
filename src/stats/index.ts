/**
 * 骰点统计聚合模块。
 *
 * 输入检定记录数组，输出成功率等统计信息。
 * 可用于骰娘指令的 `.stat` 统计功能——分析一段时间内的检定表现。
 */

import type { CheckResult } from '../types'

/** 单条检定记录。 */
export interface CheckRecord {
  /** 检定结果等级 */
  result: CheckResult
}

/** 检定统计摘要。 */
export interface CheckSummary {
  /** 检定总次数 */
  total: number
  /** 成功次数（含所有成功等级：大成功/极难成功/困难成功/普通成功） */
  successCount: number
  /** 成功率 = successCount / total（total=0 时返回 0） */
  successRate: number
  /** 大成功次数 */
  greatSuccessCount: number
  /** 大失败次数 */
  greatFailCount: number
}

/** 所有"成功"范畴的检定结果等级集合。 */
const SUCCESS_RESULTS = new Set<CheckResult>([
  'great_success',
  'extreme_success',
  'hard_success',
  'success',
])

/**
 * 对检定记录数组进行统计聚合。
 *
 * 统计维度：
 * - 总次数
 * - 成功次数及成功率
 * - 大成功次数
 * - 大失败次数
 *
 * @param records - 检定记录数组（可以是任意长度，包括空数组）
 * @returns 统计摘要；records 为空时 total=0, successRate=0
 *
 * @example
 * ```ts
 * const records = [
 *   { result: 'success' },
 *   { result: 'great_success' },
 *   { result: 'fail' },
 *   { result: 'hard_success' },
 * ]
 * const summary = summarize(records)
 * console.log(summary.successRate) // 0.75
 * console.log(summary.greatSuccessCount) // 1
 * ```
 */
export function summarize(records: readonly CheckRecord[]): CheckSummary {
  const total = records.length
  let successCount = 0
  let greatSuccessCount = 0
  let greatFailCount = 0

  for (const record of records) {
    if (SUCCESS_RESULTS.has(record.result)) successCount++
    if (record.result === 'great_success') greatSuccessCount++
    if (record.result === 'great_fail') greatFailCount++
  }

  return {
    total,
    successCount,
    successRate: total === 0 ? 0 : successCount / total,
    greatSuccessCount,
    greatFailCount,
  }
}
