# Obsidian Right-Click Tools

Lightweight plugin to enhance the file explorer’s context menu.

- Create today’s date folder and note using a configurable Moment date format (default `YYYY-MM-DD`). If it already exists, auto-increments with `_1`, `_2`, …
- Create today’s daily note from a configurable template.
- Move selected file(s)/folder(s) to a configurable destination folder.
- Add optional ribbon buttons for creating today’s date notes in multiple configured folders, each with a custom display name.

AI title/tag generation has moved to a separate plugin, “AI Note Assistant”.

## Files
- `main.js`
- `manifest.json`
- `styles.css`

## Installation (no build)
Place the three files in `/<Your Vault>/.obsidian/plugins/obsidian-right-click-tools/` and enable “Right-Click Tools” in Obsidian’s Community Plugins.

## Requirements
- Obsidian v1.5.0+

---

## 日本語説明
ファイルエクスプローラの右クリック操作を拡張する軽量プラグインです。

- 設定したMoment形式（既定 `YYYY-MM-DD`）で今日の日付フォルダとノートを作成。既に存在する場合は `_1`, `_2` … と連番を付与します。
- テンプレートを使って今日のデイリーノートを作成します。
- 選択したファイル／フォルダを、設定で指定したフォルダへ移動します。
- 表示名と保存先フォルダを複数登録し、それぞれのリボンボタンから今日のデイリーノートを作成できます。
- 「日付の書式」でMoment形式（例: `YYYY-MM-DD`、`YYYY年MM月DD日`）を選択できます。ノート名・日付フォルダ名・テンプレートの`{{date}}`に適用されます。

AIによるタイトル・タグ生成機能は別プラグイン「AI Note Assistant」へ分離しました。

### 同梱ファイル（ランタイムのみ）
- `main.js`
- `manifest.json`
- `styles.css`

### インストール（ビルド不要）
上記 3 ファイルを `/<Your Vault>/.obsidian/plugins/obsidian-right-click-tools/` に配置し、Obsidian の「コミュニティプラグイン」で “Right-Click Tools” を有効にしてください。

### デイリーノートテンプレート
- 設定タブの「日付ノートテンプレート」にテンプレートノートのパスを指定します。
- テンプレート内の `{{date}}`、`{{time}}`、`{{title}}` は作成時に置換されます。

### 要件
- Obsidian v1.5.0 以上
