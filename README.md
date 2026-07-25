# Aemeath TRPG Engine

TRPG 骰娘规则引擎：无状态掷骰求值、CoC 7/6 版与 D&D 5e 规则判定、人物生成公式、日志状态机等纯函数集合

![NPM Version](https://img.shields.io/npm/v/%40aemeath-projects%2Ftrpg?style=for-the-badge)
![License](https://img.shields.io/github/license/aemeath-projects/trpg?style=for-the-badge)

**Aemeath TRPG Engine** 是一个纯函数规则引擎库：不做任何 I/O（无数据库、无网络、不依赖任何具体 Bot 框架），消费方负责持久化，把已持久化的数据喂给本包函数即可拿到计算结果。

## 设计原则

- **零依赖** — 仅依赖 Node.js 标准库，运行时 `dependencies` 为空
- **纯函数** — 所有导出函数对相同输入返回相同输出（可注入 `RandomSource` 实现确定性重放）
- **tree-shakeable** — 按 subpath 按需导入（`@aemeath-projects/trpg/dice`），打包工具自动剔除未用代码
- **类型安全** — 完整 TypeScript 类型导出，`CheckResult`、`DiceResult` 等结构体开箱即用

## 安装

```bash
pnpm add @aemeath-projects/trpg
```

**要求：** Node.js ≥ 24.17

## 模块概览

| 模块 | Subpath | 核心导出 |
|---|---|---|
| **dice** | `@aemeath-projects/trpg/dice` | `rollExpression` · `maxOfExpression` · `rollDie` · `DiceExpressionError` |
| **coc** | `@aemeath-projects/trpg/coc` | `generateCharacter` · `judgeCoCResult` · `applySanityCheck` · `applyGrowthCheck` · `rollBonusPenaltyD100` · `drawInstantMadness` · `drawSummaryMadness` · `normalizeAttributeName` |
| **dnd** | `@aemeath-projects/trpg/dnd` | `computeSkillModifier` · `rollAbilityScoreSets` · `rollNamedAbilityScoreSets` · `applyDeathSaveRoll` · `isInstantDeath` · `applyDamageWhileUnconscious` · `initSlots` · `restSlots` · `adjustSlot` · `computeEffectiveValue` · `generateName` |
| **decks** | `@aemeath-projects/trpg/decks` | `draw` |
| **stats** | `@aemeath-projects/trpg/stats` | `summarize` · `CheckRecord` · `CheckSummary` |
| **log** | `@aemeath-projects/trpg/log` | `start` · `pause` · `resume` · `end` · `computeDuration` · `LogState` |
| **types** | `@aemeath-projects/trpg/types` | `RandomSource` · `CheckResult` |

## 快速上手

### 掷骰表达式

```ts
import { rollExpression, maxOfExpression } from '@aemeath-projects/trpg/dice'

const r = rollExpression('4d6kh3')   // D&D 属性掷骰（4d6 取最高 3 个）
r.total   // → 15
r.detail  // → "4D6=[5,3,6,2]=>(kh3)[5,3,6]=14" (不含修饰)

maxOfExpression('3d6+2')            // → 20，不掷骰，纯理论上限
```

支持的语法：`NdM` · `d%` · `+` `-` `*` · `khN` / `klN`（取高/取低 N 个）· 嵌套括号

### CoC 7 版人物生成与检定

```ts
import { generateCharacter, judgeCoCResult } from '@aemeath-projects/trpg/coc'

// 生成 7 版人物（含 8 项基础属性 + 派生属性）
const char = generateCharacter('coc7')

// 房规判定
const outcome = judgeCoCResult({ roll: 45, skill: 60, rule: 'coc7' })
outcome.result       // → 'success'
outcome.description  // → 中文描述文本
```

`judgeCoCResult` 内置 6 版 (`coc6`) 和 7 版 (`coc7`) 共 8 种房规边界策略，详见 `Houserule` 类型。

#### San Check & 成长

```ts
import { applySanityCheck } from '@aemeath-projects/trpg/coc'

// 理智检定：传入当前理智值，返回损失量和疯狂状态
const outcome = applySanityCheck({ currentSanity: 42, maxSanity: 99, lossExpr: '1d6/1d20' })

import { applyGrowthCheck } from '@aemeath-projects/trpg/coc'

// 幕间成长检定
const grown = applyGrowthCheck({ skillName: '图书馆使用', currentValue: 45 })
```

### D&D 5e 规则

```ts
import {
  rollNamedAbilityScoreSets,
  computeSkillModifier,
  applyDeathSaveRoll,
  initSlots,
  generateName,
} from '@aemeath-projects/trpg/dnd'

// 6 属性掷骰（4d6kh3 方案）
const scores = rollNamedAbilityScoreSets()

// 技能调整值
const mod = computeSkillModifier({ attributeMod: 3, isProficient: true, proficiencyBonus: 2 })
mod.total   // → 5

// 死亡豁免状态机
const newState = applyDeathSaveRoll(prevState, { roll: 15 })
newState.successes  // → 1（成功计数 +1）

// 法术位管理
const slots = initSlots({ level: 3, slots: { 1: 4, 2: 2 } })

// 随机姓名（按种族音节拼接）
const name = generateName('elf')
```

### 通用抽取 & 统计

```ts
import { draw } from '@aemeath-projects/trpg/decks'
import { summarize } from '@aemeath-projects/trpg/stats'

// 无放回随机抽取（Fisher-Yates 变体）
draw(['A', 'B', 'C', 'D'], 2)  // → e.g. ['C', 'A']

// 检定统计聚合
const summary = summarize([{ result: 'success' }, { result: 'great_success' }, { result: 'fail' }])
summary.successRate        // → 0.666...
summary.greatSuccessCount  // → 1
```

### 日志状态机

```ts
import { start, pause, resume, end, computeDuration } from '@aemeath-projects/trpg/log'

let log = start(Date.now())           // → recording
log = pause(log, Date.now())          // → paused（结算 recording 区间）
log = resume(log, Date.now())         // → recording
log = end(log, Date.now())            // → ended（最终结算）

computeDuration(log, Date.now())      // → 累计有效 ms
```

状态转换：`recording` ⇄ `paused` → `ended`（两端均可终止）

### 确定性随机（测试 / 重放）

所有接受随机数的函数均支持注入 `RandomSource`：

```ts
import seedrandom from 'seedrandom'
import { rollExpression } from '@aemeath-projects/trpg/dice'

const rng = seedrandom('fixed-seed')
rollExpression('3d6', rng)  // 每次都返回相同结果
```

## 架构说明

本库面向**骰娘 Bot 开发者**设计——数据库、消息路由、QQ / Discord / Telegram 适配层由消费方实现；引擎只负责规则计算。

```
Bot 适配层（消费方）
      │
      ▼
@aemeath-projects/trpg  ← 纯函数计算，零副作用
      │
      ▼
持久化层（消费方决定：SQLite / PostgreSQL / Redis / JSON 文件）
```

## License

MIT © Aemeath Projects
