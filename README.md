# 数学小闯关 🎯

安徽合肥小学一年级数学课堂随机练习题 —— 安卓 App。

## 这是什么

一个给一年级孩子（20 以内加减法进度）用的数学练习 App，把做题变成闯关游戏：

- **8 个关卡**：从 10 以内热身，到 20 以内进位加、退位减，再到 60 秒闪电挑战和终极数学大魔王
- **星星奖励**：每答对一题得星，通关按正确率评 1~3 星，连对 3 题额外奖励
- **计时挑战**：第 6 关 60 秒、第 8 关 90 秒，比快比准
- **小动物养成**：攒星星解锁 9 个伙伴，从蛋蛋一路养到神龙
- **语音 + 音效**：答对有欢呼和中文语音表扬，答错温柔鼓励，不打击信心

## 怎么拿到 APK

不需要你懂任何开发工具，全程免费：

### 第一步：注册/登录 GitHub

如果没有账号，去 https://github.com 注册一个（免费）。

### 第二步：新建仓库并上传代码

1. 打开 https://github.com/new
2. Repository name 填 `mathkid`，选 **Private**（私有）或 Public 都可以
3. 点 **Create repository**
4. 在这个页面点 **uploading an existing file**
5. 把 `mathkid` 文件夹里的**所有内容**（包括隐藏的 `.github` 文件夹）拖进去上传

> 如果看不到 `.github` 文件夹，在文件管理器里开启「显示隐藏文件」。

### 第三步：等云端自动编译

上传完成后，GitHub 会自动开始编译（大约 3~6 分钟）：

1. 点仓库顶部的 **Actions** 标签
2. 看到 `Build APK` 正在跑（黄点转圈）→ 等它变绿勾 ✅
3. 点进这次构建，页面底部 **Artifacts** 区域下载 `mathkid-apk.zip`
4. 解压得到 `mathkid.apk`

### 第四步：装到手机

1. 把 `mathkid.apk` 传到安卓手机（微信/QQ/数据线都行）
2. 手机上点开这个文件安装
3. 如果提示「不允许安装未知来源应用」，在弹窗里点设置 → 允许即可

安装后桌面会出现 **数学小闯关**，图标是黄色的。

## 怎么改题目

题库和玩法都在一个文件里，改起来很简单：

```
app/src/main/assets/index.html
```

- **改关卡**：搜索 `const LEVELS`，每关的 `total` 是题目数量、`time` 是限时秒数（0 表示不限时）
- **改小动物**：搜索 `const PETS`，`need` 是解锁所需的累计星星数
- **改表扬语**：搜索 `const PRAISE` 和 `const ENCOURAGE`

改完重新上传到 GitHub，Actions 会重新编译出新 APK。

## 自测脚本（可选）

改完题目或构建配置后，可以跑这些脚本确认没改坏：

```bash
cd tests
node test_engine.js        # 出题引擎：24000 道题校验答案正确性、进位退位特征
node test_structure.js     # 页面结构：标签配平、中文乱码检查
node test_build_config.js  # 构建配置：签名参数、版本号、包名、图标资源一致性
node test_interaction.js   # 完整流程：模拟孩子从打开 App 到通关（需 jsdom）
```

`test_interaction.js` 需要 jsdom：`npm install jsdom`，然后把文件顶部的 require 路径改成本地 jsdom 位置。

## 注意事项

- 签名密钥由 GitHub Actions 构建时自动生成，不需要你管理。如果以后要发布到应用商店，需要换成固定的正式签名（否则无法覆盖安装升级）。
- `minSdk 21` 表示支持安卓 5.0 及以上，覆盖绝大多数在用设备。

## 技术说明

- 安卓壳：原生 WebView 加载本地 HTML，`minSdk 21`（安卓 5.0 以上都能装）
- 游戏本体：纯 HTML/CSS/JS，无任何第三方依赖，完全离线运行
- 音效：Web Audio API 实时合成，不占体积
- 语音：调用系统中文 TTS
- 进度保存：localStorage 本地存储，卸载前不会丢
- 无网络权限、无广告、无内购、不收集任何数据
