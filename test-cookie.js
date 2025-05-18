/**
 * 测试 Cookie 获取功能
 * 用于诊断 Cookie 获取问题
 */
const path = require('path');
const fs = require('fs');
let electron;

// 尝试加载 Electron
try {
  electron = require('electron');
  console.log('成功加载 Electron 模块');
} catch (error) {
  console.log('运行在非 Electron 环境中，一些功能可能受限');
}

// 确保目录存在
const userDataDir = path.join(process.cwd(), 'browser_profiles');
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
  console.log(`创建用户数据目录: ${userDataDir}`);
}

// 加载必要的模块
const { chromium } = require('playwright');
const Store = require('electron-store');

// 初始化存储
const store = new Store({
  name: 'profiles',
  fileExtension: 'json'
});

// 获取配置文件
const profiles = store.get('profiles') || [];
console.log(`从存储中获取到 ${profiles.length} 个配置文件`);

// 如果没有配置文件，创建一个测试配置文件
if (profiles.length === 0) {
  console.log('没有找到配置文件，创建测试配置文件...');
  const { v4: uuidv4 } = require('uuid');
  const testProfile = {
    id: uuidv4(),
    name: '测试配置文件',
    browserType: 'chrome',
    userDataDir: './test_user_data',
    startUrl: 'https://www.baidu.com',
    proxy: null,
    cookies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  profiles.push(testProfile);
  store.set('profiles', profiles);
  console.log(`创建测试配置文件成功，ID: ${testProfile.id}`);
}

// 测试配置
const TEST_URL = 'https://www.baidu.com';

async function testCookieRetrieval() {
  let browser;
  try {
    console.log('开始测试 Cookie 获取功能...');
    
    // 使用第一个配置文件进行测试
    const testProfile = profiles[0];
    console.log(`使用配置文件 "${testProfile.name}" (ID: ${testProfile.id}) 进行测试`);
    
    // 创建用户数据目录
    const profileUserDataDir = path.join(userDataDir, `chrome_${testProfile.id}`);
    if (!fs.existsSync(profileUserDataDir)) {
      fs.mkdirSync(profileUserDataDir, { recursive: true });
      console.log(`创建配置文件用户数据目录: ${profileUserDataDir}`);
    }
    
    // 直接使用 Playwright 启动浏览器
    console.log('使用 Playwright 启动 Chrome 浏览器...');
    browser = await chromium.launchPersistentContext(profileUserDataDir, {
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('浏览器启动成功');
    
    // 创建页面并导航到测试 URL
    console.log(`创建新页面并导航到 ${TEST_URL}...`);
    const page = await browser.newPage();
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('页面加载完成');
    
    // 设置测试 Cookie
    console.log('设置测试 Cookie...');
    await browser.addCookies([
      {
        name: 'test_cookie',
        value: 'test_value',
        domain: new URL(TEST_URL).hostname,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 3600, // 1小时后过期
        httpOnly: false,
        secure: TEST_URL.startsWith('https'),
        sameSite: 'None'
      }
    ]);
    
    // 等待 Cookie 设置完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 使用 context API 获取 Cookie
    console.log('使用 browser.cookies() 获取 Cookie...');
    const contextCookies = await browser.cookies([TEST_URL]);
    console.log(`使用 context API 获取到 ${contextCookies.length} 个 Cookie:`);
    console.log(JSON.stringify(contextCookies, null, 2));
    
    // 使用 CDP 会话获取 Cookie
    console.log('使用 CDP 会话获取 Cookie...');
    try {
      const client = await page.context().newCDPSession(page);
      const result = await client.send('Network.getAllCookies');
      console.log(`使用 CDP 获取到 ${result.cookies.length} 个 Cookie:`);
      console.log(JSON.stringify(result.cookies, null, 2));
      
      // 将 Cookie 保存到配置文件
      const domain = new URL(TEST_URL).hostname;
      const domainCookies = result.cookies.filter(cookie => {
        return cookie.domain === domain || cookie.domain === '.' + domain || domain.endsWith(cookie.domain.replace(/^\./, ''));
      });
      
      if (domainCookies.length > 0) {
        console.log(`保存 ${domainCookies.length} 个 Cookie 到配置文件...`);
        
        // 查找当前域名的 Cookie 记录
        let domainCookieIndex = testProfile.cookies.findIndex(c => c.domain === domain);
        
        if (domainCookieIndex !== -1) {
          // 更新现有记录
          testProfile.cookies[domainCookieIndex].cookies = domainCookies;
          testProfile.cookies[domainCookieIndex].lastUpdated = new Date().toISOString();
        } else {
          // 添加新记录
          testProfile.cookies.push({
            domain,
            cookies: domainCookies,
            lastUpdated: new Date().toISOString()
          });
        }
        
        // 保存配置文件
        store.set('profiles', profiles);
        console.log(`已将 ${domainCookies.length} 个 Cookie 保存到配置文件`);
      }
    } catch (cdpError) {
      console.error(`使用 CDP 获取 Cookie 失败:`, cdpError);
    }
    
    // 关闭页面
    console.log('关闭页面...');
    await page.close();
    
    console.log('测试完成');
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    // 关闭浏览器
    if (browser) {
      console.log('关闭浏览器...');
      await browser.close().catch(e => console.error('关闭浏览器时出错:', e));
    }
    // 退出进程
    process.exit(0);
  }
}

// 运行测试
testCookieRetrieval();
