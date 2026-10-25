// くらぶのページ（app.js）のテスト。画面の代わりに小さな偽物を使う。
//   node --test test/
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

// 偽の画面と端末の記録の上で app.js を動かし、画面の部品（nodes）を返す
function run(recent) {
  const nodes = {};
  // 画面の要素の偽物
  const make = (tag) => ({
    tag, children: [], attrs: {}, hidden: true, textContent: "",
    setAttribute(k, v) { this.attrs[k] = v; },
    append(...c) { this.children.push(...c); },
    replaceChildren(...c) { this.children = c; },
    replaceWith() {}
  });
  const snapshot = { items: [{ key: "qji", name: "くじ", url: "https://katsuan.github.io/qji/", appIcon: "x.svg", group: "daily" }], groups: [] };
  nodes.hubSnapshot = Object.assign(make("script"), { textContent: JSON.stringify(snapshot) });
  nodes.recentList = make("ul");
  nodes.recent = make("section");
  const errors = [];
  const ctx = {
    document: { getElementById: (id) => nodes[id] || make("div"), createElement: make, createTextNode: (t) => ({ text: t }) },
    localStorage: { getItem: () => recent },
    fetch: () => new Promise(() => {}),
    console: { error: (e) => errors.push(e) },
    JSON, Map, Set, Array, Object, String, Promise
  };
  vm.runInNewContext(SOURCE, ctx);
  return nodes;
}

test("最近つかった：覚えたツールを出す", () => {
  const nodes = run('[{"key":"qji"}]');
  assert.equal(nodes.recentList.children.length, 1);
  assert.equal(nodes.recent.hidden, false);
});

test("最近つかった：端末の中身が壊れていても（配列でない・null）止まらず、出さない", () => {
  for (const bad of ['{"a":1}', "null", '"x"', "{"]) {
    const nodes = run(bad);
    assert.equal(nodes.recent.hidden, true);
  }
});
