import { gunzipSync } from 'fflate'
import { pack, unpack } from 'msgpackr'
import { describe, expect, it } from 'vitest'

import {
  STORY_EXTENSION,
  STORY_MAGIC,
  STORY_VERSION,
  StoryFormatError,
  assertValidV1Document,
  isSupportedStoryVersion,
  packStory,
  parseV1,
  readStoryHeader,
  unpackStory,
} from '../../../src/story'
import type { StoryCharacter, StoryDocument, StoryEntry } from '../../../src/story'

const START = 1_700_000_000_000

function makeDoc(overrides: Partial<StoryDocument> = {}): StoryDocument {
  return {
    meta: {
      logName: '深海余烬',
      createdBy: '10001',
      startedAt: START,
      endedAt: START + 7_200_000,
      durationMs: 5_400_000,
      entryCount: 2,
      exportedAt: START + 7_300_000,
      source: 'aemeath',
    },
    actors: [
      { id: '10001', name: 'KP老王', characterName: '守秘人' },
      {
        id: '10002',
        name: '调查员小李',
        characterName: '陈默',
        avatar: 'https://q.qlogo.cn/headimg_dl?dst_uin=10002&spec=100',
      },
    ],
    characters: [
      {
        name: '陈默',
        ruleset: 'coc7',
        owner: 1,
        attributes: { 力量: 50, 侦查: 65, san: 55 },
        houserule: 'coc7_house_a',
      },
    ],
    entries: [
      { offset: 0, actor: 1, type: 'message', text: '我推开那扇门。' },
      {
        offset: 3_000,
        actor: 0,
        type: 'roll',
        character: 0,
        text: '陈默 进行 侦查 检定：D100=23/60 困难成功',
        roll: {
          expression: '1d100',
          total: 23,
          detail: 'D100=23',
          rolls: [23],
          skill: '侦查',
          target: 60,
          outcome: 'hard_success',
        },
      },
    ],
    ...overrides,
  }
}

/** 构造一个只有 header 的字节流，用于篡改测试。 */
function headerOf(bytes: Uint8Array): Uint8Array {
  return bytes.slice(0, 8)
}

/** 模拟外部工具产出的未压缩归档：flags=0 + 裸标准 msgpack。 */
function buildUncompressedStory(doc: StoryDocument): Uint8Array {
  const payload = pack(doc)
  const out = new Uint8Array(8 + payload.length)
  out.set([0x53, 0x54, 0x4f, 0x52, 0x59], 0)
  out[5] = STORY_VERSION
  out[6] = 0 // 压缩算法 none
  out[7] = 0
  out.set(payload, 8)
  return out
}

describe('story 常量', () => {
  it('magic / version / 扩展名应稳定', () => {
    expect(STORY_MAGIC).toBe('STORY')
    expect(STORY_VERSION).toBe(1)
    expect(STORY_EXTENSION).toBe('.story')
  })
})

describe('packStory / unpackStory round-trip', () => {
  it('应无损还原完整文档', () => {
    const doc = makeDoc()
    const restored = unpackStory(packStory(doc))
    expect(restored).toEqual(doc)
  })

  it('应无损还原结构化骰点 payload', () => {
    const restored = unpackStory(packStory(makeDoc()))
    const rollEntry = restored.entries[1]
    expect(rollEntry?.roll).toEqual({
      expression: '1d100',
      total: 23,
      detail: 'D100=23',
      rolls: [23],
      skill: '侦查',
      target: 60,
      outcome: 'hard_success',
    })
  })

  it('多媒体应以占位符文本形式往返（格式层不存原始消息段）', () => {
    const doc = makeDoc({
      entries: [{ offset: 0, actor: 0, type: 'message', text: '看这个 [图片] @10002' }],
    })
    const restored = unpackStory(packStory(doc))
    expect(restored.entries[0]?.text).toBe('看这个 [图片] @10002')
  })

  it('空 entries 应可正常往返', () => {
    const doc = makeDoc({
      actors: [],
      characters: [],
      entries: [],
      meta: { ...makeDoc().meta, entryCount: 0 },
    })
    const restored = unpackStory(packStory(doc))
    expect(restored.entries).toEqual([])
    expect(restored.actors).toEqual([])
    expect(restored.characters).toEqual([])
  })

  it('参与者都没用卡时 characters 应为空数组', () => {
    const doc = makeDoc({
      characters: [],
      entries: [{ offset: 0, actor: 0, type: 'message', text: '纯聊天' }],
    })
    expect(unpackStory(packStory(doc)).characters).toEqual([])
  })

  it('人物卡快照与 entry 的 character 关联应无损往返', () => {
    const restored = unpackStory(packStory(makeDoc()))
    expect(restored.characters[0]).toEqual({
      name: '陈默',
      ruleset: 'coc7',
      owner: 1,
      attributes: { 力量: 50, 侦查: 65, san: 55 },
      houserule: 'coc7_house_a',
    })
    expect(restored.entries[1]?.character).toBe(0)
  })

  it('头像 URL 应无损往返', () => {
    const restored = unpackStory(packStory(makeDoc()))
    expect(restored.actors[1]?.avatar).toBe('https://q.qlogo.cn/headimg_dl?dst_uin=10002&spec=100')
    expect(restored.actors[0]).not.toHaveProperty('avatar')
  })

  it('相同输入应产出相同字节（gzip mtime 固定为 0）', () => {
    const a = packStory(makeDoc())
    const b = packStory(makeDoc())
    expect(Array.from(a)).toEqual(Array.from(b))
  })
})

