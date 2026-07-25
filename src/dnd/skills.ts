/**
 * D&D 5e 技能-属性映射与技能调整值计算。
 *
 * 包含完整的官方技能-属性关联表以及调整值计算公式。
 * 技能熟练度分为三个等级：无熟练、熟练（proficient）、专精（expertise）。
 */

/**
 * D&D 5e 技能 → 基础属性映射表（官方公开规则结构）。
 *
 * 共 18 项技能，每项关联六大属性之一。
 */
export const SKILL_TABLE: Record<string, string> = {
  运动: '力量',
  体操: '敏捷',
  巧手: '敏捷',
  隐匿: '敏捷',
  奥秘: '智力',
  历史: '智力',
  调查: '智力',
  自然: '智力',
  宗教: '智力',
  驯兽: '感知',
  洞悉: '感知',
  医药: '感知',
  察觉: '感知',
  生存: '感知',
  欺瞒: '魅力',
  威吓: '魅力',
  表演: '魅力',
  说服: '魅力',
}

/**
 * 计算技能调整值。
 *
 * ## 公式
 *
 * ```
 * 技能调整值 = floor((属性值 - 10) / 2) + 熟练加值
 * ```
 *
 * 其中熟练加值取决于熟练等级：
 * - **无熟练**：熟练加值 = 0
 * - **熟练**（proficient）：熟练加值 = proficiencyBonus
 * - **专精**（expertise）：熟练加值 = proficiencyBonus × 2
 *
 * @param attributeValue - 关联属性的值（如力量 16）
 * @param proficient - 是否拥有该技能的熟练项
 * @param expertise - 是否拥有该技能的专精项（专精时 proficient 也视为 true）
 * @param proficiencyBonus - 角色的熟练加值（由角色等级决定，如 3 级 = +2）
 * @returns 最终技能调整值
 *
 * @example
 * ```ts
 * // 16 力量的 3 级战士，运动熟练
 * computeSkillModifier(16, true, false, 2)  // → 3 + 2 = 5
 *
 * // 16 敏捷的 5 级游荡者，隐匿专精
 * computeSkillModifier(16, true, true, 3)   // → 3 + 6 = 9
 * ```
 */
export function computeSkillModifier(
  attributeValue: number,
  proficient: boolean,
  expertise: boolean,
  proficiencyBonus: number,
): number {
  const abilityMod = Math.floor((attributeValue - 10) / 2)
  const profBonus = expertise ? proficiencyBonus * 2 : proficient ? proficiencyBonus : 0
  return abilityMod + profBonus
}
