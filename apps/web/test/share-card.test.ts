import assert from "node:assert/strict";
import { test } from "node:test";
import { downloadSummary } from "../src/business/download.js";

test("long summary exports include the full disclaimer and footer inside the canvas without private fields", async (t) => {
  const drawn: { text: string; y: number; size: number }[] = [];
  const context = {
    font: "",
    fillStyle: "",
    fillRect() {},
    measureText(text: string) {
      return { width: [...text].length * 44 };
    },
    fillText(text: string, _x: number, y: number) {
      drawn.push({ text, y, size: Number.parseFloat(this.font) });
    },
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob(callback: (blob: Blob) => void) {
      callback(new Blob(["image"], { type: "image/png" }));
    },
  };
  let clicked = 0;
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: (tag: string) =>
        tag === "canvas"
          ? canvas
          : {
              click() {
                clicked++;
              },
            },
    },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  });
  t.mock.method(URL, "createObjectURL", () => "blob:test");
  t.mock.method(URL, "revokeObjectURL", () => {});
  // The DOM adapter is intentionally small: assertions cover the actual export
  // draw calls and dimensions, rather than a second copy of the layout code.
  const report = {
    productName: "长标题".repeat(53),
    resultLabel: "观察结论".repeat(20),
    totalScore: null,
    versionNumber: 2,
    isDemo: true,
    disclaimer: "仅供娱乐与自我观察。".repeat(28) + "完整声明结束",
    code: "PRIVATE_CODE_SENTINEL",
    answers: ["PRIVATE_ANSWER_SENTINEL"],
  } as never;
  await downloadSummary(report);
  const text = drawn.map((value) => value.text).join("");
  assert.ok(
    text.includes("完整声明结束"),
    "the disclaimer must not be truncated",
  );
  assert.ok(text.includes("MeetMyWorld · 多了解自己一点"));
  assert.ok(text.includes("信息不足"));
  assert.equal(text.includes("PRIVATE"), false);
  assert.ok(
    drawn.every((value) => value.y + value.size / 3 < canvas.height),
    "all lines must fit inside the PNG",
  );
  assert.equal(clicked, 1);
});
