import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Tắt thanh công cụ phát triển (Dev Indicator overlay) màu đen ở góc dưới bên trái
  devIndicators: false,
};

export default nextConfig;
