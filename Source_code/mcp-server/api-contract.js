export const MEDSCHED_API_PATHS = Object.freeze({
  doctors: "/doctors",
  appointmentByCode: (code) => `/appointments/booking-code/${encodeURIComponent(code)}`,
  receptionCheckinQr: "/reception/checkin/qr",
  statisticsOverview: "/statistics/overview",
  simulatePaymentWebhook: "/payments/webhook/simulate",
});
