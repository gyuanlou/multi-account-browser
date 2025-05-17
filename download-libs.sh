#!/bin/bash

# 创建目录
mkdir -p src/ui/css
mkdir -p src/ui/js/lib

# 下载 Vue.js
echo "下载 Vue.js..."
curl -L https://unpkg.com/vue@3/dist/vue.global.js -o src/ui/js/lib/vue.global.js

# 下载 Element Plus
echo "下载 Element Plus..."
curl -L https://unpkg.com/element-plus -o src/ui/js/lib/element-plus.js
curl -L https://unpkg.com/@element-plus/icons-vue -o src/ui/js/lib/element-plus-icons.js
curl -L https://unpkg.com/element-plus/dist/index.css -o src/ui/css/element-plus.css

echo "库文件下载完成！"
