// 无类型的第三方包 / 浏览器全局声明。
// 只补类型，不改变运行时行为。

/** 仅解码合法转义序列，非法序列原样保留（上游 util/index.js 依赖该语义） */
declare module 'safe-decode-uri-component' {
  const decode: (input: string) => string
  export = decode
}

/** 浏览器扩展全局（qq.js 的 get_user / logout、kugou.js 的 async 分支在 Node 侧不可达） */
declare const async: any
declare const cookieGet: any
declare const cookieRemove: any
