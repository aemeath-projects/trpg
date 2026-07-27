/**
 * .story 跑团日志归档格式的打包/解包。
 *
 * 容器格式：8 字节头（magic "STORY" + version + flags + reserved）+ 可选加密前缀
 * （salt 16B + nonce 12B）+ payload（msgpack，可选 gzip 压缩，可选 AES-256-GCM 加密）。
 *
 * 加密顺序是先压缩后加密。密文是高熵数据，gzip 对它无效甚至会变大。
 * 加密不占版本号——它与格式演进正交，用 flags 位表达而非递增 STORY_VERSION。
 *
 * 版本分派：版本号只存在容器头，不重复写进 payload。
 * unpackStory 读出版本后查 PARSERS 分派表调用对应解析器，
 * 每个解析器负责"解码+校验+归一到最新形状"，消费方永远只面对一种 StoryDocument 类型。
 *
 * payload 是标准 msgpack，可被任何语言的 msgpack 库直接读取。
 * 为此刻意关闭了 msgpackr 的 useRecords 和 structuredClone 两项私有优化。
 */

import { gunzipSync, gzipSync } from 'fflate'
import { Packr } from 'msgpackr'

import { NONCE_SIZE, SALT_SIZE, decryptPayload, encryptPayload } from './crypto.js'
import { StoryFormatError } from './errors.js'
import type { StoryCompression, StoryDocument, StoryHeader } from './types.js'
import { assertValidV1Document, parseV1 } from './v1.js'

export {
  MIN_PASSWORD_LENGTH,
  NONCE_SIZE,
  PBKDF2_ITERATIONS,
  SALT_SIZE,
  assertValidPassword,
  decryptPayload,
} from './crypto.js'
export { assertValidV1Document, parseV1 } from './v1.js'
export { StoryDecryptError, StoryFormatError } from './errors.js'
export type {
  StoryActor,
  StoryCharacter,
  StoryCompression,
  StoryDocument,
  StoryEntry,
  StoryEntryType,
  StoryHeader,
  StoryMeta,
  StoryRollPayload,
} from './types.js'

/** 容器 magic：ASCII `STORY`。 */
export const STORY_MAGIC = 'STORY' as const

/** 当前格式版本号。 */
export const STORY_VERSION = 1 as const

/** 归档文件扩展名。 */
export const STORY_EXTENSION = '.story' as const

/** 容器头字节数。 */
const HEADER_SIZE = 8

/** magic 的字节序列。 */
const MAGIC_BYTES = Object.freeze([0x53, 0x54, 0x4f, 0x52, 0x59]) // "STORY"

/** flags 中压缩算法占用的位（bit0-1）。 */
const COMPRESSION_MASK = 0b0000_0011

/** 压缩算法在 flags 中的编码。 */
const COMPRESSION_NONE = 0
const COMPRESSION_GZIP = 1

/** flags 中的加密标志位（bit2）。 */
const ENCRYPTED_FLAG = 0b0000_0100

/**
 * flags 中尚未定义的位（bit3-7）。
 * 置位即拒绝解析，防止把新格式当老格式读而产出错乱数据。
 */
const RESERVED_FLAGS_MASK = 0b1111_1000

/** 加密归档中 salt + nonce 前缀的总长度。 */
const CRYPTO_PREFIX_SIZE = SALT_SIZE + NONCE_SIZE

/**
 * 版本解析器：把已解压的 payload 字节解码、校验，并归一到最新的 StoryDocument 形状。
 *
 * 导出本类型是为了让新增版本时有明确的实现契约可依。分派表 PARSERS 不导出——
 * 注册哪些版本是包内决策，外部替换分派表会让"解出来的一定是最新形状"这个保证失效。
 */
export type StoryParser = (payload: Uint8Array) => StoryDocument

/**
 * 版本 → 解析器分派表。
 * 新增版本时在此注册，并让旧版本解析器承担"旧形状→新形状"的归一。
 */
const PARSERS: ReadonlyMap<number, StoryParser> = new Map<number, StoryParser>([[1, parseV1]])

/**
 * msgpack 编码器。模块级单例——Packr 实例无状态，复用省去每次调用构造开销。
 * 解码在各版本解析器内，因为不同版本可能用不同编码。
 */
const packr = new Packr({ useRecords: false, structuredClone: false })

/**
 * 判断某个格式版本是否被当前实现支持。
 * 供消费方配合 readStoryHeader 在解包前做能力判断，避免靠 catch 来做控制流。
 */
