# 更新日志

## 1.0.1 (2025-05-18)

### 优化
- 优化了日志输出，减少了不必要的控制台信息
- 减少了各个浏览器适配器（Chrome、Edge、Firefox、Safari）中的不必要日志输出
- 减少了浏览器管理器中的不必要日志输出

### 修复
- 修复了前端无法获取浏览器实例状态常量的问题
- 在 preload.js 中添加了 get-instance-status-constants 到有效通道白名单中
- 在 app.js 中添加了默认的浏览器实例状态常量，确保即使 IPC 调用失败，window.INSTANCE_STATUS 也能有一个默认值

## 1.0.0 (2025-05-01)

### 功能
- 初始版本发布
- 支持多浏览器（Chrome、Edge、Firefox、Safari）
- 支持独立指纹和代理设置
- 支持 Cookie 和本地存储管理
- 支持浏览器实例管理
