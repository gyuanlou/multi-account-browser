/**
 * Cookie 和本地存储管理服务
 * 负责浏览器 Cookie 和本地存储的查看、编辑和导入导出
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { chromium, firefox, webkit } = require('playwright');
const browserManager = require('./browser-manager');
// 直接定义状态常量，避免导入时序问题
const INSTANCE_STATUS = {
  STARTING: 'starting',  // 正在启动
  RUNNING: 'running',    // 正在运行
  CLOSING: 'closing',    // 正在关闭
  CLOSED: 'closed',      // 已关闭
  ERROR: 'error'         // 出错
};

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
      
      // 检查参数
      if (!profileId) {
        console.error('配置文件 ID 不能为空');
        throw new Error('配置文件 ID 不能为空');
      }
      
      if (url) {
        // 直接使用内联函数验证 URL，避免使用 this.isValidUrl
        try {
          new URL(url);
        } catch (e) {
          console.error(`无效的 URL: ${url}`);
          throw new Error(`无效的 URL: ${url}`);
        }
      }
      
      // 如果强制刷新，直接从浏览器获取
      if (forceRefresh) {
        console.log(`强制从浏览器获取最新 Cookie`);
      } else {
        // 先从配置文件中获取 Cookie
        if (url) {
          try {
            // 获取配置文件
            const profileManager = require('./profile-manager');
            console.log('从配置文件管理器中获取配置文件...');
            const profile = profileManager.getProfileById(profileId);
            
            if (!profile) {
              console.warn(`未找到 ID 为 ${profileId} 的配置文件`);
            } else if (profile.cookies && profile.cookies.length > 0) {
              // 提取域名
              const urlObj = new URL(url);
              const domain = urlObj.hostname;
              console.log(`当前 URL 的域名: ${domain}`);
              
              // 查找当前域名的 Cookie 记录
              const domainCookie = profile.cookies.find(c => c.domain === domain);
              
              if (domainCookie && domainCookie.cookies && domainCookie.cookies.length > 0) {
                console.log(`从配置文件中找到 ${domainCookie.cookies.length} 个 Cookie`);
                return domainCookie.cookies;
              } else {
                console.log(`配置文件中没有找到域名 ${domain} 的 Cookie`);
              }
            } else {
              console.log('配置文件中没有 Cookie 数据');
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
      console.log(`连接到浏览器实例 (profileId: ${profileId})...`);
      const browser = await this.connectToBrowser(profileId);
      console.log('浏览器实例连接成功');
      
      // 使用 Playwright 的 context 来获取 Cookie
      let cookiesList = [];
      
      try {
        // 获取浏览器上下文
        let context;
        
        // 输出浏览器实例类型
        console.log(`浏览器实例类型: ${browser.constructor ? browser.constructor.name : 'Unknown'}`);
        
        // 输出浏览器实例可用的方法
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(browser));
        console.log(`浏览器实例可用的方法: ${methods.join(', ')}`);
        
        // 检查浏览器实例是否自身就是上下文
        // 在 Playwright 中，使用 launchPersistentContext 方法启动的浏览器实例本身就是上下文
        if (typeof browser.cookies === 'function' && typeof browser.addCookies === 'function') {
          console.log('浏览器实例本身就是上下文，直接使用');
          context = browser;
        }
        // 兼容不同的浏览器 API
        else if (browser.contexts && typeof browser.contexts === 'function') {
          const contexts = browser.contexts();
          if (contexts && contexts.length > 0) {
            context = contexts[0];
            console.log('使用 browser.contexts()[0] 获取上下文');
          }
        } else if (browser.context && typeof browser.context === 'function') {
          context = browser.context();
          console.log('使用 browser.context() 获取上下文');
        } else if (browser.defaultBrowserContext && typeof browser.defaultBrowserContext === 'function') {
          context = browser.defaultBrowserContext();
          console.log('使用 browser.defaultBrowserContext() 获取上下文');
        } else if (browser._browserContexts && browser._browserContexts.length > 0) {
          context = browser._browserContexts[0];
          console.log('使用 browser._browserContexts[0] 获取上下文');
        }
        
        if (!context) {
          console.error('无法获取浏览器上下文，尝试创建新上下文');
          
          // 如果无法获取上下文，尝试创建新上下文
          if (typeof browser.newContext === 'function') {
            try {
              context = await browser.newContext();
              console.log('创建了新的浏览器上下文');
            } catch (error) {
              console.error('创建新的浏览器上下文失败:', error);
              // 如果创建失败，尝试其他方法
              if (typeof browser.pages === 'function') {
                try {
                  const pages = await browser.pages();
                  if (pages && pages.length > 0) {
                    context = pages[0].context();
                    console.log('使用现有页面的上下文');
                  }
                } catch (pagesError) {
                  console.error('获取页面失败:', pagesError);
                }
              }
            }
          }
          
          // 如果仍然无法获取上下文，尝试将浏览器实例本身作为上下文
          if (!context && typeof browser.cookies === 'function') {
            console.log('将浏览器实例本身作为上下文');
            context = browser;
          } else if (!context) {
            throw new Error('无法获取或创建浏览器上下文');
          }
        }
        
        // 获取 Cookie
        if (url) {
          try {
            // 获取特定 URL 的 Cookie
            cookiesList = await context.cookies([url]);
            console.log(`获取 URL ${url} 的 Cookie: ${cookiesList.length} 个`);
          } catch (cookieError) {
            console.error(`使用 context.cookies() 获取 Cookie 失败:`, cookieError);
          }
        } else {
          try {
            // 获取所有 Cookie
            cookiesList = await context.cookies();
            console.log(`获取所有 Cookie: ${cookiesList.length} 个`);
          } catch (cookieError) {
            console.error(`使用 context.cookies() 获取所有 Cookie 失败:`, cookieError);
          }
        }
        
        // 如果使用上下文方法获取失败，尝试使用页面方法
        if (cookiesList.length === 0) {
          console.log('使用上下文方法获取 Cookie 失败，尝试使用页面方法');
          
          // 获取现有页面或创建新页面
          let page;
          let newPageCreated = false;
          
          try {
            const pages = await context.pages();
            if (pages && pages.length > 0) {
              page = pages[0];
              console.log('使用现有页面');
            } else {
              page = await context.newPage();
              newPageCreated = true;
              console.log('创建了新页面');
            }
            
            // 如果有 URL，先导航到该页面
            if (url) {
              console.log(`导航到 ${url}...`);
              await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => {
                console.warn(`导航到 ${url} 失败: ${e.message}`);
              });
            }
            
            // 使用 page.context().cookies() 获取 Cookie
            try {
              if (url) {
                cookiesList = await page.context().cookies([url]);
              } else {
                cookiesList = await page.context().cookies();
              }
              console.log(`使用 page.context().cookies() 获取到 ${cookiesList.length} 个 Cookie`);
            } catch (pageContextError) {
              console.warn(`使用 page.context().cookies() 获取 Cookie 失败:`, pageContextError);
            }
            
            // 如果还是获取不到，尝试使用 CDP 会话
            if (cookiesList.length === 0) {
              try {
                console.log('尝试使用 CDP 会话获取 Cookie...');
                const client = await page.context().newCDPSession(page);
                const result = await client.send('Network.getAllCookies');
                cookiesList = result.cookies || [];
                console.log(`使用 CDP 获取到 ${cookiesList.length} 个 Cookie`);
                
                // 如果有 URL，过滤出相关的 Cookie
                if (url) {
                  const urlObj = new URL(url);
                  const domain = urlObj.hostname;
                  cookiesList = cookiesList.filter(cookie => {
                    return cookie.domain === domain || cookie.domain === '.' + domain || domain.endsWith(cookie.domain.replace(/^\./, ''));
                  });
                  console.log(`过滤后与 ${domain} 相关的 Cookie: ${cookiesList.length} 个`);
                }
              } catch (cdpError) {
                console.warn(`使用 CDP 获取 Cookie 失败: ${cdpError.message}`);
              }
            }
            
            // 如果创建了新页面，关闭它
            if (newPageCreated) {
              console.log('关闭创建的新页面');
              await page.close().catch(e => console.warn(`关闭页面失败: ${e.message}`));
            }
          } catch (pageError) {
            console.error('使用页面方法获取 Cookie 失败:', pageError);
          }
        }
      } catch (browserError) {
        console.error(`从浏览器获取 Cookie 失败: ${browserError.message}`);
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
      // 获取浏览器上下文
      let context;
      
      // 检查浏览器实例是否自身就是上下文
      if (typeof browser.cookies === 'function' && typeof browser.addCookies === 'function') {
        console.log('浏览器实例本身就是上下文，直接使用');
        context = browser;
      }
      // 兼容不同的浏览器 API
      else if (browser.contexts && typeof browser.contexts === 'function') {
        const contexts = browser.contexts();
        if (contexts && contexts.length > 0) {
          context = contexts[0];
          console.log('使用 browser.contexts()[0] 获取上下文');
        }
      } else if (browser.context && typeof browser.context === 'function') {
        context = browser.context();
        console.log('使用 browser.context() 获取上下文');
      }
      
      if (!context) {
        console.error('无法获取浏览器上下文，将浏览器实例作为上下文');
        context = browser;
      }
      
      // 设置 Cookie
      try {
        await context.addCookies([playwrightCookie]);
        console.log('Cookie 设置成功');
      } catch (cookieError) {
        console.error('Cookie 设置失败:', cookieError);
        throw new Error(`Cookie 设置失败: ${cookieError.message}`);
      }
      
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
      let cookies = [];
      
      // 兼容 Playwright 的 API
      if (browser.contexts && browser.contexts().length > 0) {
        // 如果是浏览器对象，使用第一个 context 获取 cookie
        const context = browser.contexts()[0];
        cookies = await context.cookies([url]);
      } 
      
      // 找到要删除的 Cookie
      const cookieToDelete = cookies.find(c => c.name === name && c.domain.includes(domain));
      
      if (cookieToDelete) {
        // 使用 Playwright 的 API 删除 Cookie
        console.log(`准备删除 Cookie: ${name} 从 ${domain}`);
        
        // 兼容 Playwright 的 API
        if (browser.contexts && browser.contexts().length > 0) {
          // 如果是浏览器对象，使用第一个 context 删除 cookie
          const context = browser.contexts()[0];
          await context.clearCookies({
            name: name,
            domain: cookieToDelete.domain,
            path: cookieToDelete.path
          });
        } 
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
      let cookiesList = [];
      let context = null;
      
      // 获取浏览器上下文
      // 检查浏览器实例是否自身就是上下文
      if (typeof browser.cookies === 'function' && typeof browser.addCookies === 'function') {
        console.log('浏览器实例本身就是上下文，直接使用');
        context = browser;
      }
      // 兼容不同的浏览器 API
      else if (browser.contexts && typeof browser.contexts === 'function') {
        const contexts = browser.contexts();
        if (contexts && contexts.length > 0) {
          context = contexts[0];
          console.log('使用 browser.contexts()[0] 获取上下文');
        }
      } else if (browser.context && typeof browser.context === 'function') {
        context = browser.context();
        console.log('使用 browser.context() 获取上下文');
      } else if (browser.defaultBrowserContext && typeof browser.defaultBrowserContext === 'function') {
        context = browser.defaultBrowserContext();
        console.log('使用 browser.defaultBrowserContext() 获取上下文');
      } else if (browser._browserContexts && browser._browserContexts.length > 0) {
        context = browser._browserContexts[0];
        console.log('使用 browser._browserContexts[0] 获取上下文');
      }
      
      // 如果仍然无法获取上下文，尝试将浏览器实例本身作为上下文
      if (!context) {
        console.log('无法获取浏览器上下文，将浏览器实例作为上下文');
        context = browser;
      }
      
      // 获取 Cookie
      try {
        cookiesList = await context.cookies([url]);
        console.log(`获取到 ${cookiesList.length} 个 Cookie`);
      } catch (cookieError) {
        console.error('获取 Cookie 失败:', cookieError);
        cookiesList = [];
      }
      
      // 如果没有 Cookie，直接返回
      if (cookiesList.length === 0) {
        console.log(`域名 ${domain} 没有 Cookie，无需删除`);
        return { success: true, count: 0 };
      }
      
      // 创建新页面以便访问 CDP 功能（如果需要）
      let page = null;
      try {
        console.log('尝试创建新页面...');
        page = await context.newPage();
        console.log('新页面创建成功');
      } catch (pageError) {
        console.warn('创建新页面失败:', pageError);
        // 如果无法创建新页面，尝试使用现有页面
        if (typeof context.pages === 'function') {
          try {
            const pages = await context.pages();
            if (pages && pages.length > 0) {
              page = pages[0];
              console.log('使用现有页面');
            }
          } catch (pagesError) {
            console.warn('获取现有页面失败:', pagesError);
          }
        }
      }
      
      console.log(`开始删除域名 ${domain} 的 ${cookiesList.length} 个 Cookie`);
      let successCount = 0;
      
      // 使用 Playwright 的 API 删除 Cookie
      if (context) {
        // 使用 Playwright 的 context API 删除 cookie
        try {
          // 先记录要删除的 cookie 名称
          const cookieNames = cookiesList.map(c => c.name);
          
          // 清除所有与该域名相关的 cookie
          await context.clearCookies();
          console.log('清除所有 Cookie 成功');
          
          // 获取所有 Cookie
          let allCookies = [];
          try {
            allCookies = await context.cookies();
            console.log(`获取到 ${allCookies.length} 个其他 Cookie`);
          } catch (getCookiesError) {
            console.warn('获取所有 Cookie 失败:', getCookiesError);
            allCookies = [];
          }
          
          // 过滤出不属于该域名的 cookie
          const otherCookies = allCookies.filter(c => !c.domain.includes(domain));
          console.log(`过滤出 ${otherCookies.length} 个不属于该域名的 Cookie`);
          
          // 重新添加不属于该域名的 cookie
          if (otherCookies.length > 0) {
            try {
              await context.addCookies(otherCookies);
              console.log(`重新添加 ${otherCookies.length} 个不属于该域名的 Cookie 成功`);
            } catch (addCookiesError) {
              console.warn('重新添加其他 Cookie 失败:', addCookiesError);
            }
          }
          
          successCount = cookieNames.length;
          console.log(`使用 Playwright API 成功删除 ${successCount} 个 Cookie`);
        } catch (deleteError) {
          console.warn(`使用 Playwright API 删除 Cookie 失败:`, deleteError);
        }
      } 
      
      // 确认最终结果
      let finalCookies = [];
      try {
        if (context) {
          finalCookies = await context.cookies([url]);
          console.log(`使用 context.cookies() 获取最终结果: ${finalCookies.length} 个 Cookie`);
        } else {
          console.warn('上下文不可用，无法获取最终结果');
        }
      } catch (finalCheckError) {
        console.warn('获取最终结果失败:', finalCheckError);
      }
      
      // 如果有页面并且没有获取到最终结果，尝试使用 CDP 会话
      if (page && finalCookies.length === 0) {
        try {
          console.log('尝试使用 CDP 会话获取最终结果...');
          const client = await page.context().newCDPSession(page);
          const finalCheck = await client.send('Network.getCookies', { urls: [url] });
          finalCookies = finalCheck.cookies || [];
          console.log(`使用 CDP 获取最终结果: ${finalCookies.length} 个 Cookie`);
        } catch (cdpError) {
          console.warn('使用 CDP 获取最终结果失败:', cdpError);
        }
      }
      
      console.log(`删除操作完成，域名 ${domain} 原有 ${cookiesList.length} 个 Cookie，成功删除 ${successCount} 个，现剩 ${finalCookies.length} 个`);
      
      // 关闭页面
      if (page) {
        try {
          await page.close();
          console.log('关闭页面成功');
        } catch (closeError) {
          console.warn('关闭页面失败:', closeError);
        }
      }
      
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
  /**
 * 清除所有 Cookie
 * @param {string} profileId 配置文件 ID
 * @param {string} url 可选，指定网站的 URL
 * @returns {Promise<boolean>} 是否清除成功
 */
