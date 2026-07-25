/**
 * CoC 属性/技能同义词表。
 *
 * 覆盖常见中英/简繁/同义写法，将用户输入的属性名归一化为规范中文名。
 * 自撰扩展版本，不引入 SealDice 完整数据源。
 *
 * 应用场景：骰娘指令解析时，用户可能输入 `力量`、`STR`、`str` 等不同写法，
 * 需要统一映射到规范名称以进行后续判定。
 */

/**
 * 同义词分组。每组第一个元素为规范名（canonical name），
 * 后续元素为该属性的所有已知别名。
 */
const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ['力量', 'STR', 'str'],
  ['体质', 'CON', 'con'],
  ['体型', 'SIZ', 'siz'],
  ['敏捷', 'DEX', 'dex'],
  ['外貌', 'APP', 'app'],
  ['教育', 'EDU', 'edu', '知识'],
  ['智力', 'INT', 'int', '灵感'],
  ['意志', 'POW', 'pow'],
  ['生命', 'HP', 'hp'],
  ['理智', 'SAN', 'san', '理智值'],
  ['侦查', '侦察'],
  ['克苏鲁神话', '克苏鲁'],
]

/**
 * 小写别名 → 规范名的查找表，由 {@link SYNONYM_GROUPS} 自动构建。
 * 每组中的所有别名（含规范名自身）均映射到规范名。
 */
const CANONICAL_LOOKUP = new Map<string, string>()
for (const group of SYNONYM_GROUPS) {
  const canonical = group[0]
  for (const alias of group) CANONICAL_LOOKUP.set(alias.toLowerCase(), canonical)
}

/**
 * 将属性/技能名归一化为规范中文名。
 *
 * 匹配规则：大小写不敏感，与同义词表比对后返回规范名。
 * 同义词表内未收录的名称原样返回（不做修改）。
 *
 * @param name - 用户输入的属性名（可能为中文、英文缩写、别名等）
 * @returns 规范化的属性名（表内命中）或原始输入（表内未收录）
 *
 * @example
 * ```ts
 * normalizeAttributeName('str')     // → '力量'
 * normalizeAttributeName('理智值')   // → '理智'
 * normalizeAttributeName('unknown') // → 'unknown'（未收录，原样返回）
 * ```
 */
export function normalizeAttributeName(name: string): string {
  return CANONICAL_LOOKUP.get(name.toLowerCase()) ?? name
}
