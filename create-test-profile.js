/**
 * 创建测试配置文件
 * 用于测试 Cookie 获取功能
 */
const { v4: uuidv4 } = require('uuid');
const Store = require('electron-store');

// 创建配置存储
const store = new Store({
  name: 'profiles',
  fileExtension: 'json'
});

// 创建测试配置文件
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

// 保存配置文件
const existingProfiles = store.get('profiles') || [];
existingProfiles.push(testProfile);
store.set('profiles', existingProfiles);

console.log(`创建测试配置文件成功，ID: ${testProfile.id}`);
console.log(`当前共有 ${existingProfiles.length} 个配置文件`);
