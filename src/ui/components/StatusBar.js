// StatusBar.js - 状态栏组件
const StatusBar = {
  template: `
    <div class="status-bar">
      <div>运行中的实例: {{ runningCount }}</div>
      <div style="flex-grow: 1;"></div>
      <div class="status-right">
        <slot></slot>
        <div>版本: {{ version }} | 平台: {{ platformName }}</div>
      </div>
    </div>
  `,
  
  props: {
    runningCount: {
      type: Number,
      default: 0
    },
    version: {
      type: String,
      default: '1.0.0'
    },
    platform: {
      type: String,
      default: ''
    }
  },
  
  computed: {
    platformName() {
      switch (this.platform) {
        case 'win32':
          return 'Windows';
        case 'darwin':
          return 'macOS';
        case 'linux':
          return 'Linux';
        default:
          return this.platform || '未知';
      }
    }
  }
};
