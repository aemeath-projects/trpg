import { describe, expect, it, vi } from 'vitest'

import {
  MIN_PASSWORD_LENGTH,
  NONCE_SIZE,
  SALT_SIZE,
  STORY_VERSION,
  StoryDecryptError,
  StoryFormatError,
  decryptPayload,
  isStoryEncrypted,
  packStory,
  packStoryEncrypted,
  readStoryHeader,
  unpackStory,
  unpackStoryEncrypted,
} from '../../../src/story'
import type { StoryDocument } from '../../../src/story'

const START = 1_700_000_000_000
const PASSWORD = 'correct horse battery'
const HEADER_SIZE = 8

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
      source: 'Aemeath TRPG',
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
    characters: [{ name: '陈默', ruleset: 'coc7', owner: 1, attributes: { 力量: 50, san: 55 } }],
    entries: [
      { offset: 0, actor: 1, type: 'message', text: '我推开那扇门。' },
      {
        offset: 3_000,
        actor: 0,
        type: 'roll',
        text: '陈默 侦查 检定：D100=23/60 困难成功',
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

describe('加密往返', () => {
  it('应无损还原完整文档', async () => {
    const doc = makeDoc()
    const bytes = await packStoryEncrypted(doc, PASSWORD)
    expect(await unpackStoryEncrypted(bytes, PASSWORD)).toEqual(doc)
  })

  it('容器头应标记 encrypted 且版本不变', async () => {
    // 加密与格式演进正交：同一 v1 文档结构，只是外层多一道封装，故用 flags 位而非版本号
    const bytes = await packStoryEncrypted(makeDoc(), PASSWORD)
    const header = readStoryHeader(bytes)

    expect(header.encrypted).toBe(true)
    expect(header.version).toBe(STORY_VERSION)
    expect(isStoryEncrypted(bytes)).toBe(true)
  })

  it('未加密归档的 encrypted 应为 false', () => {
    const bytes = packStory(makeDoc())
    expect(readStoryHeader(bytes).encrypted).toBe(false)
    expect(isStoryEncrypted(bytes)).toBe(false)
  })

  it('salt 与 nonce 应每次随机——同一文档同一口令两次产出不同字节', async () => {
    const a = await packStoryEncrypted(makeDoc(), PASSWORD)
    const b = await packStoryEncrypted(makeDoc(), PASSWORD)
    expect(Array.from(a)).not.toEqual(Array.from(b))
    // 但都能正确解开
    expect(await unpackStoryEncrypted(a, PASSWORD)).toEqual(await unpackStoryEncrypted(b, PASSWORD))
  })

  it('字节布局应为 头(8) + salt(16) + nonce(12) + 密文', async () => {
    const bytes = await packStoryEncrypted(makeDoc(), PASSWORD)
    expect(bytes.length).toBeGreaterThan(HEADER_SIZE + SALT_SIZE + NONCE_SIZE)
  })

  it('明文不应出现在密文里', async () => {
    const bytes = await packStoryEncrypted(makeDoc(), PASSWORD)
    const asText = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    expect(asText).not.toContain('深海余烬')
    expect(asText).not.toContain('调查员小李')
  })
})

describe('解密失败', () => {
  it('错口令应抛 StoryDecryptError', async () => {
    const bytes = await packStoryEncrypted(makeDoc(), PASSWORD)
    await expect(unpackStoryEncrypted(bytes, 'wrong password')).rejects.toBeInstanceOf(
      StoryDecryptError,
    )
  })

  it('错口令的报错应提示口令可能输错', async () => {
    const bytes = await packStoryEncrypted(makeDoc(), PASSWORD)
    await expect(unpackStoryEncrypted(bytes, 'wrong password')).rejects.toThrow(/口令错误/u)
  })

  it('篡改密文应被 GCM 认证标签拦下', async () => {
    const bytes = await packStoryEncrypted(makeDoc(), PASSWORD)
    bytes[bytes.length - 1] ^= 0xff
    await expect(unpackStoryEncrypted(bytes, PASSWORD)).rejects.toBeInstanceOf(StoryDecryptError)
  })

  it('篡改 salt 应导致解密失败', async () => {
    const bytes = await packStoryEncrypted(makeDoc(), PASSWORD)
    bytes[HEADER_SIZE] ^= 0xff
    await expect(unpackStoryEncrypted(bytes, PASSWORD)).rejects.toBeInstanceOf(StoryDecryptError)
  })

  it('篡改 nonce 应导致解密失败', async () => {
    const bytes = await packStoryEncrypted(makeDoc(), PASSWORD)
    bytes[HEADER_SIZE + SALT_SIZE] ^= 0xff
    await expect(unpackStoryEncrypted(bytes, PASSWORD)).rejects.toBeInstanceOf(StoryDecryptError)
  })

  it('StoryDecryptError 应可被笼统的 StoryFormatError catch 住', async () => {
    // 继承关系让「只想知道归档读不了」的调用方不必列举两种异常类型
    const bytes = await packStoryEncrypted(makeDoc(), PASSWORD)
    await expect(unpackStoryEncrypted(bytes, 'wrong password')).rejects.toBeInstanceOf(
      StoryFormatError,
    )
  })

  it('截断的加密文件（缺 salt/nonce）应给出明确报错', async () => {
    const bytes = await packStoryEncrypted(makeDoc(), PASSWORD)
    const truncated = bytes.slice(0, HEADER_SIZE + 4)
    await expect(unpackStoryEncrypted(truncated, PASSWORD)).rejects.toThrow(/已截断/u)
  })
})

describe('口令长度校验', () => {
  it('过短口令应拒绝加密', async () => {
    await expect(packStoryEncrypted(makeDoc(), 'short')).rejects.toThrow(
      new RegExp(`至少需要 ${String(MIN_PASSWORD_LENGTH)} 个字符`, 'u'),
    )
  })

  it('过短口令应在解密时提前失败，不白跑 KDF', async () => {
    const bytes = await packStoryEncrypted(makeDoc(), PASSWORD)
    await expect(unpackStoryEncrypted(bytes, 'x')).rejects.toThrow(/至少需要/u)
  })

  it('恰好达到最小长度的口令应通过', async () => {
    const password = 'a'.repeat(MIN_PASSWORD_LENGTH)
    const bytes = await packStoryEncrypted(makeDoc(), password)
    expect(await unpackStoryEncrypted(bytes, password)).toEqual(makeDoc())
  })
})

describe('同步 / 异步 API 的分派', () => {
  it('同步 unpackStory 遇到加密归档应给出引导性报错', async () => {
    // 而不是把密文交给 msgpack 解码器啃出一句莫名的 decode 失败
    const bytes = await packStoryEncrypted(makeDoc(), PASSWORD)
    expect(() => unpackStory(bytes)).toThrow(/已加密.*unpackStoryEncrypted/su)
  })

  it('异步 unpackStoryEncrypted 遇到未加密归档应引导用同步 API', async () => {
    const bytes = packStory(makeDoc())
    await expect(unpackStoryEncrypted(bytes, PASSWORD)).rejects.toThrow(/未加密.*unpackStory/su)
  })

  it('未加密归档仍可被同步 API 读取（向后兼容）', () => {
    const doc = makeDoc()
    expect(unpackStory(packStory(doc))).toEqual(doc)
  })
})

describe('flags 未定义位', () => {
  it('bit3-7 置位应被拒绝', () => {
    // 将来再加第三个 flag 时，本版本程序会明确失败而非把新格式当老格式读
    const bytes = packStory(makeDoc())
    bytes[6] |= 0b0000_1000
    expect(() => readStoryHeader(bytes)).toThrow(/未定义的位/u)
  })

  it('最高位置位同样应被拒绝', () => {
    const bytes = packStory(makeDoc())
    bytes[6] |= 0b1000_0000
    expect(() => readStoryHeader(bytes)).toThrow(/未定义的位/u)
  })

  it('加密位与压缩位共存应正常解析', async () => {
    const bytes = await packStoryEncrypted(makeDoc(), PASSWORD)
    const header = readStoryHeader(bytes)
    expect(header.encrypted).toBe(true)
    // 文档足够大，压缩位应为 gzip
    expect(header.compression).toBe('gzip')
  })
})

describe('WebCrypto 不可用时的报错', () => {
  it('解密时环境不支持 WebCrypto 应给出可操作的报错', async () => {
    // 模拟浏览器非安全上下文：crypto.subtle 为 undefined
    // 这是类型声明与运行时的真实脱节——Node 永远有 subtle，但前端 http 页面没有
    const originalCrypto = globalThis.crypto
    try {
      vi.stubGlobal('crypto', { ...originalCrypto, subtle: undefined })

      const salt = new Uint8Array(SALT_SIZE)
      const nonce = new Uint8Array(NONCE_SIZE)
      const ciphertext = new Uint8Array(32)

      await expect(decryptPayload({ salt, nonce, ciphertext }, 'valid_password')).rejects.toThrow(
        /不提供 WebCrypto/u,
      )
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
