// くらぶ 〜Qlove〜 のページの動き（index.html が読む）。
// 1. 最新の一覧（おくるんの data/hub-links.json）を読み、tools/build.py が書きこんだ控えとちがえば描きなおす
// 2. ツールが覚えた「最近つかった」（localStorage の conneqt:recent。どのツールも katsuan.github.io の下なので読める）を上に出す
// カードの形は tools/build.py の render と同じにする。
(function () {
  "use strict";

  const HUB_URL = "https://katsuan.github.io/line-share/data/hub-links.json";

  // 要素を作る（attrs の text は中身の文字、ほかは属性。children を中に入れる）
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs || {})) {
      if (value == null || value === "") continue;
      if (name === "text") node.textContent = value;
      else node.setAttribute(name, value);
    }
    for (const child of children || []) if (child) node.append(child);
    return node;
  }

  // 部の名前から「〜…〜」を外した短い名前（目次に使う）
  const shortLabel = (label) => String(label || "").replace(/\s*〜.*〜\s*$/, "");

  // group が元の部。also は兼部（キロっく＝たいいく部とけいぞく部）で、その部にも並べる
  const inClub = (it, key) => it.group === key || (Array.isArray(it.also) && it.also.includes(key));

  // 部ごとのツールの並び（兼部はその部のツールのあと）と、key からツールを引く表を返す
  function clubs(data) {
    const items = (data.items || []).filter((it) => it && it.url && it.name);
    const groups = [...(data.groups || [])];
    const known = new Set(groups.map((g) => g.key));
    const rest = items.filter((it) => !known.has(it.group));
    if (rest.length) groups.push({ key: "other", label: "そのほか", desc: "" });
    const out = groups
      .map((g) => [g, g.key === "other" ? rest : items.filter((it) => inClub(it, g.key)).sort((a, b) => (a.group !== g.key) - (b.group !== g.key))]) // 兼部はあと
      .filter(([, members]) => members.length);
    return { groups: out, byKey: new Map(items.map((it) => [it.key, it])) };
  }

  // ツールのカード1枚（押すとツールを開く。つぎにおすすめがあれば下に）
  function card(it, byKey) {
    const li = el("li", { class: "q-card", style: `--q: ${it.qColor || it.color || ""}` }, [
      el("a", { class: "q-main", href: it.url }, [
        el("img", { src: it.appIcon, alt: "", width: "48", height: "48", loading: "lazy" }),
        el("span", { class: "q-body" }, [
          el("span", { class: "q-name" }, [
            document.createTextNode(`${it.name} `),
            el("small", { text: it.en }),
            Array.isArray(it.also) && it.also.length ? el("span", { class: "q-also", text: "兼部" }) : null // 兼部のツールは、どの部でも印
          ]),
          el("span", { class: "q-copy", text: it.copy }),
          el("span", { class: "q-lead", text: it.lead || it.desc })
        ])
      ])
    ]);
    const next = it.next || {};
    const target = byKey.get(next.key);
    if (target) {
      li.append(
        el("a", { class: "q-next", href: target.url }, [
          el("span", { "aria-hidden": "true", text: "→" }),
          el("span", {}, [document.createTextNode("つぎに "), el("b", { text: target.name }), document.createTextNode(`：${next.why || ""}`)])
        ])
      );
    }
    return li;
  }

  // 最新の一覧で、部の目次とカードを描きなおす
  function render(data) {
    const { groups, byKey } = clubs(data);
    const root = el("div", { id: "clubs" }, [
      el(
        "ul",
        { class: "club-nav", "aria-label": "部の目次" },
        groups.map(([g]) => el("li", {}, [el("a", { href: `#club-${g.key}`, text: shortLabel(g.label) })]))
      ),
      ...groups.map(([g, members]) =>
        el("section", { class: "club", id: `club-${g.key}` }, [
          el("h2", { class: "club-head", text: g.label }),
          g.desc ? el("p", { class: "club-desc", text: g.desc }) : null,
          el("ul", { class: "q-list" }, members.map((it) => card(it, byKey)))
        ])
      )
    ]);
    document.getElementById("clubs").replaceWith(root);
  }

  // 端末に覚えた「最近つかった」ツールを上に出す（壊れていれば出さない）
  function showRecent(data) {
    let recent = [];
    try {
      recent = JSON.parse(localStorage.getItem("conneqt:recent") || "[]");
    } catch {
      return; // 覚えられない環境では出さない
    }
    if (!Array.isArray(recent)) return; // 中身が壊れていたら出さない
    const byKey = new Map((data.items || []).map((it) => [it.key, it]));
    const tools = recent.map((row) => row && byKey.get(row.key)).filter(Boolean).slice(0, 6);
    const list = document.getElementById("recentList");
    list.replaceChildren(
      ...tools.map((it) =>
        el("li", {}, [el("a", { href: it.url }, [el("img", { src: it.appIcon, alt: "", width: "44", height: "44" }), document.createTextNode(it.name)])])
      )
    );
    document.getElementById("recent").hidden = tools.length === 0;
  }

  let snapshot = {};
  try {
    snapshot = JSON.parse(document.getElementById("hubSnapshot").textContent);
  } catch {
    // 控えが読めなくても、最新を読みにいく
  }
  showRecent(snapshot);

  fetch(HUB_URL, { cache: "no-cache" })
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((latest) => {
      if (JSON.stringify(latest) !== JSON.stringify(snapshot)) render(latest);
      showRecent(latest);
    })
    .catch(() => {
      // 読めなければ、書きこんである控えのまま
    });
})();
