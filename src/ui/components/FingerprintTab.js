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
        
        <el-divider content-position="left">指纹测试</el-divider>
        
        <el-form-item>
          <el-button type="primary" @click="generateRandomFingerprint">随机生成所有指纹</el-button>
          <el-button @click="testFingerprintProtection" :disabled="!profile.id">测试指纹防检测</el-button>
        </el-form-item>
        
        <div v-if="testResults" class="fingerprint-test-results">
          <h3>测试结果</h3>
          <el-table :data="testResults" border style="width: 100%">
            <el-table-column prop="test" label="测试项目"></el-table-column>
            <el-table-column label="结果">
              <template #default="{ row }">
                <el-tag :type="row.passed ? 'success' : 'danger'">
                  {{ row.passed ? '通过' : '未通过' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="details" label="详情"></el-table-column>
          </el-table>
        </div>
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
      testResults: null,
      localFingerprint: {
        canvasMode: 'noise',
        webrtcMode: 'public_only',
        fontProtection: true,
        hardwareInfoProtection: true,
        audioContextProtection: true,
        pluginDataProtection: true,
        timezoneProtection: true
      },
      browserType: 'chrome',
      osType: 'windows'
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
    async testFingerprintProtection() {
      if (!this.profile.id) {
        this.$message.warning('请先保存配置文件');
        return;
      }
      
      try {
        this.$message.info('正在测试指纹保护...');
        const results = await window.ipcRenderer.invoke('test-fingerprint-protection', this.profile.id);
        this.testResults = [
          {
            test: 'Canvas 指纹',
            passed: results.canvas.protected,
            details: results.canvas.details
          },
          {
            test: 'WebRTC 保护',
            passed: results.webrtc.protected,
            details: results.webrtc.details
          },
          {
            test: '字体指纹',
            passed: results.fonts.protected,
            details: results.fonts.details
          },
          {
            test: '硬件信息',
            passed: results.hardware.protected,
            details: results.hardware.details
          },
          {
            test: '音频指纹',
            passed: results.audio.protected,
            details: results.audio.details
          },
          {
            test: '插件信息',
            passed: results.plugins.protected,
            details: results.plugins.details
          },
          {
            test: '时区保护',
            passed: results.timezone.protected,
            details: results.timezone.details
          }
        ];
      } catch (error) {
        this.$message.error('测试指纹保护失败: ' + error.message);
      }
    },
    
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
        const options = {
          browser: this.browserType,
          os: this.osType
        };
        
        const fingerprint = await window.ipcRenderer.invoke('generate-random-fingerprint', options);
        this.localFingerprint.userAgent = fingerprint.userAgent;
        this.localFingerprint.platform = fingerprint.platform;
      } catch (error) {
        this.$message.error('生成随机 User-Agent 失败: ' + error.message);
      }
    },
    
    async generateRandomFingerprint() {
      try {
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
          timezoneProtection: this.localFingerprint.timezoneProtection
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
          timezoneProtection: options.timezoneProtection
        };
        
        this.detectBrowserAndOS();
        
        this.$message.success('已生成随机指纹');
      } catch (error) {
        this.$message.error('生成随机指纹失败: ' + error.message);
      }
    }
  }
};
