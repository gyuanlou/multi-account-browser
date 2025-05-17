// NavigationBar.js - 导航栏组件
const NavigationBar = {
  template: `
    <el-header height="60px">
      <div class="header-container">
        <div class="logo">
          <!-- 移除 onerror 事件，使用静态图片，避免闪烁 -->
          <span class="app-title">多账号浏览器管理工具</span>
        </div>
        <el-menu mode="horizontal" :ellipsis="false" :default-active="activeMenu" @select="handleMenuSelect">
          <el-menu-item index="profiles">配置管理</el-menu-item>
          <el-menu-item index="instances">浏览器实例</el-menu-item>
          <el-menu-item index="cookies">Cookie 管理</el-menu-item>
          <el-menu-item index="automation">自动化</el-menu-item>
          <el-menu-item index="settings">设置</el-menu-item>
        </el-menu>
      </div>
    </el-header>
  `,
  
  props: {
    activeMenu: {
      type: String,
      required: true
    }
  },
  
  methods: {
    handleMenuSelect(key) {
      this.$emit('menu-select', key);
    }
  }
};
