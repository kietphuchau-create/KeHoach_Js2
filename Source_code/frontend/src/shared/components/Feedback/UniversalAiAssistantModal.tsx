'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Send,
  X,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  CalendarCheck2,
  Stethoscope
} from 'lucide-react';
import { api, getAuthUser } from '@/shared/lib/api';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  toolUsed?: string | null;
  toolResult?: any;
  answerSource?: string;
  tokenSaved?: boolean;
}

interface UniversalAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: 'STAFF' | 'DOCTOR' | 'ADMIN' | 'PATIENT';
  currentContext?: string;
  onActionSuccess?: () => void;
}

type AssistantRole = 'STAFF' | 'DOCTOR' | 'ADMIN' | 'PATIENT';

function resolveAssistantRole(defaultRole: AssistantRole): AssistantRole {
  const user = getAuthUser();
  const roles: string[] = user?.roles || [];
  if (roles.includes('ROLE_ADMIN')) return 'ADMIN';
  if (roles.includes('ROLE_DOCTOR')) return 'DOCTOR';
  if (roles.includes('ROLE_STAFF')) return 'STAFF';
  if (user) {
    const role = String(user.role || 'PATIENT').toUpperCase().replace('ROLE_', '');
    return ['STAFF', 'DOCTOR', 'ADMIN', 'PATIENT'].includes(role) ? role as AssistantRole : 'PATIENT';
  }
  return defaultRole;
}

function cleanAssistantText(text: string): string {
  return (text || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^_([^_]+)_$/gm, '$1')
    .trim();
}

