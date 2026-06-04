import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("header links to the Pretendo GitHub repository", async () => {
  const pageSource = await readFile(new URL("./page.tsx", import.meta.url), {
    encoding: "utf8",
  });

  assert.match(pageSource, /href="https:\/\/github\.com\/samarthmn\/pretendo"/);
  assert.match(pageSource, /aria-label="Open Pretendo on GitHub"/);
});
