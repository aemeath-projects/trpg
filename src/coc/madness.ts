/**
 * 疯狂症状随机抽取。
 *
 * 提供即时症状（d10 等概率）和总结症状（d100 分段加权）两张表。
 * 内容自撰改编，不逐字引用规则书原文。
 */

import { draw } from '../decks'
import type { RandomSource } from '../types'

/** 疯狂症状条目，含简短名称与详细描述。 */
export interface MadnessEntry {
  readonly name: string
  readonly description: string
}

/** 即时疯狂症状表（10 条，d10 等概率抽取）。 */
const INSTANT_MADNESS_TABLE: readonly MadnessEntry[] = [
  { name: '失忆', description: '陷入失忆，忘记刚刚发生的一切，茫然地四处张望' },
  { name: '僵直', description: '因恐惧而当场僵直，无法动弹，直到威胁消失' },
  { name: '呓语', description: '语无伦次地喃喃自语，说着旁人无法理解的字句' },
  { name: '情绪失控', description: '突然放声大笑或大哭，情绪完全失控' },
  { name: '幻觉', description: '产生幻觉，看到或听到根本不存在的事物' },
  { name: '恐惧', description: '陷入强烈的恐惧，转身就想逃离现场' },
  { name: '颤抖', description: '身体不受控制地颤抖，无法完成任何精细动作' },
  { name: '错认', description: '将周围的人误认成早已过世的亲友，产生错误的执着' },
  { name: '偏执', description: '陷入偏执，怀疑身边所有人都想加害自己' },
  { name: '解离', description: '精神短暂"离线"，对外界毫无反应，如同灵魂出窍' },
]

/** 总结疯狂症状表（10 条，d100 分段加权抽取）。 */
const SUMMARY_MADNESS_TABLE: readonly ({ max: number } & MadnessEntry)[] = [
  { max: 10, name: '失忆症', description: '产生失忆症状，遗忘一段过去几天到几周的记忆' },
  {
    max: 20,
    name: '躯体化',
    description: '发展出躯体化症状，身体某部位出现说不清病因的疼痛或麻痹',
  },
  { max: 30, name: '偏执状态', description: '陷入偏执状态，对特定的人或组织产生根深蒂固的怀疑' },
  { max: 40, name: '人格解体', description: '出现人格解体，感觉自己的身体和精神像是脱离了一样' },
  { max: 50, name: '仪式行为', description: '沉迷于某种重复性的仪式行为，不做就浑身难受' },
  { max: 60, name: '恐惧症', description: '对某个特定事物（颜色/声音/气味等）产生强烈恐惧症' },
  { max: 70, name: '暴力冲动', description: '陷入间歇性的暴力冲动，需要极力克制才能不伤人' },
  { max: 80, name: '多重人格', description: '出现多重人格倾向，偶尔"切换"成另一个自称的身份' },
  { max: 90, name: '持续性幻觉', description: '产生持续性幻觉，能看见或听见不存在的东西' },
  { max: 100, name: '木僵', description: '精神彻底崩溃，陷入长期的木僵状态，需要专业救助' },
]

/**
 * 从即时疯狂表随机抽取一条症状（d10 等概率）。
 */
export function drawInstantMadness(rng: RandomSource = Math.random): MadnessEntry {
  return draw(INSTANT_MADNESS_TABLE, 1, rng)[0]
}

/**
 * 从总结疯狂表按 d100 分段加权抽取一条症状。
 *
 * @throws {Error} 掷骰结果无法匹配任何分段时抛出
 */
export function drawSummaryMadness(rng: RandomSource = Math.random): MadnessEntry {
  const roll = Math.floor(rng() * 100) + 1
  const entry = SUMMARY_MADNESS_TABLE.find((e) => roll <= e.max)
  if (!entry) {
    throw new Error(`无法匹配疯狂症状：roll=${String(roll)}`)
  }
  return { name: entry.name, description: entry.description }
}
