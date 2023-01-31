---
title: "First_post"
date: 2023-01-31T11:35:43+08:00
draft: true
---

```c
hugo new site [blogfilename]
hugo server -t hugo-ivy --buildDrafts
hugo --theme=hugo-ivy --baseUrl="https://ningonoe.github.io/" --buildDrafts
```

```c
192.30.255.112 github.com git
185.31.16.184 github.global.ssl.fastly.net
```

以下是各个系统Hosts文件所在位置：

Windows：C:\Windows\System32\drivers\etc\hosts（Windows注意使用管理员权限打开，记事本或者VS code均可）
Mac：/etc/hosts
Linux：/etc/hosts（非Root用户注意权限）


##### Error building site: TOCSS: failed to transform "scss/style.scss" (text/x-scss).

```c
PS D:\Software\hugo\myblog> hugo server -t stack
WARN 2023/01/31 10:11:51 Module "stack" is not compatible with this Hugo version; run "hugo mod graph" for more information.
Start building sites …
hugo v0.110.0-e32a493b7826d02763c3b79623952e625402b168 windows/amd64 BuildDate=2023-01-17T12:16:09Z VendorInfo=gohugoio
Error: Error building site: TOCSS: failed to transform "scss/style.scss" (text/x-scss). Check your Hugo installation; you need the extended version to build SCSS/SASS with transpiler set to 'libsass'.: this feature is not available in your current Hugo version, see https://goo.gl/YMrWcn for more information
Built in 20 ms
```

版本不对，缺少包，需下载带有拓展包版本的hugo


##### ERROR Failed to read Git log: fatal: not a git repository

```c
# 修改config.toml
# 是否使用 git 信息
enableGitInfo = false
```