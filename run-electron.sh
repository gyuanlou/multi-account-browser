#!/bin/bash

# 设置环境变量
export ELECTRON_NO_SANDBOX=1
export ELECTRON_DISABLE_GPU=1
export ELECTRON_DISABLE_SECURITY_WARNINGS=1

# 进入项目目录
cd "$(dirname "$0")"

# 创建简单测试文件
cat > test-electron.js << EOL
console.log('正在尝试启动Electron...');
const electron = require('electron');
const path = require('path');

// 检查electron模块
console.log('Electron模块:', typeof electron, electron);

// 手动启动electron
const { spawn } = require('child_process');
const electronPath = require('electron');

// 创建一个简单的HTML文件
const fs = require('fs');
if (!fs.existsSync('test.html')) {
  fs.writeFileSync('test.html', '<html><body><h1>Electron测试页面</h1></body></html>');
  console.log('创建了测试HTML文件');
}

// 打印环境信息
console.log('环境变量:', process.env.ELECTRON_NO_SANDBOX);
console.log('当前目录:', process.cwd());
console.log('Electron路径:', electronPath);

// 显示帮助信息
console.log('\n可能需要安装的依赖:');
console.log('sudo dnf install libXScrnSaver-devel libxkbcommon-x11 gtk3');
console.log('sudo dnf group install "Development Tools"');
EOL

# 运行测试脚本
echo "运行测试脚本..."
node test-electron.js

# 尝试直接用electron运行
echo -e "\n尝试直接运行electron..."
npx electron --no-sandbox --disable-gpu test.html

# 如果上面失败，尝试另一种方法
if [ $? -ne 0 ]; then
  echo -e "\n尝试使用xvfb-run运行electron..."
  if command -v xvfb-run &> /dev/null; then
    xvfb-run npx electron --no-sandbox --disable-gpu test.html
  else
    echo "xvfb-run未安装，请尝试: sudo dnf install xorg-x11-server-Xvfb"
  fi
fi
