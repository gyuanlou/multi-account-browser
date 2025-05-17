// ProxyTab.js - 代理设置标签页组件
const ProxyTab = {
  template: `
    <div class="tab-content">
      <el-form label-position="top" :model="localProxy">
        <el-form-item label="启用代理">
          <el-switch v-model="localProxy.enabled" active-text="启用" inactive-text="禁用"></el-switch>
        </el-form-item>
        
        <template v-if="localProxy.enabled">
          <el-form-item label="代理类型">
            <el-select v-model="localProxy.type" style="width: 100%;">
              <el-option label="HTTP" value="http"></el-option>
              <el-option label="HTTPS" value="https"></el-option>
              <el-option label="SOCKS4" value="socks4"></el-option>
              <el-option label="SOCKS5" value="socks5"></el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="代理地址">
            <el-input v-model="localProxy.host" placeholder="例如: 127.0.0.1"></el-input>
          </el-form-item>
          
          <el-form-item label="端口">
            <el-input-number v-model="localProxy.port" :min="1" :max="65535" style="width: 100%;"></el-input-number>
          </el-form-item>
          
          <el-form-item label="认证">
            <el-switch v-model="authEnabled" active-text="启用" inactive-text="禁用"></el-switch>
          </el-form-item>
          
          <template v-if="authEnabled">
            <el-form-item label="用户名">
              <el-input v-model="localProxy.username" placeholder="用户名"></el-input>
            </el-form-item>
            
            <el-form-item label="密码">
              <el-input v-model="localProxy.password" type="password" placeholder="密码"></el-input>
            </el-form-item>
          </template>
          
          <el-form-item label="测试 URL">
            <el-input v-model="localProxy.testUrl" placeholder="例如: https://api.ipify.org?format=json"></el-input>
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="testProxy" :loading="testing">测试代理</el-button>
          </el-form-item>
          
          <div v-if="testResult" class="test-result">
            <el-alert
              :title="testResult.success ? '代理测试成功' : '代理测试失败'"
              :type="testResult.success ? 'success' : 'error'"
              :description="testResult.success ? '连接成功' : testResult.error"
              show-icon>
            </el-alert>
            
            <div v-if="testResult.success" style="margin-top: 10px;">
              <el-descriptions border>
                <el-descriptions-item label="IP地址">{{ testResult.ip }}</el-descriptions-item>
                <el-descriptions-item label="延迟">{{ testResult.latency }}ms</el-descriptions-item>
                <el-descriptions-item label="国家/地区" v-if="testResult.country">{{ testResult.countryName || testResult.country }}</el-descriptions-item>
                <el-descriptions-item label="城市" v-if="testResult.city">{{ testResult.city }}</el-descriptions-item>
                <el-descriptions-item label="ISP" v-if="testResult.isp">{{ testResult.isp }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </template>
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
      localProxy: {},
      authEnabled: false,
      testing: false,
      testResult: null
    };
  },
  
  watch: {
    localProxy: {
      handler(val) {
        this.$emit('update:profile', { 
          ...this.profile, 
          proxy: val 
        });
      },
      deep: true
    },
    'profile.proxy': {
      handler(val) {
        if (val) {
          this.localProxy = { ...val };
          this.authEnabled = !!(this.localProxy.username || this.localProxy.password);
        } else {
          this.localProxy = {
            enabled: false,
            type: 'http',
            host: '',
            port: 8080,
            username: '',
            password: '',
            testUrl: 'https://api.ipify.org?format=json'
          };
        }
      },
      immediate: true,
      deep: true
    },
    authEnabled(val) {
      if (!val) {
        this.localProxy.username = '';
        this.localProxy.password = '';
      }
    }
  },
  
  methods: {
    async testProxy() {
      if (!this.localProxy.enabled || !this.localProxy.host || !this.localProxy.port) {
        this.$message.warning('请填写完整的代理信息');
        return;
      }
      
      console.log('开始测试代理:', JSON.stringify(this.localProxy));
      this.testing = true;
      this.testResult = null;
      
      try {
        console.log('调用主进程测试代理...');
        
        // 创建一个新的代理配置对象，只包含简单的数据类型
        const proxyConfig = {
          enabled: this.localProxy.enabled,
          type: this.localProxy.type,
          host: this.localProxy.host,
          port: parseInt(this.localProxy.port),
          testUrl: this.localProxy.testUrl
        };
        
        // 只在有用户名和密码时添加
        if (this.localProxy.username) {
          proxyConfig.username = this.localProxy.username;
        }
        
        if (this.localProxy.password) {
          proxyConfig.password = this.localProxy.password;
        }
        
        console.log('发送代理配置到主进程:', JSON.stringify(proxyConfig));
        
        const result = await window.ipcRenderer.invoke('test-proxy', proxyConfig);
        console.log('收到代理测试结果:', JSON.stringify(result));
        
        this.testResult = result;
        
        if (result.success) {
          console.log('代理测试成功，IP:', result.ip);
            
          // 如果代理测试成功，询问是否要自动设置地理位置
          if (result.country && !this.profile.geoLocation?.autoFromProxy) {
            console.log('提示用户设置地理位置...');
            console.log('地理位置信息:', JSON.stringify(result));
            
            this.$confirm('是否根据代理 IP 自动设置地理位置信息？', '提示', {
              confirmButtonText: '确定',
              cancelButtonText: '取消',
              type: 'info'
            }).then(() => {
              // 更新地理位置设置
              console.log('用户确认设置地理位置');
              
              // 创建更新后的配置文件
              const geoLocation = {
                autoFromProxy: true,
                country: result.country,
                city: result.city || '',
                latitude: result.latitude || 0,
                longitude: result.longitude || 0,
                timezone: result.timezone || 'UTC'
              };
              
              // 如果有语言信息，也添加到地理位置设置中
              if (result.language) {
                geoLocation.language = result.language;
              }
              
              const updatedProfile = {
                ...this.profile,
                geoLocation: {
                  ...this.profile.geoLocation,
                  ...geoLocation
                }
              };
              
              console.log('更新配置文件:', JSON.stringify(updatedProfile.geoLocation));
              this.$emit('update:profile', updatedProfile);
              this.$message.success('已自动设置地理位置信息');
            }).catch(() => {
              console.log('用户取消设置地理位置');
              // 用户取消
            });
          }
        } else {
          console.log('代理测试失败:', result.error);
        }
      } catch (error) {
        console.error('代理测试过程中发生错误:', error);
        this.testResult = {
          success: false,
          error: error.message
        };
      } finally {
        this.testing = false;
        console.log('代理测试完成');
      }
    }
  }
};
