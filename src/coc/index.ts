/**
 * CoC（Call of Cthulhu / 克苏鲁的呼唤）规则集对外入口。
 *
 * 提供 CoC 6 版 / 7 版规则下的核心机制实现：
 * - **人物生成**：8 项基础属性 + 派生属性（{@link generateCharacter}）
 * - **房规判定**：8 种大成功/大失败边界规则（{@link judgeCoCResult}）
 * - **理智检定**：San Check + 神话淬炼（{@link applySanityCheck}）
 * - **成长检定**：幕间技能成长（{@link applyGrowthCheck}）
 * - **优势/劣势骰**：Bonus/Penalty d100（{@link rollBonusPenaltyD100}）
 * - **疯狂症状**：即时症状和总结症状（{@link drawInstantMadness}、{@link drawSummaryMadness}）
 * - **同义词表**：属性名归一化（{@link normalizeAttributeName}）
 *
 * @module coc
 */

export type { Houserule } from './houserules.js'
export { judgeCoCResult } from './houserules.js'

export type { CocRuleset, CocCharacterResult } from './chargen.js'
export { generateCharacter, lookupBuildAndDamageBonus } from './chargen.js'

export { normalizeAttributeName } from './synonyms.js'

export type { SanityCheckOutcome } from './sanity.js'
export { applySanityCheck } from './sanity.js'

export type { GrowthCheckOutcome } from './growth.js'
export { applyGrowthCheck } from './growth.js'

export { rollBonusPenaltyD100 } from './bonusPenalty.js'

export { drawInstantMadness, drawSummaryMadness } from './madness.js'
