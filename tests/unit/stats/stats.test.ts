import { describe, expect, it } from 'vitest'

import { ENGINE_NAME } from '../../../src/index.js'
import { summarize } from '../../../src/stats'

describe('root exports', () => {
  it('ENGINE_NAME 应为 @aemeath-projects/trpg', () => {
    expect(ENGINE_NAME).toBe('@aemeath-projects/trpg')
  })
})

describe('summarize', () => {
  it('空记录应返回全 0 且成功率为 0', () => {
    const result = summarize([])
    expect(result).toEqual({
      total: 0,
      successCount: 0,
      successRate: 0,
      greatSuccessCount: 0,
      greatFailCount: 0,
    })
  })

  it('应正确统计成功率与大成功/大失败次数', () => {
    const result = summarize([
      { result: 'great_success' },
      { result: 'success' },
      { result: 'fail' },
      { result: 'great_fail' },
    ])
    expect(result.total).toBe(4)
    expect(result.successCount).toBe(2)
    expect(result.successRate).toBe(0.5)
    expect(result.greatSuccessCount).toBe(1)
    expect(result.greatFailCount).toBe(1)
  })
})
