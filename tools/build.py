#!/usr/bin/env python3
"""部の一覧とツールのカードを index.html に書きこむ（JS がなくても・読みこみに失敗しても見えるように）。

一覧は、おくるん（line-share）の data/hub-links.json。手元に ../q-oqrn があればそれを、なければ公開中のものを読む。
書きこんだ一覧の元データも index.html に控えておき、開いたときに app.js が最新の hub-links.json と比べて、
ちがえば app.js が同じ形で描きなおす（カードの形を変えたら app.js の render もそろえる）。

  python3 tools/build.py
"""
import html
import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
LOCAL = ROOT.parent / "q-oqrn" / "data" / "hub-links.json"
URL = "https://katsuan.github.io/line-share/data/hub-links.json"


def load():
    if LOCAL.exists():
        return json.loads(LOCAL.read_text(encoding="utf-8"))
    with urllib.request.urlopen(URL, timeout=10) as res:
        return json.load(res)


def e(value):
    return html.escape(str(value or ""), quote=True)


def short_label(label):
    # 「💪 たいいく部 〜taiiQ部〜」→「💪 たいいく部」（目次は短く）
    return re.sub(r"\s*〜.*〜\s*$", "", label or "")


def clubs(data):
    items = [it for it in data.get("items", []) if it.get("url") and it.get("name")]
    groups = list(data.get("groups", []))
    known = {g["key"] for g in groups}
    rest = [it for it in items if it.get("group") not in known]
    if rest:
        groups.append({"key": "other", "label": "そのほか", "desc": ""})
    out = []
    for g in groups:
        members = [it for it in items if it.get("group") == g["key"] or (g["key"] == "other" and it in rest)]
        if members:
            out.append((g, members))
    return out, {it["key"]: it for it in items}


def card(it, by_key):
    nxt = it.get("next") or {}
    target = by_key.get(nxt.get("key"))
    s = (
        f'<li class="q-card" style="--q: {e(it.get("qColor") or it.get("color"))}">'
        f'<a class="q-main" href="{e(it["url"])}">'
        f'<img src="{e(it.get("appIcon"))}" alt="" width="48" height="48" loading="lazy">'
        '<span class="q-body">'
        f'<span class="q-name">{e(it.get("name"))} <small>{e(it.get("en"))}</small></span>'
        f'<span class="q-copy">{e(it.get("copy"))}</span>'
        f'<span class="q-lead">{e(it.get("lead") or it.get("desc"))}</span>'
        "</span></a>"
    )
    if target:
        s += (
            f'<a class="q-next" href="{e(target["url"])}"><span aria-hidden="true">→</span>'
            f'<span>つぎに <b>{e(target.get("name"))}</b>：{e(nxt.get("why"))}</span></a>'
        )
    return s + "</li>"


def render(data):
    groups, by_key = clubs(data)
    nav = "".join(f'<li><a href="#club-{e(g["key"])}">{e(short_label(g.get("label")))}</a></li>' for g, _ in groups)
    parts = [f'<div id="clubs">\n  <ul class="club-nav" aria-label="部の目次">{nav}</ul>']
    for g, members in groups:
        parts.append(
            f'  <section class="club" id="club-{e(g["key"])}">'
            f'<h2 class="club-head">{e(g.get("label"))}</h2>'
            + (f'<p class="club-desc">{e(g.get("desc"))}</p>' if g.get("desc") else "")
            + '<ul class="q-list">' + "".join(card(it, by_key) for it in members) + "</ul></section>"
        )
    parts.append("</div>")
    snapshot = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    parts.append(f'<script type="application/json" id="hubSnapshot">{snapshot}</script>')
    return "\n  ".join(parts), sum(len(m) for _, m in groups)


def main():
    data = load()
    body, count = render(data)
    page = ROOT / "index.html"
    s = page.read_text(encoding="utf-8")
    s, n = re.subn(
        r"(<!-- qlove:start -->).*?(<!-- qlove:end -->)",
        lambda m: m.group(1) + "\n  " + body + "\n  " + m.group(2),
        s,
        flags=re.S,
    )
    if n != 1:
        raise SystemExit("index.html に <!-- qlove:start --> … <!-- qlove:end --> がありません")
    page.write_text(s, encoding="utf-8")
    print(f"ツール {count} 件を書きこみました")


if __name__ == "__main__":
    main()
