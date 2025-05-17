# 多账号浏览器管理工具 - 自动化任务使用指南

## 任务类型

自动化任务支持三种类型：

1. **脚本类型**：执行预定义的浏览器操作序列
2. **URL类型**：打开浏览器并访问指定网址
3. **命令类型**：执行特定的浏览器命令，如刷新Cookie、清除缓存等

## 脚本类型任务使用方法

### 创建脚本任务

1. 在自动化任务页面点击"新建任务"
2. 选择任务类型为"脚本"
3. 选择要使用的浏览器配置文件
4. 在脚本编辑框中输入JSON格式的脚本内容
5. 点击"保存"创建任务

### 脚本格式

脚本必须是有效的JSON格式，基本结构如下：

```json
{
  "name": "脚本名称",
  "description": "脚本描述",
  "steps": [
    {
      "type": "步骤类型",
      "其他参数": "参数值"
    },
    ...更多步骤
  ],
  "variables": {}
}
```

### 支持的步骤类型

1. **导航 (navigate)**
   ```json
   {
     "type": "navigate",
     "url": "https://www.baidu.com",
     "waitUntil": "networkidle2"
   }
   ```

2. **输入文本 (input)**
   ```json
   {
     "type": "input",
     "selector": "#kw",
     "value": "要输入的文本",
     "humanize": true
   }
   ```

3. **点击元素 (click)**
   ```json
   {
     "type": "click",
     "selector": "#su",
     "humanize": true
   }
   ```

4. **等待 (wait)**
   ```json
   {
     "type": "wait",
     "timeout": 3000
   }
   ```

5. **提取内容 (extract)**
   ```json
   {
     "type": "extract",
     "selector": ".result h3",
     "variable": "firstResult"
   }
   ```

6. **截图 (screenshot)**
   ```json
   {
     "type": "screenshot",
     "fullPage": true
   }
   ```

7. **选择下拉菜单 (select)**
   ```json
   {
     "type": "select",
     "selector": "select#dropdown",
     "value": "option1"
   }
   ```

8. **执行JavaScript (evaluate)**
   ```json
   {
     "type": "evaluate",
     "function": "return document.title;"
   }
   ```

9. **滚动页面 (scroll)**
   ```json
   {
     "type": "scroll",
     "selector": ".element-to-scroll-to"
   }
   ```

### 完整示例

```json
{
  "name": "百度搜索测试",
  "description": "访问百度并搜索指定内容",
  "steps": [
    {
      "type": "navigate",
      "url": "https://www.baidu.com",
      "waitUntil": "networkidle2"
    },
    {
      "type": "input",
      "selector": "#kw",
      "value": "自动化测试",
      "humanize": true
    },
    {
      "type": "click",
      "selector": "#su",
      "humanize": true
    },
    {
      "type": "wait",
      "timeout": 3000
    },
    {
      "type": "extract",
      "selector": ".result h3",
      "variable": "firstResult"
    },
    {
      "type": "screenshot",
      "fullPage": true
    }
  ],
  "variables": {}
}
```

## URL类型任务使用方法

1. 在自动化任务页面点击"新建任务"
2. 选择任务类型为"URL"
3. 选择要使用的浏览器配置文件
4. 输入要访问的URL
5. 点击"保存"创建任务

## 命令类型任务使用方法

1. 在自动化任务页面点击"新建任务"
2. 选择任务类型为"命令"
3. 选择要使用的浏览器配置文件
4. 选择要执行的命令：
   - `refreshCookies`：刷新浏览器Cookie
   - `clearCache`：清除浏览器缓存
   - `clearLocalStorage`：清除本地存储
   - `updateFingerprint`：更新浏览器指纹
5. 点击"保存"创建任务

## 任务管理

1. **运行任务**：点击任务列表中的"运行"按钮
2. **停止任务**：点击任务列表中的"停止"按钮
3. **查看日志**：点击任务列表中的"日志"按钮
4. **删除任务**：点击任务列表中的"删除"按钮

## 任务日志

任务日志功能提供以下操作：

1. **查看日志**：显示任务执行过程中的详细日志
2. **刷新日志**：手动刷新日志内容
3. **复制日志**：将日志内容复制到剪贴板
4. **下载日志**：将日志内容下载为文本文件
5. **清除日志**：清除当前任务的所有日志

## 注意事项

1. 脚本内容必须是有效的JSON格式
2. 选择器(selector)必须是有效的CSS选择器
3. 命令类型任务需要先启动浏览器才能执行
4. 任务执行过程中可能会遇到网络延迟，请适当设置等待时间
5. 使用humanize参数可以模拟人类操作，减少被网站检测为机器人的可能性
