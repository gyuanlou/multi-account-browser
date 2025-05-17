# 多账号浏览器管理工具 | Multi-Account Browser Manager

## 中文 | [English](#multi-account-browser-manager)

### 软件概述

多账号浏览器管理工具是一款专为需要管理多个网络账号的用户设计的应用程序。它允许您创建和管理多个独立的浏览器配置文件，每个配置文件都有自己的 Cookie、缓存、历史记录和指纹信息，确保不同账号之间完全隔离。

### 主要功能

- **多浏览器支持**：支持 Chrome、Edge、Firefox 和 Safari 浏览器
- **多账号管理**：创建和管理多个独立的浏览器配置文件
- **指纹保护**：为每个配置文件设置独特的浏览器指纹，防止被网站识别和追踪
- **代理设置**：支持 HTTP、HTTPS、SOCKS4 和 SOCKS5 代理
- **地理位置模拟**：根据代理 IP 自动设置或手动设置地理位置信息
- **Cookie 管理**：导入、导出和管理 Cookie
- **自动化任务**：创建和执行自动化脚本，实现浏览器操作自动化
- **数据备份**：备份和恢复所有配置文件和设置

### 安装说明

1. 从 [GitHub Releases](https://github.com/yourusername/multi-account-browser/releases) 下载最新版本
2. 根据您的操作系统选择相应的安装包：
   - Windows: `.exe` 或 `.msi` 文件
   - macOS: `.dmg` 文件
   - Linux: `.AppImage`、`.deb` 或 `.rpm` 文件
3. 安装并启动应用程序

### 使用指南

#### 创建新配置

1. 点击左侧面板中的“新建配置”按钮
2. 输入配置名称和其他基本信息
3. 配置指纹、代理和其他设置
4. 点击“保存”按钮

#### 启动浏览器实例

1. 在配置列表中选择要启动的配置
2. 点击“启动”按钮
3. 浏览器实例将使用指定的设置启动

#### 管理 Cookie

1. 启动浏览器实例并访问目标网站
2. 在应用程序中切换到“Cookie 管理”页面
3. 选择目标网站并查看、编辑或导出 Cookie

#### 创建自动化脚本

1. 切换到“自动化”页面
2. 点击“新建脚本”按钮
3. 编写或导入自动化脚本
4. 选择目标配置文件并运行脚本

### 技术特点

- 使用 Electron 和 Vue.js 构建的跨平台应用
- 基于 Playwright 实现多浏览器支持
- 采用适配器设计模式，为不同浏览器提供统一接口
- 实现用户数据目录清理功能，防止锁文件问题

---

# Multi-Account Browser Manager

## English | [中文](#多账号浏览器管理工具--multi-account-browser-manager)

### Overview

The Multi-Account Browser Manager is an application designed for users who need to manage multiple online accounts. It allows you to create and manage multiple independent browser profiles, each with its own cookies, cache, history, and fingerprint information, ensuring complete isolation between different accounts.

### Key Features

- **Multi-Browser Support**: Support for Chrome, Edge, Firefox, and Safari browsers
- **Multiple Account Management**: Create and manage multiple independent browser profiles
- **Fingerprint Protection**: Set unique browser fingerprints for each profile to prevent identification and tracking by websites
- **Proxy Settings**: Support for HTTP, HTTPS, SOCKS4, and SOCKS5 proxies
- **Geolocation Simulation**: Automatically set or manually configure geolocation information based on proxy IP
- **Cookie Management**: Import, export, and manage cookies
- **Automation Tasks**: Create and execute automation scripts for browser operations
- **Data Backup**: Backup and restore all profiles and settings

### Installation

1. Download the latest version from [GitHub Releases](https://github.com/yourusername/multi-account-browser/releases)
2. Choose the appropriate installation package for your operating system:
   - Windows: `.exe` or `.msi` file
   - macOS: `.dmg` file
   - Linux: `.AppImage`, `.deb`, or `.rpm` file
3. Install and launch the application

### User Guide

#### Creating a New Profile

1. Click the "New Profile" button in the left panel
2. Enter the profile name and other basic information
3. Configure fingerprint, proxy, and other settings
4. Click the "Save" button

#### Launching a Browser Instance

1. Select the profile you want to launch from the profile list
2. Click the "Start" button
3. The browser instance will launch with the specified settings

#### Managing Cookies

1. Launch a browser instance and visit the target website
2. Switch to the "Cookie Manager" page in the application
3. Select the target website and view, edit, or export cookies

#### Creating Automation Scripts

1. Switch to the "Automation" page
2. Click the "New Script" button
3. Write or import automation scripts
4. Select the target profile and run the script

### Technical Features

- Cross-platform application built with Electron and Vue.js
- Multi-browser support implemented with Playwright
- Adapter design pattern for providing a unified interface for different browsers
- User data directory cleanup functionality to prevent lock file issues
