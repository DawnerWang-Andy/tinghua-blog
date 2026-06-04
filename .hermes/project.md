# 半开博客 - Hermes Agent 项目配置
# 这个文件被 Hermes Agent 自动读取

name: 半开（Bankai）
description: Hugo + Stack 主题的小说创作博客
repo: DawnerWang-Andy/tinghua-blog
site: https://bankai-5ss.pages.dev

content_dir: content/novels/
build_cmd: hugo --gc
deploy: git push → GitHub Actions → Cloudflare Pages

skills:
  - tinghua-blog-workflow

agent_rules:
  - 新增章节在 content/novels/ 下建 .md，不要用 hugo new
  - 每个章节 frontmatter 必须包含 title, date, tags, categories, weight
  - 构建前先 hugo --gc 测试
  - macOS 中文编码 bug：不要用 hugo new site 和 git submodule
