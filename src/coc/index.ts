/**
 * CoC（Call of Cthulhu / 克苏鲁的呼唤）规则集入口。
 *
 * 提供 CoC 6/7 版核心机制：人物生成、房规判定、理智检定、成长检定、
 * 优势劣势骰、疯狂症状、同义词表。
 */

export type { Houserule } from './houserules.js'
export { judgeCoCResult } from './houserules.js'

export type { CocRuleset, CocCharacterResult } from './chargen.js'
export { generateCharacter, lookupBuildAndDamageBonus } from './chargen.js'

export { ALIAS_ENTRIES, normalizeAttributeName } from './synonyms.js'

export type { SanityCheckOutcome } from './sanity.js'
export { applySanityCheck } from './sanity.js'

export type { GrowthCheckOutcome } from './growth.js'
export { applyGrowthCheck } from './growth.js'

export { rollBonusPenaltyD100 } from './bonusPenalty.js'

export type { MadnessEntry } from './madness.js'
export { drawInstantMadness, drawSummaryMadness } from './madness.js'
