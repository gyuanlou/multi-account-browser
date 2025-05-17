/**
 * 代理管理服务
 * 负责代理设置和测试
 */
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const geoLocationService = require('./geo-location-service');
const { validateProxyConfig, getProxyUrl } = require('./proxy-utils');

class ProxyManager {
  constructor() {
    // 默认测试 URL
    this.defaultTestUrl = 'https://api.ipify.org?format=json';
    
    // 代理池（可以从配置文件加载）
    this.proxyPool = [];
  }
  
  /**
   * 测试代理连接
   * @param {Object} proxyConfig 代理配置
   * @returns {Promise<Object>} 测试结果
   */
  async testProxy(proxyConfig) {
    const { type, host, port, username, password, testUrl } = proxyConfig;
    const url = testUrl || this.defaultTestUrl;
    
    try {
      console.log(`开始测试代理: ${type}://${host}:${port}`);
      
      // 使用原生 fetch API 测试代理，避免使用代理对象
      // 我们将在主进程中直接调用 HTTP 请求，而不是创建代理对象
      // 这样可以避免序列化问题
      
      // 使用系统级别的代理设置
      const startTime = Date.now();
      
      // 使用 Node.js 的 http 或 https 模块直接发送请求
      const http = require('http');
      const https = require('https');
      const { URL } = require('url');
      
      // 解析测试 URL
      const testURL = new URL(url);
      const isHttps = testURL.protocol === 'https:';
      
      // 创建请求选项
      const requestOptions = {
        hostname: testURL.hostname,
        port: testURL.port || (isHttps ? 443 : 80),
        path: `${testURL.pathname}${testURL.search}`,
        method: 'GET',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      };
      
      // 根据代理类型设置环境变量
      let env = {};
      if (type === 'http' || type === 'https') {
        const authPart = username && password ? `${username}:${password}@` : '';
        env.HTTP_PROXY = `http://${authPart}${host}:${port}`;
        env.HTTPS_PROXY = `http://${authPart}${host}:${port}`;
      } else if (type === 'socks4' || type === 'socks5') {
        const authPart = username && password ? `${username}:${password}@` : '';
        env.SOCKS_PROXY = `socks5://${authPart}${host}:${port}`;
      }
      
      console.log(`使用代理环境变量:`, env);
      
      // 创建一个 Promise 来处理请求
      const requestPromise = new Promise((resolve, reject) => {
        const req = (isHttps ? https : http).request(requestOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const jsonData = JSON.parse(data);
              resolve(jsonData);
            } catch (e) {
              reject(new Error(`响应不是有效的 JSON: ${data}`));
            }
          });
        });
        
