<div align="center">
  <img
    width="1200"
    height="475"
    alt="Office Fish Hunter Banner"
    src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6"
  />
</div>

# 🏢 Office Fish Hunter

一个办公室主题的 **摸鱼模拟 / 钓鱼小游戏** 🐟  
你用 **键盘 WASD** 控制角色走位，用 **摄像头手势** 在工位前摸鱼、抓鱼，躲避老板巡查。

👉 **无需构建、无需安装依赖**  
👉 **纯 HTML + CDN，GitHub Pages 打开就能玩**

**在线试玩：**  
https://bucila-ctrl.github.io/office-slacker_edition/

---

## ✨ Features

- 🎮 **键盘移动（稳定）**
  - `W / A / S / D` 或 `↑ ↓ ← →` 移动角色
  - 不依赖手势移动，操作更精准

- 🖐️ **手势交互（核心玩法）**
  - **Open Palm（张开手掌）**：在工位旁开始摸鱼（进度↑，风险↑）
  - **Closed Fist（握拳）**：抓鱼结算
  - **松开拳头**：关闭奖励弹窗

- 🧠 **风险与老板系统**
  - 摸鱼会累积风险
  - 老板随机巡逻，靠太近会被抓，直接扣分并训话

- 🧭 **不怕迷路**
  - 玩家移动会留下 **轨迹尾巴**
  - 脚下有 **定位光圈**，移动后也能一眼找到角色

- 🌐 **纯静态部署**
  - React / MediaPipe 全部走 CDN
  - 无 Node / 无 Vite / 无打包流程

---

## 🚀 Quick Start（本地运行）

> ⚠️ 摄像头 API 需要 http(s)，不要直接双击 `index.html`

### 方式一：VS Code（推荐）
1. 安装 VS Code 插件 **Live Server**
2. 右键 `index.html` → **Open with Live Server**
3. 浏览器自动打开并请求摄像头权限

### 方式二：Python 启动本地服务器
在项目根目录执行：

```bash
python -m http.server 5173
