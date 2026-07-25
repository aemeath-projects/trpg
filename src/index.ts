/**
 * Aemeath TRPG Engine 根入口。
 *
 * 提供引擎标识和公共类型重导出。各子模块（coc/dnd/dice/log/stats/decks）
 * 请从各自 subpath import 以支持 tree-shaking：
 *
 * ```ts
 * import { generateCharacter } from '@aemeath-projects/trpg/coc'
 * import { rollExpression } from '@aemeath-projects/trpg/dice'
 * ```
 *
 * @module trpg
 */

/** 引擎包名常量。 */
export const ENGINE_NAME = '@aemeath-projects/trpg'

export type { RandomSource, CheckResult } from './types/index.js'
