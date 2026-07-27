/**
 * 跨模块共享类型定义，避免循环依赖。
 */

/**
 * 随机数源：返回 [0, 1) 区间浮点数的函数。
 * 默认使用 Math.random，可注入确定性序列（如 seedrandom）用于单元测试重现或骰娘回溯重放。
 */
export type RandomSource = () => number

/**
 * 检定结果等级。
 *
 * great_success — 大成功（房规边界判定）
 * extreme_success — 极难成功（roll ≤ skill/5）
 * hard_success — 困难成功（roll ≤ skill/2）
 * success — 普通成功（roll ≤ skill）
 * fail — 失败（roll > skill）
 * great_fail — 大失败（房规边界判定）
 */
export type CheckResult =
  'great_success' | 'extreme_success' | 'hard_success' | 'success' | 'fail' | 'great_fail'
