// FingerprintTab.js - 指纹设置标签页组件
const FingerprintTab = {
  template: `
    <div class="tab-content">
      <el-form label-position="top" :model="localFingerprint">
        <el-form-item label="浏览器类型">
          <el-select v-model="browserType" placeholder="选择浏览器类型" @change="updateUserAgent">
            <el-option label="Chrome" value="chrome"></el-option>
            <el-option label="Firefox" value="firefox"></el-option>
            <el-option label="Safari" value="safari"></el-option>
            <el-option label="Edge" value="edge"></el-option>
          </el-select>

        </el-form-item>
        
        <el-form-item label="操作系统/平台">
          <el-select v-model="osType" placeholder="选择操作系统" @change="updateUserAgentAndPlatform">
            <el-option label="Windows" value="windows"></el-option>
            <el-option label="macOS" value="macos"></el-option>
            <el-option label="Linux" value="linux"></el-option>
          </el-select>
          <div style="margin-top: 5px; color: #909399; font-size: 12px;">
            <span>平台值: {{ platformDisplay }}</span>
          </div>
        </el-form-item>
        
        <el-form-item label="User-Agent">
          <el-input v-model="localFingerprint.userAgent" placeholder="浏览器 User-Agent"></el-input>
          <div style="margin-top: 5px;">
            <el-button size="small" @click="generateRandomUserAgent">随机生成</el-button>
          </div>
        </el-form-item>
        
        <el-form-item label="语言">
          <el-select v-model="localFingerprint.language" placeholder="选择语言">
            <el-option label="简体中文" value="zh-CN"></el-option>
            <el-option label="繁体中文" value="zh-TW"></el-option>
            <el-option label="英语(美国)" value="en-US"></el-option>
            <el-option label="英语(英国)" value="en-GB"></el-option>
            <el-option label="日语" value="ja-JP"></el-option>
            <el-option label="韩语" value="ko-KR"></el-option>
            <el-option label="法语" value="fr-FR"></el-option>
            <el-option label="德语" value="de-DE"></el-option>
            <el-option label="西班牙语" value="es-ES"></el-option>
            <el-option label="俄语" value="ru-RU"></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="屏幕分辨率">
          <el-row :gutter="10">
            <el-col :span="11">
              <el-input-number v-model="localFingerprint.screenWidth" :min="800" :max="3840" placeholder="宽度"></el-input-number>
            </el-col>
            <el-col :span="2" style="text-align: center;">x</el-col>
            <el-col :span="11">
              <el-input-number v-model="localFingerprint.screenHeight" :min="600" :max="2160" placeholder="高度"></el-input-number>
            </el-col>
          </el-row>
          <div style="margin-top: 5px; color: #909399; font-size: 12px;">
            <span>此设置将同步到启动选项中的窗口大小</span>
          </div>
        </el-form-item>
        
        <el-divider content-position="left">高级指纹保护</el-divider>
        
        <el-form-item label="Canvas 指纹保护">
          <el-select v-model="localFingerprint.canvasMode" placeholder="选择 Canvas 保护模式">
            <el-option label="禁用保护" value="none"></el-option>
            <el-option label="添加噪点" value="noise"></el-option>
            <el-option label="返回空白数据" value="block"></el-option>
            <el-option label="模拟指纹" value="fake"></el-option>
          </el-select>
          <div class="setting-description">
            防止网站通过 Canvas 生成唯一指纹识别您的浏览器
          </div>
        </el-form-item>
        
        <el-form-item label="WebRTC 保护">
          <el-select v-model="localFingerprint.webrtcMode" placeholder="选择 WebRTC 保护模式">
            <el-option label="正常工作" value="default"></el-option>
            <el-option label="仅公共 IP" value="public_only"></el-option>
            <el-option label="完全禁用" value="disabled"></el-option>
          </el-select>
          <div class="setting-description">
            防止 WebRTC 泄露您的真实 IP 地址，即使使用代理或 VPN
          </div>
        </el-form-item>
        
        <el-form-item label="字体指纹保护">
          <el-switch
            v-model="localFingerprint.fontProtection"
            active-text="启用"
            inactive-text="禁用">
          </el-switch>
          <div class="setting-description">
            防止网站通过检测字体列表生成唯一指纹
          </div>
        </el-form-item>
        
        <el-form-item label="硬件信息保护">
          <el-switch
            v-model="localFingerprint.hardwareInfoProtection"
            active-text="启用"
            inactive-text="禁用">
          </el-switch>
          <div class="setting-description">
            防止网站获取硬件信息（GPU、CPU 核心数等）
          </div>
        </el-form-item>
        
        <el-form-item label="音频指纹保护">
          <el-switch
            v-model="localFingerprint.audioContextProtection"
            active-text="启用"
            inactive-text="禁用">
          </el-switch>
          <div class="setting-description">
            防止网站通过音频上下文生成唯一指纹
          </div>
        </el-form-item>
        
        <el-form-item label="插件信息保护">
          <el-switch
            v-model="localFingerprint.pluginDataProtection"
            active-text="启用"
            inactive-text="禁用">
          </el-switch>
          <div class="setting-description">
            防止网站获取已安装的浏览器插件信息
          </div>
        </el-form-item>
        
        <el-form-item label="RECTS 矩形防护">
          <el-switch
            v-model="localFingerprint.rectsProtection"
            active-text="启用"
            inactive-text="禁用">
          </el-switch>
          <div class="setting-description">
            防止网站通过元素位置和大小生成唯一指纹
          </div>
        </el-form-item>
        
        <el-form-item label="时区保护">
          <el-switch
            v-model="localFingerprint.timezoneProtection"
            active-text="启用"
            inactive-text="禁用">
          </el-switch>
          <div class="setting-description">
            防止网站检测您的真实时区
          </div>
        </el-form-item>
        
        <el-form-item label="防护模式">
          <el-select v-model="localFingerprint.protectionMode" placeholder="选择防护模式">
            <el-option label="标准模式" value="standard"></el-option>
            <el-option label="增强模式 (Brave 风格)" value="brave"></el-option>
            <el-option label="平衡模式 (兼容性更好)" value="balanced"></el-option>
          </el-select>
          <div class="setting-description">
            增强模式提供最强的防护，平衡模式在防护和兼容性之间取得平衡
          </div>
        </el-form-item>
        
        <el-form-item label="网站兼容性列表">
          <el-input
            type="textarea"
            :rows="3"
            placeholder="输入需要兼容模式的网站域名，每行一个，如: aliyun.com"
            v-model="localFingerprint.compatibleSites">
          </el-input>
          <div class="setting-description">
            对这些网站使用兼容模式，减少指纹防护强度，解决验证码问题
          </div>
        </el-form-item>
        
        <el-form-item label="随机种子">
          <el-input-number v-model="localFingerprint.randomSeed" :min="1" :max="2147483647" placeholder="随机种子"></el-input-number>
          <el-button size="small" @click="updateRandomSeed" style="margin-left: 10px;">重新生成</el-button>
          <div class="setting-description">
            随机种子用于生成一致的指纹，确保同一配置文件的所有浏览器实例具有相同的指纹
          </div>
        </el-form-item>
        
        <el-divider content-position="left">指纹工具</el-divider>
        
        <el-form-item>
          <el-button type="primary" @click="generateRandomFingerprint">随机生成指纹</el-button>
        </el-form-item>
        
        <el-divider content-position="left">指纹测试平台</el-divider>
        
        <el-form-item label="测试平台">
          <el-select v-model="testPlatform" placeholder="选择测试平台">
            <el-option label="yalala.com" value="yalala"></el-option>
            <el-option label="amiunique.org" value="amiunique"></el-option>
            <el-option label="browserleaks.com" value="browserleaks"></el-option>
            <el-option label="pixelscan.net" value="pixelscan"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="openTestPlatform">打开测试平台</el-button>
        </el-form-item>        
        <el-form-item v-if="testResults">
          <el-card class="test-results-card">
            <div slot="header">
              <span>测试结果</span>
            </div>
            <div v-if="testResults.success" class="test-success">
              <i class="el-icon-success"></i> 指纹防护有效
              <div class="test-details">{{ testResults.details }}</div>
            </div>
            <div v-else class="test-failure">
              <i class="el-icon-error"></i> 指纹防护存在问题
              <div class="test-details">{{ testResults.details }}</div>
              <div class="test-suggestion">
                <strong>建议：</strong> {{ testResults.suggestion || '尝试启用增强模式（Brave 风格）以提高防护效果' }}
              </div>
            </div>
          </el-card>
        </el-form-item>
        
        <el-alert
          v-if="localFingerprint.protectionMode === 'brave'"
          title="增强模式已启用"
          type="success"
          description="您正在使用 Brave 风格的增强防护模式，这将提供更强大的指纹保护功能。"
          show-icon
          :closable="false">
        </el-alert>
      </el-form>
    </div>
  `,
  
  props: {
    profile: {
      type: Object,
      required: true
    }
  },
  
  data() {
    return {
      localFingerprint: {
        userAgent: '',
        platform: '',
        language: '',
        screenWidth: 1920,
        screenHeight: 1080,
        canvasMode: 'noise',
        webrtcMode: 'public_only',
        fontProtection: true,
        hardwareInfoProtection: true,
        audioContextProtection: true,
        pluginDataProtection: true,
        rectsProtection: true,
        timezoneProtection: true,
        protectionMode: 'balanced', // 默认使用平衡模式
        compatibleSites: '', // 默认兼容网站
        randomSeed: Math.floor(Math.random() * 2147483647) // 默认随机种子
      },
      browserType: 'chrome',
      osType: 'windows',
      testPlatform: 'yalala',
      testResults: null,
      showAdvancedSettings: false,
      // 添加标志位，防止递归更新
      isUpdatingScreenSize: false,
      isUpdatingWindowSize: false,
      isUpdatingBrowserOS: false // 防止浏览器和操作系统联动时无限递归
    };
  },
  
  computed: {
    // 平台显示值
    platformDisplay() {
      if (!this.localFingerprint.platform) {
        // 根据操作系统类型返回默认平台值
        switch (this.osType) {
          case 'windows':
            return 'Win32';
          case 'macos':
            return 'MacIntel';
          case 'linux':
            return 'Linux x86_64';
          default:
            return 'Win32';
        }
      }
      return this.localFingerprint.platform;
    }
  },
  
  mounted() {
    // 初始化时，从 profile 中加载指纹配置
    if (this.profile && this.profile.fingerprint) {
      // 保存默认的兼容网站列表
      const defaultCompatibleSites = this.localFingerprint.compatibleSites;
      
      // 合并配置
      this.localFingerprint = { ...this.localFingerprint, ...this.profile.fingerprint };
      
      // 如果profile中的compatibleSites为空，则使用默认值
      if (!this.localFingerprint.compatibleSites) {
        this.localFingerprint.compatibleSites = defaultCompatibleSites;
      }
      
      this.detectBrowserAndOS();
    }
  },
  
  watch: {
    // 监听浏览器类型变化
    browserType(newVal) {
      // 防止递归更新
      if (this.isUpdatingBrowserOS) {
        return;
      }
      
      this.isUpdatingBrowserOS = true;
      
      // 如果选择了Safari浏览器，强制使用macOS
      if (newVal === 'safari' && this.osType !== 'macos') {
        this.osType = 'macos';
        this.$message.info('Safari浏览器只能在macOS上运行，已自动切换操作系统');
      }
      
      // 更新User-Agent
      this.updateUserAgentAndPlatform();
      
      // 重置标志位
      this.$nextTick(() => {
        this.isUpdatingBrowserOS = false;
      });
    },
    
    // 监听操作系统类型变化
    osType(newVal, oldVal) {
      // 防止递归更新
      if (this.isUpdatingBrowserOS) {
        return;
      }
      
      this.isUpdatingBrowserOS = true;
      
      // 如果当前是Safari浏览器，但操作系统不是macOS，则强制使用Chrome
      if (this.browserType === 'safari' && newVal !== 'macos') {
        this.browserType = 'chrome';
        this.$message.info('Safari浏览器只能在macOS上运行，已自动切换为Chrome浏览器');
      }
      
      // 更新User-Agent和平台值
      this.updateUserAgentAndPlatform();
      
      // 重置标志位
      this.$nextTick(() => {
        this.isUpdatingBrowserOS = false;
      });
    },
    
    localFingerprint: {
      handler(val) {
        // 防止递归更新
        if (this.isUpdatingScreenSize) {
          return;
        }
        
        // 更新指纹配置
        this.$emit('update:profile', { 
          ...this.profile, 
          fingerprint: val 
        });
        
        // 在指纹设置变化时更新指纹脚本
        this.updateFingerprintScripts();
        
        // 如果屏幕分辨率发生变化，才同步到窗口大小
        if (!this.isUpdatingWindowSize && 
            (this.profile.startup?.windowWidth !== val.screenWidth || 
             this.profile.startup?.windowHeight !== val.screenHeight)) {
          this.syncScreenResolutionToWindowSize();
        }
      },
      deep: true
    },
    'localFingerprint.screenWidth': function(newVal) {
      // 当屏幕宽度变化时同步到窗口宽度
      if (this.profile.startup && newVal && !this.isUpdatingScreenSize) {
        this.isUpdatingWindowSize = true;
        this.$emit('update:profile', {
          ...this.profile,
          startup: {
            ...this.profile.startup,
            windowWidth: newVal
          }
        });
        this.$nextTick(() => {
          this.isUpdatingWindowSize = false;
        });
      }
    },
    'localFingerprint.screenHeight': function(newVal) {
      // 当屏幕高度变化时同步到窗口高度
      if (this.profile.startup && newVal && !this.isUpdatingScreenSize) {
        this.isUpdatingWindowSize = true;
        this.$emit('update:profile', {
          ...this.profile,
          startup: {
            ...this.profile.startup,
            windowHeight: newVal
          }
        });
        this.$nextTick(() => {
          this.isUpdatingWindowSize = false;
        });
      }
    },
    'profile.fingerprint': {
      handler(val) {
        this.localFingerprint = { ...val };
        this.detectBrowserAndOS();
      },
      immediate: true,
      deep: true
    },
    'profile.startup': {
      handler(val) {
        // 如果启动选项中的窗口大小变化，同步到屏幕分辨率
        if (val && val.windowWidth && val.windowHeight && !this.isUpdatingWindowSize) {
          this.isUpdatingScreenSize = true;
          
          // 仅当值不同时才更新，避免不必要的更新
          if (this.localFingerprint.screenWidth !== val.windowWidth) {
            this.localFingerprint.screenWidth = val.windowWidth;
          }
          if (this.localFingerprint.screenHeight !== val.windowHeight) {
            this.localFingerprint.screenHeight = val.windowHeight;
          }
          
          this.$nextTick(() => {
            this.isUpdatingScreenSize = false;
          });
        }
      },
      immediate: true,
      deep: true
    }
  },
  
  methods: {
    /**
     * 更新指纹防护脚本
     * 在指纹设置变化时调用
     */
    updateFingerprintScripts() {
      try {
        console.log('通知后端更新指纹防护脚本...');
        // 调用自定义 IPC 方法更新指纹脚本
        window.ipcRenderer.invoke('update-fingerprint-scripts')
          .then(() => {
            console.log('指纹脚本更新成功');
          })
          .catch(error => {
            console.error('指纹脚本更新失败:', error);
          });
      } catch (error) {
        console.error('更新指纹脚本时出错:', error);
      }
    },
    
    detectBrowserAndOS() {
      // 防止递归更新
      if (this.isUpdatingBrowserOS) {
        return;
      }
      
      const ua = this.localFingerprint.userAgent || '';
      let detectedBrowser = '';
      let detectedOS = '';
      
      // 检测浏览器类型
      if (ua.includes('Edg/')) {
        // Edge 需要放在最前面检测，因为它的 UA 也包含 Chrome 和 Safari
        detectedBrowser = 'edge';
      } else if (ua.includes('Firefox/')) {
        detectedBrowser = 'firefox';
      } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
        detectedBrowser = 'safari';
      } else if (ua.includes('Chrome/')) {
        detectedBrowser = 'chrome';
      } else {
        detectedBrowser = 'chrome';
      }
      
      // 检测操作系统
      if (ua.includes('Windows')) {
        detectedOS = 'windows';
      } else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) {
        detectedOS = 'macos';
      } else if (ua.includes('Linux')) {
        detectedOS = 'linux';
      } else {
        detectedOS = 'windows';
      }
      
      // 检查兼容性
      if (detectedBrowser === 'safari' && detectedOS !== 'macos') {
        // Safari 只能在 macOS 上运行，如果检测到不匹配，使用 macOS
        detectedOS = 'macos';
      }
      
      // 设置防递归标志
      this.isUpdatingBrowserOS = true;
      
      // 只有当检测到的值与当前值不同时才更新，避免循环触发监听器
      let browserChanged = false;
      let osChanged = false;
      
      if (this.browserType !== detectedBrowser) {
        this.browserType = detectedBrowser;
        browserChanged = true;
      }
      
      if (this.osType !== detectedOS) {
        this.osType = detectedOS;
        osChanged = true;
      }
      
      // 重置标志位
      this.$nextTick(() => {
        this.isUpdatingBrowserOS = false;
      });
    },
    
    updateUserAgentAndPlatform() {
      // 防止递归更新
      if (this.isUpdatingBrowserOS) {
        return;
      }
      
      this.isUpdatingBrowserOS = true;
      
      // 检查浏览器和操作系统的兼容性，但不触发通知
      let needUpdateOS = false;
      let needUpdateBrowser = false;
      
      if (this.browserType === 'safari' && this.osType !== 'macos') {
        // Safari 只能在 macOS 上运行
        needUpdateOS = true;
      }
      
      // 生成新的 User-Agent
      this.generateRandomUserAgent();
      
      // 根据操作系统类型自动设置平台值
      this.updatePlatformBasedOnOS();
      
      // 重置标志位
      this.$nextTick(() => {
        this.isUpdatingBrowserOS = false;
        
        // 如果需要更新OS，在重置标志位后再更新
        if (needUpdateOS) {
          this.osType = 'macos';
        }
        
        if (needUpdateBrowser) {
          this.browserType = 'chrome';
        }
      });
    },
    
    /**
     * 根据操作系统类型更新平台值
     */
    updatePlatformBasedOnOS() {
      switch (this.osType) {
        case 'windows':
          this.localFingerprint.platform = 'Win32';
          break;
        case 'macos':
          this.localFingerprint.platform = 'MacIntel';
          break;
        case 'linux':
          this.localFingerprint.platform = 'Linux x86_64';
          break;
        default:
          this.localFingerprint.platform = 'Win32';
      }
    },
    
    updateUserAgent() {
      // 兼容旧版本的方法
      this.updateUserAgentAndPlatform();
    },
    
    async generateRandomUserAgent() {
      try {
        // 防止递归更新
        if (this.isUpdatingBrowserOS) {
          return;
        }
        
        this.isUpdatingBrowserOS = true;
        
        // 检查浏览器和操作系统兼容性，但不触发通知
        let needUpdateOS = false;
        
        if (this.browserType === 'safari' && this.osType !== 'macos') {
          needUpdateOS = true;
        }
        
        // 确保随机种子存在，如果不存在则生成
        const seed = this.ensureRandomSeed();
        
        const options = {
          browser: needUpdateOS ? 'safari' : this.browserType,
          browserType: needUpdateOS ? 'safari' : this.browserType, // 同时传递 browserType 参数以兼容后端
          os: needUpdateOS ? 'macos' : this.osType,
          // 传递随机种子
          randomSeed: seed,
          // 传阒用户选择的语言
          language: this.localFingerprint.language
        };
        
        const fingerprint = await window.ipcRenderer.invoke('generate-random-fingerprint', options);
        this.localFingerprint.userAgent = fingerprint.userAgent;
        this.localFingerprint.platform = fingerprint.platform;
        
        // 先更新平台值
        this.updatePlatformBasedOnOS();
        
        // 在标志位重置后再更新操作系统和浏览器类型
        this.$nextTick(() => {
          this.isUpdatingBrowserOS = false;
          
          // 如果需要更新OS，在重置标志位后再更新
          if (needUpdateOS) {
            this.osType = 'macos';
          }
          
          // 检测生成的 User-Agent 是否与所选浏览器和操作系统匹配
          this.detectBrowserAndOS();
        });
      } catch (error) {
        this.isUpdatingBrowserOS = false;
        this.$message.error('生成随机 User-Agent 失败: ' + error.message);
      }
    },
    
    /**
     * 生成随机种子
     * @returns {number} 生成的随机种子
     */
    generateRandomSeed() {
      // 生成一个新的随机种子
      const newSeed = Math.floor(Math.random() * 2147483647);
      this.localFingerprint.randomSeed = newSeed;
      return newSeed;
    },
    
    /**
     * 确保随机种子存在，如果不存在则生成
     * @returns {number} 当前的随机种子
     */
    ensureRandomSeed() {
      if (!this.localFingerprint.randomSeed) {
        return this.generateRandomSeed();
      }
      return this.localFingerprint.randomSeed;
    },
    
    /**
     * 同步屏幕分辨率到窗口大小
     */
    syncScreenResolutionToWindowSize() {
      // 如果正在更新屏幕分辨率，则跳过以避免递归
      if (this.isUpdatingScreenSize) {
        return;
      }
      
      // 确保 profile.startup 存在
      if (!this.profile.startup) {
        this.profile.startup = {};
      }
      
      // 设置标志位防止递归
      this.isUpdatingWindowSize = true;
      
      // 同步屏幕分辨率到窗口大小
      if (this.localFingerprint.screenWidth && this.localFingerprint.screenHeight) {
        // 只有当值不同时才更新
        const currentWidth = this.profile.startup.windowWidth;
        const currentHeight = this.profile.startup.windowHeight;
        const newWidth = this.localFingerprint.screenWidth;
        const newHeight = this.localFingerprint.screenHeight;
        
        if (currentWidth !== newWidth || currentHeight !== newHeight) {
          this.$emit('update:profile', {
            ...this.profile,
            startup: {
              ...this.profile.startup,
              windowWidth: newWidth,
              windowHeight: newHeight
            }
          });
        }
      }
      
      // 重置标志位
      this.$nextTick(() => {
        this.isUpdatingWindowSize = false;
      });
    },
    
    /**
     * 更新随机种子并重新生成指纹
     */
    async updateRandomSeed() {
      try {
        // 生成新的随机种子
        const newSeed = Math.floor(Math.random() * 2147483647);
        this.localFingerprint.randomSeed = newSeed;
        this.$message.success('已生成新的随机种子: ' + newSeed);
        
        // 更新指纹和 User-Agent
        await this.generateRandomFingerprint();
        
        this.$message.success('指纹和 User-Agent 已更新');
      } catch (error) {
        this.$message.error('更新随机种子失败: ' + error.message);
      }
    },
    
    /**
     * 生成随机指纹
     */
    async generateRandomFingerprint() {
      try {
        // 确保随机种子存在，如果不存在则生成
        const seed = this.ensureRandomSeed();
        
        const options = {
          browser: this.browserType,
          os: this.osType,
          language: this.localFingerprint.language,
          // 保留当前的高级保护设置
          canvasMode: this.localFingerprint.canvasMode,
          webrtcMode: this.localFingerprint.webrtcMode,
          fontProtection: this.localFingerprint.fontProtection,
          hardwareInfoProtection: this.localFingerprint.hardwareInfoProtection,
          audioContextProtection: this.localFingerprint.audioContextProtection,
          pluginDataProtection: this.localFingerprint.pluginDataProtection,
          rectsProtection: this.localFingerprint.rectsProtection,
          timezoneProtection: this.localFingerprint.timezoneProtection,
          // 传递随机种子
          randomSeed: seed
        };
        
        const fingerprint = await window.ipcRenderer.invoke('generate-random-fingerprint', options);
        
        // 合并新生成的指纹与当前的高级保护设置
        this.localFingerprint = { 
          ...fingerprint,
          canvasMode: options.canvasMode,
          webrtcMode: options.webrtcMode,
          fontProtection: options.fontProtection,
          hardwareInfoProtection: options.hardwareInfoProtection,
          audioContextProtection: options.audioContextProtection,
          pluginDataProtection: options.pluginDataProtection,
          rectsProtection: options.rectsProtection,
          timezoneProtection: options.timezoneProtection,
          protectionMode: this.localFingerprint.protectionMode, // 保留当前的防护模式设置
          randomSeed: options.randomSeed // 保存随机种子
        };
        
        this.detectBrowserAndOS();
        
        this.$message.success('已生成随机指纹');
      } catch (error) {
        this.$message.error('生成随机指纹失败: ' + error.message);
      }
    },
    
    /**
     * 打开指纹测试平台
     */
    async openTestPlatform() {
      let url = '';
      switch (this.testPlatform) {
        case 'yalala':
          url = 'https://www.yalala.com/';
          break;
        case 'amiunique':
          url = 'https://amiunique.org/fp';
          break;
        case 'browserleaks':
          url = 'https://browserleaks.com/canvas';
          break;
        case 'pixelscan':
          url = 'https://pixelscan.net/';
          break;
        default:
          url = 'https://www.yalala.com/';
      }
      
      try {
        await window.ipcRenderer.invoke('open-url-in-browser', this.profile.id, url);
        this.$message.success(`已在浏览器中打开 ${url}`);
      } catch (error) {
        this.$message.error(`打开测试平台失败: ${error.message}`);
      }
    },
    
   
  }
};
