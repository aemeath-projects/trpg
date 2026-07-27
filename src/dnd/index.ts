/**
 * D&D 5e 规则集入口。
 *
 * 提供技能系统、人物生成、死亡豁免、法术位管理、Buff 叠加、随机姓名。
 */

export { SKILL_TABLE, computeSkillModifier } from './skills.js'

export type { AbilityScoreSet, NamedAbilityScoreSet } from './chargen.js'
export { rollAbilityScoreSets, rollNamedAbilityScoreSets } from './chargen.js'

export type { DeathSaveState, DeathSaveOutcome, DeathSaveRollResult } from './deathSaves.js'
export { applyDeathSaveRoll, isInstantDeath, applyDamageWhileUnconscious } from './deathSaves.js'

export type { SpellSlotState } from './spellSlots.js'
export { initSlots, setSlotMax, restSlots, adjustSlot } from './spellSlots.js'

export { computeEffectiveValue } from './buff.js'

export { generateName } from './names.js'
