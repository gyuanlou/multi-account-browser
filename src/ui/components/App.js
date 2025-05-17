// App.js - 主应用组件
const App = {
  template: `
    <el-config-provider :locale="locale">
      <!-- 锁屏组件 -->
      <lock-screen v-if="componentsReady"></lock-screen>
      
      <div class="container">
        <!-- 顶部导航栏 -->
        <navigation-bar 
          :active-menu="activeMenu" 
          @menu-select="handleMenuSelect">
        </navigation-bar>
        
        <!-- 主要内容区域 -->
        <el-main>
          <!-- 配置管理页面 -->
          <div v-if="activeMenu === 'profiles'" class="profile-container">
            <profile-list 
              :profiles="profiles" 
              :selected-profile-id="selectedProfileId"
              :running-instances="runningInstances"
              @select-profile="selectProfile"
              @create-profile="createNewProfile"
              @delete-profile="deleteProfile"
              @launch-browser="launchBrowser"
              @close-browser="closeBrowser">
            </profile-list>
            
            <div class="profile-content" v-if="selectedProfile">
              <profile-editor 
                :profile="selectedProfile" 
                @save="saveProfile"
                @delete="deleteProfile">
              </profile-editor>
            </div>
            <div class="profile-content" v-else>
              <el-empty description="请选择或创建一个配置"></el-empty>
            </div>
          </div>
          
          <!-- 浏览器实例页面 -->
          <div v-if="activeMenu === 'instances'">
            <running-instances 
              :instances="runningInstances"
              :profiles="profiles"
              @launch-browser="launchBrowser"
              @close-browser="closeBrowser">
            </running-instances>
          </div>
          
          <!-- 自动化页面 -->
          <div v-if="activeMenu === 'automation' && componentsReady">
            <automation-page></automation-page>
          </div>
          
          <!-- Cookie 管理页面 -->
          <div v-if="activeMenu === 'cookies' && componentsReady">
            <cookie-manager-page></cookie-manager-page>
          </div>
          
          <!-- 设置页面 -->
          <div v-if="activeMenu === 'settings' && componentsReady">
            <settings-page></settings-page>
          </div>
        </el-main>
        
        <!-- 状态栏 -->
        <status-bar 
          :running-count="runningInstances.length"
          :version="appInfo && appInfo.version ? appInfo.version : '1.0.0'"
          :platform="appInfo && appInfo.platform ? appInfo.platform : ''">
          <theme-switcher v-if="componentsReady"></theme-switcher>
        </status-bar>
      </div>
    </el-config-provider>
  `,
  
  data() {
    return {
      locale: zhCn,
      activeMenu: 'profiles',
      profiles: [],
      selectedProfileId: null,
      selectedProfile: null,
      runningInstances: [],
      appInfo: {
        version: '1.0.0',
        platform: ''
      },
      componentsReady: false // 添加组件就绪状态标志
    };
  },
  
  created() {
    // 监听应用就绪事件
    window.ipcRenderer.on('app-ready', (event, info) => {
      this.appInfo = info;
    });
    
    // 监听导入配置就绪事件
    window.ipcRenderer.on('import-profile-ready', async () => {
      try {
        console.log('开始获取导入配置数据');
        
        // 使用 IPC 调用获取配置数据
        const profileData = await window.ipcRenderer.invoke('import-profile-data');
        console.log('获取到配置数据:', profileData ? '成功' : '失败');
        
        // 验证数据是否存在
        if (!profileData) {
          throw new Error('接收到的配置数据为空');
        }
        
        // 创建一个新的配置对象，保留原有数据但生成新的 ID
        const newProfile = {
          ...profileData,
          id: this.generateUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('已创建新配置:', newProfile.name);
        
        // 保存导入的配置
        await this.saveProfile(newProfile);
        this.$message.success('配置导入成功');
      } catch (error) {
        console.error('导入配置失败:', error);
        this.$message.error('导入配置失败: ' + error.message);
      }
    });
    
    // 加载配置文件列表
    this.loadProfiles();
    
    // 定时刷新运行中的实例
    this.refreshRunningInstances();
    setInterval(() => {
      this.refreshRunningInstances();
    }, 5000);
    
    // 延迟设置组件就绪状态，确保所有组件都已正确加载
    setTimeout(() => {
      this.componentsReady = true;
      console.log('组件已就绪');
    }, 500);
  },
  
  methods: {
    // 处理菜单选择
    handleMenuSelect(key) {
      this.activeMenu = key;
    },
    
    // 加载配置文件列表
    async loadProfiles() {
      try {
        console.log('开始加载配置文件列表...');
        const profiles = await window.ipcRenderer.invoke('get-profiles');
        
        // 使用新数组替换原数组，确保 Vue 能检测到变化
        this.profiles = [];
        this.$nextTick(() => {
          // 在下一个 tick 中更新，确保 DOM 已经更新
          this.profiles = JSON.parse(JSON.stringify(profiles));
          console.log('配置文件列表已更新，数量:', this.profiles.length);
          
          // 如果有配置文件，默认选中第一个
          if (this.profiles.length > 0 && !this.selectedProfileId) {
            this.selectProfile(this.profiles[0].id);
          }
          
          // 如果当前有选中的配置，确保它也被更新
          if (this.selectedProfileId) {
            const updatedProfile = this.profiles.find(p => p.id === this.selectedProfileId);
            if (updatedProfile) {
              this.selectedProfile = JSON.parse(JSON.stringify(updatedProfile));
              console.log('已更新选中的配置:', this.selectedProfile.name);
            }
          }
        });
      } catch (error) {
        console.error('加载配置文件失败:', error);
        this.$message.error('加载配置文件失败: ' + error.message);
      }
    },
    
    // 选择配置文件
    selectProfile(profileId) {
      console.log('选择配置文件:', profileId);
      this.selectedProfileId = profileId;
      
      // 使用深拷贝确保选中的配置是一个新对象
      const selectedProfile = this.profiles.find(profile => profile.id === profileId);
      if (selectedProfile) {
        // 使用 JSON 序列化和反序列化创建深拷贝
        this.selectedProfile = JSON.parse(JSON.stringify(selectedProfile));
        console.log('已选中配置:', this.selectedProfile.name);
      } else {
        this.selectedProfile = null;
        console.log('未找到指定的配置');
      }
    },
    
    // 创建新配置
    async createNewProfile() {
      try {
        console.log('正在创建新配置...');
        console.log('事件已收到，开始创建配置');
        const newProfile = {
          // 不要在前端生成 ID，让后端生成
          // id: 'profile_' + Date.now(),
          name: '新配置 ' + new Date().toLocaleTimeString(),
          createdAt: new Date().toISOString(),
          proxy: {
            enabled: false,
            type: 'http',
            host: '',
            port: 8080,
            username: '',
            password: '',
            testUrl: 'https://api.ipify.org?format=json'
          },
          fingerprint: {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
            platform: 'Win32',
            language: 'zh-CN',
            timezone: 'Asia/Shanghai',
            webrtcEnabled: false
          },
          geoLocation: {
            country: 'CN',
            city: '北京',
            latitude: 39.9042,
            longitude: 116.4074,
            timezone: 'Asia/Shanghai',
            autoFromProxy: false
          },
          startup: {
            startUrl: 'https://www.baidu.com',
            windowWidth: 1280,
            windowHeight: 800,
            incognito: false,
            maximized: false,
            hideToolbar: false,
            autoClose: false,
            autoCloseTime: 30,
            extraArgs: ''
          },
          automation: {
            enabled: false,
            type: 'script',
            script: '',
            runTime: 'manual',
            scheduleTime: null,
            repeatDays: []
          }
        };
        
        await this.saveProfile(newProfile);
        console.log('新配置创建成功:', newProfile);
      } catch (error) {
        console.error('创建新配置失败:', error);
        this.$message.error('创建新配置失败: ' + error.message);
      }
    },
    
    // 保存配置文件
    async saveProfile(profile) {
      try {
        console.log('保存配置文件开始...');
        
        // 创建一个可序列化的配置对象副本
        const serializableProfile = {};
        
        // 只复制基本属性，避免循环引用和不可序列化的对象
        const safeKeys = ['id', 'name', 'tags', 'notes', 'accounts', 'createdAt', 'updatedAt', 'proxy', 'fingerprint', 'geoLocation', 'startup', 'automation'];
        
        for (const key of safeKeys) {
          if (profile[key] !== undefined) {
            try {
              // 使用 JSON 序列化和反序列化来创建深拷贝，同时确保数据可序列化
              serializableProfile[key] = JSON.parse(JSON.stringify(profile[key]));
            } catch (e) {
              console.warn(`属性 ${key} 无法序列化，将跳过`, e);
              // 如果无法序列化，提供一个默认值
              if (key === 'proxy') {
                serializableProfile[key] = { enabled: false, type: 'http', host: '', port: 8080 };
              }
            }
          }
        }
        
        console.log('处理后的配置文件:', serializableProfile);
        const savedProfile = await window.ipcRenderer.invoke('save-profile', serializableProfile);
        
        // 更新配置列表
        await this.loadProfiles();
        
        // 选中保存的配置
        this.selectProfile(savedProfile.id);
        
        this.$message.success('配置已保存');
      } catch (error) {
        console.error('保存配置失败:', error);
        this.$message.error('保存配置失败: ' + error.message);
      }
    },
    
    // 删除配置文件
    async deleteProfile(profileId) {
      try {
        await window.ipcRenderer.invoke('delete-profile', profileId);
        
        // 更新配置列表
        await this.loadProfiles();
        
        // 清除选中
        if (this.selectedProfileId === profileId) {
          this.selectedProfileId = null;
          this.selectedProfile = null;
        }
        
        this.$message.success('配置已删除');
      } catch (error) {
        this.$message.error('删除配置失败: ' + error.message);
      }
    },
    
    // 刷新运行中的实例
    async refreshRunningInstances() {
      try {
        const instances = await window.ipcRenderer.invoke('get-running-instances');
        this.runningInstances = instances;
      } catch (error) {
        console.error('获取运行实例失败:', error);
      }
    },
    
    // 启动浏览器
    async launchBrowser(profileId) {
      try {
        await window.ipcRenderer.invoke('launch-browser', profileId);
        this.$message.success('浏览器已启动');
        this.refreshRunningInstances();
      } catch (error) {
        this.$message.error('启动浏览器失败: ' + error.message);
      }
    },
    
    // 关闭浏览器
    async closeBrowser(profileId) {
      try {
        console.log(`尝试关闭浏览器实例: ${profileId}`);
        await window.ipcRenderer.invoke('close-browser', profileId);
        this.$message.success('浏览器已关闭');
        // 延迟刷新实例列表，等待浏览器完全关闭
        setTimeout(() => {
          this.refreshRunningInstances();
        }, 500);
      } catch (error) {
        console.error(`关闭浏览器失败: ${error.message}`);
        this.$message.error('关闭浏览器失败: ' + error.message);
      }
    },
    
    // 生成 UUID
    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  }
};
