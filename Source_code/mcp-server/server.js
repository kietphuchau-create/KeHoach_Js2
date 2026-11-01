#!/usr/bin/env node

/**
 * ==============================================================================
 * MEDSCHED MODEL CONTEXT PROTOCOL (MCP) SERVER WRAPPER
 * ==============================================================================
 * Chuẩn MCP Server kết nối các Trợ lý AI (Claude, Antigravity, ChatGPT, Gemini)
 * trực tiếp với Hệ Thống Đặt Lịch & Tiếp Đón Y Tế MedSched.
 *
 * Giao thức: Model Context Protocol (MCP) Stdio Transport
 * ==============================================================================
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MEDSCHED_API_PATHS } from "./api-contract.js";

const BACKEND_BASE_URL = process.env.MEDSCHED_API_URL || "http://localhost:8080/api/v1";
const BACKEND_API_TOKEN = process.env.MEDSCHED_API_TOKEN || "";

function apiHeaders(extra = {}) {
  return {
    Accept: "application/json",
    ...(BACKEND_API_TOKEN ? { Authorization: `Bearer ${BACKEND_API_TOKEN}` } : {}),
    ...extra,
  };
}

async function apiRequest(path, init = {}) {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    ...init,
    headers: apiHeaders(init.headers),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`MedSched API ${response.status} tại ${path}${detail ? `: ${detail}` : ""}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

function success(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify({ status: "SUCCESS", source: "MEDSCHED_API_LIVE", ...payload }, null, 2) }],
  };
}

// Khởi tạo MCP Server
const server = new Server(
  {
    name: "medsched-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Định nghĩa danh sách các Tools chuẩn MCP mà AI Agent có thể gọi
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_doctors",
        description: "Lấy danh sách các Bác sĩ hiện có trong phòng khám MedSched (kèm học vị, chuyên khoa, phòng khám, giá khám)",
        inputSchema: {
          type: "object",
          properties: {
            specialty: {
              type: "string",
              description: "Lọc theo tên chuyên khoa (tùy chọn, ví dụ: 'Nội tổng quát', 'Da liễu', 'Nhi khoa')",
            },
          },
        },
      },
      {
        name: "get_appointment_by_code",
        description: "Tra cứu thông tin vé hẹn khám của bệnh nhân thông qua mã đặt khám (bookingCode, ví dụ: MED918869)",
        inputSchema: {
          type: "object",
          properties: {
            bookingCode: {
              type: "string",
              description: "Mã vé hẹn khám cần tra cứu (ví dụ: MED918869 hoặc WALK-123456)",
            },
          },
          required: ["bookingCode"],
        },
      },
      {
        name: "reception_checkin",
        description: "Thực hiện thủ tục Tiếp Đón Bệnh Nhân (Check-in 1 chạm) tại Quầy Tiếp Đón Lễ Tân MedSched",
        inputSchema: {
          type: "object",
          properties: {
            bookingCode: {
              type: "string",
              description: "Mã vé hẹn của bệnh nhân (ví dụ: MED918869)",
            },
          },
          required: ["bookingCode"],
        },
      },
      {
        name: "get_daily_statistics",
        description: "Lấy báo cáo số liệu thống kê phòng khám thời gian thực (tổng số ca khám, lượt tiếp đón, doanh thu, phân bổ đặt trước và vãng lai)",
        inputSchema: {
          type: "object",
          properties: {
            range: {
              type: "string",
              description: "Khoảng thời gian thống kê: 'TODAY' (Hôm nay), 'LAST_7_DAYS', 'THIS_MONTH'",
              enum: ["TODAY", "LAST_7_DAYS", "THIS_MONTH"],
            },
          },
        },
      },
      {
        name: "simulate_payment_received",
        description: "Kích hoạt mô phỏng Webhook Ngân Hàng Napas/VietQR/MoMo báo tiền cọc (2.000 VNĐ) đã vào tài khoản, phục vụ nghiệm thu tự động",
        inputSchema: {
          type: "object",
          properties: {
            bookingCode: {
              type: "string",
              description: "Mã vé hẹn hoặc mã thanh toán cần mô phỏng tiền về",
            },
            amount: {
              type: "number",
              description: "Số tiền đã chuyển khoản (mặc định 2000)",
            },
          },
          required: ["bookingCode"],
        },
      },
    ],
  };
});

/**
 * Bộ xử lý thực thi từng Tool khi AI Agent yêu cầu
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ----------------------------------------------------------------------
      // TOOL 1: get_doctors
      // ----------------------------------------------------------------------
      case "get_doctors": {
        const doctors = await apiRequest(MEDSCHED_API_PATHS.doctors);
        const filtered = args?.specialty
          ? doctors.filter((doctor) => String(doctor.specialtyName || "").toLowerCase().includes(String(args.specialty).toLowerCase()))
          : doctors;
        return success({ total: filtered.length, doctors: filtered });
      }

      // ----------------------------------------------------------------------
      // TOOL 2: get_appointment_by_code
      // ----------------------------------------------------------------------
      case "get_appointment_by_code": {
        const code = String(args?.bookingCode || "").trim();
        if (!code) {
          throw new Error("bookingCode không được để trống.");
        }

        const appointment = await apiRequest(MEDSCHED_API_PATHS.appointmentByCode(code));
        return success({ appointment });
      }

      // ----------------------------------------------------------------------
      // TOOL 3: reception_checkin
      // ----------------------------------------------------------------------
      case "reception_checkin": {
        const code = String(args?.bookingCode || "").trim();
        if (!code) {
          throw new Error("Vui lòng cung cấp mã vé hẹn cần tiếp đón.");
        }

        const details = await apiRequest(MEDSCHED_API_PATHS.receptionCheckinQr, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingCode: code }),
        });
        return success({ message: "Bệnh nhân đã được tiếp đón thành công vào hàng đợi phòng khám!", details });
      }

      // ----------------------------------------------------------------------
      // TOOL 4: get_daily_statistics
      // ----------------------------------------------------------------------
      case "get_daily_statistics": {
        const range = args?.range || "TODAY";
        const query = new URLSearchParams({ role: "ROLE_ADMIN", granularity: "DAY", range });
        const statistics = await apiRequest(`${MEDSCHED_API_PATHS.statisticsOverview}?${query}`);
        return success({ range, statistics });
      }

      // ----------------------------------------------------------------------
      // TOOL 5: simulate_payment_received
      // ----------------------------------------------------------------------
      case "simulate_payment_received": {
        const code = String(args?.bookingCode || "").trim();
        const amount = Number(args?.amount) || 2000;

        if (!code) throw new Error("bookingCode không được để trống.");
        const data = await apiRequest(MEDSCHED_API_PATHS.simulatePaymentWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingCode: code,
            amount,
            bankCode: "MCP_TEST",
            referenceNumber: `MCP-${Date.now()}`,
          }),
        });
        return success({ message: "Webhook thanh toán đã được tiếp nhận và cập nhật vào CSDL!", data });
      }

      default:
        throw new Error(`Công cụ MCP '${name}' không được hỗ trợ.`);
    }
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Lỗi khi thực thi công cụ '${name}': ${error?.message || error}`,
        },
      ],
    };
  }
});

/**
 * Khởi động MCP Server qua luồng Standard I/O (Stdio)
 */
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log ra stderr để không làm xáo trộn luồng JSON-RPC của stdout
  console.error("🚀 MedSched MCP Server is running and listening on Stdio...");
}

run().catch((err) => {
  console.error("❌ Fatal error in MedSched MCP Server:", err);
  process.exit(1);
});
