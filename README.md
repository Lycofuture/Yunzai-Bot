# Yunzai-Bot v3

[![docker test](https://github.com/Lycofuture/Yunzai-Bot/actions/workflows/Docker%20Build%20Test.yml/badge.svg?branch=main)](https://github.com/Lycofuture/Yunzai-Bot/actions/workflows/Docker%20Build%20Test.yml)
[![release](https://github.com/Lycofuture/Yunzai-Bot/actions/workflows/release.yml/badge.svg)](https://github.com/Lycofuture/Yunzai-Bot/actions/workflows/release.yml)

云崽v3.0，原神qq群机器人，通过米游社接口，查询原神游戏信息，快速生成图片返回

项目仅供学习交流使用，严禁用于任何商业用途和非法行为

[目前功能](https://github.com/Lycofuture/Yunzai-Bot/tree/main/plugins/genshin)

## 使用方法

> 环境准备： Windows or
>
Linux，Node.js([版本至少v16以上](http://nodejs.cn/download/))，[Redis](https://redis.io/docs/getting-started/installation/),
git([版本至少v1.7以上](https://git-scm.com/downloads))

1.克隆项目

```bash
git clone --depth=1 -b main https://github.com/Lycofuture/Yunzai-Bot.git
```

```bash
cd Yunzai-Bot #进入Yunzai目录
```

2.安装[pnpm](https://pnpm.io/zh/installation)，已安装的可以跳过

```bash
npm install pnpm -g
```

3.安装依赖

```bash
git submodule init
 ```
```bash
git submodule update --remote
 ```
```bash
pnpm install -P
```

4.运行（首次运行按提示输入登录）

```bash
node app
```

## Le佬版迁移教程

1. 执行(为了切换到本云崽)

```bash
git remote set-url origin https://github.com/Lycofuture/Yunzai-Bot.git && git checkout main && git pull
```

2. 执行(为了重置到最新的更新)

```bash
git reset --hard origin/main && git pull && git submodule update --init --recursive && git submodule update --recursive --remote
```

3. 执行(为了升级依赖，同时修复部分迁移用户因pm2问题无法重启与后台运行)

```bash
pnpm update
```

```bash
pnpm install -P
```

```bash
pnpm install pm2 -g
```

```bash
pm2 update
```

4. 执行

```bash
node ./node_modules/puppeteer/install.js
```

5. 运行（首次运行按提示输入登录）

```bash
node app
```

6. 登陆后后台运行（先按ctrl+c终止机器人运行，然后输入)

```bash
pnpm run start
```

## 致谢

|                           Nickname                            | Contribution |
|:-------------------------------------------------------------:|--------------|
| [GardenHamster](https://github.com/GardenHamster/GenshinPray) | 模拟抽卡背景素材来源   |
|      [西风驿站](https://bbs.mihoyo.com/ys/collection/839181)      | 角色攻略图来源      |
|     [米游社友人A](https://bbs.mihoyo.com/ys/collection/428421)     | 角色突破素材图来源    |

## 其他

- 最后给个star或者[爱发电](https://afdian.net/@Le-niao)，你的支持是维护本项目的动力~~
- 图片素材来源于网络，仅供交流学习使用
- 严禁用于任何商业用途和非法行为
