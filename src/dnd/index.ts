/**
 * D&D 5e（Dungeons & Dragons 5th Edition）规则集对外入口。
 *
 * 提供 D&D 5e 规则下的核心机制实现：
 * - **技能系统**：技能-属性映射表 + 调整值计算（{@link computeSkillModifier}）
 * - **人物生成**：4d6kh3 属性掷骰（{@link rollAbilityScoreSets}、{@link rollNamedAbilityScoreSets}）
 * - **死亡豁免**：状态机 + 即死判定（{@link applyDeathSaveRoll}）
 * - **法术位管理**：初始化/恢复/消耗（{@link initSlots}、{@link restSlots}、{@link adjustSlot}）
 * - **Buff 叠加**：临时属性修正（{@link computeEffectiveValue}）
 * - **随机姓名**：按种族音节拼接（{@link generateName}）
 *
 * @module dnd
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
