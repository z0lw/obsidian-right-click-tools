# Obsidian Right-Click Tools

右クリック操作を強化する軽量プラグインです。ファイル/フォルダの移行と、今日の日付フォルダ（`YYYY-MM-DD`）の作成に対応します。

## 同梱ファイル（ランタイムのみ）
- `main.js`
- `manifest.json`
- `styles.css`

## インストール（ビルド不要）
- 3ファイルを `/<Your Vault>/.obsidian/plugins/obsidian-right-click-tools/` に配置
- Obsidian → 設定 → コミュニティプラグイン → 「Right-Click Tools」を有効化

## 使い方
- 今日のフォルダ作成: エクスプローラで右クリック → 「今日の日付のフォルダを作成」
  - 既に存在する場合は `YYYY-MM-DD_1`, `_2`… と連番を付与
- ファイル/フォルダの移行: エクスプローラで右クリック → 「<設定値>」に移行
  - 設定タブから移行先フォルダ名を指定可能

## 要件
- Obsidian v1.5.0 以降
