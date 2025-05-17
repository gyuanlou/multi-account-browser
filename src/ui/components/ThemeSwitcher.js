// ThemeSwitcher.js - 主题切换组件
const ThemeSwitcher = {
  template: `
    <div class="theme-switcher">
      <el-tooltip :content="isDarkMode ? '切换到浅色模式' : '切换到深色模式'" placement="bottom">
        <el-button 
          type="text" 
          @click="toggleTheme" 
          class="theme-toggle-btn"
        >
          <i v-if="isDarkMode" class="el-icon-sunny"></i>
          <i v-else class="el-icon-moon"></i>
        </el-button>
      </el-tooltip>
    </div>
  `,
  
  data() {
    return {
      isDarkMode: localStorage.getItem('theme') === 'dark'
    };
  },
  
  created() {
    // 初始化主题
    this.applyTheme();
    
    // 监听系统主题变化
    this.setupSystemThemeListener();
  },
  
  methods: {
    toggleTheme() {
      this.isDarkMode = !this.isDarkMode;
      const theme = this.isDarkMode ? 'dark' : 'light';
      
      // 保存主题设置到本地存储
      localStorage.setItem('theme', theme);
      
      // 应用主题
      this.applyTheme();
      
      // 通知主进程更新设置
      window.ipcRenderer.invoke('update-setting', 'theme', theme);
    },
    
    applyTheme() {
      // 应用主题到 body 类
      document.body.className = this.isDarkMode ? 'theme-dark' : 'theme-light';
    },
    
    setupSystemThemeListener() {
      // 如果浏览器支持媒体查询，监听系统主题变化
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // 初始检查
        if (localStorage.getItem('theme') === null) {
          // 如果用户没有设置过主题偏好，使用系统主题
          this.isDarkMode = mediaQuery.matches;
          localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
          this.applyTheme();
        }
        
        // 添加监听器
        const handleChange = (e) => {
          // 只有在用户没有明确设置主题偏好时才跟随系统
          if (localStorage.getItem('theme') === null) {
            this.isDarkMode = e.matches;
            this.applyTheme();
          }
        };
        
        // 添加变化监听器
        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener('change', handleChange);
        } else {
          // 兼容旧版浏览器
          mediaQuery.addListener(handleChange);
        }
      }
    }
  }
};