export function isSupportedStoryVersion(version: number): boolean {
  return PARSERS.has(version)
}

/**
 * 打包 .story 归档。
 *
 * 压缩算法取压缩前后更小者。gzip 的 mtime 固定为 0——fflate 默认把当前时间写进 gzip 头，
 * 那会让相同输入产出不同字节，破坏可复现性与内容寻址。
 *
 * @throws {StoryFormatError} 文档结构不合法时抛出
 */
export function packStory(doc: StoryDocument): Uint8Array {
  // 打包侧也校验：归档一旦写出、源数据被清理，结构性错误就再也无法修复了。
  const { payload, flags } = encodePayload(doc)

  const out = new Uint8Array(HEADER_SIZE + payload.length)
  writeHeader(out, flags)
  out.set(payload, HEADER_SIZE)
  return out
}

/**
 * 加密打包 .story 归档。
 *
 * 流程为 msgpack → 压缩 → AES-256-GCM 加密。压缩必须在加密之前。
 *
 * @param doc - 待打包的文档
 * @param password - 用户口令
 * @throws {StoryFormatError} 文档结构不合法、口令过短或环境不支持 WebCrypto 时抛出
 */
export async function packStoryEncrypted(
  doc: StoryDocument,
  password: string,
): Promise<Uint8Array> {
  const { payload, flags } = encodePayload(doc)
  const { salt, nonce, ciphertext } = await encryptPayload(payload, password)

  const out = new Uint8Array(HEADER_SIZE + CRYPTO_PREFIX_SIZE + ciphertext.length)
  writeHeader(out, flags | ENCRYPTED_FLAG)
  out.set(salt, HEADER_SIZE)
  out.set(nonce, HEADER_SIZE + SALT_SIZE)
  out.set(ciphertext, HEADER_SIZE + CRYPTO_PREFIX_SIZE)
  return out
}

/**
 * 校验文档、编码为 msgpack 并择优压缩。
 * 加密与非加密路径共用，避免两份实现漂移。
 */
function encodePayload(doc: StoryDocument): { payload: Uint8Array; flags: number } {
  // 打包侧也校验：归档一旦写出、源数据被清理，结构性错误就再也无法修复了。
  // 校验函数取自当前版本的解析器——「什么算合法」是版本相关的
  assertValidV1Document(doc)

  const raw = packr.pack(doc)
  const gzipped = gzipSync(raw, { level: 9, mtime: 0 })

  const useGzip = gzipped.length < raw.length
  return {
    payload: useGzip ? gzipped : raw,
    flags: useGzip ? COMPRESSION_GZIP : COMPRESSION_NONE,
  }
}

/** 写入 8 字节容器头。 */
function writeHeader(out: Uint8Array, flags: number): void {
  out.set(MAGIC_BYTES, 0)
  out[5] = STORY_VERSION
  out[6] = flags
  out[7] = 0
}

/**
 * 读取容器头，不解包 payload。
 * 用于低成本探测归档的版本、压缩方式与是否加密。
 *
 * @param bytes - .story 文件字节（只需前 8 字节）
 * @returns 头信息
 * @throws {StoryFormatError} 字节数不足、magic 不符、保留位非 0、压缩算法未知、
 *   或 flags 含未定义位时抛出
 */
export function readStoryHeader(bytes: Uint8Array): StoryHeader {
  if (bytes.length < HEADER_SIZE) {
    throw new StoryFormatError(
      `不是合法的 .story 文件：至少需要 ${String(HEADER_SIZE)} 字节，实际 ${String(bytes.length)} 字节`,
    )
  }

  for (const [i, expected] of MAGIC_BYTES.entries()) {
    if (bytes[i] !== expected) {
      throw new StoryFormatError('不是合法的 .story 文件：magic 不匹配')
    }
  }

  // 长度已在函数开头校验过 >= HEADER_SIZE，下标访问必定有值
  const version = bytes[5]
  if (version < 1) {
    throw new StoryFormatError(`.story 版本号非法：${String(version)}`)
  }
  // 刻意**不**在此拒绝「本实现不支持的版本」：那属于能力判断而非容器头合法性。若读头就为
  // 超前版本抛错，消费方便无法「读头 → isSupportedStoryVersion 判断 → 决定是否解包」，
  // 因为第一步就失败了。该判断留给 unpackStory
  if (bytes[7] !== 0) {
    throw new StoryFormatError('.story 保留字节非 0，可能来自不兼容的格式变体')
  }

  const flags = bytes[6]
  if ((flags & RESERVED_FLAGS_MASK) !== 0) {
    throw new StoryFormatError(
      `.story flags 含本实现未定义的位（0x${flags.toString(16)}），可能由更新版本的程序生成`,
    )
  }

  return {
    version,
    compression: decodeCompression(flags),
    encrypted: (flags & ENCRYPTED_FLAG) !== 0,
  }
}

