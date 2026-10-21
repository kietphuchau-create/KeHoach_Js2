/**
 * Script kiểm thử nhanh MedSched MCP Server
 * Chạy lệnh: node test-mcp.js
 */

import { spawn } from "child_process";

console.log("🔍 Đang khởi động và kiểm tra MedSched MCP Server...");

const mcpProcess = spawn("node", ["server.js"], {
  cwd: process.cwd(),
  stdio: ["pipe", "pipe", "inherit"],
});

let outputData = "";

mcpProcess.stdout.on("data", (chunk) => {
  outputData += chunk.toString();
  try {
    const lines = outputData.trim().split("\n");
    for (const line of lines) {
      if (line.startsWith("{")) {
        const json = JSON.parse(line);
        console.log("✅ MCP Response nhận được thành công:");
        console.log(JSON.stringify(json, null, 2));
        mcpProcess.kill();
        process.exit(0);
      }
    }
  } catch {}
});

// Gửi bản tin chuẩn MCP: ListToolsRequest (JSON-RPC 2.0)
const listToolsMessage = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {},
};

setTimeout(() => {
  mcpProcess.stdin.write(JSON.stringify(listToolsMessage) + "\n");
}, 500);

setTimeout(() => {
  console.log("⏱️ Đã kiểm tra xong.");
  mcpProcess.kill();
  process.exit(0);
}, 3000);