describe('容器头', () => {
  it('前 8 字节应为 magic + version + flags + reserved', () => {
    const bytes = packStory(makeDoc())
    expect(Array.from(bytes.slice(0, 5))).toEqual([0x53, 0x54, 0x4f, 0x52, 0x59])
    expect(bytes[5]).toBe(STORY_VERSION)
    expect(bytes[7]).toBe(0)
  })

  it('readStoryHeader 应能只凭 8 字节读出头信息', () => {
    const header = readStoryHeader(headerOf(packStory(makeDoc())))
    expect(header.version).toBe(STORY_VERSION)
    expect(['none', 'gzip']).toContain(header.compression)
  })

  it('字节数不足 8 应抛 StoryFormatError', () => {
    expect(() => readStoryHeader(new Uint8Array([0x53, 0x54]))).toThrow(StoryFormatError)
  })

  it('magic 不匹配应抛 StoryFormatError', () => {
    const bytes = packStory(makeDoc())
    bytes[0] = 0x58
    expect(() => unpackStory(bytes)).toThrow(/magic 不匹配/u)
  })

  it('版本号为 0 应判非法', () => {
    const bytes = packStory(makeDoc())
    bytes[5] = 0
    expect(() => unpackStory(bytes)).toThrow(/版本号非法/u)
  })

  it('readStoryHeader 对超前版本不应抛错——能力判断归 unpackStory', () => {
    // 否则消费方无法「读头 → isSupportedStoryVersion 判断 → 决定是否解包」，读头就先炸了
    const bytes = packStory(makeDoc())
    bytes[5] = 99
    expect(readStoryHeader(bytes).version).toBe(99)
  })

  it('保留字节非 0 应拒绝', () => {
    const bytes = packStory(makeDoc())
    bytes[7] = 1
    expect(() => unpackStory(bytes)).toThrow(/保留字节非 0/u)
  })

  it('未知压缩算法应拒绝', () => {
    const bytes = packStory(makeDoc())
    bytes[6] = 0b10 // 编码 2 未定义
    expect(() => unpackStory(bytes)).toThrow(/未知的压缩算法/u)
  })
})

describe('版本分派', () => {
  it('当前版本应命中分派表并正常解析', () => {
    const doc = makeDoc()
    expect(isSupportedStoryVersion(STORY_VERSION)).toBe(true)
    expect(unpackStory(packStory(doc))).toEqual(doc)
  })

  it('超前版本应提示升级', () => {
    const bytes = packStory(makeDoc())
    bytes[5] = STORY_VERSION + 1
    expect(() => unpackStory(bytes)).toThrow(/由更新版本的程序生成.*请升级/su)
  })

  it('isSupportedStoryVersion 应只对已注册版本返回 true', () => {
    expect(isSupportedStoryVersion(0)).toBe(false)
    expect(isSupportedStoryVersion(1)).toBe(true)
    expect(isSupportedStoryVersion(STORY_VERSION + 1)).toBe(false)
    expect(isSupportedStoryVersion(99)).toBe(false)
  })

  // 注：「版本已不再受支持」分支（version < STORY_VERSION 且未注册）目前无法构造——
  // STORY_VERSION 为 1 时，0 会被 readStoryHeader 的合法性检查拦下，≥2 都走「请升级」。
  // 该分支要等到未来废弃某个旧版本（如 STORY_VERSION=3 且只注册 {2,3}）才可达，
  // 此处不写假装覆盖它的测试。
})

