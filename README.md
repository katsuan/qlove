# くらぶ 〜Qlove〜

くらしの部室。スマホと LINE で使う小さなツール（Q ツール）の入口ページです。

https://katsuan.github.io/qlove/

## 一覧の更新

ツールの一覧は、おくるん（[line-share](https://github.com/katsuan/line-share)）の `data/hub-links.json` が元です。

- ページを開くと `app.js` が公開中の `hub-links.json` を読み、書きこんである一覧とちがえば描きなおします。
- JS がなくても見えるよう、`index.html` にも一覧を書きこんであります。ツールを足したら書きなおします。

```sh
python3 tools/build.py
```

手元に `../q-oqrn` があればそれを、なければ公開中の `hub-links.json` を読みます。
