/**
 * 代理工具函数
 * 提供代理配置验证和URL生成功能
 */

/**
 * 验证代理配置
 * @param {Object} proxyConfig 代理配置
 * @returns {Object} 验证结果
 */
function validateProxyConfig(proxyConfig) {
  const result = {
    valid: true,
    errors: []
  };
  
  if (!proxyConfig) {
    result.valid = false;
    result.errors.push('代理配置不能为空');
    return result;
  }
  
  // 验证代理类型
  if (!proxyConfig.type) {
    result.valid = false;
    result.errors.push('代理类型不能为空');
  } else if (!['http', 'https', 'socks4', 'socks5'].includes(proxyConfig.type)) {
    result.valid = false;
    result.errors.push('代理类型无效，必须是 http、https、socks4 或 socks5');
  }
  
  // 验证主机
  if (!proxyConfig.host) {
    result.valid = false;
    result.errors.push('代理主机不能为空');
  }
  
  // 验证端口
  if (!proxyConfig.port) {
    result.valid = false;
    result.errors.push('代理端口不能为空');
  } else if (isNaN(proxyConfig.port) || proxyConfig.port <= 0 || proxyConfig.port > 65535) {
    result.valid = false;
    result.errors.push('代理端口无效，必须是 1-65535 之间的数字');
  }
  
  return result;
}

/**
 * 生成代理URL
 * @param {Object} proxyConfig 代理配置
 * @returns {string} 代理URL
 */
function getProxyUrl(proxyConfig) {
  if (!proxyConfig || !proxyConfig.host || !proxyConfig.port) {
    return '';
  }
  
  const { type, host, port, username, password } = proxyConfig;
  
  if (username && password) {
    return `${type}://${username}:${password}@${host}:${port}`;
  }
  
  return `${type}://${host}:${port}`;
}

module.exports = {
  validateProxyConfig,
  getProxyUrl
};