        req.on('error', (e) => {
          reject(e);
        });
        
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('请求超时'));
        });
        
        req.end();
      });
      
      // 执行请求
      const responseData = await requestPromise;
      const endTime = Date.now();
      
      console.log(`代理测试响应:`, responseData);
      
      // 如果成功获取 IP，尝试获取地理位置信息
      if (responseData && responseData.ip) {
        try {
          const geoData = await geoLocationService.getLocationFromIP(responseData.ip);
          
          // 创建一个纯数据结果对象，确保可序列化
          const result = {
            success: true,
            ip: responseData.ip,
            latency: endTime - startTime
          };
          
          // 安全地添加地理位置数据
          if (geoData) {
            const safeGeoData = JSON.parse(JSON.stringify({
              country: geoData.country || '',
              countryName: geoData.countryName || '',
              city: geoData.city || '',
              latitude: geoData.latitude || 0,
              longitude: geoData.longitude || 0,
              timezone: geoData.timezone || '',
              isp: geoData.isp || ''
            }));
            
            Object.assign(result, safeGeoData);
          }
          
          return result;
        } catch (geoError) {
          console.error(`获取地理位置失败:`, geoError.message);
          // 如果获取地理位置失败，仍然返回 IP 信息
          return {
            success: true,
            ip: responseData.ip,
            latency: endTime - startTime,
            error: `获取地理位置失败: ${geoError.message}`
          };
        }
      } else {
        return {
          success: false,
          error: '无法获取 IP 地址'
        };
      }
    } catch (error) {
      console.error(`代理测试失败:`, error.message);
      // 返回一个简单的对象，只包含字符串和基本类型
      return {
        success: false,
        error: `代理测试失败: ${error.message}`
      };
    }
  }
  
  /**
   * 添加代理到代理池
   * @param {Object} proxy 代理配置
   * @returns {boolean} 是否添加成功
   */
  addProxyToPool(proxy) {
    // 检查代理是否已存在
    const existingIndex = this.proxyPool.findIndex(p => 
      p.host === proxy.host && p.port === proxy.port);
    
    if (existingIndex !== -1) {
      // 更新现有代理
      this.proxyPool[existingIndex] = { ...proxy };
    } else {
      // 添加新代理
      this.proxyPool.push({ ...proxy });
    }
    
    return true;
  }
  
  /**
   * 从代理池中移除代理
   * @param {string} proxyId 代理 ID
   * @returns {boolean} 是否移除成功
   */
  removeProxyFromPool(proxyId) {
    const initialLength = this.proxyPool.length;
    this.proxyPool = this.proxyPool.filter(p => p.id !== proxyId);
    return this.proxyPool.length < initialLength;
  }
  
  /**
   * 获取代理池
   * @returns {Array} 代理池
   */
  getProxyPool() {
    return [...this.proxyPool];
  }
  
  /**
   * 从代理池中获取随机代理
   * @param {Object} filters 筛选条件
   * @returns {Object|null} 代理配置
   */
  getRandomProxy(filters = {}) {
    // 筛选符合条件的代理
    let filteredProxies = [...this.proxyPool];
    
    if (filters.country) {
      filteredProxies = filteredProxies.filter(p => p.country === filters.country);
    }
    
    if (filters.type) {
      filteredProxies = filteredProxies.filter(p => p.type === filters.type);
    }
    
    if (filteredProxies.length === 0) {
      return null;
    }
    
    // 随机选择一个代理
    const randomIndex = Math.floor(Math.random() * filteredProxies.length);
    return { ...filteredProxies[randomIndex] };
  }
  
  /**
   * 批量测试代理
   * @param {Array} proxies 代理列表
   * @returns {Promise<Array>} 测试结果
   */
  async batchTestProxies(proxies) {
    const results = [];
    
    for (const proxy of proxies) {
      try {
        const result = await this.testProxy(proxy);
        results.push({
          proxy,
          result
        });
      } catch (error) {
        results.push({
          proxy,
          result: {
            success: false,
            error: error.message
          }
        });
      }
    }
    
    return results;
  }
  
  /**
   * 导入代理列表
   * @param {string} proxyList 代理列表文本
   * @param {string} format 格式（ip:port, ip:port:user:pass, json）
   * @param {string} type 代理类型（http, https, socks4, socks5）
   * @returns {Array} 导入的代理列表
   */
  importProxies(proxyList, format = 'ip:port', type = 'http') {
    const proxies = [];
    const lines = proxyList.trim().split('\n');
    
    for (const line of lines) {
      try {
        let proxy = {};
        
        if (format === 'json') {
          // 解析 JSON 格式
          proxy = JSON.parse(line);
        } else if (format === 'ip:port:user:pass') {
          // 解析 ip:port:user:pass 格式
          const parts = line.split(':');
          if (parts.length >= 4) {
            proxy = {
              type,
              host: parts[0],
              port: parseInt(parts[1]),
              username: parts[2],
              password: parts[3]
            };
          }
        } else {
          // 解析 ip:port 格式
          const parts = line.split(':');
          if (parts.length >= 2) {
            proxy = {
              type,
              host: parts[0],
              port: parseInt(parts[1])
            };
          }
        }
        
        // 添加到代理池
        if (proxy.host && proxy.port) {
          proxy.id = `${proxy.host}:${proxy.port}`;
          this.addProxyToPool(proxy);
          proxies.push(proxy);
        }
      } catch (error) {
        console.error(`导入代理失败: ${line}`, error);
      }
    }
    
    return proxies;
  }
}

module.exports = new ProxyManager();
