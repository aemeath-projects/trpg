/**
 * .story 跑团日志归档格式的数据模型。
 *
 * 本模块刻意不复用 dice/evaluator 的 DiceResult、types 的 CheckResult 等内部类型。
 * 已写出的 .story 文件必须能被未来版本的解包器读回，而内部计算类型需要能随时重构——
 * 两者一旦耦合，重构会静默破坏历史归档兼容性。
 *
 * 本文件类型永远描述最新版本形状。只允许新增可选字段。删除字段、重命名字段、
 * 收窄已有字段类型的改动都必须：递增 STORY_VERSION、新增版本解析器并注册到分派表、
 * 旧版本解析器负责把旧形状归一到新形状。
 */

/** 日志条目类型。 */
export type StoryEntryType =
  /** 普通消息：玩家发言，或 bot 的剧情类文本输出 */
  | 'message'
  /** 结构化掷骰记录 */
  | 'roll'

/**
 * 参与者。
 *
 * StoryEntry.actor 只存本数组的下标——一场 3000 条消息的团里同一显示名会出现 3000 次，
 * 字典化后只存一次。
 */
export interface StoryActor {
  /** 平台账号 id（QQ 归档里是 QQ 号） */
  id: string
  /**
   * 显示名——归档写出时该参与者在聊天平台上呈现的名字。
   *
   * 刻意不区分账号昵称与群名片：后者是 QQ 方言（Discord 叫 server nickname，
   * Telegram 没有这个概念），落进通用格式等于把单一平台的建模泄漏进来。
   * 生产方自行决定用哪个值填这里。
   */
  name: string
  /** 该参与者在本场团中使用的人物卡名 */
  characterName?: string
  /**
   * 头像 URL。
   *
   * 是活引用而非快照：指向平台的头像服务，参与者换头像后 URL 会随之呈现新头像。存 URL
   * 而非内嵌图片字节，是因为归档要能通过 IM 传阅，内嵌头像会让文件体积涨一个量级。
   * 由生产方填写而非消费方推导：URL 规则是平台相关的。
   */
  avatar?: string
}

/**
 * 人物卡快照。
 *
 * 独立成段而不挂 StoryActor：actor 与 character 不是一对一（KP 没卡却要操作 NPC，
 * 玩家能在一场团里换卡），挂 actor 就把"一人一卡"写进了格式。
 *
 * 快照语义：存的是该角色在本场团中首次出现时的状态，不存数值变化轨迹。
 * HP/SAN 的下降过程应建模成时间序条目而非在此嵌套历史结构。
 */
export interface StoryCharacter {
  /** 卡名 */
  name: string
  /**
   * 规则系统标识（如 coc7、dnd5e）。
   *
   * 声明为 string 而非联合类型：.story 不该被生产方支持哪些规则系统绑住，
   * 新增系统不应构成格式的破坏性变更。
   */
  ruleset: string
  /** {@link StoryDocument.actors} 中持卡人的下标 */
  owner: number
  /**
   * 属性与技能值，键为属性名。
   *
   * 刻意是松散 KV 而非具名字段：CoC7 是八围+百分制技能，DnD5e 是六围+熟练加值+AC/HP+
   * 职业等级，形状差异巨大。消费方按 ruleset 自行分派解读。
   */
  attributes: Readonly<Record<string, number>>
  /** 该卡启用的房规标识，未启用时无值 */
  houserule?: string
}

/**
 * 结构化掷骰数据。
 *
 * skill/target/outcome 只在技能检定类命令（.ra/.rc/.sc 等）下有值，
 * 自由掷骰（.r）三者均为 undefined。
 */
export interface StoryRollPayload {
  /** 原始掷骰表达式（如 `3d6+2`） */
  expression: string
  /** 表达式最终结果（含所有加减修正） */
  total: number
  /** 人类可读的掷骰明细（如 `3D6=[4,2,6]=12+2=14`） */
  detail: string
  /** 本次表达式产生的全部骰子原始面值（含被 kh/kl 丢弃的） */
  rolls: readonly number[]
  /** 检定项名称（如 `侦查`） */
  skill?: string
  /** 检定目标值 */
  target?: number
  /** 检定结果等级（如 hard_success）。声明为 string 避免归档格式被内部枚举的增删绑住。 */
  outcome?: string
  /** 是否为暗骰 */
  hidden?: boolean
}

/** 单条日志条目。 */
export interface StoryEntry {
  /**
   * 相对 StoryMeta.startedAt 的毫秒偏移。
   *
   * 存相对值而非绝对时间戳：绝对毫秒在 msgpack 下恒 9 字节，相对偏移多为小整数，
   * 只占 1-3 字节。
   */
  offset: number
  /** {@link StoryDocument.actors} 的下标 */
  actor: number
  /** 条目类型 */
  type: StoryEntryType
  /**
   * 文本内容。
   *
   * 归档只存纯文本。图片/语音/at 等非文本消息段由生产方压平成占位符（[图片]、@10001 等）
   * 后写入本字段，格式层不保留 OneBot 原始消息段。
   */
  text?: string
  /** `type === 'roll'` 时的结构化掷骰数据 */
  roll?: StoryRollPayload
  /**
   * StoryDocument.characters 的下标，标明本条目属于哪张卡。
   *
   * 可选：普通发言条目通常无从判定用的是哪张卡，只有掷骰、检定等明确关联卡的条目才有值。
   */
  character?: number
}

/** 归档元信息。 */
export interface StoryMeta {
  /** 日志名 */
  logName: string
  /** 开团者（KP）的 QQ 号 */
  createdBy: string
  /** 日志启动时间戳（ms，绝对值；StoryEntry.offset 以此为基准） */
  startedAt: number
  /** 日志结束时间戳（ms） */
  endedAt: number
  /** 累计有效记录时长（ms，已扣除暂停区间） */
  durationMs: number
  /** 条目总数 */
  entryCount: number
  /** 导出时间戳（ms） */
  exportedAt: number
  /** 产出该归档的应用标识（如 `aemeath`） */
  source: string
}

/** `.story` 文件解包后的完整文档。 */
export interface StoryDocument {
  meta: StoryMeta
  actors: readonly StoryActor[]
  /** 本场团出现过的人物卡快照。参与者都没用卡时为空数组 */
  characters: readonly StoryCharacter[]
  entries: readonly StoryEntry[]
}

/** payload 压缩算法。 */
export type StoryCompression = 'none' | 'gzip'

/** 容器头信息，由 readStoryHeader 在不解包 payload 的前提下读出。 */
export interface StoryHeader {
  /** 格式版本号 */
  version: number
  /** payload 的压缩算法 */
  compression: StoryCompression
  /** 是否为口令加密归档。为 true 时必须用 unpackStoryEncrypted 解包 */
  encrypted: boolean
}