describe('压缩自适应', () => {
  it('大文档应走 gzip 且显著小于未压缩体积', () => {
    // 500 条高度重复的条目——跑团日志的典型形态，gzip 收益明显
    const entries: StoryEntry[] = Array.from({ length: 500 }, (_, i) => ({
      offset: i * 1_000,
      actor: i % 2,
      type: 'message' as const,
      text: '调查员们继续沿着走廊向前推进，墙上的壁画愈发诡异。',
    }))
    const bytes = packStory(makeDoc({ entries, meta: { ...makeDoc().meta, entryCount: 500 } }))

    expect(readStoryHeader(bytes).compression).toBe('gzip')
    // 未压缩时每条约 60+ 字节 UTF-8 文本，500 条远超 10KB
    expect(bytes.length).toBeLessThan(10_000)
    expect(unpackStory(bytes).entries).toHaveLength(500)
  })

  it('应能读回第三方生成的未压缩归档（flags=0）', () => {
    // packStory 自身几乎总会选中 gzip——meta 的字段名就足够可压缩。none 分支的实际价值
    // 在于消费外部工具生成的归档：其它语言的脚本想写 .story 但不愿引 gzip 依赖时，
    // 直接写 flags=0 + 裸 msgpack 即可，解包侧必须认。
    const doc = makeDoc()
    const uncompressed = buildUncompressedStory(doc)

    expect(readStoryHeader(uncompressed).compression).toBe('none')
    expect(unpackStory(uncompressed)).toEqual(doc)
  })
})

describe('标准 msgpack 互操作', () => {
  it('gzip 解开后的 payload 应能被裸 msgpack 解码器直接读回', () => {
    // 关闭了 msgpackr 的 useRecords / structuredClone 私有扩展，payload 必须是标准 msgpack，
    // 这是 .story 能被 Python / Go 等其它语言的 msgpack 库消费的前提
    const bytes = packStory(makeDoc())
    expect(readStoryHeader(bytes).compression).toBe('gzip')

    const payload = gunzipSync(bytes.subarray(8))
    expect(unpack(payload)).toEqual(makeDoc())
  })
})

describe('文档结构校验', () => {
  it('actor 下标越界应在打包时就被拦下', () => {
    const doc = makeDoc({
      actors: [{ id: '1', name: 'n' }],
      characters: [],
      entries: [{ offset: 0, actor: 5, type: 'message' }],
    })
    expect(() => packStory(doc)).toThrow(/entries\[0\]\.actor 下标越界/u)
  })

  it('缺少 meta 应拒绝打包', () => {
    const doc = { actors: [], characters: [], entries: [] } as unknown as StoryDocument
    expect(() => packStory(doc)).toThrow(/缺少 meta 段/u)
  })

  it('meta 必填字段类型错误应拒绝打包', () => {
    const doc = makeDoc()
    const broken = { ...doc, meta: { ...doc.meta, createdBy: 10_001 } } as unknown as StoryDocument
    expect(() => packStory(broken)).toThrow(/meta\.createdBy/u)
  })

  it('meta 缺少 source 应拒绝打包', () => {
    const doc = makeDoc()
    const { source: _source, ...metaWithoutSource } = doc.meta
    const broken = { ...doc, meta: metaWithoutSource } as unknown as StoryDocument
    expect(() => packStory(broken)).toThrow(/meta\.source/u)
  })

  it('entries 不是数组应拒绝打包', () => {
    const doc = { ...makeDoc(), entries: 'nope' } as unknown as StoryDocument
    expect(() => packStory(doc)).toThrow(/entries 段缺失或不是数组/u)
  })

  it('entry 缺少 offset 应拒绝打包', () => {
    const doc = makeDoc({
      actors: [{ id: '1', name: 'n' }],
      characters: [],
      entries: [{ actor: 0, type: 'message' } as unknown as StoryEntry],
    })
    expect(() => packStory(doc)).toThrow(/offset 缺失或不是数字/u)
  })

  it('characters 不是数组应拒绝打包', () => {
    const doc = { ...makeDoc(), characters: 'nope' } as unknown as StoryDocument
    expect(() => packStory(doc)).toThrow(/characters 段缺失或不是数组/u)
  })

  it('character.owner 下标越界应在打包时就被拦下', () => {
    const doc = makeDoc({
      actors: [{ id: '1', name: 'n' }],
      characters: [{ name: '陈默', ruleset: 'coc7', owner: 3, attributes: {} }],
      entries: [{ offset: 0, actor: 0, type: 'message' }],
    })
    expect(() => packStory(doc)).toThrow(/characters\[0\]\.owner 下标越界/u)
  })

  it('character 缺少 ruleset 应拒绝打包', () => {
    const doc = makeDoc({
      characters: [{ name: '陈默', owner: 0, attributes: {} } as unknown as StoryCharacter],
    })
    expect(() => packStory(doc)).toThrow(/characters\[0\]\.ruleset/u)
  })

  it('entry.character 下标越界应在打包时就被拦下', () => {
    const doc = makeDoc({
      characters: [],
      entries: [{ offset: 0, actor: 0, type: 'roll', character: 0 }],
    })
    expect(() => packStory(doc)).toThrow(/entries\[0\]\.character 下标越界/u)
  })

  it('character 缺少 name 应拒绝打包', () => {
    const doc = makeDoc({
      characters: [
        { ruleset: 'coc7', owner: 0, attributes: { 力量: 50 } } as unknown as StoryCharacter,
      ],
    })
    expect(() => packStory(doc)).toThrow(/characters\[0\]\.name/u)
  })

  it('character.attributes 缺失或不是对象应拒绝打包', () => {
    const doc = makeDoc({
      characters: [{ name: '陈默', ruleset: 'coc7', owner: 0 } as unknown as StoryCharacter],
    })
    expect(() => packStory(doc)).toThrow(/characters\[0\]\.attributes/u)
  })

  it('characters 数组中条目不是对象应拒绝打包', () => {
    const doc = makeDoc({
      characters: ['not_an_object' as unknown as StoryCharacter],
    })
    expect(() => packStory(doc)).toThrow(/characters\[0\] 不是对象/u)
  })

  it('entries 数组中条目不是对象应拒绝打包', () => {
    // 绕过 TypeScript 类型系统传入非法条目
    const doc = makeDoc({
      actors: [{ id: '1', name: 'n' }],
      characters: [],
      entries: [null as unknown as StoryEntry],
    })
    expect(() => packStory(doc)).toThrow(/entries\[0\] 不是对象/u)
  })

  it('下标为非整数应被拦下', () => {
    const doc = makeDoc({
      actors: [{ id: '1', name: 'n' }],
      characters: [],
      entries: [{ offset: 0, actor: 1.5, type: 'message' } as unknown as StoryEntry],
    })
    expect(() => packStory(doc)).toThrow(/不是非负整数/u)
  })

  it('下标为负数应被拦下', () => {
    const doc = makeDoc({
      actors: [{ id: '1', name: 'n' }],
      characters: [],
      entries: [{ offset: 0, actor: -1, type: 'message' } as unknown as StoryEntry],
    })
    expect(() => packStory(doc)).toThrow(/不是非负整数/u)
  })

  it('meta 不是对象应拒绝打包', () => {
    const doc = {
      meta: 'not_an_object',
      actors: [],
      characters: [],
      entries: [],
    } as unknown as StoryDocument
    expect(() => packStory(doc)).toThrow(/缺少 meta 段/u)
  })
})

