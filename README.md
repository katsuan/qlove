# くらぶ 〜Qlove〜

くらしの部室。スマホと LINE で使う小さなツール（Q ツール）の入口ページです。

https://katsuan.github.io/qlove/

## 一覧の更新

ツールの一覧は、おくるん（[line-share](https://github.com/katsuan/line-share)）の `data/hub-links.json` が元です。

- ページを開くと `app.js` が公開中の `hub-links.json` を読み、書きこんである一覧とちがえば描きなおします。
- JS がなくても見えるよう、`index.html` にも一覧を書きこんであります。ツールを足したら書きなおします。
- カードの形を変えるときは、`tools/build.py` の `card` と `app.js` の `card` を両方そろえます（`test/cards.test.js` が、ずれていたら知らせます）。

```sh
python3 tools/build.py
```

手元に `../q-oqrn` があればそれを、なければ公開中の `hub-links.json` を読みます。

## ファイル

| 名前 | 役わり |
|---|---|
| `index.html` | ページ（JS がなくても見える一覧の控えつき） |
| `app.js` | 最新の一覧を読んで描きなおす・最近つかったツール |
| `style.css` | 見た目（共通の部品はおくるんの `shared/ui.css`） |
| `tools/build.py` | `index.html` の一覧の控えを書きなおす |
| `test/` | テスト（`node --test test/`）。`cards.test.js` は、`app.js` が描きなおすカードと `tools/build.py` が書きこんだカードが同じ形かを見る |
| `.github/workflows/pages.yml` | 公開（Q 共通の `q-pages.yml`） |

## 公開

main に push すると GitHub Actions が、テストと check-code が通ったときだけ Pages に出します。読みこむ CSS・JS の `?v=` は公開のときに付くので、手で付けなくてよいです。
