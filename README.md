# Nihongo Review Site (Static)

這個專案是可直接部署到 GitHub Pages 的靜態網站，讓學生透過課文 + 解釋 + 音檔複習。

## 目錄

```text
.
├─ index.html
├─ assets/
│  ├─ css/style.css
│  └─ js/app.js
├─ data/
│  ├─ levels.json
│  └─ lessons/
│     ├─ beginner-1/
│     ├─ beginner-2/
│     ├─ advanced-1/
│     └─ advanced-2/
└─ audio/
```

## 你平常只要改的地方

1. 在 `data/levels.json` 調整各級數課數範圍。
2. 在 `data/lessons/<level-id>/lesson-XX.json` 編輯該課句子內容。
3. 把 mp3 放進 `audio/<level-id>/lesson-XX/`，再把 `audio` 路徑填回 JSON。

## Lesson JSON 範例

```json
{
  "title": "初級一 第 1 課",
  "note": "自我介紹與基本句型",
  "sentences": [
    {
      "jp": "はじめまして。",
      "reading": "hajimemashite.",
      "zh": "初次見面。",
      "audio": "audio/beginner-1/lesson-01/001.mp3"
    }
  ]
}
```

## GitHub Pages

1. Push 到 GitHub 的 `version1` 或 `main` 分支。
2. Repository → **Settings** → **Pages**。
3. Source 選擇要發佈的分支（通常 `main`）與根目錄 `/`。
