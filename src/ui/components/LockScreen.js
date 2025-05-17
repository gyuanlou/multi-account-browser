// LockScreen.js - 锁屏组件
const LockScreen = {
  template: `
    <div class="lock-screen" v-if="isLocked">
      <div class="lock-container">
        <div class="lock-header">
          <i class="el-icon-lock"></i>
          <h2>应用已锁定</h2>
        </div>
        
        <div class="lock-form">
          <p>请输入主密码解锁应用</p>
          
          <el-form @submit.native.prevent="unlock">
            <el-form-item>
              <el-input 
                type="password" 
                v-model="password" 
                placeholder="输入主密码"
                @keyup.enter.native="unlock">
              </el-input>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="unlock" :loading="verifying">
                解锁
              </el-button>
            </el-form-item>
          </el-form>
          
          <div class="lock-error" v-if="errorMessage">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>
  `,
  
  data() {
    return {
      isLocked: false,
      password: '',
      verifying: false,
      errorMessage: '',
      inactivityTimer: null,
      lastActivityTime: Date.now()
    };
  },
  
  created() {
    // 监听锁定事件
    window.ipcRenderer.on('app-lock', () => {
      this.lockApp();
    });
    
    // 检查是否启用了自动锁定
    this.checkAutoLock();
    
    // 监听用户活动
    document.addEventListener('mousemove', this.resetInactivityTimer);
    document.addEventListener('keydown', this.resetInactivityTimer);
    document.addEventListener('click', this.resetInactivityTimer);
  },
  
  beforeDestroy() {
    // 清除事件监听
    document.removeEventListener('mousemove', this.resetInactivityTimer);
    document.removeEventListener('keydown', this.resetInactivityTimer);
    document.removeEventListener('click', this.resetInactivityTimer);
    
    // 清除定时器
    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
    }
  },
  
  methods: {
    async checkAutoLock() {
      try {
        // 获取安全设置
        const securitySettings = await window.ipcRenderer.invoke('get-setting', 'security');
        
        if (securitySettings && securitySettings.autoLock) {
          // 设置不活动检测定时器
          this.startInactivityTimer(securitySettings.lockAfterMinutes);
        }
        
        // 检查是否启用了主密码保护
        if (securitySettings && securitySettings.masterPasswordEnabled) {
          // 应用启动时锁定
          this.lockApp();
        }
      } catch (error) {
        console.error('检查自动锁定设置失败:', error);
      }
    },
    
    startInactivityTimer(minutes) {
      // 清除现有定时器
      if (this.inactivityTimer) {
        clearInterval(this.inactivityTimer);
      }
      
      // 设置新定时器，每分钟检查一次不活动状态
      this.inactivityTimer = setInterval(() => {
        const now = Date.now();
        const inactiveTime = (now - this.lastActivityTime) / (1000 * 60); // 转换为分钟
        
        if (inactiveTime >= minutes) {
          this.lockApp();
        }
      }, 60000); // 每分钟检查一次
    },
    
    resetInactivityTimer() {
      this.lastActivityTime = Date.now();
    },
    
    lockApp() {
      this.isLocked = true;
      this.password = '';
      this.errorMessage = '';
    },
    
    async unlock() {
      if (!this.password) {
        this.errorMessage = '请输入主密码';
        return;
      }
      
      this.verifying = true;
      this.errorMessage = '';
      
      try {
        const verified = await window.ipcRenderer.invoke('verify-master-password', this.password);
        
        if (verified) {
          this.isLocked = false;
          this.password = '';
          this.resetInactivityTimer();
        } else {
          this.errorMessage = '密码错误，请重试';
        }
      } catch (error) {
        this.errorMessage = '验证失败: ' + error.message;
      } finally {
        this.verifying = false;
      }
    }
  }
};
