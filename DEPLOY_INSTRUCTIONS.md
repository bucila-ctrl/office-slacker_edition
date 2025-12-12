# 🚀 部署说明

## 推送到 GitHub

创建 GitHub 仓库后，运行以下命令：

```bash
git remote add origin https://github.com/<你的用户名>/office-slacker_-ai-edition.git
git push -u origin main
```

或者如果你使用 SSH：
```bash
git remote add origin git@github.com:<你的用户名>/office-slacker_-ai-edition.git
git push -u origin main
```

## 启用 GitHub Pages

1. 进入你的 GitHub 仓库
2. 点击 **Settings** (设置)
3. 在左侧菜单找到 **Pages**
4. 在 "Source" 下拉菜单中选择 **"GitHub Actions"**
5. 保存设置

## 访问你的游戏

部署完成后（通常需要 1-2 分钟），你的游戏将在以下地址可用：

```
https://<你的用户名>.github.io/office-slacker_-ai-edition/
```

## 更新 Git 用户信息（可选）

如果你想更新提交时显示的用户名和邮箱：

```bash
git config user.name "你的名字"
git config user.email "你的邮箱@example.com"
```

然后重新提交（如果需要）：
```bash
git commit --amend --reset-author
```

