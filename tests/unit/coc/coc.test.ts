import { describe, expect, it } from 'vitest'

import {
  applyGrowthCheck,
  applySanityCheck,
  drawInstantMadness,
  drawSummaryMadness,
  generateCharacter,
  judgeCoCResult,
  lookupBuildAndDamageBonus,
  normalizeAttributeName,
  rollBonusPenaltyD100,
} from '../../../src/coc'
import type { RandomSource } from '../../../src/types'

function fixedSequence(values: number[]): RandomSource {
  let i = 0
  return () => {
    if (i >= values.length) throw new Error('test rng 序列已耗尽')
    return values[i++]
  }
}

describe('judgeCoCResult — C0 房规', () => {
  it('出 1 为大成功', () => {
    expect(judgeCoCResult(1, 50, 'C0')).toBe('great_success')
  })
  it('技能值不满 50 时出 96~100 为大失败', () => {
    expect(judgeCoCResult(96, 40, 'C0')).toBe('great_fail')
    expect(judgeCoCResult(100, 40, 'C0')).toBe('great_fail')
  })
  it('技能值满 50 时只有出 100 才是大失败', () => {
    expect(judgeCoCResult(96, 60, 'C0')).toBe('fail')
    expect(judgeCoCResult(100, 60, 'C0')).toBe('great_fail')
  })
  it('roll <= skillValue/5 为极难成功', () => {
    expect(judgeCoCResult(10, 50, 'C0')).toBe('extreme_success')
  })
  it('roll <= skillValue/2 为困难成功', () => {
    expect(judgeCoCResult(25, 50, 'C0')).toBe('hard_success')
  })
  it('roll <= skillValue 为普通成功', () => {
    expect(judgeCoCResult(45, 50, 'C0')).toBe('success')
  })
  it('roll > skillValue 为失败', () => {
    expect(judgeCoCResult(51, 50, 'C0')).toBe('fail')
  })
})

describe('judgeCoCResult — C1 房规', () => {
  it('技能值 >= 50 时 1~5 为大成功', () => {
    expect(judgeCoCResult(3, 60, 'C1')).toBe('great_success')
  })
  it('技能值 < 50 时只有 1 为大成功', () => {
    expect(judgeCoCResult(1, 40, 'C1')).toBe('great_success')
    expect(judgeCoCResult(3, 40, 'C1')).not.toBe('great_success')
  })
  it('技能值 >= 50 时只有 100 为大失败', () => {
    expect(judgeCoCResult(100, 60, 'C1')).toBe('great_fail')
    expect(judgeCoCResult(96, 60, 'C1')).not.toBe('great_fail')
  })
  it('技能值 < 50 时 96~100 为大失败', () => {
    expect(judgeCoCResult(96, 40, 'C1')).toBe('great_fail')
  })
})

describe('judgeCoCResult — C2 房规', () => {
  it('roll 在 1~5 且 <= 技能值为大成功', () => {
    expect(judgeCoCResult(3, 50, 'C2')).toBe('great_success')
  })
  it('roll 在 1~5 但 > 技能值不为大成功', () => {
    expect(judgeCoCResult(4, 3, 'C2')).not.toBe('great_success')
  })
  it('roll=100 为大失败', () => {
    expect(judgeCoCResult(100, 50, 'C2')).toBe('great_fail')
  })
  it('96~99 且 roll > 技能值为大失败', () => {
    expect(judgeCoCResult(97, 50, 'C2')).toBe('great_fail')
  })
})

describe('judgeCoCResult — C3 房规', () => {
  it('1~5 为大成功', () => {
    expect(judgeCoCResult(3, 50, 'C3')).toBe('great_success')
  })
  it('>=96 为大失败', () => {
    expect(judgeCoCResult(96, 50, 'C3')).toBe('great_fail')
  })
})

describe('judgeCoCResult — C4 房规', () => {
  it('roll 在 1~5 且 <= skillValue/10 为大成功', () => {
    expect(judgeCoCResult(5, 50, 'C4')).toBe('great_success')
  })
  it('roll 在 1~5 但 > skillValue/10 不为大成功', () => {
    expect(judgeCoCResult(5, 30, 'C4')).not.toBe('great_success')
  })
  it('技能值 >= 50 时 roll=100 为大失败', () => {
    expect(judgeCoCResult(100, 60, 'C4')).toBe('great_fail')
    expect(judgeCoCResult(99, 60, 'C4')).not.toBe('great_fail')
  })
  it('技能值 < 50 时 roll >= 96+skillValue/10 为大失败', () => {
    expect(judgeCoCResult(99, 30, 'C4')).toBe('great_fail')
  })
})