/**
 * 判断归档是否为口令加密。
 * 供消费方在解包前分派到 unpackStory（同步）或 unpackStoryEncrypted（异步、需口令）。
 */
export function isStoryEncrypted(bytes: Uint8Array): boolean {
  return readStoryHeader(bytes).encrypted
}

/**
 * 解包 .story 归档。
 *
 * 同时接受 gzip 与未压缩 payload，让其它语言的工具能在不引入 gzip 依赖的前提下生成
 * 合法 .story。加密归档请改用 unpackStoryEncrypted。
 *
 * @param bytes - .story 文件的完整字节
 * @returns 解包并归一到最新形状的文档
 * @throws {StoryFormatError} 容器头非法、归档已加密、版本不支持、解压/解码/结构不合法时抛出
 */
export function unpackStory(bytes: Uint8Array): StoryDocument {
  const header = readStoryHeader(bytes)
  if (header.encrypted) {
    throw new StoryFormatError('该归档已加密，请改用 unpackStoryEncrypted() 并提供口令')
  }

  const parse = resolveParser(header.version)
  return parse(decompress(bytes.subarray(HEADER_SIZE), header.compression))
}

/**
 * 解包加密的 .story 归档。
 * 流程与 packStoryEncrypted 相反：解密 → 解压 → 解码。
 *
 * @throws {StoryDecryptError} 口令错误或密文被篡改时抛出
 * @throws {StoryFormatError} 容器头非法、归档未加密、字节数不足、版本不支持、
 *   解压/解码/结构不合法时抛出
 */
export async function unpackStoryEncrypted(
  bytes: Uint8Array,
  password: string,
): Promise<StoryDocument> {
  const header = readStoryHeader(bytes)
  if (!header.encrypted) {
    throw new StoryFormatError('该归档未加密，请改用 unpackStory()')
  }
  if (bytes.length < HEADER_SIZE + CRYPTO_PREFIX_SIZE) {
    throw new StoryFormatError('加密的 .story 文件已截断：缺少完整的 salt / nonce')
  }

  // 版本分派提前到解密之前：版本不支持时没必要先花 600k 次迭代去派生密钥
  const parse = resolveParser(header.version)

  const salt = bytes.subarray(HEADER_SIZE, HEADER_SIZE + SALT_SIZE)
  const nonce = bytes.subarray(HEADER_SIZE + SALT_SIZE, HEADER_SIZE + CRYPTO_PREFIX_SIZE)
  const ciphertext = bytes.subarray(HEADER_SIZE + CRYPTO_PREFIX_SIZE)

  const payload = await decryptPayload({ salt, nonce, ciphertext }, password)
  return parse(decompress(payload, header.compression))
}

/** 按版本取解析器，未注册时抛出可操作的错误。 */
function resolveParser(version: number): StoryParser {
  const parse = PARSERS.get(version)
  if (parse === undefined) {
    throw new StoryFormatError(
      version > STORY_VERSION
        ? `.story 版本 ${String(version)} 由更新版本的程序生成，当前最高支持 ${String(STORY_VERSION)}，请升级`
        : `.story 版本 ${String(version)} 已不再受支持`,
    )
  }
  return parse
}

/** 按 flags 指示的算法解压 payload。 */
function decompress(payload: Uint8Array, compression: StoryCompression): Uint8Array {
  if (compression !== 'gzip') return payload
  try {
    return gunzipSync(payload)
  } catch (err) {
    throw new StoryFormatError(
      `.story 解压失败：${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

/** 把 flags 中的压缩位解码为算法名。 */
function decodeCompression(flags: number): StoryCompression {
  const code = flags & COMPRESSION_MASK
  if (code === COMPRESSION_NONE) return 'none'
  if (code === COMPRESSION_GZIP) return 'gzip'
  throw new StoryFormatError(`.story 使用了未知的压缩算法（编码 ${String(code)}）`)
}
