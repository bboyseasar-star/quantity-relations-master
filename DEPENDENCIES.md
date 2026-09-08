# 依存関係

|名称|固定バージョン・指定方法|用途|ライセンス・配布元・通信先|
|---|---|---|---|
|MathJax|`3.2.2`|数式表示|Apache-2.0、[公式配布元](https://github.com/mathjax/MathJax-src)、`cdn.jsdelivr.net`|
|MathLive|`0.101.0`|数式入力|MIT、[公式配布元](https://github.com/arnog/mathlive)、`unpkg.com`|
|BIZ UDPGothic|Google Fonts|本文表示|OFL-1.1、[公式配布元](https://github.com/googlefonts/morisawa-biz-ud-gothic)、`fonts.googleapis.com`・`fonts.gstatic.com`|
|Outfit|Google Fonts|数字・見出し表示|OFL-1.1、[Google Fonts配布元](https://github.com/google/fonts/tree/main/ofl/outfit)、`fonts.googleapis.com`・`fonts.gstatic.com`|

CDN読込時には各配信元へIPアドレス、User-Agent、Referer等の通常のアクセス情報が送信されます。学習履歴・答案を送る独自通信はありません。CDNが利用できない場合、数式入力・表示またはWebフォントが正常に動作しない可能性があります。

紙吹雪と手書きメモはアプリ独自のCSS・Canvas実装で、第三者ライブラリではありません。手書き内容は保存・送信しません。追加のnpm依存、画像、音声、外部APIはありません。
