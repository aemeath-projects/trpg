/**
 * 疯狂症状随机抽取。
 *
 * 提供即时症状（d10 等概率）和总结症状（d100 分段加权）两张表。
 * 内容自撰改编，不逐字引用规则书原文。
 */

import { draw } from '../decks'
import type { RandomSource } from '../types'

/** 即时疯狂症状表（10 条，d10 等概率抽取）。 */
const INSTANT_MADNESS_TABLE: readonly string[] = [
  '陷入失忆，忘记刚刚发生的一切，茫然地四处张望',
  '因恐惧而当场僵直，无法动弹，直到威胁消失',
  '语无伦次地喃喃自语，说着旁人无法理解的字句',
  '突然放声大笑或大哭，情绪完全失控',
  '产生幻觉，看到或听到根本不存在的事物',
  '陷入强烈的恐惧，转身就想逃离现场',
  '身体不受控制地颤抖，无法完成任何精细动作',
  '将周围的人误认成早已过世的亲友，产生错误的执着',
  '陷入偏执，怀疑身边所有人都想加害自己',
  '精神短暂"离线"，对外界毫无反应，如同灵魂出窍',
]

/** 总结疯狂症状表（10 条，d100 分段加权抽取）。 */
const SUMMARY_MADNESS_TABLE: readonly { max: number; text: string }[] = [
  { max: 10, text: '产生失忆症状，遗忘一段过去几天到几周的记忆' },
  { max: 20, text: '发展出躯体化症状，身体某部位出现说不清病因的疼痛或麻痹' },
  { max: 30, text: '陷入偏执状态，对特定的人或组织产生根深蒂固的怀疑' },
  { max: 40, text: '出现人格解体，感觉自己的身体和精神像是脱离了一样' },
  { max: 50, text: '沉迷于某种重复性的仪式行为，不做就浑身难受' },
  { max: 60, text: '对某个特定事物（颜色/声音/气味等）产生强烈恐惧症' },
  { max: 70, text: '陷入间歇性的暴力冲动，需要极力克制才能不伤人' },
  { max: 80, text: '出现多重人格倾向，偶尔"切换"成另一个自称的身份' },
  { max: 90, text: '产生持续性幻觉，能看见或听见不存在的东西' },
  { max: 100, text: '精神彻底崩溃，陷入长期的木僵状态，需要专业救助' },
]

/**
 * 从即时疯狂表随机抽取一条症状（d10 等概率）。
 */
export function drawInstantMadness(rng: RandomSource = Math.random): string {
  return draw(INSTANT_MADNESS_TABLE, 1, rng)[0]
}

/**
 * 从总结疯狂表按 d100 分段加权抽取一条症状。
 *
 * @throws {Error} 掷骰结果无法匹配任何分段时抛出
 */
export function drawSummaryMadness(rng: RandomSource = Math.random): string {
  const roll = Math.floor(rng() * 100) + 1
  const entry = SUMMARY_MADNESS_TABLE.find((e) => roll <= e.max)
  if (!entry) {
    throw new Error(`无法匹配疯狂症状：roll=${String(roll)}`)
  }
  return entry.text
}
