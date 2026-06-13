---
layout: page
title: Cantonese Wordles
description: A daily Cantonese Jyutping puzzle migrated from Next.js to static JavaScript for GitHub Pages.
img: assets/img/10.jpg
importance: 10
category: fun
---

这个页面展示的是一个适配 GitHub Pages 的静态小游戏版本。
原始项目依赖 `Next.js + TypeScript + API Route + Supabase`，无法直接部署到 `al-folio` 的 Jekyll 站点中。
因此这里改为纯前端 JavaScript 方案，保留核心玩法，同时去掉服务端依赖。

对用户的影响：

- 页面可以直接托管在 GitHub Pages 上，加载和部署都更稳定。
- 每日题目按北京时间轮换，保持“每天一题”的体验。
- 当前浏览器会保存当天进度，刷新页面不会丢失已找到的单词。

<style>
  .cantonese-wordles-embed {
    margin-top: 1.5rem;
  }

  .cantonese-wordles-embed iframe {
    width: 100%;
    min-height: 980px;
    border: 0;
    border-radius: 24px;
    background: #fff9f0;
    box-shadow: 0 16px 36px rgba(46, 36, 18, 0.14);
  }

  @media (max-width: 640px) {
    .cantonese-wordles-embed iframe {
      min-height: 1080px;
      border-radius: 18px;
    }
  }
</style>

<div class="cantonese-wordles-embed">
  <iframe
    src="{{ '/assets/games/cantonese-wordles/index.html' | relative_url }}"
    title="Cantonese Wordles"
    loading="lazy"
  ></iframe>
</div>
