#!/usr/bin/env python3
"""名前を変えたツールの、古い repo 名に置く案内のページを作る。

古い住所（https://katsuan.github.io/<古い名前>/…）に来た人を、くらぶの入口の引っこしの案内
（https://katsuan.github.io/qlove/?moved=<key>&rest=<続き>）へ送る。続き（/create.html?… など）は、
くらぶの入口が新しい住所に付けなおす（app.js の MOVED。ツールを足したらそこにも1行足す）。
前に送ったカードの画像が出るように、新しい repo の画像（png・svg など）を同じ場所に写す。

使い方: python3 tools/moved.py <古い名前> <key> <新しい repo のフォルダ>
  例:   python3 tools/moved.py countdown qronos ~/GitHub/q-qronos
作る場所: ~/GitHub/q-moved/<古い名前>/（git の repo にして、GitHub の katsuan/<古い名前> に送る）
"""
import shutil
import subprocess
import sys
from pathlib import Path

HUB = "https://katsuan.github.io/qlove/"
IMAGE_EXT = {".png", ".svg", ".webp", ".jpg", ".jpeg", ".gif", ".ico"}
SKIP_DIRS = ("test/", "tests/", "tools/", "design/", ".github/", "node_modules/")
MAX_BYTES = 2 * 1024 * 1024

PAGE = """<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>引っこしました</title>
<script>
  // {old} は引っこしました。くらぶの入口の案内へ、住所の続きごと送る（tools/moved.py が作ったページ）
  (function () {{
    var old = "/{old}";
    var path = location.pathname.indexOf(old) === 0 ? location.pathname.slice(old.length) : "";
    var rest = (path || "/") + location.search + location.hash;
    location.replace("{hub}?moved={key}&rest=" + encodeURIComponent(rest));
  }})();
</script>
<style>
  html, body {{ margin: 0; background: #f6f4fb; color: #2a2438; font: 16px/1.6 system-ui, sans-serif; }}
  @media (prefers-color-scheme: dark) {{ html, body {{ background: #17141f; color: #ece8f5; }} a {{ color: #b9a6ff; }} }}
  main {{ padding: 24px 16px; }}
</style>
</head>
<body>
<main>
<p>このツールは引っこしました。</p>
<p><a href="{hub}?moved={key}">くらぶの入口へ</a></p>
</main>
</body>
</html>
"""


def images(src):
    """新しい repo の、公開される画像（git が見ているもの）"""
    out = subprocess.run(["git", "-C", str(src), "ls-files"], capture_output=True, text=True, check=True).stdout
    for name in out.splitlines():
        p = src / name
        if p.suffix.lower() in IMAGE_EXT and not name.startswith(SKIP_DIRS) and p.is_file() and p.stat().st_size <= MAX_BYTES:
            yield name


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    old, key, src = sys.argv[1], sys.argv[2], Path(sys.argv[3]).expanduser()
    dest = Path.home() / "GitHub" / "q-moved" / old
    dest.mkdir(parents=True, exist_ok=True)
    page = PAGE.format(old=old, key=key, hub=HUB)
    (dest / "index.html").write_text(page, encoding="utf-8")
    (dest / "404.html").write_text(page, encoding="utf-8")
    (dest / ".nojekyll").write_text("", encoding="utf-8")
    (dest / "README.md").write_text(
        f"このツールは引っこしました（新しい住所は {HUB}?moved={key} から）。\n"
        "ここは、古い住所から来た人をくらぶの入口の案内へ送るためだけの場所です（くらぶの tools/moved.py が作る）。\n",
        encoding="utf-8",
    )
    n = 0
    for name in images(src):
        to = dest / name
        to.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src / name, to)
        n += 1
    print(f"{dest}：案内のページと、画像 {n} 個")


main()
