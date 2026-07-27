/**
 * D&D 5e 临时属性叠加（Buff）计算。
 * 有效值 = 基础值 + buff 值。不做来源追踪，不区分加值类型。
 */

/**
 * 计算临时属性叠加后的有效值。
 *
 * @param base - 属性基础值
 * @param buff - buff 修正值（正数为增益，负数为减益）
 * @returns 有效值 = base + buff
 */
export function computeEffectiveValue(base: number, buff: number): number {
  return base + buff
}
