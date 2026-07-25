import { describe, expect, it } from 'vitest'

import { computeDuration, end, pause, resume, start } from '../../../src/log'

describe('log 状态机', () => {
  it('start 应进入 recording 状态', () => {
    const state = start(1000)
    expect(state).toEqual({
      status: 'recording',
      startedAt: 1000,
      lastResumedAt: 1000,
      accumulatedMs: 0,
    })
  })

  it('pause 应结算当前 recording 区间并转为 paused', () => {
    const state = pause(start(1000), 5000)
    expect(state.status).toBe('paused')
    expect(state.accumulatedMs).toBe(4000)
  })

  it('resume 应重置 lastResumedAt 并转回 recording', () => {
    const paused = pause(start(1000), 5000)
    const resumed = resume(paused, 8000)
    expect(resumed.status).toBe('recording')
    expect(resumed.lastResumedAt).toBe(8000)
    expect(resumed.accumulatedMs).toBe(4000)
  })

  it('跨多次 pause/resume 应正确累计时长', () => {
    let state = start(0)
    state = pause(state, 1000) // 累计 1000
    state = resume(state, 2000)
    state = pause(state, 4000) // 累计 1000+2000=3000
    expect(state.accumulatedMs).toBe(3000)
  })

  it('对非 recording 状态调用 pause 应报错', () => {
    const paused = pause(start(0), 1000)
    expect(() => pause(paused, 2000)).toThrow(RangeError)
  })

  it('对非 paused 状态调用 resume 应报错', () => {
    expect(() => resume(start(0), 1000)).toThrow(RangeError)
  })

  it('end 应结算并转为 ended，之后再 end 应报错', () => {
    const ended = end(start(0), 3000)
    expect(ended.status).toBe('ended')
    expect(ended.accumulatedMs).toBe(3000)
    expect(ended.endedAt).toBe(3000)
    expect(() => end(ended, 4000)).toThrow(RangeError)
  })

  it('end 在 paused 状态下应直接使用已结算的累计值（不额外加 recording 区间）', () => {
    const paused = pause(start(1000), 5000) // accumulatedMs=4000
    const ended = end(paused, 9999)
    expect(ended.status).toBe('ended')
    expect(ended.accumulatedMs).toBe(4000) // 不额外加 now-lastResumedAt
    expect(ended.endedAt).toBe(9999)
  })

  it('computeDuration 在 recording 状态下应包含进行中的区间', () => {
    const state = start(1000)
    expect(computeDuration(state, 6000)).toBe(5000)
  })

  it('computeDuration 在 paused/ended 状态下应只返回已结算的累计值', () => {
    const paused = pause(start(0), 2000)
    expect(computeDuration(paused, 9999)).toBe(2000)
  })
})
