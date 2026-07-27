/**
 * .story v1 解析器。
 *
 * 校验逻辑跟着解析器走而不放在共享层："什么算合法"是版本相关的。
 * 返回值永远是最新版本的 StoryDocument。将来 v2 出现后，本文件要额外承担
 * v1 形状 → v2 形状的归一（为新增字段填默认值），这样消费方永远不必判版本。
 */

import { Unpackr } from 'msgpackr'

import { StoryFormatError } from './errors.js'
import type { StoryCharacter, StoryDocument, StoryEntry, StoryMeta } from './types.js'

/**
 * msgpack 解码器。
 *
 * 关闭 useRecords（用私有扩展类型复用 object key，不是标准 msgpack）和 structuredClone
 * （用私有扩展类型表达循环引用/Map/Set，破坏互操作性且引入攻击面）。
 */
const unpackr = new Unpackr({ useRecords: false, structuredClone: false, mapsAsObjects: true })

/**
 * 解析 v1 payload。
 *
 * @param payload 已解压的 msgpack 字节
 * @returns 归一到最新形状的文档
 * @throws {StoryFormatError} msgpack 解码失败或结构不合法时抛出
 */
export function parseV1(payload: Uint8Array): StoryDocument {
  let decoded: unknown
  try {
    decoded = unpackr.unpack(payload)
  } catch (err) {
    throw new StoryFormatError(
      `.story 内容解码失败：${err instanceof Error ? err.message : String(err)}`,
    )
  }

  assertValidV1Document(decoded)
  return decoded
}

/**
 * 校验 v1 文档结构。
 *
 * 打包侧同样调用本函数——归档一旦写出、源数据被清理，结构性错误就再也无法修复了。
 *
 * @throws {StoryFormatError} 结构不合法时抛出
 */
export function assertValidV1Document(doc: unknown): asserts doc is StoryDocument {
  if (typeof doc !== 'object' || doc === null) {
    throw new StoryFormatError('.story 内容不是对象')
  }

  // 全程按 unknown 解构：入参可能来自不可信字节流，先断言成 StoryDocument 的字段类型
  // 再做 typeof 检查，会让类型系统认定这些检查恒真，与运行时实际情况脱节
  const { meta, actors, characters, entries } = doc as {
    meta?: unknown
    actors?: unknown
    characters?: unknown
    entries?: unknown
  }

  if (typeof meta !== 'object' || meta === null) {
    throw new StoryFormatError('.story 缺少 meta 段')
  }
  const metaFields = meta as Partial<Record<keyof StoryMeta, unknown>>
  for (const field of ['logName', 'createdBy', 'source'] satisfies (keyof StoryMeta)[]) {
    if (typeof metaFields[field] !== 'string') {
      throw new StoryFormatError(`.story meta.${field} 缺失或不是字符串`)
    }
  }
  if (typeof metaFields.startedAt !== 'number') {
    throw new StoryFormatError('.story meta.startedAt 缺失或不是数字')
  }

  if (!Array.isArray(actors)) {
    throw new StoryFormatError('.story actors 段缺失或不是数组')
  }
  if (!Array.isArray(characters)) {
    throw new StoryFormatError('.story characters 段缺失或不是数组')
  }
  if (!Array.isArray(entries)) {
    throw new StoryFormatError('.story entries 段缺失或不是数组')
  }

  for (const [i, raw] of (characters as readonly unknown[]).entries()) {
    if (typeof raw !== 'object' || raw === null) {
      throw new StoryFormatError(`.story characters[${String(i)}] 不是对象`)
    }
    // 按 unknown 解构而非 Partial<StoryCharacter>：入参来自不可信字节流，
    // 断言成声明类型会让类型系统认定 `attributes === null` 恒假，与运行时脱节
    const { name, ruleset, owner, attributes } = raw as Record<keyof StoryCharacter, unknown>
    if (typeof name !== 'string') {
      throw new StoryFormatError(`.story characters[${String(i)}].name 缺失或不是字符串`)
    }
    if (typeof ruleset !== 'string') {
      throw new StoryFormatError(`.story characters[${String(i)}].ruleset 缺失或不是字符串`)
    }
    assertIndexInRange(owner, actors.length, `characters[${String(i)}].owner`, 'actors')
    if (typeof attributes !== 'object' || attributes === null) {
      throw new StoryFormatError(`.story characters[${String(i)}].attributes 缺失或不是对象`)
    }
  }

  for (const [i, raw] of (entries as readonly unknown[]).entries()) {
    if (typeof raw !== 'object' || raw === null) {
      throw new StoryFormatError(`.story entries[${String(i)}] 不是对象`)
    }
    const { actor, offset, character } = raw as Partial<StoryEntry>
    assertIndexInRange(actor, actors.length, `entries[${String(i)}].actor`, 'actors')
    if (typeof offset !== 'number') {
      throw new StoryFormatError(`.story entries[${String(i)}].offset 缺失或不是数字`)
    }
    // character 可选：普通发言条目无从判定用的是哪张卡，只有掷骰类条目才有值
    if (character !== undefined) {
      assertIndexInRange(
        character,
        characters.length,
        `entries[${String(i)}].character`,
        'characters',
      )
    }
  }
}

/**
 * 校验字典下标合法。
 *
 * 下标越界是本格式最危险的结构性错误：msgpack 层面完全合法，消费方却会取到 undefined
 * 或错误的参与者，且归档写出后源数据已清理、无从修复。
 */
function assertIndexInRange(value: unknown, length: number, field: string, dictName: string): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new StoryFormatError(`.story ${field} 不是非负整数：${String(value)}`)
  }
  if (value >= length) {
    throw new StoryFormatError(
      `.story ${field} 下标越界：${String(value)}，${dictName} 长度 ${String(length)}`,
    )
  }
}
