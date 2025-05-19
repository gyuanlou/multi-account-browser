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
        
        <el-form-item label="操作系统">
          <el-select v-model="osType" placeholder="选择操作系统" @change="updateUserAgent">
            <el-option label="Windows" value="windows"></el-option>
            <el-option label="macOS" value="macos"></el-option>
            <el-option label="Linux" value="linux"></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="User-Agent">
          <el-input v-model="localFingerprint.userAgent" placeholder="浏览器 User-Agent"></el-input>
          <div style="margin-top: 5px;">
            <el-button size="small" @click="generateRandomUserAgent">随机生成</el-button>
          </div>
        </el-form-item>
        
        <el-form-item label="平台">
          <el-select v-model="localFingerprint.platform" placeholder="选择平台">
            <el-option label="Windows" value="Win32"></el-option>
            <el-option label="macOS" value="MacIntel"></el-option>
            <el-option label="Linux" value="Linux x86_64"></el-option>
          </el-select>
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
          </el-select>
          <div class="setting-description">
            增强模式使用 Brave 浏览器风格的防护技术，提供更强大的指纹保护
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
        protectionMode: 'standard',
        randomSeed: Math.floor(Math.random() * 2147483647) // 默认随机种子
      },
      browserType: 'chrome',
      osType: 'windows',
      testPlatform: 'yalala',
      testResults: null
    };
  },
  
  watch: {
    localFingerprint: {
      handler(val) {
        this.$emit('update:profile', { 
          ...this.profile, 
          fingerprint: val 
        });
      },
      deep: true
    },
    'profile.fingerprint': {
      handler(val) {
        this.localFingerprint = { ...val };
        this.detectBrowserAndOS();
      },
      immediate: true,
      deep: true
    }
  },
  
  methods: {
    detectBrowserAndOS() {
      const ua = this.localFingerprint.userAgent || '';
      
      // 检测浏览器类型
      if (ua.includes('Firefox/')) {
        this.browserType = 'firefox';
      } else if (ua.includes('Safari/') && ua.includes('Chrome/')) {
        this.browserType = 'chrome';
      } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
        this.browserType = 'safari';
      } else if (ua.includes('Edg/')) {
        this.browserType = 'edge';
      } else {
        this.browserType = 'chrome';
      }
      
      // 检测操作系统
      if (ua.includes('Windows')) {
        this.osType = 'windows';
      } else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) {
        this.osType = 'macos';
      } else if (ua.includes('Linux')) {
        this.osType = 'linux';
      } else {
        this.osType = 'windows';
      }
    },
    
    updateUserAgent() {
      // 根据选择的浏览器和操作系统更新 User-Agent
      this.generateRandomUserAgent();
    },
    
    async generateRandomUserAgent() {
      try {
        // 确保随机种子存在，如果不存在则生成
        const seed = this.ensureRandomSeed();
        
        const options = {
          browser: this.browserType,
          os: this.osType,
          // 传递随机种子
          randomSeed: seed
        };
        
        const fingerprint = await window.ipcRenderer.invoke('generate-random-fingerprint', options);
        this.localFingerprint.userAgent = fingerprint.userAgent;
        this.localFingerprint.platform = fingerprint.platform;
      } catch (error) {
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
