/**
 * .story 格式异常类型。
 *
 * 独立成文件避免循环依赖：各版本解析器都要抛它，而 index.ts 又要 import 各解析器。
 */

/**
 * .story 格式错误。打包输入不合法、解包字节流不是合法 .story 均抛出此异常。
 */
export class StoryFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StoryFormatError'
  }
}

/**
 * 加密归档解密失败（口令错误或密文被篡改）。
 *
 * 独立于 StoryFormatError：解密失败大概率只是口令输错，该提示用户重输，
 * 而格式错误意味着文件损坏、无可挽回。仍继承 StoryFormatError，
 * 让只想笼统 catch"归档读不了"的调用方不必列举两种类型。
 */
export class StoryDecryptError extends StoryFormatError {
  constructor(message: string) {
    super(message)
    this.name = 'StoryDecryptError'
  }
}
