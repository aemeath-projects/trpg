/**
 * .story 归档的口令加密：AES-256-GCM + PBKDF2-HMAC-SHA256。
 *
 * 为什么是对称加密：非对称需要每个玩家预先持有密钥对，QQ 用户不会有，只能由服务器
 * 代管私钥——服务器同时持有密文与私钥，加密就退化成只防外人拿到链接，防护面与对称口令
 * 完全相同，却多出密钥对生成、存储、轮换、丢失恢复四套机制。
 *
 * 为什么用 WebCrypto：Node 与浏览器都原生提供 crypto.subtle，本包因此保持零新增依赖、
 * 双端同一份代码。这是 .story 能被前端在线查看器直接解密的前提。
 * 代价是全部 API 异步，故加密路径必须是 async。
 *
 * 未选 XChaCha20-Poly1305：抗 nonce 重用更好，但浏览器 WebCrypto 不支持，得引三方库。
 * 本方案每次加密都新生成随机 nonce，不存在重用场景。
 * GCM 自带 128 位认证标签，口令错误与密文篡改都会在解密时直接失败，无需另做 HMAC。
 */

import { StoryDecryptError, StoryFormatError } from './errors.js'

/**
 * PBKDF2 迭代次数。
 *
 * 取 OWASP 对 PBKDF2-HMAC-SHA256 的建议值。口令由用户自定，必然出现弱口令，
 * KDF 强度是此时唯一的防线。代价是服务端加密多几百毫秒、浏览器解密约 1-2 秒——
 * 导出是低频操作，可接受。
 */
export const PBKDF2_ITERATIONS = 600_000

/** PBKDF2 盐长度（字节）。每次加密随机生成，存在容器头之后。 */
export const SALT_SIZE = 16

/** GCM nonce（IV）长度（字节）。12 是 AES-GCM 的标准长度。 */
export const NONCE_SIZE = 12

/** GCM 认证标签长度（bit）。WebCrypto 把标签追加在密文尾部。 */
const TAG_LENGTH_BITS = 128

/**
 * 口令最小长度。
 *
 * 拦住 123、abc 这类口令。真正的强度靠 PBKDF2_ITERATIONS，长度下限只是挡掉最离谱
 * 的输入。不做复杂度规则（大小写/数字/符号混合），那类规则在实践中只会逼出 Password1!
 * 这种既难记又不安全的口令。
 */
export const MIN_PASSWORD_LENGTH = 8

/**
 * WebCrypto 可接受的字节视图。
 *
 * TypeScript 5.7 起 Uint8Array 带上了底层缓冲区的泛型参数，而 WebCrypto 签名要求
 * ArrayBuffer 而非 ArrayBufferLike——后者含 SharedArrayBuffer，跨线程共享的缓冲区
 * 在加密过程中可能被并发改写。用类型别名显式表达约束，让不合规的调用在编译期失败。
 */
type CryptoBytes = Uint8Array<ArrayBuffer>

/**
 * 加密后的载荷三元组。
 *
 * 字段用宽 Uint8Array 而非 CryptoBytes：解包侧的三段都来自对文件字节的 subarray，
 * 类型是宽的，收窄由 decryptPayload 内部统一处理，不该让调用方操心。
 */
export interface EncryptedPayload {
  /** PBKDF2 盐 */
  salt: Uint8Array
  /** GCM nonce */
  nonce: Uint8Array
  /** 密文，尾部含 16 字节认证标签 */
  ciphertext: Uint8Array
}

/**
 * 取 WebCrypto 实例，缺失时给出可操作的报错。
 *
 * 类型层面这个检查看似多余（@types/node 把 globalThis.crypto 声明为非空），但本包是双端的：
 * 浏览器在非安全上下文（http 且非 localhost）下 crypto.subtle 确实是 undefined。
 * 这是类型声明与运行时的真实脱节，不是防御性冗余。
 */
function getSubtle(): SubtleCrypto {
  /* eslint-disable @typescript-eslint/no-unnecessary-condition */
  const subtle = globalThis.crypto?.subtle
  if (subtle === undefined) {
    throw new StoryFormatError(
      '当前运行环境不提供 WebCrypto（crypto.subtle），无法处理加密归档。' +
        'Node 需 ≥ 18，浏览器需 HTTPS 或 localhost 环境',
    )
  }
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */
  return subtle
}

/**
 * 收窄为 WebCrypto 可接受的字节视图。
 *
 * msgpackr/fflate 返回的是泛型更宽的 Uint8Array<ArrayBufferLike>。绝大多数情况下底层就是
 * 普通 ArrayBuffer，此时零拷贝直接用；只有落在 SharedArrayBuffer 上时才复制一份——
 * 共享内存可能被其他线程在加密过程中改写，复制是运行时必要的，不是为了糊过类型检查。
 */
function toCryptoBytes(bytes: Uint8Array): CryptoBytes {
  return bytes.buffer instanceof ArrayBuffer
    ? (bytes as CryptoBytes)
    : new Uint8Array(bytes.slice())
}

/** 校验口令长度。打包与解包都调用——解包侧提前失败可省掉 PBKDF2 迭代的开销。 */
export function assertValidPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new StoryFormatError(
      `口令至少需要 ${String(MIN_PASSWORD_LENGTH)} 个字符，当前 ${String(password.length)} 个`,
    )
  }
}

/**
 * 从口令派生 AES-256-GCM 密钥。
 *
 * @param password 用户口令
 * @param salt PBKDF2 盐
 */
async function deriveKey(password: string, salt: CryptoBytes): Promise<CryptoKey> {
  const subtle = getSubtle()
  const baseKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * 加密载荷。
 *
 * 每次调用都新生成随机 salt 与 nonce——salt 随机化让同一口令在不同归档上派生出不同密钥
 * （挡住预计算表），nonce 随机化避免 GCM 的 nonce 重用。
 *
 * @param payload 待加密字节（应为已压缩的数据）
 * @param password 用户口令
 * @throws {StoryFormatError} 口令过短或环境不支持 WebCrypto 时抛出
 */
export async function encryptPayload(
  payload: Uint8Array,
  password: string,
): Promise<EncryptedPayload> {
  assertValidPassword(password)

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_SIZE))
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(NONCE_SIZE))
  const key = await deriveKey(password, salt)

  const ciphertext = await getSubtle().encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: TAG_LENGTH_BITS },
    key,
    toCryptoBytes(payload),
  )

  return { salt, nonce, ciphertext: new Uint8Array(ciphertext) }
}

/**
 * 解密载荷。
 *
 * @throws {StoryDecryptError} 口令错误或密文/salt/nonce 被篡改时抛出
 * @throws {StoryFormatError} 口令过短或环境不支持 WebCrypto 时抛出
 */
export async function decryptPayload(
  encrypted: EncryptedPayload,
  password: string,
): Promise<CryptoBytes> {
  assertValidPassword(password)

  const key = await deriveKey(password, toCryptoBytes(encrypted.salt))

  try {
    const plaintext = await getSubtle().decrypt(
      { name: 'AES-GCM', iv: toCryptoBytes(encrypted.nonce), tagLength: TAG_LENGTH_BITS },
      key,
      toCryptoBytes(encrypted.ciphertext),
    )
    return new Uint8Array(plaintext)
  } catch {
    // WebCrypto 对认证失败只抛一个信息量为零的 OperationError，原样透出对用户毫无帮助。
    // 换成明确的业务异常，让调用方能提示「口令是否输错」
    throw new StoryDecryptError('解密失败：口令错误，或归档文件已损坏 / 被篡改')
  }
}
