// tests/unit/dnd/dnd.test.ts
import { describe, expect, it } from 'vitest'

import {
  adjustSlot,
  applyDamageWhileUnconscious,
  applyDeathSaveRoll,
  computeEffectiveValue,
  computeSkillModifier,
  generateName,
  initSlots,
  isInstantDeath,
  restSlots,
  rollAbilityScoreSets,
  rollNamedAbilityScoreSets,
  setSlotMax,
} from '../../../src/dnd'
import type { RandomSource } from '../../../src/types'

function fixedSequence(values: number[]): RandomSource {
  let i = 0
  return () => {
    if (i >= values.length) throw new Error('test rng 序列已耗尽')
    return values[i++]
  }
}

describe('computeSkillModifier', () => {
  it('无熟练：只算属性调整值', () => {
    expect(computeSkillModifier(14, false, false, 2)).toBe(2) // floor((14-10)/2)=2
  })
  it('熟练：加一次熟练加值', () => {
    expect(computeSkillModifier(14, true, false, 2)).toBe(4)
  })
  it('专精：熟练加值翻倍', () => {
    expect(computeSkillModifier(14, true, true, 2)).toBe(6)
  })
})

describe('rollAbilityScoreSets / rollNamedAbilityScoreSets', () => {
  it('自由分配模式应生成 count 组、每组 6 项总和', () => {
    const sets = rollAbilityScoreSets(2, fixedSequence(Array(48).fill(0.5)))
    expect(sets).toHaveLength(2)
    expect(sets[0].values).toHaveLength(6)
    expect(sets[0].total).toBe(sets[0].values.reduce((a, b) => a + b, 0))
  })

  it('预设模式应按属性名标注全部 6 项', () => {
    const sets = rollNamedAbilityScoreSets(1, fixedSequence(Array(24).fill(0.5)))
    expect(Object.keys(sets[0].values).sort()).toEqual(
      ['体质', '力量', '感知', '敏捷', '智力', '魅力'].sort(),
    )
  })
})

describe('applyDeathSaveRoll', () => {
  it('roll=20 应恢复且清空状态', () => {
    const result = applyDeathSaveRoll({ success: 1, failure: 1 }, fixedSequence([0.99]))
    expect(result.outcome).toBe('critical_success')
    expect(result.state).toEqual({ success: 0, failure: 0 })
  })
  it('roll=1 应失败+2', () => {
    const result = applyDeathSaveRoll({ success: 0, failure: 0 }, fixedSequence([0]))
    expect(result.outcome).toBe('critical_failure')
    expect(result.state.failure).toBe(2)
  })
  it('累计 3 次成功应稳定并清空状态', () => {
    // roll=15 → floor(0.7*20)+1=15，属于成功区间
    const result = applyDeathSaveRoll({ success: 2, failure: 0 }, fixedSequence([0.7]))
    expect(result.outcome).toBe('stabilized')
    expect(result.state).toEqual({ success: 0, failure: 0 })
  })
  it('累计 3 次失败应死亡', () => {
    const result = applyDeathSaveRoll({ success: 0, failure: 2 }, fixedSequence([0.2])) // roll=5，失败区间
    expect(result.outcome).toBe('dead')
  })
})

describe('isInstantDeath / applyDamageWhileUnconscious', () => {
  it('过量伤害 >= 血量上限应直接死亡', () => {
    expect(isInstantDeath(12, 12)).toBe(true)
    expect(isInstantDeath(5, 12)).toBe(false)
  })
  it('未致死的过量伤害应折算为一次死亡豁免失败', () => {
    const result = applyDamageWhileUnconscious({ success: 0, failure: 2 })
    expect(result.state.failure).toBe(3)
    expect(result.dead).toBe(true)
  })
})

describe('法术位纯计算', () => {
  it('init/rest/adjust 应按预期变化', () => {
    let state = initSlots({ '1': 3, '2': 4 })
    expect(state['1']).toEqual({ current: 3, max: 3 })

    state = adjustSlot(state, '1', -1)
    expect(state['1']).toEqual({ current: 2, max: 3 })

    state = restSlots(state)
    expect(state['1']).toEqual({ current: 3, max: 3 })

    state = setSlotMax(state, '1', 5)
    expect(state['1']).toEqual({ current: 3, max: 5 })
  })

  it('adjust 未设置上限的环数应报错', () => {
    expect(() => adjustSlot({}, '3', -1)).toThrow(RangeError)
  })
})

describe('computeEffectiveValue', () => {
  it('应返回基础值加 buff', () => {
    expect(computeEffectiveValue(10, 6)).toBe(16)
  })
})

describe('generateName', () => {
  it('应生成指定数量的姓名', () => {
    const names = generateName('精灵', 3, fixedSequence(Array(9).fill(0)))
    expect(names).toHaveLength(3)
    expect(names[0].length).toBeGreaterThan(0)
  })
  it('未知种族应回退到默认音节库', () => {
    const names = generateName('龙裔', 1, fixedSequence([0, 0, 0]))
    expect(names).toHaveLength(1)
  })
})