describe('judgeCoCResult — C5 房规', () => {
  it('roll 在 1~2 且 < skillValue/5 为大成功', () => {
    expect(judgeCoCResult(1, 50, 'C5')).toBe('great_success')
  })
  it('roll 在 1~2 但 >= skillValue/5 不为大成功', () => {
    expect(judgeCoCResult(2, 10, 'C5')).not.toBe('great_success')
  })
  it('技能值 >= 50 时 roll >= 99 为大失败', () => {
    expect(judgeCoCResult(99, 60, 'C5')).toBe('great_fail')
    expect(judgeCoCResult(98, 60, 'C5')).not.toBe('great_fail')
  })
  it('技能值 < 50 时 roll >= 96 为大失败', () => {
    expect(judgeCoCResult(96, 40, 'C5')).toBe('great_fail')
  })
})

describe('judgeCoCResult — C6 房规', () => {
  it('1~3 为大成功', () => {
    expect(judgeCoCResult(2, 50, 'C6')).toBe('great_success')
  })
  it('>=98 为大失败', () => {
    expect(judgeCoCResult(98, 50, 'C6')).toBe('great_fail')
  })
})

describe('judgeCoCResult — DeltaGreen 房规', () => {
  it('十位个位相同且 <= 技能值为大成功', () => {
    expect(judgeCoCResult(22, 50, 'DeltaGreen')).toBe('great_success')
  })
  it('十位个位相同且 > 技能值为大失败', () => {
    expect(judgeCoCResult(77, 50, 'DeltaGreen')).toBe('great_fail')
  })
})

describe('generateCharacter', () => {
  it('coc7：应生成 8 项特征 + HP/体格/伤害加值/MOV', () => {
    const result = generateCharacter('coc7', fixedSequence(Array(64).fill(0.5)))
    expect(Object.keys(result.attributes).sort()).toEqual(
      ['APP', 'CON', 'DEX', 'EDU', 'INT', 'POW', 'SIZ', 'STR'].sort(),
    )
    expect(result.hp).toBeGreaterThan(0)
    expect(result.build).toBeDefined()
    expect(result.damageBonus).toBeDefined()
    expect(result.mov).toBe(8)
  })

  it('coc6：只应生成 HP，不含体格/伤害加值/MOV', () => {
    const result = generateCharacter('coc6', fixedSequence(Array(64).fill(0.5)))
    expect(result.hp).toBeGreaterThan(0)
    expect(result.build).toBeUndefined()
    expect(result.damageBonus).toBeUndefined()
    expect(result.mov).toBeUndefined()
  })

  it('STR+SIZ 在 165~204 时应产出 build=2, damageBonus=+1D6', () => {
    // 使用高 rng 值使 STR 与 SIZ 接近最大 → STR+SIZ 进入 165-204 区间
    const result = generateCharacter('coc7', fixedSequence(Array(64).fill(0.999)))
    expect(result.build).toBe(2)
    expect(result.damageBonus).toBe('+1D6')
  })
})

describe('lookupBuildAndDamageBonus', () => {
  it('<=64 → build=-2, damageBonus=-2', () => {
    expect(lookupBuildAndDamageBonus(50)).toEqual({ build: -2, damageBonus: '-2' })
  })
  it('65~84 → build=-1, damageBonus=-1', () => {
    expect(lookupBuildAndDamageBonus(70)).toEqual({ build: -1, damageBonus: '-1' })
  })
  it('85~124 → build=0, damageBonus=0', () => {
    expect(lookupBuildAndDamageBonus(100)).toEqual({ build: 0, damageBonus: '0' })
  })
  it('125~164 → build=1, damageBonus=+1D4', () => {
    expect(lookupBuildAndDamageBonus(150)).toEqual({ build: 1, damageBonus: '+1D4' })
  })
  it('165~204 → build=2, damageBonus=+1D6', () => {
    expect(lookupBuildAndDamageBonus(180)).toEqual({ build: 2, damageBonus: '+1D6' })
  })
  it('>204 → build=3, damageBonus=+2D6', () => {
    expect(lookupBuildAndDamageBonus(210)).toEqual({ build: 3, damageBonus: '+2D6' })
  })
})

describe('normalizeAttributeName', () => {
  it('应将同义词归一化为规范名', () => {
    expect(normalizeAttributeName('str')).toBe('力量')
    expect(normalizeAttributeName('侦察')).toBe('侦查')
    expect(normalizeAttributeName('理智值')).toBe('理智')
  })
  it('未收录的名称应原样返回', () => {
    expect(normalizeAttributeName('手枪')).toBe('手枪')
  })
})