async clearCookies(profileId, url = null) {
  try {
    console.log(`准备清除 Cookie, 配置文件 ID: ${profileId}, URL: ${url || '所有'}`);
    
    // 获取浏览器实例
    console.log('尝试连接到浏览器...');
    const browser = await this.connectToBrowser(profileId);
    console.log('成功连接到浏览器');
    
    // 兼容 Playwright 的 API
    if (browser.contexts && browser.contexts().length > 0) {
      // 如果是浏览器对象，使用第一个 context 清除 cookie
      console.log('使用 Playwright context API 清除 Cookie');
      const context = browser.contexts()[0];
      
      if (url) {
        // 获取特定 URL 的 Cookie
        console.log(`获取 URL ${url} 的 Cookie`);
        const cookies = await context.cookies([url]);
        console.log(`找到 ${cookies.length} 个 Cookie`);
        
        // 在 Playwright 中，我们可以使用 context.clearCookies() 清除所有 cookie
        // 然后重新添加不需要删除的 cookie
        const allCookies = await context.cookies();
        const otherCookies = allCookies.filter(c => !cookies.some(cookie => 
          cookie.name === c.name && cookie.domain === c.domain && cookie.path === c.path
        ));
        
        // 清除所有 cookie
        console.log('清除所有 Cookie');
        await context.clearCookies();
        
        // 重新添加不需要删除的 cookie
        if (otherCookies.length > 0) {
          console.log(`重新添加 ${otherCookies.length} 个不需要删除的 Cookie`);
          await context.addCookies(otherCookies);
        }
      } else {
        // 清除所有 Cookie
        console.log('清除所有 Cookie');
        await context.clearCookies();
      }
    } 
    console.log('Cookie 清除成功');
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
          if (browser.contexts && browser.contexts().length > 0) {
            // 如果是浏览器对象，使用第一个 context 设置 cookie
            const context = browser.contexts()[0];
            await context.addCookies([playwrightCookie]);
          }
          successCount++;
        } catch (setCookieError) {
          console.warn(`设置 Cookie 失败: ${cookie.name}`, setCookieError);
        }
      }
            
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
   * @param {boolean} autoLaunch 如果实例未启动，是否自动启动
   * @returns {Promise<Object|{error: string, code: string}>} 本地存储数据或错误信息
   */
  async getLocalStorage(profileId, url, storageType = 'localStorage', autoLaunch = false) {
    try {
      console.log(`准备获取本地存储, 配置文件 ID: ${profileId}, URL: ${url}, 类型: ${storageType}`);
      
      // 获取浏览器实例
      console.log('尝试连接到浏览器...');
      let browser = await this.connectToBrowser(profileId, autoLaunch);
      
      // 检查是否有错误码
      if (browser && browser.code) {
        console.log(`连接到浏览器失败，错误码: ${browser.code}, 错误信息: ${browser.error}`);
        return browser; // 返回错误信息
      }
      
      // 如果浏览器实例为 null（可能已关闭），返回空对象
      if (!browser) {
        console.log('浏览器实例为 null（可能已关闭），返回空对象');
        return {};
      }
      
      console.log('成功连接到浏览器');
      
      // 获取浏览器上下文
      let context = null;
      
      // 检查浏览器实例是否自身就是上下文
      if (typeof browser.cookies === 'function' && typeof browser.addCookies === 'function') {
        console.log('浏览器实例本身就是上下文，直接使用');
        context = browser;
      }
      // 兼容不同的浏览器 API
      else if (browser.contexts && typeof browser.contexts === 'function') {
        try {
          const contexts = browser.contexts();
          if (contexts && contexts.length > 0) {
            context = contexts[0];
            console.log('使用 browser.contexts()[0] 获取上下文');
          }
        } catch (contextError) {
          console.warn('获取浏览器上下文失败:', contextError);
        }
      } else if (browser.context && typeof browser.context === 'function') {
        try {
          context = browser.context();
          console.log('使用 browser.context() 获取上下文');
        } catch (contextError) {
          console.warn('获取浏览器上下文失败:', contextError);
        }
      } else if (browser.defaultBrowserContext && typeof browser.defaultBrowserContext === 'function') {
        try {
          context = browser.defaultBrowserContext();
          console.log('使用 browser.defaultBrowserContext() 获取上下文');
        } catch (contextError) {
          console.warn('获取浏览器上下文失败:', contextError);
        }
      } else if (browser._browserContexts && browser._browserContexts.length > 0) {
        context = browser._browserContexts[0];
        console.log('使用 browser._browserContexts[0] 获取上下文');
      }
      
      // 如果仍然无法获取上下文，尝试将浏览器实例本身作为上下文
      if (!context) {
        console.log('无法获取浏览器上下文，将浏览器实例作为上下文');
        context = browser;
      }
      
      // 检查浏览器是否已关闭
      let isBrowserClosed = false;
      
      // 检查方法 1: 使用 isConnected 方法
      if (typeof browser.isConnected === 'function') {
        try {
          if (!browser.isConnected()) {
            console.log('浏览器已断开连接，返回空对象');
            isBrowserClosed = true;
          }
        } catch (e) {
          console.log('检查浏览器连接状态时出错:', e.message);
          isBrowserClosed = true;
        }
      }
      
      // 检查方法 2: 检查浏览器实例是否有效
      if (!isBrowserClosed && browser._connection && typeof browser._connection.isConnected === 'function') {
        try {
          if (!browser._connection.isConnected()) {
            console.log('浏览器连接已断开，返回空对象');
            isBrowserClosed = true;
          }
        } catch (e) {
          console.log('检查浏览器连接状态时出错:', e.message);
          isBrowserClosed = true;
        }
      }
      
      // 检查方法 3: 尝试访问浏览器属性
      // 注意: 在 Playwright 中，有些属性可能不可用，但浏览器仍然在运行
      // 因此，我们不应该仅基于属性访问来判断浏览器是否关闭
      if (!isBrowserClosed) {
        try {
          // 尝试访问一个安全的属性
          const test = browser.version || browser.browserType || browser.userAgent;
          if (test === undefined) {
            console.log('无法访问浏览器属性，但仍然继续处理');
            // 不设置 isBrowserClosed = true，因为这可能是误报
          }
        } catch (e) {
          console.log('访问浏览器属性时出错，但仍然继续处理:', e.message);
          // 不设置 isBrowserClosed = true，因为这可能是误报
        }
      }
      
      if (isBrowserClosed) {
        return { error: '浏览器实例已关闭，请重新启动浏览器', code: 'BROWSER_CLOSED' };
      }
      
      // 创建页面
      console.log('尝试创建新页面...');
      let page = null;
      try {
        page = await context.newPage();
        console.log('新页面创建成功');
      } catch (pageError) {
        console.warn('创建新页面失败:', pageError);
        console.log('浏览器可能已关闭，返回空对象');
        return {}; // 如果无法创建页面（可能是浏览器已关闭），返回空对象
      }
      
      // 导航到指定 URL
      console.log(`尝试导航到 ${url}...`);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        console.log('导航成功');
      } catch (gotoError) {
        console.warn('导航失败:', gotoError);
        // 如果导航失败，尝试使用简单的 URL
        try {
          const simpleUrl = new URL(url).origin;
          console.log(`尝试导航到简化的 URL: ${simpleUrl}...`);
          await page.goto(simpleUrl, { waitUntil: 'domcontentloaded' });
          console.log('导航到简化 URL 成功');
        } catch (simpleGotoError) {
          console.warn('导航到简化 URL 也失败:', simpleGotoError);
          // 如果仍然失败，尝试使用空白页
          try {
            await page.goto('about:blank');
            console.log('导航到空白页');
          } catch (blankPageError) {
            console.warn('导航到空白页失败:', blankPageError);
            // 如果连空白页都无法导航，可能是浏览器已关闭
            try {
              await page.close();
            } catch (closeError) {
              console.warn('关闭页面失败:', closeError);
            }
            return {}; // 返回空对象
          }
        }
      }
      
      // 获取本地存储
      console.log(`尝试获取 ${storageType}...`);
      let storage = {};
      try {
        storage = await page.evaluate(({ type }) => {
          try {
            const storage = type === 'localStorage' ? localStorage : sessionStorage;
            const result = {};
            
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i);
              result[key] = storage.getItem(key);
            }
            
            return result;
          } catch (e) {
            console.error('在页面中获取存储失败:', e);
            return {};
          }
        }, { type: storageType });
      } catch (evaluateError) {
        console.warn('执行页面脚本失败:', evaluateError);
        // 如果执行脚本失败，可能是浏览器已关闭
        return {}; // 返回空对象
      }
      
      console.log(`成功获取 ${Object.keys(storage).length} 个存储项`);
      
      // 关闭页面
      try {
        await page.close();
        console.log('关闭页面成功');
      } catch (closeError) {
        console.warn('关闭页面失败:', closeError);
        // 如果关闭页面失败，可能是浏览器已关闭，忽略错误
      }
      
      return storage;
    } catch (error) {
      console.error('获取本地存储失败:', error);
      // 不抛出错误，而是返回空对象
      return {};
    }
  }

  /**
   * 设置本地存储
   * @param {string} profileId 配置文件 ID
   * @param {string} url 网站 URL
   * @param {Object} data 要设置的数据
   * @param {string} storageType 存储类型，localStorage 或 sessionStorage
   * @param {boolean} autoLaunch 如果实例未启动，是否自动启动
   * @returns {Promise<boolean|{error: string, code: string}>} 是否成功或错误信息
   */
  async setLocalStorage(profileId, url, data, storageType = 'localStorage', autoLaunch = true) {
    try {
      console.log(`准备设置${storageType === 'localStorage' ? '本地存储' : '会话存储'}, 配置文件 ID: ${profileId}, URL: ${url}`);
      console.log(`要设置的数据:`, JSON.stringify(data, null, 2));
      
      // 尝试连接到浏览器实例
      console.log('尝试连接到浏览器实例...');
      let browser = null;
      
      try {
        // 先尝试连接到现有实例
        browser = await this.connectToBrowser(profileId, true);
        console.log('成功连接到浏览器实例');
      } catch (connectError) {
        console.error('连接到浏览器实例失败:', connectError);
        
        // 如果连接失败，尝试启动新实例
        try {
          console.log('尝试启动新的浏览器实例...');
          browser = await this.launchBrowser(profileId);
          console.log('浏览器实例启动成功');
          
          // 等待一下，确保浏览器实例完全启动
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (launchError) {
          console.error('启动浏览器实例失败:', launchError);
          return { error: '无法启动或连接到浏览器实例', code: 'BROWSER_LAUNCH_FAILED' };
        }
      }
      
      // 检查是否有错误码
      if (browser && browser.code) {
        console.log(`连接到浏览器失败，错误码: ${browser.code}, 错误信息: ${browser.error}`);
        return browser; // 返回错误信息
      }
      
      // 如果浏览器实例为 null（可能已关闭），返回失败
      if (!browser) {
        console.log('浏览器实例为 null（可能已关闭），返回失败');
        return { error: '浏览器实例为 null', code: 'BROWSER_NULL' };
      }
      
      console.log('成功连接到浏览器');
      
      // 获取浏览器上下文
      let context = null;
      
      // 检查浏览器实例是否自身就是上下文
      if (typeof browser.cookies === 'function' && typeof browser.addCookies === 'function') {
        console.log('浏览器实例本身就是上下文，直接使用');
        context = browser;
      }
      // 兼容不同的浏览器 API
      else if (browser.contexts && typeof browser.contexts === 'function') {
        try {
          const contexts = browser.contexts();
          if (contexts && contexts.length > 0) {
            context = contexts[0];
            console.log('使用 browser.contexts()[0] 获取上下文');
          }
        } catch (contextError) {
          console.warn('获取浏览器上下文失败:', contextError);
        }
      } else if (browser.context && typeof browser.context === 'function') {
        try {
          context = browser.context();
          console.log('使用 browser.context() 获取上下文');
        } catch (contextError) {
          console.warn('获取浏览器上下文失败:', contextError);
        }
      } else if (browser.defaultBrowserContext && typeof browser.defaultBrowserContext === 'function') {
        try {
          context = browser.defaultBrowserContext();
          console.log('使用 browser.defaultBrowserContext() 获取上下文');
        } catch (contextError) {
          console.warn('获取浏览器上下文失败:', contextError);
        }
      } else if (browser._browserContexts && browser._browserContexts.length > 0) {
        context = browser._browserContexts[0];
        console.log('使用 browser._browserContexts[0] 获取上下文');
      }
      
      // 如果仍然无法获取上下文，尝试将浏览器实例本身作为上下文
      if (!context) {
        console.log('无法获取浏览器上下文，将浏览器实例作为上下文');
        context = browser;
      }
      
      // 检查浏览器是否已关闭
      let isBrowserClosed = false;
      
      // 检查方法 1: 使用 isConnected 方法
      if (typeof browser.isConnected === 'function') {
        try {
          if (!browser.isConnected()) {
            console.log('浏览器已断开连接，返回失败');
            isBrowserClosed = true;
          }
        } catch (e) {
          console.log('检查浏览器连接状态时出错:', e.message);
          isBrowserClosed = true;
        }
      }
      
      // 检查方法 2: 检查浏览器实例是否有效
      if (!isBrowserClosed && browser._connection && typeof browser._connection.isConnected === 'function') {
        try {
          if (!browser._connection.isConnected()) {
            console.log('浏览器连接已断开，返回失败');
            isBrowserClosed = true;
          }
        } catch (e) {
          console.log('检查浏览器连接状态时出错:', e.message);
          isBrowserClosed = true;
        }
      }
      
      // 检查方法 3: 尝试访问浏览器属性
      // 注意: 在 Playwright 中，有些属性可能不可用，但浏览器仍然在运行
      // 因此，我们不应该仅基于属性访问来判断浏览器是否关闭
      if (!isBrowserClosed) {
        try {
          // 尝试访问一个安全的属性
          const test = browser.version || browser.browserType || browser.userAgent;
          if (test === undefined) {
            console.log('无法访问浏览器属性，但仍然继续处理');
            // 不设置 isBrowserClosed = true，因为这可能是误报
          }
        } catch (e) {
          console.log('访问浏览器属性时出错，但仍然继续处理:', e.message);
          // 不设置 isBrowserClosed = true，因为这可能是误报
        }
      }
      
      if (isBrowserClosed) {
        return { error: '浏览器实例已关闭，请重新启动浏览器', code: 'BROWSER_CLOSED' };
      }
      
      // 创建页面
      console.log('尝试创建新页面...');
      let page = null;
      try {
        page = await context.newPage();
        console.log('新页面创建成功');
      } catch (pageError) {
        console.warn('创建新页面失败:', pageError);
        console.log('浏览器可能已关闭，返回失败');
        return false; // 如果无法创建页面（可能是浏览器已关闭），返回失败
      }
      
      // 导航到指定 URL
      console.log(`尝试导航到 ${url}...`);
      let navigationSuccess = false;
      
      try {
        // 尝试直接导航到完整 URL
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log('导航成功');
        navigationSuccess = true;
      } catch (gotoError) {
        console.warn('导航失败:', gotoError);
      }
      
      // 如果直接导航失败，尝试使用简单的 URL
      if (!navigationSuccess) {
        try {
          const simpleUrl = new URL(url).origin;
          console.log(`尝试导航到简化的 URL: ${simpleUrl}...`);
          await page.goto(simpleUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          console.log('导航到简化 URL 成功');
          navigationSuccess = true;
        } catch (simpleGotoError) {
          console.warn('导航到简化 URL 也失败:', simpleGotoError);
        }
      }
      
      // 如果仍然失败，尝试使用空白页
      if (!navigationSuccess) {
        try {
          await page.goto('about:blank', { timeout: 15000 });
          console.log('导航到空白页');
          navigationSuccess = true;
        } catch (blankPageError) {
          console.warn('导航到空白页失败:', blankPageError);
          // 如果连空白页都无法导航，可能是浏览器已关闭
          try {
            await page.close();
          } catch (closeError) {
            console.warn('关闭页面失败:', closeError);
          }
          return false; // 返回失败
        }
      }
      
      // 设置本地存储
      console.log(`尝试设置 ${storageType}...`);
      try {
        // 先检查当前存储内容，以便进行比较
        const currentStorage = await page.evaluate((type) => {
          try {
            const storage = type === 'localStorage' ? localStorage : sessionStorage;
            const result = {};
            
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i);
              result[key] = storage.getItem(key);
            }
            
            return result;
          } catch (e) {
            console.error('获取当前存储失败:', e);
            return {};
          }
        }, storageType);
        
        console.log('当前存储内容:', JSON.stringify(currentStorage, null, 2));
        
        // 设置新数据 - 使用更可靠的方法
        await page.evaluate(({ type, data }) => {
          try {
            const storage = type === 'localStorage' ? localStorage : sessionStorage;
            
            // 先清除现有存储
            storage.clear();
            console.log('清除现有存储成功');
            
            // 等待一下，确保清除操作完成
            setTimeout(() => {}, 100);
            
            // 逐个设置新数据，并验证每个设置是否成功
            const results = {};
            const failures = [];
            
            for (const key in data) {
              if (Object.prototype.hasOwnProperty.call(data, key)) {
                try {
                  // 设置项
                  storage.setItem(key, data[key]);
                  
                  // 验证设置是否成功
                  const storedValue = storage.getItem(key);
                  if (storedValue === data[key]) {
                    results[key] = storedValue;
                    console.log(`成功设置存储项: ${key} = ${storedValue}`);
                  } else {
                    failures.push(key);
                    console.error(`设置存储项失败: ${key}, 期望值: ${data[key]}, 实际值: ${storedValue}`);
                  }
                } catch (itemError) {
                  failures.push(key);
                  console.error(`设置存储项时出错: ${key}`, itemError);
                }
              }
            }
            
            console.log(`共设置了 ${Object.keys(results).length} 个存储项，失败 ${failures.length} 个`);
            
            // 再次验证所有存储内容
            const finalVerification = {};
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i);
              finalVerification[key] = storage.getItem(key);
            }
            
            console.log('最终存储内容:', JSON.stringify(finalVerification));
            return { success: failures.length === 0, results: finalVerification, failures };
          } catch (e) {
            console.error('在页面中设置存储失败:', e);
            throw e;
          }
        }, { type: storageType, data });
        
        // 获取设置结果
        const setResult = await page.evaluate((type) => {
          try {
            const storage = type === 'localStorage' ? localStorage : sessionStorage;
            const result = {};
            
            // 确保所有项都已经正确设置
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i);
              result[key] = storage.getItem(key);
            }
            
            return {
              success: true,
              data: result,
              count: Object.keys(result).length
            };
          } catch (e) {
            console.error('验证存储失败:', e);
            return {
              success: false,
              error: e.message,
              data: {}
            };
          }
        }, storageType);
        
        console.log('设置结果:', JSON.stringify(setResult, null, 2));
        
        // 检查是否所有数据都设置成功
        let allDataSet = true;
        const missingKeys = [];
        
        for (const key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            if (!setResult.data[key] || setResult.data[key] !== data[key]) {
              console.warn(`存储项 ${key} 设置失败，期望值: ${data[key]}, 实际值: ${setResult.data[key] || '不存在'}`);
              allDataSet = false;
              missingKeys.push(key);
            }
          }
        }
        
        if (!allDataSet) {
          console.warn(`部分存储项设置失败: ${missingKeys.join(', ')}`);
        } else {
          console.log('所有存储项设置成功');
        }
        
        // 再次确认存储项数量
        const expectedCount = Object.keys(data).length;
        const actualCount = Object.keys(setResult.data).length;
        
        if (expectedCount !== actualCount) {
          console.warn(`存储项数量不匹配: 期望 ${expectedCount} 个，实际 ${actualCount} 个`);
        }
      } catch (evaluateError) {
        console.warn('执行页面脚本失败:', evaluateError);
        // 如果执行脚本失败，可能是浏览器已关闭
        try {
          await page.close();
        } catch (closeError) {
          console.warn('关闭页面失败:', closeError);
        }
        return false; // 返回失败
      }
      
      console.log('本地存储设置成功');
      
      // 关闭页面
      try {
        await page.close();
        console.log('关闭页面成功');
      } catch (closeError) {
        console.warn('关闭页面失败:', closeError);
        // 如果关闭页面失败，可能是浏览器已关闭，忽略错误
      }
      
      // 保存到配置文件
      try {
        const profileManager = require('./profile-manager');
        const profile = profileManager.getProfileById(profileId);
        
        if (profile) {
          // 确保 storage 数组存在
          if (!profile.storage) {
            profile.storage = [];
          }
          
          // 提取域名
          const urlObj = new URL(url);
          const domain = urlObj.hostname;
          
          if (domain) {
            // 查找当前域名的存储记录
            let domainStorage = profile.storage.find(
              s => s.domain === domain && s.type === storageType
            );
            
            if (!domainStorage) {
              // 如果不存在，创建新的域名记录
              domainStorage = {
                domain: domain,
                type: storageType,
                items: []
              };
              profile.storage.push(domainStorage);
            }
            
            // 确保 items 数组存在
            if (!domainStorage.items) {
              domainStorage.items = [];
            }
            
            // 清空现有项，然后添加新项
            domainStorage.items = [];
            
            // 将对象转换为数组格式
            for (const key in data) {
              if (Object.prototype.hasOwnProperty.call(data, key)) {
                domainStorage.items.push({
                  key: key,
                  value: data[key]
                });
              }
            }
            
            // 保存更新后的配置文件
            profileManager.saveProfile(profile);
            console.log(`已保存 ${domainStorage.items.length} 个 ${storageType} 存储项到配置文件`);
          }
        }
      } catch (profileError) {
        console.warn('保存存储项到配置文件失败:', profileError);
        // 保存到配置文件失败不应该影响整个操作的成功
      }
      
      return true;
    } catch (error) {
      console.error('设置本地存储失败:', error);
      // 不抛出错误，而是返回失败
      return false;
    }
  }

  /**
   * 从配置文件加载 Cookie 到浏览器实例
   * @param {string} profileId 配置文件 ID
   * @param {string} url 网站 URL
   * @returns {Promise<boolean>} 是否成功
   */
  async loadCookiesFromProfile(profileId, url) {
    try {
      console.log(`尝试从配置文件加载 Cookie, 配置文件 ID: ${profileId}, URL: ${url}`);
      
      // 获取配置文件
      const profileManager = require('./profile-manager');
      const profile = profileManager.getProfileById(profileId);
      
      if (!profile) {
        console.log(`找不到配置文件 ID: ${profileId}`);
        return false;
      }
      
      // 检查是否有 Cookie 数据
      if (!profile.cookies || !Array.isArray(profile.cookies) || profile.cookies.length === 0) {
        console.log('配置文件中没有 Cookie 数据');
        return true; // 没有数据也算成功
      }
      
      // 提取当前域名
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // 查找当前域名的 Cookie 记录
      const domainCookie = profile.cookies.find(c => c.domain === domain);
      
      if (!domainCookie || !domainCookie.cookies || domainCookie.cookies.length === 0) {
        console.log(`配置文件中没有域名 ${domain} 的 Cookie 数据`);
        return true; // 没有数据也算成功
      }
      
      console.log(`从配置文件中加载了 ${domainCookie.cookies.length} 个 Cookie`);
      
      // 连接到浏览器实例
      const browser = await this.connectToBrowser(profileId);
      
      if (!browser) {
        console.error('无法连接到浏览器实例');
        return false;
      }
      
      // 获取浏览器上下文
      let context = null;
      
      // 检查浏览器实例是否自身就是上下文
      if (typeof browser.cookies === 'function' && typeof browser.addCookies === 'function') {
        console.log('浏览器实例本身就是上下文，直接使用');
        context = browser;
      }
      // 兼容不同的浏览器 API
      else if (browser.contexts && typeof browser.contexts === 'function') {
        const contexts = browser.contexts();
        if (contexts && contexts.length > 0) {
          context = contexts[0];
          console.log('使用 browser.contexts()[0] 获取上下文');
        }
      } else if (browser.context && typeof browser.context === 'function') {
        context = browser.context();
        console.log('使用 browser.context() 获取上下文');
      } else if (browser.defaultBrowserContext && typeof browser.defaultBrowserContext === 'function') {
        context = browser.defaultBrowserContext();
        console.log('使用 browser.defaultBrowserContext() 获取上下文');
      } else if (browser._browserContexts && browser._browserContexts.length > 0) {
        context = browser._browserContexts[0];
        console.log('使用 browser._browserContexts[0] 获取上下文');
      }
      
      // 如果仍然无法获取上下文，尝试将浏览器实例本身作为上下文
      if (!context) {
        console.log('无法获取浏览器上下文，将浏览器实例作为上下文');
        context = browser;
      }
      
      // 转换 Cookie 格式并设置
      let successCount = 0;
      let failureCount = 0;
      
      for (const cookie of domainCookie.cookies) {
        try {
          // 转换为 Playwright 格式
          const playwrightCookie = {
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain || domain,
            path: cookie.path || '/',
            expires: cookie.expires,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite
          };
          
          // 设置 Cookie
          await context.addCookies([playwrightCookie]);
          successCount++;
        } catch (error) {
          console.error(`设置 Cookie ${cookie.name} 失败:`, error);
          failureCount++;
        }
      }
      
      console.log(`成功设置 ${successCount} 个 Cookie，失败 ${failureCount} 个`);
      
      return successCount > 0 || domainCookie.cookies.length === 0;
    } catch (error) {
      console.error('从配置文件加载 Cookie 失败:', error);
      return false;
    }
  }

  /**
   * 从配置文件加载存储项到浏览器实例
   * @param {string} profileId 配置文件 ID
   * @param {string} url 网站 URL
   * @param {string} storageType 存储类型，localStorage 或 sessionStorage
   * @returns {Promise<boolean>} 是否成功
   */
  async loadStorageFromProfile(profileId, url, storageType = 'localStorage') {
    try {
      console.log(`尝试从配置文件加载${storageType === 'localStorage' ? '本地存储' : '会话存储'}项, 配置文件 ID: ${profileId}, URL: ${url}`);
      
      // 获取配置文件
      const profiles = await this.getProfiles();
      const profile = profiles.find(p => p.id === profileId);
      
      if (!profile) {
        console.log(`找不到配置文件 ID: ${profileId}`);
        return false;
      }
      
      // 检查是否有存储数据
      if (!profile.storage || !Array.isArray(profile.storage) || profile.storage.length === 0) {
        console.log('配置文件中没有存储数据');
        return true; // 没有数据也算成功
      }
      
      // 提取当前域名
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // 查找当前域名的存储记录
      const domainStorage = profile.storage.find(
        s => s.domain === domain && s.type === storageType
      );
      
      if (!domainStorage || !domainStorage.items || domainStorage.items.length === 0) {
        console.log(`配置文件中没有域名 ${domain} 的 ${storageType} 存储数据`);
        return true; // 没有数据也算成功
      }
      
      // 将存储项转换为对象格式
      const storageData = {};
      for (const item of domainStorage.items) {
        storageData[item.key] = item.value;
      }
      
      console.log(`从配置文件中加载了 ${domainStorage.items.length} 个 ${storageType} 存储项`);
      console.log('存储数据:', storageData);
      
      // 调用 setLocalStorage 方法将数据设置到浏览器实例
      const result = await this.setLocalStorage(profileId, url, storageData, storageType);
      
      if (result === true) {
        console.log(`成功将 ${storageType} 存储项从配置文件加载到浏览器实例`);
        return true;
      } else {
        console.error(`将 ${storageType} 存储项从配置文件加载到浏览器实例失败:`, result);
        return false;
      }
    } catch (error) {
      console.error(`从配置文件加载 ${storageType} 存储项失败:`, error);
      return false;
    }
  }

  /**
   * 清除本地存储
   * @param {string} profileId 配置文件 ID
   * @param {string} url 网站 URL
   * @param {string} storageType 存储类型，localStorage 或 sessionStorage
   * @returns {Promise<boolean>} 是否成功
   */
  async clearLocalStorage(profileId, url, storageType = 'localStorage') {
    try {
      console.log(`准备清除${storageType === 'localStorage' ? '本地存储' : '会话存储'}, 配置文件 ID: ${profileId}, URL: ${url}`);
      
      // 尝试连接到浏览器实例
      console.log('尝试连接到浏览器实例...');
      let browser = null;
      
      try {
        // 先尝试连接到现有实例
        browser = await this.connectToBrowser(profileId, true);
        console.log('成功连接到浏览器实例');
      } catch (connectError) {
        console.error('连接到浏览器实例失败:', connectError);
        
        // 如果连接失败，尝试启动新实例
        try {
          console.log('尝试启动新的浏览器实例...');
          browser = await this.launchBrowser(profileId);
          console.log('浏览器实例启动成功');
          
          // 等待一下，确保浏览器实例完全启动
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (launchError) {
          console.error('启动浏览器实例失败:', launchError);
          return false; // 返回失败
        }
      }
      
      // 检查是否有错误码
      if (browser && browser.code) {
        console.log(`连接到浏览器失败，错误码: ${browser.code}, 错误信息: ${browser.error}`);
        return false; // 返回失败
      }
      
      // 如果浏览器实例为 null（可能已关闭），返回失败
      if (!browser) {
        console.log('浏览器实例为 null（可能已关闭），返回失败');
        return false;
      }
      
      console.log('成功连接到浏览器');
      
      // 获取浏览器上下文
      let context = null;
      
      // 检查浏览器实例是否有 contexts 方法
      if (browser.contexts && typeof browser.contexts === 'function') {
        try {
          const contexts = browser.contexts();
          if (contexts && contexts.length > 0) {
            context = contexts[0];
            console.log('使用 browser.contexts()[0] 获取上下文');
          }
        } catch (contextError) {
          console.warn('获取浏览器上下文失败:', contextError);
        }
      } else if (browser.context && typeof browser.context === 'function') {
        try {
          context = browser.context();
          console.log('使用 browser.context() 获取上下文');
        } catch (contextError) {
          console.warn('获取浏览器上下文失败:', contextError);
        }
      } else if (browser._browserContexts && browser._browserContexts.length > 0) {
        context = browser._browserContexts[0];
        console.log('使用 browser._browserContexts[0] 获取上下文');
      } else {
        // 如果无法获取上下文，尝试将浏览器实例本身作为上下文
        console.log('无法获取浏览器上下文，将浏览器实例作为上下文');
        context = browser;
      }
      
      if (!context) {
        console.error('无法获取浏览器上下文');
        return false;
      }
      
      // 创建页面
      console.log('尝试创建新页面...');
      let page = null;
      try {
        page = await context.newPage();
        console.log('新页面创建成功');
      } catch (pageError) {
        console.warn('创建新页面失败:', pageError);
        console.log('浏览器可能已关闭，返回失败');
        return false; // 如果无法创建页面（可能是浏览器已关闭），返回失败
      }
      
      // 导航到指定 URL
      console.log(`尝试导航到 ${url}...`);
      let navigationSuccess = false;
      
      try {
        // 尝试直接导航到完整 URL
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log('导航成功');
        navigationSuccess = true;
      } catch (gotoError) {
        console.warn('导航失败:', gotoError);
      }
      
      // 如果直接导航失败，尝试使用简单的 URL
      if (!navigationSuccess) {
        try {
          const simpleUrl = new URL(url).origin;
          console.log(`尝试导航到简化的 URL: ${simpleUrl}...`);
          await page.goto(simpleUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          console.log('导航到简化 URL 成功');
          navigationSuccess = true;
        } catch (simpleGotoError) {
          console.warn('导航到简化 URL 也失败:', simpleGotoError);
        }
      }
      
      // 如果仍然失败，尝试使用空白页
      if (!navigationSuccess) {
        try {
          await page.goto('about:blank', { timeout: 15000 });
          console.log('导航到空白页');
          navigationSuccess = true;
        } catch (blankPageError) {
          console.warn('导航到空白页失败:', blankPageError);
          // 如果连空白页都无法导航，可能是浏览器已关闭
          try {
            await page.close();
          } catch (closeError) {
            console.warn('关闭页面失败:', closeError);
          }
          return false; // 返回失败
        }
      }
      
      // 先检查当前存储内容
      try {
        const currentStorage = await page.evaluate((type) => {
          try {
            const storage = type === 'localStorage' ? localStorage : sessionStorage;
            const result = {};
            
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i);
              result[key] = storage.getItem(key);
            }
            
            return result;
          } catch (e) {
            console.error('获取当前存储失败:', e);
            return {};
          }
        }, storageType);
        
        console.log('清除前的存储内容:', JSON.stringify(currentStorage, null, 2));
        console.log(`存储项数量: ${Object.keys(currentStorage).length}`);
      } catch (error) {
        console.warn('获取当前存储内容失败:', error);
      }
      
      // 清除本地存储
      console.log(`尝试清除 ${storageType}...`);
      try {
        await page.evaluate((type) => {
          try {
            const storage = type === 'localStorage' ? localStorage : sessionStorage;
            const itemCount = storage.length;
            storage.clear();
            console.log(`已清除 ${itemCount} 个存储项`);
            return storage.length === 0; // 验证是否清除成功
          } catch (e) {
            console.error('清除存储失败:', e);
            throw e;
          }
        }, storageType);
        
        // 验证清除是否成功
        const verifyResult = await page.evaluate((type) => {
          const storage = type === 'localStorage' ? localStorage : sessionStorage;
          return storage.length === 0;
        }, storageType);
        
        console.log(`验证清除结果: ${verifyResult ? '成功' : '失败'}`);
        
        if (!verifyResult) {
          console.warn('清除存储后验证失败，存储项仍然存在');
        }
      } catch (evaluateError) {
        console.warn('执行页面脚本失败:', evaluateError);
        // 如果执行脚本失败，可能是浏览器已关闭
        try {
          await page.close();
        } catch (closeError) {
          console.warn('关闭页面失败:', closeError);
        }
        return false; // 返回失败
      }
      
      // 关闭页面
      try {
        await page.close();
        console.log('关闭页面成功');
      } catch (closeError) {
        console.warn('关闭页面失败:', closeError);
        // 如果关闭页面失败，可能是浏览器已关闭，忽略错误
      }
      
      console.log('本地存储清除成功');
      return true;
    } catch (error) {
      console.error('清除本地存储失败:', error);
      return false; // 返回失败而不是抛出错误
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
   * @param {boolean} autoLaunch 如果实例未启动，是否自动启动
   * @returns {Promise<Object|{error: string, code: string}>} 浏览器实例或错误信息
  */
  async connectToBrowser(profileId, autoLaunch = false) {
    try {
      console.log(`尝试连接到配置文件 ID 为 ${profileId} 的浏览器实例`);
      
      // 检查 browserManager 是否存在
      if (!browserManager) {
        console.error('浏览器管理器不存在');
        return { error: '浏览器管理器不存在', code: 'BROWSER_MANAGER_NOT_FOUND' };
      }
      
      // 使用 browserManager.isInstanceRunning 方法检查实例是否在运行
      const isRunning = browserManager.isInstanceRunning(profileId);
      console.log(`检查浏览器实例 ${profileId} 是否在运行: ${isRunning}`);
      
      // 获取实例状态，用于日志记录
      let instanceStatus = '未知';
      if (browserManager.browserInstances.has(profileId)) {
        instanceStatus = browserManager.browserInstances.get(profileId).status;
      }
      console.log(`浏览器实例 ${profileId} 当前状态: ${instanceStatus}`);
      
      if (!isRunning) {
        console.log(`浏览器实例 ${profileId} 不在运行状态 (${instanceStatus} != ${INSTANCE_STATUS.RUNNING})`);
        
        // 如果不自动启动，返回特殊错误码
        if (!autoLaunch) {
          console.log('实例不在运行状态，返回特殊错误码');
          return { 
            error: `浏览器实例未运行，请先启动浏览器`, 
            code: 'BROWSER_NOT_RUNNING' 
          };
        }
        
        // 尝试启动新的浏览器实例
        console.log(`尝试启动新的浏览器实例...`);
        try {
          const browser = await browserManager.launchBrowser(profileId);
          console.log(`成功启动新的浏览器实例`);
          return browser;
        } catch (launchError) {
          console.error(`启动新的浏览器实例失败:`, launchError);
          return { 
            error: `启动浏览器实例失败: ${launchError.message}`, 
            code: 'BROWSER_LAUNCH_FAILED' 
          };
        }
      }
      
      // 获取并返回浏览器实例
      const instance = browserManager.getRunningInstance(profileId);
      return instance;
    } catch (error) {
      console.error('连接到浏览器时出错:', error);
      return { 
        error: `连接到浏览器时出错: ${error.message}`, 
        code: 'BROWSER_CONNECTION_ERROR' 
      };
    }
  }
  

}

module.exports = new CookieManager();
