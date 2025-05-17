// app.js - 主应用脚本
console.log('开始初始化 Vue 应用...');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 内容已加载，初始化 Vue 应用...');
  
  // 注册所有组件
  const app = Vue.createApp({
    render() {
      return Vue.h(App);
    }
  });
  
  console.log('Vue 应用已创建');
  
  // 注册 Element Plus 图标
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
  }
  
  // 注册自定义组件
  app.component('App', App);
  app.component('NavigationBar', NavigationBar);
  app.component('ProfileList', ProfileList);
  app.component('ProfileListItem', ProfileListItem);
  app.component('ProfileEditor', ProfileEditor);
  app.component('BasicInfoTab', BasicInfoTab);
  app.component('AccountsTab', AccountsTab);
  app.component('FingerprintTab', FingerprintTab);
  app.component('ProxyTab', ProxyTab);
  app.component('GeoLocationTab', GeoLocationTab);
  app.component('StartupTab', StartupTab);
  app.component('RunningInstances', RunningInstances);
  app.component('InstanceCard', InstanceCard);
  app.component('StatusBar', StatusBar);
  app.component('Settings', Settings);
  app.component('AutomationTab', AutomationTab);
  
  // 注册新添加的组件
  app.component('lock-screen', LockScreen);
  app.component('settings-page', SettingsPage);
  app.component('automation-page', AutomationPage);
  app.component('cookie-manager-page', CookieManagerPage);
  app.component('theme-switcher', ThemeSwitcher);
  
  // 使用 Element Plus 并设置中文语言
  app.use(ElementPlus, {
    locale: zhCn
  });
  
  // 全局错误处理
  app.config.errorHandler = (err, vm, info) => {
    console.error('Vue 错误:', err);
    console.error('错误信息:', info);
  };
  
  // 挂载应用
  app.mount('#app');
  
  console.log('Vue 应用已初始化');
});

// 添加默认图片，以防 logo.png 不存在
function createDefaultLogo() {
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij48cGF0aCBmaWxsPSIjNDA5RUZGIiBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTEgMTVoLTJ2LTZoMnY2em00IDBoLTJ2LTZoMnY2em0tNy0xNWg2djJIOHYtMnoiLz48L3N2Zz4=';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#409EFF';
    ctx.fillRect(0, 0, 200, 200);
    ctx.drawImage(img, 50, 50, 100, 100);
    
    const dataUrl = canvas.toDataURL('image/png');
    localStorage.setItem('default-logo', dataUrl);
  };
}

createDefaultLogo();
