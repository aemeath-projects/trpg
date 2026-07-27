/**
 * D&D 随机姓名生成器。
 *
 * 按种族提供音节片段（首/中/尾），随机拼接生成角色名。
 * 支持人类、精灵、矮人、半身人，未收录种族回退为人类音节。
 * 自撰音节表，不使用固定名字名单。
 */

import type { RandomSource } from '../types'

/** 音节片段集合：首音节、中音节、尾音节各一组。 */
interface SyllableSet {
  lead: string[]
  mid: string[]
  tail: string[]
}

/** 各种族的音节片段表。 */
const RACE_SYLLABLES: Record<string, SyllableSet> = {
  人类: {
    lead: ['艾', '瑞', '凯', '莉', '奥', '塞'],
    mid: ['蒙', '拉', '文', '莎', '诺'],
    tail: ['德', '娜', '斯', '恩', '亚'],
  },
  精灵: {
    lead: ['西', '菲', '瑟', '琳', '艾'],
    mid: ['尔', '拉', '安'],
    tail: ['雅', '恩', '尔'],
  },
  矮人: {
    lead: ['托', '布', '格', '多'],
    mid: ['林', '罗', '刚'],
    tail: ['森', '克', '德'],
  },
  半身人: {
    lead: ['波', '皮', '罗'],
    mid: ['多', '宾'],
    tail: ['克', '文', '福'],
  },
}

/** 未收录种族的回退音节表（人类）。 */
const DEFAULT_SYLLABLES = RACE_SYLLABLES['人类']

/**
 * 按指定种族生成随机角色名。
 * 随机选取首音节 + 中音节 + 尾音节拼接，每名字 3 个音节。
 *
 * @param race - 种族中文名，未收录种族回退为人类音节
 * @param count - 生成数量
 * @param rng - 随机数源，默认 Math.random
 * @returns 生成的名字数组
 */
export function generateName(
  race: string,
  count: number,
  rng: RandomSource = Math.random,
): string[] {
  const syllables = RACE_SYLLABLES[race] ?? DEFAULT_SYLLABLES
  const names: string[] = []
  for (let i = 0; i < count; i++) {
    const lead = syllables.lead[Math.floor(rng() * syllables.lead.length)]
    const mid = syllables.mid[Math.floor(rng() * syllables.mid.length)]
    const tail = syllables.tail[Math.floor(rng() * syllables.tail.length)]
    names.push(lead + mid + tail)
  }
  return names
}
