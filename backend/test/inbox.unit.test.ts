import * as assert from "node:assert/strict";
import { test } from "node:test";
import { cleanFilename, sniffImageMime } from "../src/inbox/files.service";
import { oaSignature, verifyOaSignature } from "../src/inbox/oa.service";

test("sniffImageMime nhận ảnh theo nội dung, từ chối file giả", () => {
  assert.equal(sniffImageMime(Buffer.from("ffd8ffe000104a46494600010100", "hex")), "image/jpeg");
  assert.equal(sniffImageMime(Buffer.from("89504e470d0a1a0a0000000d49484452", "hex")), "image/png");
  assert.equal(sniffImageMime(Buffer.from("474946383961010001008000", "hex")), "image/gif");
  assert.equal(sniffImageMime(Buffer.from("RIFF\x10\x00\x00\x00WEBPVP8 ", "binary")), "image/webp");
  assert.equal(sniffImageMime(Buffer.from("<html><script>alert(1)</script>")), null);
  assert.equal(sniffImageMime(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")), null);
});

test("cleanFilename bỏ đường dẫn và ký tự nguy hiểm", () => {
  assert.equal(cleanFilename("../../etc/passwd", "x.jpg"), "passwd");
  assert.equal(cleanFilename("C:\\Users\\a\\anh.png", "x.jpg"), "anh.png");
  assert.equal(cleanFilename("a<b>\u0000.png", "x.jpg"), "ab.png");
  assert.equal(cleanFilename("", "x.jpg"), "x.jpg");
  assert.equal(cleanFilename("a".repeat(500) + ".png", "x.jpg").length, 120);
});

test("Chữ ký webhook OA: đúng công thức, sai một ký tự là từ chối", () => {
  const mac = oaSignature("app1", '{"a":1}', "123", "sec");
  assert.match(mac, /^[0-9a-f]{64}$/);
  assert.ok(verifyOaSignature(`mac=${mac}`, mac));
  assert.ok(verifyOaSignature(mac.toUpperCase(), mac));
  assert.ok(!verifyOaSignature(`mac=${mac.slice(0, -1)}0`, mac));
  assert.ok(!verifyOaSignature(undefined, mac));
  assert.notEqual(oaSignature("app1", '{"a":2}', "123", "sec"), mac, "đổi nội dung → đổi chữ ký");
});