describe('applySanityCheck', () => {
  it('检定成功时应扣减 successExpr', () => {
    // roll=30（<=50，success），successExpr="1d4" 用 rng 第二个值求值
    const result = applySanityCheck(50, '1d4', '1d10', 'C0', 0, false, fixedSequence([0.3, 0]))
    expect(result.result).toBe('success')
    expect(result.loss).toBe(1) // 1d4 用 rng=0 → floor(0*4)+1=1
    expect(result.newSan).toBe(49)
    expect(result.mythosHardened).toBe(false)
  })

  it('大失败时应扣减失败表达式的理论最大值', () => {
    // roll=100，技能值 40（不满 50），C0 房规下 100 为大失败
    const result = applySanityCheck(40, '1d4', '1d10', 'C0', 0, false, fixedSequence([0.99]))
    expect(result.result).toBe('great_fail')
    expect(result.loss).toBe(10) // maxOfExpression('1d10') = 10
  })

  it('神话淬炼触发后损失减半（向下取整）', () => {
    // roll=60（>san=50，fail），克苏鲁神话值 55 > 50 触发淬炼；failExpr="1d10" 用 rng=0.29 → floor(0.29*10)+1=3，减半后 1
    const result = applySanityCheck(50, '1d4', '1d10', 'C0', 55, false, fixedSequence([0.6, 0.29]))
    expect(result.mythosHardened).toBe(true)
    expect(result.loss).toBe(1)
  })
})

describe('applyGrowthCheck', () => {
  it('roll > 技能值时应成长', () => {
    const result = applyGrowthCheck(50, fixedSequence([0.99, 0]))
    expect(result.grew).toBe(true)
    expect(result.newValue).toBe(51) // 50 + 1d10(rng=0)=1
  })
  it('roll <= 技能值且 < 96 时不应成长', () => {
    const result = applyGrowthCheck(50, fixedSequence([0.3]))
    expect(result.grew).toBe(false)
    expect(result.newValue).toBe(50)
  })
})

describe('rollBonusPenaltyD100', () => {
  it('优势骰应取最小十位数', () => {
    const result = rollBonusPenaltyD100(1, 'bonus', fixedSequence([0.33, 0.1]))
    expect(result.total).toBe(24)
  })
  it('劣势骰应取最大十位数', () => {
    const result = rollBonusPenaltyD100(1, 'penalty', fixedSequence([0.33, 0.1]))
    expect(result.total).toBe(34)
  })
  it('base=100 时应转换为 displayValue=0 处理十位拆分', () => {
    // base=100 → displayValue=0，十位=0，个位=0；bonus 候选十位 min(0,6)=0 → finalDisplay=0 → 100
    const result = rollBonusPenaltyD100(1, 'bonus', fixedSequence([0.99, 0.5]))
    expect(result.total).toBe(100)
  })
  it('额外 d10 掷出 10 时应映射为候选十位 0', () => {
    // base=51（十位=5，个位=1），额外 d10=10→候选十位0，bonus 取 min(5,0)=0 → finalDisplay=0*10+1=1
    const result = rollBonusPenaltyD100(1, 'bonus', fixedSequence([0.5, 0.99]))
    expect(result.total).toBe(1)
  })
  it('finalDisplay=0 时应映射回 100', () => {
    // base=1（displayValue=1，十位=0，个位=1），额外d10=1（候选十位1），bonus取最小=0 → finalDisplay=0*10+1=1...hmm
    // 需要个位为 0 且最优十位也为 0 才能让 finalDisplay=0
    // base=10（十位=1，个位=0），额外d10=1（候选十位1），bonus取最小=1 → finalDisplay=10
    // base=10，penalty 取最大=1 → finalDisplay=10
    // 要 finalDisplay=0：需要十位候选最小值为0且个位为0
    // base=1（displayValue=1，十位=0，个位=1）→ 不行，个位=1
    // base=10（displayValue=10，十位=1，个位=0），额外d10=10（候选十位0），penalty取最大=1 → finalDisplay=10
    // base=10，额外d10=10，bonus取最小=0 → finalDisplay=0*10+0=0 → 映射100
    const result = rollBonusPenaltyD100(1, 'bonus', fixedSequence([0.09, 0.99]))
    expect(result.total).toBe(100)
  })
  it('多个额外骰的优势应取所有候选十位中的最小值', () => {
    const result = rollBonusPenaltyD100(2, 'bonus', fixedSequence([0.5, 0.3, 0.9]))
    expect(result.rolls).toHaveLength(3)
  })
})

describe('madness', () => {
  it('drawInstantMadness 应返回非空字符串', () => {
    expect(drawInstantMadness(fixedSequence([0]))).toBeTruthy()
  })
  it('drawSummaryMadness 应按 d100 落在正确区间', () => {
    expect(drawSummaryMadness(fixedSequence([0]))).toContain('失忆')
    expect(drawSummaryMadness(fixedSequence([0.99]))).toContain('崩溃')
  })
  it('drawSummaryMadness 在 roll 超出区间时应抛出异常', () => {
    // rng=1.0 → roll=101，超出了 SUMMARY_MADNESS_TABLE 的 max=100 范围
    expect(() => drawSummaryMadness(() => 1.0)).toThrow('无法匹配疯狂症状')
  })
})
