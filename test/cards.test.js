// くらぶのカードの形のテスト：開いたときに app.js が描きなおすカードと、tools/build.py が index.html に書きこんだカードが同じ形か。
// あわせて、部の分け方（兼部・そのほか）と「つぎに」の行を確かめる。
//   node --test test/
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const HTML = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

// Python の html.escape(quote=True) と同じ置きかえ
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" })[c]);

// 画面の要素の偽物（属性は付けた順に覚える）
function make(tag) {
  return {
    tag, children: [], attrs: {}, hidden: true, textContent: "",
    setAttribute(k, v) { this.attrs[k] = String(v); },
    append(...c) { this.children.push(...c); },
    replaceChildren(...c) { this.children = c; },
    replaceWith(node) { this.replacedBy = node; }
  };
}
// 偽物の要素を HTML の字にする
function html(node) {
  if (node.text !== undefined) return esc(node.text);
  const attrs = Object.entries(node.attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
  if (node.tag === "img") return `<img${attrs}>`;
  const inner = node.textContent ? esc(node.textContent) : node.children.map(html).join("");
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
}

// app.js を動かし、最新の一覧 latest で描きなおした部の一覧（#clubs）を返す
async function renderWith(latest, snapshot = { items: [], groups: [] }) {
  const clubs = make("div");
  const nodes = { hubSnapshot: Object.assign(make("script"), { textContent: JSON.stringify(snapshot) }), recentList: make("ul"), recent: make("nav"), clubs };
  const ctx = {
    document: { getElementById: (id) => nodes[id] || make("div"), createElement: make, createTextNode: (t) => ({ text: String(t) }) },
    localStorage: { getItem: () => "[]" },
    fetch: () => Promise.resolve({ ok: true, json: () => latest }),
    JSON, Map, Set, Array, Object, String, Promise
  };
  vm.runInNewContext(SOURCE, ctx);
  await new Promise((r) => setImmediate(r));
  return clubs.replacedBy;
}

test("app.js が描くカードは、tools/build.py が index.html に書きこんだカードと同じ形", async () => {
  const snapshot = JSON.parse(HTML.match(/<script type="application\/json" id="hubSnapshot">([\s\S]*?)<\/script>/)[1].replace(/<\\\//g, "</"));
  const written = HTML.match(/<div id="clubs">[\s\S]*?<\/div>/)[0].replace(/>\s+</g, "><");
  // 控えと同じ中身だと描きなおさないので、使わない印を1つ足して渡す
  const root = await renderWith({ ...snapshot, v: "test" }, snapshot);
  assert.ok(root, "描きなおしていない");
  assert.equal(html(root), written);
});

const tool = (key, o = {}) => ({ key, name: key, en: key.toUpperCase(), url: `https://katsuan.github.io/${key}/`, appIcon: `${key}.svg`, copy: "c", lead: "l", group: "daily", ...o });

test("部の分け方：兼部のツールは両方の部に（その部のツールのあと）。部が決まっていないツールは「そのほか」。名前か URL のないものは出さない", async () => {
  const data = {
    groups: [{ key: "sports", label: "💪 たいいく部 〜taiiQ部〜", desc: "うごく" }, { key: "habit", label: "🔥 けいぞく部 〜keizoQ部〜" }],
    items: [tool("kiloq", { group: "sports", also: ["habit"] }), tool("tuzuq", { group: "habit" }), tool("saqsen", { group: "sports" }), tool("odd", { group: "nowhere" }), tool("nourl", { url: "" })]
  };
  const root = await renderWith(data);
  const [nav, ...sections] = root.children;
  assert.deepEqual(nav.children.map((li) => li.children[0].textContent), ["💪 たいいく部", "🔥 けいぞく部", "そのほか"]);
  const names = sections.map((s) => s.children.at(-1).children.map((li) => li.children[0].attrs.href.split("/")[3]));
  assert.deepEqual(names, [["kiloq", "saqsen"], ["tuzuq", "kiloq"], ["odd"]]);
  assert.deepEqual(sections.map((s) => s.attrs.id), ["club-sports", "club-habit", "club-other"]);
  // 説明のない部には説明の行を出さない
  assert.equal(sections[1].children.some((c) => c.attrs.class === "club-desc"), false);
  assert.ok(html(sections[1]).includes('<span class="q-also">兼部</span>'));
});

test("「つぎに」の行：つぎのツールが一覧にあるときだけ、そのツールへのリンク", async () => {
  const data = {
    groups: [{ key: "daily", label: "毎日" }],
    items: [tool("tuzuq", { next: { key: "kiloq", why: "筋トレで自動チェック" } }), tool("kiloq", { next: { key: "gone", why: "x" } })]
  };
  const root = await renderWith(data);
  const cards = root.children[1].children.at(-1).children.map(html);
  assert.ok(cards[0].includes('<a class="q-next" href="https://katsuan.github.io/kiloq/"><span class="ls-icon" data-icon="next" aria-hidden="true"></span><span>つぎに <b>kiloq</b>：筋トレで自動チェック</span></a>'));
  assert.equal(cards[1].includes("q-next"), false);
});

test("ツールの名前や説明に記号があっても、HTML としては動かない", async () => {
  const bad = '<img src=x onerror=alert(1)>'; // qcheck-ok: W8 テストの見本の文字
  const root = await renderWith({ groups: [{ key: "daily", label: bad }], items: [tool("qji", { name: bad, lead: bad })] });
  const out = html(root);
  assert.equal(out.includes("<img src=x"), false);
  assert.ok(out.includes("&lt;img src=x"));
});
