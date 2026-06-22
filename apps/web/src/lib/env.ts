/**
 * 配置缺失错误。
 *
 * 映射为 HTTP 503,消息只包含**变量名**(非敏感,部署文档里本就公开),
 * 这样线上一旦缺配置,接口会直接回显「缺少环境变量 X」,
 * 而不是一个看不出原因的 500,便于快速定位部署问题。
 */
export class ConfigError extends Error {
  readonly status = 503;
  readonly code = 'CONFIG_MISSING';
  constructor(public readonly varName: string) {
    super(`服务未正确配置:缺少环境变量 ${varName}`);
    this.name = 'ConfigError';
  }
}

/** 读取必需的环境变量;缺失则抛 ConfigError(503,响应含变量名)。 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new ConfigError(name);
  return value;
}