export default function UniversalAiAssistantModal({
  isOpen,
  onClose,
  defaultRole = 'STAFF',
  currentContext = '',
  onActionSuccess,
}: UniversalAiAssistantModalProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Vai trò được suy ra từ session hiện tại, không cho phép người dùng tự nâng quyền bằng UI.
  const [userRole, setUserRole] = useState<AssistantRole>(() => resolveAssistantRole(defaultRole));
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextRole = resolveAssistantRole(defaultRole);
    setUserRole((currentRole) => {
      if (currentRole !== nextRole) setMessages([]);
      return nextRole;
    });
  }, [defaultRole]);

  // Khởi tạo tin nhắn chào theo vai trò
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      let welcomeText = '';
      if (userRole === 'STAFF') {
        welcomeText = `👋 Xin chào Lễ tân! Tôi là **Trợ lý AI MedSched (MCP Protocol)**.\n\nTôi có thể hỗ trợ bạn:\n• **Tiếp đón 1 chạm**: Nhập *"Tiếp đón bệnh nhân MED918869"*\n• **Tra cứu bệnh nhân**: Nhập *"Tìm bệnh nhân 0901234567"* hoặc *"Tra cứu vé MED918869"*`;
      } else if (userRole === 'DOCTOR') {
        welcomeText = `🩺 Xin chào Bác sĩ! Tôi là **Trợ lý AI Y Tế MedSched**.\n\nTôi có thể hỗ trợ bác sĩ:\n• **Tóm tắt tiền sử bệnh**: Nhập *"Tóm tắt bệnh án MED918869"*\n• **Tra cứu dược phẩm**: Nhập *"Tra cứu thuốc Paracetamol"* hoặc tên biệt dược`;
      } else if (userRole === 'ADMIN') {
        welcomeText = `📊 Xin chào Quản trị viên! Tôi là **Trợ lý Phân tích AI MedSched**.\n\nTôi có thể trích xuất số liệu phòng khám thời gian thực:\n• Nhập *"Báo cáo hôm nay"*\n• Nhập *"Thống kê 7 ngày qua"* hoặc *"Báo cáo tháng này"*`;
      } else {
        welcomeText = `👋 Chào bạn! Tôi là **Trợ lý Sức Khỏe AI MedSched**.\n\nHãy mô tả triệu chứng hoặc cảm giác khó chịu của bạn (ví dụ: *"Tôi bị đau đầu, chóng mặt và sốt nhẹ"*), tôi sẽ tư vấn gói khám phù hợp nhất!`;
      }

      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: cleanAssistantText(welcomeText),
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, userRole, messages.length]);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const openSuggestedBooking = (support: any) => {
    const params = new URLSearchParams();
    if (support?.specialtyCode) params.set('specialtyCode', support.specialtyCode);
    if (support?.specialtyId) params.set('specialtyId', support.specialtyId);
    if (support?.symptoms) params.set('symptoms', support.symptoms);
    const firstDoctor = Array.isArray(support?.doctors) ? support.doctors[0] : null;
    if (firstDoctor?.doctorId) params.set('doctorId', firstDoctor.doctorId);
    const firstSlot = firstDoctor?.availableSlots?.[0];
    if (firstSlot?.slotId) params.set('slotId', firstSlot.slotId);
    router.push(`${support?.bookingPath || '/booking'}?${params.toString()}`);
    onClose();
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const conversationContext = messages
        .filter((message) => message.id !== 'welcome')
        .slice(-10)
        .map((message) => `[${message.sender === 'user' ? 'USER' : 'ASSISTANT'}] ${message.text}`)
        .join('\n');
      const context = [currentContext, conversationContext].filter(Boolean).join('\n');
      const res = await api.aiChat(query, userRole, context);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: cleanAssistantText(res.reply),
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        toolUsed: res.executedTool,
        toolResult: res.toolResult,
        answerSource: res.answerSource,
        tokenSaved: res.tokenSaved,
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Nếu có tác vụ tiếp đón thành công, trigger reload dữ liệu màn hình ngoài
      if (res.executedTool === 'reception_checkin' && onActionSuccess) {
        onActionSuccess();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Xin lỗi, không thể hoàn tất tác vụ do lỗi kết nối: ' + (err?.message || 'Lỗi server'),
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Các câu lệnh gợi ý nhanh theo vai trò
  const quickActions: Record<string, string[]> = {
    STAFF: [
      'Tiếp đón bệnh nhân MED918869',
      'Tra cứu vé hẹn MED918869',
      'Tìm bệnh nhân theo số điện thoại',
    ],
    DOCTOR: [
      'Tóm tắt bệnh án MED918869',
      'Tra cứu thuốc Paracetamol',
      'Tra cứu thuốc Amoxicillin',
    ],
    ADMIN: [
      'Báo cáo thống kê hôm nay',
      'Thống kê hiệu suất 7 ngày qua',
      'Báo cáo lưu lượng khám tháng này',
    ],
    PATIENT: [
      'Tôi bị đau đầu và sốt nhẹ cần khám gì?',
      'Bị ngứa da dị ứng nổi mẩn đỏ',
      'Đau răng buốt khi uống nước lạnh',
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col h-[640px] max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-teal-300 border border-white/20 shadow-inner">
              <Bot size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base tracking-tight">Trợ Lý AI Đa Nhiệm MedSched</h3>
                <span className="text-[10px] bg-teal-400/20 text-teal-200 border border-teal-300/30 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                  MCP Protocol
                </span>
              </div>
              <p className="text-[11px] text-teal-100/80">
                Vai trò hiện tại: <strong className="text-white">{userRole}</strong> • Sẵn sàng thực thi tác vụ tự động
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Vai trò được khóa theo tài khoản đăng nhập */}
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200/80 flex items-center justify-between text-xs overflow-x-auto shrink-0 gap-2">
          <span className="text-slate-500 font-semibold text-[11px] shrink-0">
            Trợ lý được cấp theo quyền tài khoản
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-700 text-white shadow-xs">
            {userRole === 'ADMIN' ? 'Quản trị viên' : userRole === 'DOCTOR' ? 'Bác sĩ' : userRole === 'STAFF' ? 'Lễ tân' : 'Bệnh nhân'}
          </span>
        </div>

        {/* Nội dung tin nhắn chat */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
          {messages.map((m) => {
            const isAi = m.sender === 'ai';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isAi ? 'items-start' : 'items-end justify-end'}`}
              >
                {isAi && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-600 to-teal-800 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <Sparkles size={15} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-wrap ${
                    isAi
                      ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm'
                      : 'bg-teal-700 text-white rounded-br-sm font-medium'
                  }`}
                >
                  {m.text}

                  {/* Chỉ báo thân thiện; không lộ tên hàm/công cụ kỹ thuật cho người dùng. */}
                  {m.toolUsed && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-1 rounded-lg">
                      <CheckCircle2 size={12} className="text-teal-600 shrink-0" />
                      <span>Đã tra cứu dữ liệu MedSched</span>
                    </div>
                  )}

                  {m.answerSource === 'INTERNAL_RAG' && (
                    <div className="mt-2 pt-2 border-t border-emerald-100 text-[10px] text-emerald-700 font-semibold">
                      ✓ Trả lời từ kho dữ liệu nội bộ MedSched — không phụ thuộc API AI
                    </div>
                  )}

                  {isAi && m.toolResult?.type === 'PATIENT_BOOKING_SUPPORT' && (
                    <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/80 p-3 text-slate-700">
                      <div className="flex items-center gap-2 font-bold text-teal-800">
                        <Stethoscope size={15} />
                        <span>{m.toolResult.specialtyName || 'Chuyên khoa phù hợp'}</span>
                      </div>
                      {Array.isArray(m.toolResult.doctors) && m.toolResult.doctors.length > 0 && (
                        <div className="mt-1.5 text-[11px] text-slate-600">
                          Gợi ý: {m.toolResult.doctors
                            .slice(0, 2)
                            .map((doctor: any) => doctor.doctorName)
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => openSuggestedBooking(m.toolResult)}
                        className="mt-2.5 w-full rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-800 active:scale-[0.99]"
                      >
                        <span className="flex items-center justify-center gap-1.5">
                          <CalendarCheck2 size={14} /> Đặt lịch khám
                        </span>
                      </button>
                    </div>
                  )}

                  <div className={`text-[10px] mt-1 text-right ${isAi ? 'text-slate-400' : 'text-teal-100'}`}>
                    {m.time}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-2xl border border-slate-200 w-fit animate-pulse">
              <RefreshCw size={14} className="animate-spin text-teal-600" />
              <span>AI đang xử lý yêu cầu và kích hoạt công cụ y tế...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles size={11} className="text-amber-500" /> Gợi ý:
          </span>
          {(quickActions[userRole] || []).map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(cmd)}
              disabled={loading}
              className="text-[11px] bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder={
              userRole === 'STAFF'
                ? 'Nhập lệnh tiếp đón (VD: Tiếp đón bệnh nhân MED918869)...'
                : userRole === 'DOCTOR'
                ? 'Nhập ca cần tóm tắt hoặc tên thuốc cần tra cứu...'
                : userRole === 'ADMIN'
                ? 'Hỏi số liệu thống kê hoặc tình hình khám...'
                : 'Mô tả triệu chứng bệnh của bạn...'
            }
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden disabled:opacity-50 transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 active:scale-95 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-sm"
          >
            <Send size={14} />
            <span className="hidden sm:inline">Gửi</span>
          </button>
        </form>
      </div>
    </div>
  );
}
