/**
 * D&D 5e 临时属性叠加（Buff）计算。
 *
 * 有效值 = 基础值 + buff 值。buff 可以是正数（增益）或负数（减益）。
 * 最简单的叠加模型——不做来源追踪、不区分加值类型（增强/环境/士气等）。
 */

/**
 * 计算临时属性叠加后的有效值。
 *
 * @param base - 属性基础值（如基础力量 16）
 * @param buff - buff 修正值（正数为增益，负数为减益，0 为无影响）
 * @returns 有效值 = base + buff
 *
 * @example
 * ```ts
 * computeEffectiveValue(16, 2)   // → 18（熊之坚韧 +2）
 * computeEffectiveValue(16, -3)  // → 13（衰弱射线 -3）
 * computeEffectiveValue(16, 0)   // → 16（无 buff）
 * ```
 */
export function computeEffectiveValue(base: number, buff: number): number {
  return base + buff
}