describe('assertValidV1Document — 边界情况', () => {
  it('doc 为 null 应抛出 StoryFormatError', () => {
    expect(() => assertValidV1Document(null)).toThrow(/内容不是对象/u)
  })

  it('doc 为原始类型应抛出 StoryFormatError', () => {
    expect(() => assertValidV1Document(42)).toThrow(/内容不是对象/u)
  })
})

describe('解压失败', () => {
  it('gzip 数据损坏应抛出解压失败错误', () => {
    const bytes = packStory(makeDoc())
    // 破坏 gzip payload（头部之后的内容）
    for (let i = 8; i < Math.min(bytes.length, 20); i++) {
      bytes[i] = 0xff
    }
    expect(() => unpackStory(bytes)).toThrow(/解压失败/u)
  })
})

describe('parseV1 — msgpack 解码失败', () => {
  it('损坏的 msgpack 数据应被捕获并给出明确报错', () => {
    const corrupted = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff])
    expect(() => parseV1(corrupted)).toThrow(/解码失败/u)
  })
})

describe('文档结构校验 — 补充边界', () => {
  it('meta 为 null 应拒绝打包', () => {
    const doc = {
      meta: null,
      actors: [],
      characters: [],
      entries: [],
    } as unknown as StoryDocument
    expect(() => packStory(doc)).toThrow(/缺少 meta 段/u)
  })

  it('meta.startedAt 不是数字应拒绝打包', () => {
    const doc = makeDoc()
    const broken = {
      ...doc,
      meta: { ...doc.meta, startedAt: '2024-01-01' },
    } as unknown as StoryDocument
    expect(() => packStory(broken)).toThrow(/meta\.startedAt/u)
  })

  it('meta 不含 createdBy 时 startedAt 类型检查不受影响', () => {
    const doc = makeDoc()
    const broken = {
      ...doc,
      meta: { logName: 'test', source: 'test', startedAt: 'not-a-number' },
    } as unknown as StoryDocument
    expect(() => packStory(broken)).toThrow(/meta\.createdBy/u)
  })
})
