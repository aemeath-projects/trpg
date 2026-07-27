/**
 * D&D 5e 技能-属性映射与调整值计算。
 *
 * 包含完整的官方技能-属性关联表。熟练度分三级：无熟练、熟练、专精。
 */

/**
 * D&D 5e 技能 → 基础属性映射表（官方公开规则结构）。共 18 项。
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
 * 公式：floor((属性值 - 10) / 2) + 熟练加值。
 * 无熟练时熟练加值为 0，熟练时为 proficiencyBonus，专精时为 proficiencyBonus × 2。
 *
 * @param attributeValue - 关联属性值
 * @param proficient - 是否有熟练项
 * @param expertise - 是否有专精项
 * @param proficiencyBonus - 角色的熟练加值
 * @returns 最终技能调整值
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
