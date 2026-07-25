/**
 * 跨模块共享类型定义。
 *
 * 所有子模块共用的基础类型集中定义于此，避免循环依赖。
 *
 * @module types
 */

/**
 * 随机数源：返回 [0, 1) 区间浮点数的函数。
 *
 * 默认使用 `Math.random`，可注入确定性序列（如 seedrandom）用于：
 * - 单元测试中的可重现结果
 * - 骰娘"回溯"功能中的重放模式
 */
export type RandomSource = () => number

/**
 * 检定结果等级（CoC 房规判定与骰点统计共用）。
 *
 * `extreme_success` / `hard_success` 均属于"成功"范畴内的更高档位，
 * 是否在回复文案里单独展示由消费方决定。
 *
 * ## 等级说明
 *
 * | 等级 | 含义 |
 * |------|------|
 * | `great_success` | 大成功（房规边界判定） |
 * | `extreme_success` | 极难成功（roll ≤ skill/5） |
 * | `hard_success` | 困难成功（roll ≤ skill/2） |
 * | `success` | 普通成功（roll ≤ skill） |
 * | `fail` | 失败（roll > skill） |
 * | `great_fail` | 大失败（房规边界判定） |
 */
export type CheckResult =
  'great_success' | 'extreme_success' | 'hard_success' | 'success' | 'fail' | 'great_fail'
