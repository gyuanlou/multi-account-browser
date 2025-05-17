/**
 * Cookie 和本地存储管理服务
 * 负责浏览器 Cookie 和本地存储的查看、编辑和导入导出
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { chromium, firefox, webkit } = require('playwright');
const browserManager = require('./browser-manager');

class CookieManager {
  /**
   * 获取指定配置文件的所有 Cookie
   * @param {string} profileId 配置文件 ID
   * @param {string} url 可选，指定网站的 URL
   * @param {boolean} forceRefresh 可选，强制从浏览器获取最新的 Cookie，而不是从配置文件中获取
   * @returns {Promise<Array>} Cookie 列表
   */
  async getCookies(profileId, url = null, forceRefresh = false) {
    try {
      console.log(`获取 Cookie, 配置文件 ID: ${profileId}, URL: ${url}, 强制刷新: ${forceRefresh}`);
      
      // 如果强制刷新，直接从浏览器获取
      if (forceRefresh) {
        console.log(`强制从浏览器获取最新 Cookie`);
      } else {
        // 先从配置文件中获取 Cookie
        if (url) {
          try {
            // 获取配置文件
            const profileManager = require('./profile-manager');
            const profile = profileManager.getProfileById(profileId);
            
            if (profile && profile.cookies && profile.cookies.length > 0) {
              // 提取域名
              const urlObj = new URL(url);
              const domain = urlObj.hostname;
              
              // 查找当前域名的 Cookie 记录
              const domainCookie = profile.cookies.find(c => c.domain === domain);
              
              if (domainCookie && domainCookie.cookies && domainCookie.cookies.length > 0) {
                console.log(`从配置文件中找到 ${domainCookie.cookies.length} 个 Cookie`);
                return domainCookie.cookies;
              }
            }
          } catch (profileError) {
            console.warn(`从配置文件中获取 Cookie 失败:`, profileError);
            // 如果从配置文件中获取失败，则从浏览器中获取
          }
        }
      }
      
      // 如果强制刷新或从配置文件中没有找到 Cookie，则从浏览器中获取
      console.log(`从浏览器中获取 Cookie`);
      
      // 获取浏览器实例
      const browser = await this.connectToBrowser(profileId);
      
      // 使用 Playwright 的 context 来获取 Cookie
      // Playwright 不使用 CDP 会话，而是直接使用 context.cookies() 方法
      let cookiesList = [];
      
      if (url) {
        // 获取特定 URL 的 Cookie
        cookiesList = await browser.cookies([url]);
      } else {
        // 获取所有 Cookie
        cookiesList = await browser.cookies();
      }
      
      console.log(`从浏览器中获取到 ${cookiesList.length} 个 Cookie`);
      
      return cookiesList;
    } catch (error) {
      console.error('获取 Cookie 失败:', error);
      throw new Error(`获取 Cookie 失败: ${error.message}`);
    }
  }

  /**
   * 设置 Cookie
   * @param {string} profileId 配置文件 ID
   * @param {Object} cookie Cookie 对象
   * @returns {Promise<boolean>} 是否设置成功
   */
  async setCookie(profileId, cookie) {
    try {
      console.log(`准备设置 Cookie, 配置文件 ID: ${profileId}`);
      console.log('Cookie 对象:', JSON.stringify(cookie, null, 2));
      
      if (!profileId) {
        throw new Error('profileId 不能为空');
      }
      
      if (!cookie || !cookie.name || !cookie.value) {
        throw new Error('Cookie 对象不完整，必须包含 name 和 value');
      }
      
      // 获取浏览器实例
      console.log('尝试连接到浏览器...');
      const browser = await this.connectToBrowser(profileId);
      console.log('成功连接到浏览器');
      
      // 使用 Playwright 的 API 设置 Cookie
      console.log('设置 Cookie...');
      
      // 转换 cookie 格式为 Playwright 格式
      const playwrightCookie = {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite
      };
      
      // 设置 Cookie
      await browser.addCookies([playwrightCookie]);
      console.log('Cookie 设置成功');
      
      // 保存到配置文件
      try {
        const profileManager = require('./profile-manager');
        const profile = profileManager.getProfileById(profileId);
        
        if (profile) {
          // 确保 cookies 数组存在
          if (!profile.cookies) {
            profile.cookies = [];
          }
          
          // 提取域名
          const domain = cookie.domain || (cookie.url ? new URL(cookie.url).hostname : null);
          
          if (domain) {
            // 查找当前域名的 Cookie 记录
            let domainCookie = profile.cookies.find(c => c.domain === domain);
            
            if (!domainCookie) {
              // 如果不存在，创建新的域名记录
              domainCookie = {
                domain: domain,
                cookies: []
              };
              profile.cookies.push(domainCookie);
            }
            
            // 确保 cookies 数组存在
            if (!domainCookie.cookies) {
              domainCookie.cookies = [];
            }
            
            // 查找是否已存在相同名称的 Cookie
            const existingCookieIndex = domainCookie.cookies.findIndex(c => c.name === cookie.name);
            
            if (existingCookieIndex !== -1) {
              // 如果存在，更新它
              domainCookie.cookies[existingCookieIndex] = cookie;
            } else {
              // 如果不存在，添加新的
              domainCookie.cookies.push(cookie);
            }
            
            // 保存更新后的配置文件
            profileManager.saveProfile(profile);
            console.log('Cookie 已保存到配置文件');
          }
        }
      } catch (profileError) {
        console.warn('保存 Cookie 到配置文件失败:', profileError);
        // 保存到配置文件失败不应该影响整个操作的成功
      }
      
      console.log('Cookie 设置成功');
      return true;
    } catch (error) {
      console.error('设置 Cookie 失败:', error);
      throw new Error(`设置 Cookie 失败: ${error.message}`);
    }
  }

  /**
   * 删除 Cookie
   * @param {string} profileId 配置文件 ID
   * @param {string} url Cookie 的 URL
   * @param {string} name Cookie 名称
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteCookie(profileId, url, name) {
    try {
      console.log(`准备删除 Cookie, 配置文件 ID: ${profileId}, URL: ${url}, 名称: ${name}`);
      
      // 参数验证
      if (!profileId) {
        throw new Error('profileId 不能为空');
      }
      
      if (!url) {
        throw new Error('url 不能为空');
      }
      
      if (!name) {
        throw new Error('name 不能为空');
      }
      
      // 获取浏览器实例
      console.log('尝试连接到浏览器...');
      const browser = await this.connectToBrowser(profileId);
      console.log('成功连接到浏览器');
      
      // 获取域名
      let domain;
      try {
        domain = new URL(url).hostname;
        console.log(`解析域名成功: ${domain}`);
      } catch (e) {
        console.error(`解析 URL 失败: ${url}`, e);
        throw new Error(`无效的 URL: ${url}`);
      }
      
      // 获取当前所有 Cookie
      console.log(`获取当前 Cookie...`);
      const cookies = await browser.cookies([url]);
      
      // 找到要删除的 Cookie
      const cookieToDelete = cookies.find(c => c.name === name && c.domain.includes(domain));
      
      if (cookieToDelete) {
        // 使用 Playwright 的 API 删除 Cookie
        console.log(`准备删除 Cookie: ${name} 从 ${domain}`);
        await browser.deleteCookies({
          name: name,
          domain: cookieToDelete.domain,
          path: cookieToDelete.path
        });
        console.log('Cookie 删除成功');
      } else {
        console.log(`未找到要删除的 Cookie: ${name}`);
      }
      
      // 从配置文件中删除 Cookie
      try {
        const profileManager = require('./profile-manager');
        const profile = profileManager.getProfileById(profileId);
        
        if (profile && profile.cookies && profile.cookies.length > 0) {
          // 找到对应域名的 Cookie 记录
          const domainIndex = profile.cookies.findIndex(c => c.domain === domain);
          
          if (domainIndex !== -1) {
            const domainCookie = profile.cookies[domainIndex];
            
            // 从域名的 Cookie 列表中移除指定的 Cookie
            if (domainCookie.cookies && domainCookie.cookies.length > 0) {
              const cookieIndex = domainCookie.cookies.findIndex(c => c.name === name);
              
              if (cookieIndex !== -1) {
                domainCookie.cookies.splice(cookieIndex, 1);
                
                // 如果该域名下没有其他 Cookie，则移除整个域名记录
                if (domainCookie.cookies.length === 0) {
                  profile.cookies.splice(domainIndex, 1);
                }
                
                // 保存更新后的配置文件
                profileManager.saveProfile(profile);
                console.log(`从配置文件中删除 Cookie 成功: ${name}`);
              }
            }
          }
        }
      } catch (profileError) {
        console.warn(`从配置文件中删除 Cookie 失败:`, profileError);
        // 从配置文件中删除失败不应该影响整个操作的成功
      }
      
      console.log('Cookie 删除成功');
      return true;
    } catch (error) {
      console.error('删除 Cookie 失败:', error);
      throw new Error(`删除 Cookie 失败: ${error.message}`);
    }
  }

  /**
   * 删除特定域名的所有 Cookie
   * @param {string} profileId 配置文件 ID
   * @param {string} url 网站 URL
   * @returns {Promise<{success: boolean, count: number}>} 删除结果
   */
  async deleteDomainCookies(profileId, url) {
    try {
      console.log(`准备删除域名的所有 Cookie, 配置文件 ID: ${profileId}, URL: ${url}`);
      
      // 参数验证
      if (!profileId) {
        throw new Error('profileId 不能为空');
      }
      
      if (!url) {
        throw new Error('url 不能为空');
      }
      
      // 获取域名
      let domain;
      try {
        domain = new URL(url).hostname;
        console.log(`解析域名成功: ${domain}`);
      } catch (e) {
        console.error(`解析 URL 失败: ${url}`, e);
        throw new Error(`无效的 URL: ${url}`);
      }
      
      // 获取浏览器实例
      console.log('尝试连接到浏览器...');
      const browser = await this.connectToBrowser(profileId);
      console.log('成功连接到浏览器');
      
      // 使用 Playwright 的 API 获取 Cookie
      console.log(`获取域名 ${domain} 的所有 Cookie`);
      
      // 在 Playwright 中，我们可以直接使用 context.cookies() 方法
      const cookiesList = await browser.cookies([url]);
      
      // 如果需要使用 CDP 功能，可以创建一个页面和 CDP 会话
      console.log('创建新页面...');
      const page = await browser.newPage();
      console.log('创建 CDP 会话...');
      // 使用 Playwright 的 CDP 会话 API
      const client = await page.context().newCDPSession(page);
      console.log(`获取到 ${cookiesList.length} 个 Cookie`);
      
      // 如果没有 Cookie，直接返回
      if (cookiesList.length === 0) {
        console.log(`域名 ${domain} 没有 Cookie，无需删除`);
        await page.close();
        return { success: true, count: 0 };
      }
      
      // 逐个删除 Cookie
      console.log(`开始删除域名 ${domain} 的 ${cookiesList.length} 个 Cookie`);
      let successCount = 0;
      
      for (const cookie of cookiesList) {
        try {
          console.log(`尝试删除 Cookie: ${cookie.name}, 域名: ${cookie.domain}, 路径: ${cookie.path}`);
          
          // 删除 Cookie
          await client.send('Network.deleteCookies', { 
            name: cookie.name,
            domain: cookie.domain || domain,
            path: cookie.path || '/'
          });
          
          successCount++;
          console.log(`删除 Cookie ${cookie.name} 成功`);
        } catch (deleteError) {
          console.warn(`删除 Cookie ${cookie.name} 失败:`, deleteError);
        }
      }
      
      // 确认最终结果
      const finalCheck = await client.send('Network.getCookies', { urls: [url] });
      const finalCookies = finalCheck.cookies || [];
      console.log(`删除操作完成，域名 ${domain} 原有 ${cookiesList.length} 个 Cookie，成功删除 ${successCount} 个，现剩 ${finalCookies.length} 个`);
      
      // 关闭页面
      await page.close();
      
      // 从配置文件中删除该域名的所有 Cookie
      try {
        const profileManager = require('./profile-manager');
        const profile = profileManager.getProfileById(profileId);
        
        if (profile && profile.cookies && profile.cookies.length > 0) {
          // 找到对应域名的 Cookie 记录
          const domainIndex = profile.cookies.findIndex(c => c.domain === domain);
          
          if (domainIndex !== -1) {
            // 移除整个域名记录
            profile.cookies.splice(domainIndex, 1);
            
            // 保存更新后的配置文件
            profileManager.saveProfile(profile);
            console.log(`从配置文件中删除域名 ${domain} 的所有 Cookie 成功`);
          }
        }
      } catch (profileError) {
        console.warn(`从配置文件中删除域名 Cookie 失败:`, profileError);
        // 从配置文件中删除失败不应该影响整个操作的成功
      }
      
      return { success: true, count: successCount };
    } catch (error) {
      console.error('删除域名 Cookie 失败:', error);
      throw new Error(`删除域名 Cookie 失败: ${error.message}`);
    }
  }

  /**
   * 清除所有 Cookie
   * @param {string} profileId 配置文件 ID
   * @param {string} url 可选，指定网站的 URL
   * @returns {Promise<boolean>} 是否清除成功
   */
  async clearCookies(profileId, url = null) {
    try {
      // 获取浏览器实例
      const browser = await this.connectToBrowser(profileId);
      
      if (url) {
        // 使用 Playwright API 获取并删除指定 URL 的 Cookie
        const cookies = await browser.cookies([url]);
        
        // 逐个删除 Cookie
        for (const cookie of cookies) {
          await browser.deleteCookies({
            name: cookie.name,
            domain: cookie.domain,
            path: cookie.path
          });
        }
      } else {
        // 清除所有 Cookie - 在 Playwright 中没有直接的方法清除所有 Cookie
        // 我们需要获取所有 Cookie 然后逐个删除
        const allCookies = await browser.cookies();
        for (const cookie of allCookies) {
          await browser.deleteCookies({
            name: cookie.name,
            domain: cookie.domain,
            path: cookie.path
          });
        }
        
        // 如果需要使用 CDP 功能，可以创建一个页面和 CDP 会话
        const page = await browser.newPage();
        const client = await page.context().newCDPSession(page);
        await client.send('Network.clearBrowserCookies');
        await page.close();
      }
      
      // 关闭页面
      await page.close();
      
      return true;
    } catch (error) {
      console.error('清除 Cookie 失败:', error);
      throw new Error(`清除 Cookie 失败: ${error.message}`);
    }
  }

  /**
   * 导出 Cookie 到文件
   * @param {string} profileId 配置文件 ID
   * @param {string} filePath 导出文件路径
   * @param {string} url 可选，指定网站的 URL
   * @returns {Promise<Object>} 导出结果
   */
  async exportCookies(profileId, filePath, url = null) {
    try {
      // 获取 Cookie
      const cookies = await this.getCookies(profileId, url);
      
      // 写入文件
      fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2));
      
      return {
        success: true,
        count: cookies.length,
        filePath: filePath
      };
    } catch (error) {
      console.error('导出 Cookie 失败:', error);
      throw new Error(`导出 Cookie 失败: ${error.message}`);
    }
  }

  /**
   * 导入 Cookie 从文件
   * @param {string} profileId 配置文件 ID
   * @param {string} filePath 导入文件路径
   * @returns {Promise<Object>} 导入结果
   */
  async importCookies(profileId, filePath) {
    try {
      // 读取文件
      const cookiesData = fs.readFileSync(filePath, 'utf8');
      const cookies = JSON.parse(cookiesData);
      
      if (!Array.isArray(cookies)) {
        throw new Error('无效的 Cookie 格式，应为数组');
      }
      
      // 获取浏览器实例
      const browser = await this.connectToBrowser(profileId);
      
      // 使用 Playwright API 设置 Cookie
      // 逐个设置 Cookie
      let successCount = 0;
      for (const cookie of cookies) {
        try {
          // 转换 cookie 格式为 Playwright 格式
          const playwrightCookie = {
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path || '/',
            expires: cookie.expires,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite
          };
          
          // 设置 Cookie
          await browser.addCookies([playwrightCookie]);
          successCount++;
        } catch (setCookieError) {
          console.warn(`设置 Cookie 失败: ${cookie.name}`, setCookieError);
        }
      }
      
      // 关闭页面
      await page.close();
      
      return {
        success: true,
        count: successCount,
        total: cookies.length
      };
    } catch (error) {
      console.error('导入 Cookie 失败:', error);
      throw new Error(`导入 Cookie 失败: ${error.message}`);
    }
  }

  /**
   * 获取本地存储
   * @param {string} profileId 配置文件 ID
   * @param {string} url 网站 URL
   * @param {string} storageType 存储类型，localStorage 或 sessionStorage
   * @returns {Promise<Object>} 本地存储数据
   */
  async getLocalStorage(profileId, url, storageType = 'localStorage') {
    try {
      // 获取浏览器实例
      const browser = await this.connectToBrowser(profileId);
      
      // 创建页面并导航到指定 URL
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // 获取本地存储
      const storage = await page.evaluate((type) => {
        const storage = type === 'localStorage' ? localStorage : sessionStorage;
        const result = {};
        
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          result[key] = storage.getItem(key);
        }
        
        return result;
      }, storageType);
      
      // 关闭页面
      await page.close();
      
      return storage;
    } catch (error) {
      console.error('获取本地存储失败:', error);
      throw new Error(`获取本地存储失败: ${error.message}`);
    }
  }

  /**
   * 设置本地存储
   * @param {string} profileId 配置文件 ID
   * @param {string} url 网站 URL
   * @param {Object} data 要设置的数据
   * @param {string} storageType 存储类型，localStorage 或 sessionStorage
   * @returns {Promise<boolean>} 是否设置成功
   */
  async setLocalStorage(profileId, url, data, storageType = 'localStorage') {
    try {
      // 获取浏览器实例
      const browser = await this.connectToBrowser(profileId);
      
      // 创建页面并导航到指定 URL
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // 设置本地存储
      await page.evaluate((type, data) => {
        const storage = type === 'localStorage' ? localStorage : sessionStorage;
        
        for (const [key, value] of Object.entries(data)) {
          storage.setItem(key, value);
        }
      }, storageType, data);
      
      // 关闭页面
      await page.close();
      
      return true;
    } catch (error) {
      console.error('设置本地存储失败:', error);
      throw new Error(`设置本地存储失败: ${error.message}`);
    }
  }

  /**
   * 清除本地存储
   * @param {string} profileId 配置文件 ID
   * @param {string} url 网站 URL
   * @param {string} storageType 存储类型，localStorage 或 sessionStorage
   * @returns {Promise<boolean>} 是否清除成功
   */
  async clearLocalStorage(profileId, url, storageType = 'localStorage') {
    try {
      // 获取浏览器实例
      const browser = await this.connectToBrowser(profileId);
      
      // 创建页面并导航到指定 URL
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // 清除本地存储
      await page.evaluate((type) => {
        const storage = type === 'localStorage' ? localStorage : sessionStorage;
        storage.clear();
      }, storageType);
      
      // 关闭页面
      await page.close();
      
      return true;
    } catch (error) {
      console.error('清除本地存储失败:', error);
      throw new Error(`清除本地存储失败: ${error.message}`);
    }
  }
  
  /**
   * 刷新指定配置文件的 Cookie
   * @param {string} profileId 配置文件 ID
   * @param {string} url 可选，指定网站的 URL
   * @returns {Promise<Object>} 刷新结果
   */
  async refreshCookies(profileId, url = null) {
    try {
      console.log(`刷新 Cookie, 配置文件 ID: ${profileId}, URL: ${url}`);
      
      // 获取浏览器实例
      const browser = await this.connectToBrowser(profileId);
      
      // 获取当前的 Cookie
      const cookies = await this.getCookies(profileId, url, true);
      
      if (!cookies || cookies.length === 0) {
        console.log('没有找到需要刷新的 Cookie');
        return { success: true, message: '没有找到需要刷新的 Cookie', count: 0 };
      }
      
      // 如果指定了 URL，则尝试保存到配置文件
      if (url) {
        try {
          // 获取配置文件
          const profileManager = require('./profile-manager');
          const profile = profileManager.getProfileById(profileId);
          
          if (profile) {
            // 提取域名
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            
            // 初始化 cookies 数组（如果不存在）
            if (!profile.cookies) {
              profile.cookies = [];
            }
            
            // 查找当前域名的 Cookie 记录
            let domainCookieIndex = profile.cookies.findIndex(c => c.domain === domain);
            
            if (domainCookieIndex !== -1) {
              // 更新现有记录
              profile.cookies[domainCookieIndex].cookies = cookies;
              profile.cookies[domainCookieIndex].lastUpdated = new Date().toISOString();
            } else {
              // 添加新记录
              profile.cookies.push({
                domain,
                cookies,
                lastUpdated: new Date().toISOString()
              });
            }
            
            // 保存配置文件
            await profileManager.saveProfile(profile);
            console.log(`已将 ${cookies.length} 个 Cookie 保存到配置文件`);
          }
        } catch (profileError) {
          console.warn(`将 Cookie 保存到配置文件失败:`, profileError);
          // 如果保存失败，仍然继续刷新操作
        }
      }
      
      return { 
        success: true, 
        message: `成功刷新 ${cookies.length} 个 Cookie`, 
        count: cookies.length 
      };
    } catch (error) {
      console.error('刷新 Cookie 失败:', error);
      throw new Error(`刷新 Cookie 失败: ${error.message}`);
    }
  }

  /**
   * 连接到浏览器实例
   * @param {string} profileId 配置文件 ID
   * @returns {Promise<Object>} 浏览器实例
   * @private
   */
  async connectToBrowser(profileId) {
    try {
      console.log(`尝试连接到配置文件 ID 为 ${profileId} 的浏览器实例`);
      
      // 检查是否有正在运行的浏览器实例
      if (!browserManager.browserInstances.has(profileId)) {
        console.log(`没有找到配置文件 ID 为 ${profileId} 的浏览器实例记录`);
        throw new Error(`没有找到配置文件 ID 为 ${profileId} 的正在运行的浏览器实例`);
      }
      
      const instance = browserManager.browserInstances.get(profileId);
      console.log(`找到浏览器实例，状态: ${instance.status}`);
      
      // 检查实例状态
      if (instance.status !== 'running') {
        console.log(`浏览器实例已经不在运行状态，当前状态: ${instance.status}`);
        throw new Error(`浏览器实例已经不在运行状态，当前状态: ${instance.status}`);
      }
      
      // 直接使用已经存在的浏览器实例
      if (instance.browser) {
        console.log('使用现有浏览器实例');
        
        // 检查浏览器实例是否有效
        try {
          // 对于 Playwright 实例，我们可以检查连接状态
          if (typeof instance.browser.isConnected === 'function') {
            if (!instance.browser.isConnected()) {
              console.log('浏览器实例已断开连接');
              throw new Error('浏览器实例已断开连接');
            }
          }
          
          // 注意：不再检查 _connection.isConnected，因为这个方法可能不存在
          
          // 如果检查通过，返回浏览器实例
          return instance.browser;
        } catch (connectionError) {
          console.error('检查浏览器连接状态时出错:', connectionError);
          // 如果连接已断开，尝试重新启动浏览器
          instance.status = 'closed';
          throw new Error(`浏览器实例连接已断开: ${connectionError.message}`);
        }
      }
      
      // 如果没有浏览器实例，尝试启动新的浏览器
      console.log('尝试启动新的浏览器实例');
      const browser = await browserManager.launchBrowser(profileId);
      return browser;
      
    } catch (error) {
      console.error('连接到浏览器失败:', error);
      throw new Error(`连接到浏览器失败: ${error.message}`);
    }
  }
}

module.exports = new CookieManager();
