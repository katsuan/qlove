// くらぶのページ（index.html）の言葉のテスト。
//   node --test test/
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const HTML = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
// <meta name|property="…" content="…"> の content を返す
const meta = (name) => (HTML.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`)) || [])[1] || "";

// 題と OGP の説明に LINE を書かない（q-oqrn の docs/ux.md G5）
test("題・description・og:description に LINE がない", () => {
  for (const text of [HTML.match(/<title>([^<]*)<\/title>/)[1], meta("description"), meta("og:title"), meta("og:description")]) {
    assert.doesNotMatch(text, /LINE/, text);
  }
});

// 最初の画面の説明（.lead）にも LINE を書かない（G5）
test("最初の説明の文に LINE がない", () => {
  const lead = HTML.match(/<p class="ls-hint lead">([\s\S]*?)<\/p>/)[1];
  assert.doesNotMatch(lead, /LINE/);
});
