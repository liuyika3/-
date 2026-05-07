import { execFile } from "child_process";

const runjs =
  process.platform === "win32"
    ? `${process.env.USERPROFILE}\\.npm-global\\node_modules\\@larksuite\\cli\\scripts\\run.js`
    : null;

function execJson(bin, args) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { encoding: "utf8" }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || stdout || err.message));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error(`Failed to parse JSON: ${e.message}\n${stdout}`));
      }
    });
  });
}

function base64urlToUtf8(b64url) {
  const b64 = String(b64url || "").replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString("utf8");
}

async function main() {
  const bin = process.platform === "win32" ? "node" : "lark-cli";
  const prefix = process.platform === "win32" ? [runjs] : [];

  const list = await execJson(bin, [
    ...prefix,
    "mail",
    "user_mailbox.messages",
    "list",
    "--params",
    JSON.stringify({ user_mailbox_id: "me", folder_id: "SENT", page_size: 1 }),
    "--as",
    "user",
  ]);

  const id = list?.data?.items?.[0];
  if (!id) {
    console.log("No sent messages found.");
    return;
  }

  const get = await execJson(bin, [
    ...prefix,
    "mail",
    "user_mailbox.messages",
    "get",
    "--params",
    JSON.stringify({ user_mailbox_id: "me", message_id: id, format: "full" }),
    "--as",
    "user",
  ]);

  const msg = get?.data?.message || {};
  const html = base64urlToUtf8(msg.body_html || "");
  const newlineCount = (html.match(/\n/g) || []).length;
  const inword = (html.match(/[A-Za-z]\n+[A-Za-z]/g) || []).length;
  const hasImg = /<img\b/i.test(html);
  const hasCid = /src=["']cid:/i.test(html);

  console.log(
    JSON.stringify(
      {
        message_id: id,
        subject: msg.subject || null,
        attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
        html_has_img: hasImg,
        html_has_cid: hasCid,
        newlineCount,
        inwordNewlines: inword,
      },
      null,
      2
    )
  );

  console.log("\n--- html_snip ---\n");
  console.log(html.slice(0, 1800));
}

main().catch((e) => {
  console.error(e.message || String(e));
  process.exit(1);
});

