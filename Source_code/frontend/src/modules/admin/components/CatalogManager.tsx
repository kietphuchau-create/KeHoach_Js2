'use client';

import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Stethoscope, 
  Syringe, 
  DoorOpen,
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Wrench,
  MapPin,
  ExternalLink,
  Navigation
} from 'lucide-react';
import { api } from '@/shared/lib/api';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import MapLocationPicker, { LocationData } from '@/shared/components/MapLocationPicker';
import { 
  getBranchLocation, 
  saveBranchLocation, 
  getBranchGoogleMapsUrl 
} from '@/shared/lib/branchCoordinates';
import { 
  ClinicRoom, 
  getClinicRooms, 
  addClinicRoom, 
  updateClinicRoom, 
  deleteClinicRoom, 
  toggleClinicRoomStatus,
  ROOMS_UPDATED_EVENT 
} from '@/shared/lib/clinicRooms';

type TabType = 'centers' | 'specialties' | 'services' | 'rooms';

export default function CatalogManager() {
  const [activeTab, setActiveTab] = useState<TabType>('centers');
  
  const [centers, setCenters] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [hasPinnedLocation, setHasPinnedLocation] = useState<boolean>(false);
  const [centerCoordinates, setCenterCoordinates] = useState<{ lat?: number; lng?: number }>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, s, sv] = await Promise.all([
        api.getMedicalCenters(),
        api.getSpecialties(),
        api.getServices()
      ]);
      setCenters(c);
      setSpecialties(s);
      setServices(sv);
      setRooms(getClinicRooms());
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi tải danh mục' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleRoomsUpdate = () => {
      setRooms(getClinicRooms());
    };
    window.addEventListener(ROOMS_UPDATED_EVENT, handleRoomsUpdate);
    return () => window.removeEventListener(ROOMS_UPDATED_EVENT, handleRoomsUpdate);
  }, []);

  const openModal = (mode: 'create' | 'edit', item?: any) => {
    setModalMode(mode);
    setEditingId(item?.id || null);
    
    if (activeTab === 'centers') {
      const isEdit = mode === 'edit';
      const savedLoc = getBranchLocation(item?.id || item?.code, item?.name, item?.address);
      const initLat = savedLoc?.lat || 10.7769;
      const initLng = savedLoc?.lng || 106.7009;

      setFormData(item || { code: '', name: '', address: '', phone: '' });
      setCenterCoordinates({ lat: initLat, lng: initLng });
      setHasPinnedLocation(isEdit || Boolean(savedLoc));
    } else if (activeTab === 'specialties') {
      setFormData(item || { code: '', name: '', description: '', medicalCenterId: centers[0]?.id || '' });
    } else if (activeTab === 'services') {
      setFormData(item || { code: '', name: '', description: '', price: 0, estimatedDurationMinutes: 15, specialtyId: specialties[0]?.id || '' });
    } else if (activeTab === 'rooms') {
      setFormData(item ? { ...item } : { 
        code: 'P.', 
        name: '', 
        floor: 'Tầng 1', 
        medicalCenterName: centers[0]?.name || 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 1', 
        status: 'active',
        note: '' 
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (activeTab === 'centers') {
        if (!hasPinnedLocation) {
          setMessage({ 
            type: 'error', 
            text: '⚠️ BẮT BUỘC: Bạn phải kéo ghim chọn vị trí chính xác trên bản đồ trước khi lưu chi nhánh! Hệ thống AI cần tọa độ này để dẫn đường chuẩn xác qua Google Maps.' 
          });
          setLoading(false);
          return;
        }
        if (!formData.address || !formData.address.trim()) {
          setMessage({ 
            type: 'error', 
            text: 'Vui lòng nhập địa chỉ đầy đủ của chi nhánh!' 
          });
          setLoading(false);
          return;
        }

        let savedRes: any = null;
        if (modalMode === 'create') {
          savedRes = await api.createMedicalCenter(formData);
        } else {
          savedRes = await api.updateMedicalCenter(editingId!, formData);
        }

        // Lưu vĩnh viễn tọa độ GPS của chi nhánh vào LocalStorage & broadcast
        if (centerCoordinates.lat && centerCoordinates.lng) {
          const targetKey = savedRes?.id || editingId || formData.code;
          saveBranchLocation(targetKey, {
            lat: centerCoordinates.lat,
            lng: centerCoordinates.lng,
            address: formData.address,
            name: formData.name,
            code: formData.code
          });
        }

        setMessage({ type: 'success', text: `Lưu chi nhánh phòng khám và cập nhật vị trí bản đồ thành công!` });
        loadData();
      } else if (activeTab === 'specialties') {
        if (modalMode === 'create') await api.createSpecialty(formData);
        else await api.updateSpecialty(editingId!, formData);
        setMessage({ type: 'success', text: `Lưu chuyên khoa thành công!` });
        loadData();
      } else if (activeTab === 'services') {
        if (modalMode === 'create') await api.createService(formData);
        else await api.updateService(editingId!, formData);
        setMessage({ type: 'success', text: `Lưu dịch vụ khám thành công!` });
        loadData();
      } else if (activeTab === 'rooms') {
        if (modalMode === 'create') {
          addClinicRoom({
            code: formData.code,
            name: formData.name,
            floor: formData.floor,
            medicalCenterName: formData.medicalCenterName,
            status: formData.status || 'active',
            note: formData.note,
          });
          setMessage({ type: 'success', text: `Đã mở mới phòng khám ${formData.code.toUpperCase()} thành công!` });
        } else {
          updateClinicRoom(editingId!, formData);
          setMessage({ type: 'success', text: `Cập nhật phòng khám ${formData.code} thành công!` });
        }
        setRooms(getClinicRooms());
      }
      
      setShowModal(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi lưu dữ liệu' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (activeTab === 'rooms') {
      if (!window.confirm('Bạn có chắc chắn muốn xóa phòng khám này khỏi danh mục?')) return;
      deleteClinicRoom(id);
      setRooms(getClinicRooms());
      setMessage({ type: 'success', text: 'Đã xóa phòng khám thành công!' });
      return;
    }

    if (!window.confirm('Bạn có chắc muốn vô hiệu hóa mục này?')) return;
    setLoading(true);
    try {
      if (activeTab === 'centers') await api.deactivateMedicalCenter(id);
      else if (activeTab === 'specialties') await api.deactivateSpecialty(id);
      else if (activeTab === 'services') await api.deactivateService(id);
      
      setMessage({ type: 'success', text: 'Vô hiệu hóa thành công!' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi xóa dữ liệu' });
      setLoading(false);
    }
  };

  const handleToggleRoomStatus = (id: string, currentStatus: string, code: string) => {
    const nextStatusText = currentStatus === 'active' ? 'bảo trì' : 'hoạt động bình thường';
    if (!window.confirm(`Bạn có chắc muốn chuyển phòng khám ${code} sang trạng thái "${nextStatusText}"?`)) return;
    toggleClinicRoomStatus(id);
    setRooms(getClinicRooms());
    setMessage({ type: 'success', text: `Đã cập nhật trạng thái phòng ${code} thành công!` });
  };

  const handleToggleLockdown = async (id: string, currentlyActive: boolean, centerName: string) => {
    if (currentlyActive) {
      if (!window.confirm(`[CẢNH BÁO THẢM HỌA] Bạn có chắc chắn muốn PHONG TỎA KHẨN CẤP cơ sở "${centerName}"? Hệ thống sẽ đóng cổng đặt lịch ngay lập tức.`)) return;
      setLoading(true);
      try {
        await api.deactivateMedicalCenter(id);
        setMessage({ type: 'success', text: `Đã phong tỏa khẩn cấp cơ sở ${centerName}!` });
        loadData();
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message || 'Lỗi phong tỏa cơ sở' });
        setLoading(false);
      }
    } else {
      if (!window.confirm(`Bạn muốn khôi phục hoạt động cho cơ sở "${centerName}" sau thảm họa?`)) return;
      setLoading(true);
      try {
        await api.reactivateMedicalCenter(id);
        setMessage({ type: 'success', text: `Đã khôi phục hoạt động cơ sở ${centerName}!` });
        loadData();
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message || 'Lỗi khôi phục cơ sở' });
        setLoading(false);
      }
    }
  };

  const renderTable = () => {
    if (loading && centers.length === 0) return <LoadingSpinner message="Đang tải dữ liệu danh mục..." />;
    
    if (activeTab === 'centers') {
      return (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase">
              <th className="py-3 px-3.5 whitespace-nowrap w-24">Mã CS</th>
              <th className="py-3 px-3.5 font-bold">Tên Chi Nhánh</th>
              <th className="py-3 px-3.5">Địa Chỉ</th>
              <th className="py-3 px-3.5 whitespace-nowrap w-32">SĐT</th>
              <th className="py-3 px-3.5 whitespace-nowrap text-center w-36">Trạng Thái</th>
              <th className="py-3 px-3.5 text-right whitespace-nowrap w-28">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {centers.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-3.5 font-mono font-medium whitespace-nowrap text-slate-700">{c.code}</td>
                <td className="py-3 px-3.5 font-semibold text-slate-800">{c.name}</td>
                <td className="py-3 px-3.5 text-slate-600 text-xs">
                  <div>{c.address}</div>
                  <a 
                    href={getBranchGoogleMapsUrl(c)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-800 hover:underline mt-1"
                    title="Mở Google Maps kiểm tra vị trí tọa độ GPS thực tế"
                  >
                    <MapPin size={11} className="text-red-500" />
                    <span>Xem Trên Google Maps</span>
                    <ExternalLink size={10} />
                  </a>
                </td>
                <td className="py-3 px-3.5 whitespace-nowrap text-slate-700 font-mono text-xs">{c.phone || '—'}</td>
                <td className="py-3 px-3.5 whitespace-nowrap text-center">
                  {c.active ? (
                    <span className="inline-flex items-center justify-center text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                      Hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-rose-200 shadow-sm animate-pulse whitespace-nowrap">
                      Phong Tỏa Khẩn Cấp
                    </span>
                  )}
                </td>
                <td className="py-3 px-3.5 text-right whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
                    <button 
                      onClick={() => openModal('edit', c)} 
                      className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition cursor-pointer" 
                      title="Sửa thông tin"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleToggleLockdown(c.id, c.active, c.name)} 
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        c.active 
                          ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700' 
                          : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                      title={c.active ? 'Phong Tỏa Khẩn Cấp (Cháy nổ/Thiên tai)' : 'Khôi Phục Hoạt Động'}
                    >
                      <AlertTriangle size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(c.id)} 
                      className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition cursor-pointer" 
                      title="Vô hiệu hóa chi nhánh"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    
    if (activeTab === 'specialties') {
      return (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase">
              <th className="py-3 px-3.5 whitespace-nowrap w-24">Mã Khoa</th>
              <th className="py-3 px-3.5 font-bold">Tên Chuyên Khoa</th>
              <th className="py-3 px-3.5 whitespace-nowrap w-44">Thuộc Chi Nhánh</th>
              <th className="py-3 px-3.5 text-right whitespace-nowrap w-24">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {specialties.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-3.5 font-mono font-medium whitespace-nowrap text-slate-700">{s.code}</td>
                <td className="py-3 px-3.5 font-semibold text-slate-800">{s.name}</td>
                <td className="py-3 px-3.5 whitespace-nowrap">
                  <span 
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-semibold text-xs border border-blue-100 max-w-[180px] truncate" 
                    title={s.medicalCenterName}
                  >
                    {s.medicalCenterName?.includes('Quận 1') ? 'CN Quận 1' : s.medicalCenterName?.includes('Quận 7') ? 'CN Quận 7' : s.medicalCenterName?.replace('Phòng Khám Đa Khoa MedSched - ', '') || s.medicalCenterName}
                  </span>
                </td>
                <td className="py-3 px-3.5 text-right whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
                    <button 
                      onClick={() => openModal('edit', s)} 
                      className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition cursor-pointer"
                      title="Sửa chuyên khoa"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(s.id)} 
                      className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition cursor-pointer"
                      title="Xóa chuyên khoa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    
    if (activeTab === 'services') {
      return (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase">
              <th className="py-3 px-3.5 whitespace-nowrap w-24">Mã DV</th>
              <th className="py-3 px-3.5 font-bold">Tên Dịch Vụ</th>
              <th className="py-3 px-3.5 whitespace-nowrap w-40">Chuyên Khoa</th>
              <th className="py-3 px-3.5 text-right whitespace-nowrap w-32">Giá (VND)</th>
              <th className="py-3 px-3.5 text-center whitespace-nowrap w-24">Thời gian</th>
              <th className="py-3 px-3.5 text-right whitespace-nowrap w-24">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {services.map(sv => (
              <tr key={sv.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-3.5 font-mono font-medium whitespace-nowrap text-slate-700">{sv.code}</td>
                <td className="py-3 px-3.5 font-semibold text-slate-800">{sv.name}</td>
                <td className="py-3 px-3.5 text-slate-600 text-xs whitespace-nowrap">{sv.specialtyName}</td>
                <td className="py-3 px-3.5 text-right font-mono font-medium text-emerald-600 whitespace-nowrap">{sv.price?.toLocaleString()} đ</td>
                <td className="py-3 px-3.5 text-center whitespace-nowrap text-xs text-slate-600">{sv.estimatedDurationMinutes} phút</td>
                <td className="py-3 px-3.5 text-right whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
                    <button 
                      onClick={() => openModal('edit', sv)} 
                      className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition cursor-pointer"
                      title="Sửa dịch vụ"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(sv.id)} 
                      className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition cursor-pointer"
                      title="Vô hiệu hóa dịch vụ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === 'rooms') {
      return (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase">
              <th className="py-3 px-3.5 whitespace-nowrap w-20">Mã Phòng</th>
              <th className="py-3 px-3.5 font-bold">Tên Phòng Khám</th>
              <th className="py-3 px-2 whitespace-nowrap text-center w-20">Tầng</th>
              <th className="py-3 px-3 whitespace-nowrap w-36">Chi Nhánh</th>
              <th className="py-3 px-3 text-slate-600 max-w-[180px]">Ghi Chú / Thiết Bị</th>
              <th className="py-3 px-3 whitespace-nowrap text-center w-36">Trạng Thái</th>
              <th className="py-3 px-3.5 text-right whitespace-nowrap w-28">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Chưa có phòng khám nào được cấu hình. Bấm "Thêm Mới Phòng Khám" để tạo.
                </td>
              </tr>
            ) : (
              rooms.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3.5 font-mono font-bold text-blue-700 whitespace-nowrap">{r.code}</td>
                  <td className="py-3 px-3.5 font-semibold text-slate-800 leading-snug">{r.name}</td>
                  <td className="py-3 px-2 whitespace-nowrap text-center">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                      {r.floor}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span 
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-semibold text-xs border border-blue-100" 
                      title={r.medicalCenterName}
                    >
                      {r.medicalCenterName?.includes('Quận 1') ? 'CN Quận 1' : r.medicalCenterName?.includes('Quận 7') ? 'CN Quận 7' : r.medicalCenterName?.replace('Phòng Khám Đa Khoa MedSched - ', '') || r.medicalCenterName}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-xs max-w-[180px] truncate" title={r.note || ''}>
                    {r.note || '—'}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-center">
                    {r.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                        <CheckCircle2 size={12} />
                        Sẵn sàng khám
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                        <Wrench size={12} />
                        Đang bảo trì
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
                      <button 
                        onClick={() => openModal('edit', r)} 
                        className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition cursor-pointer" 
                        title="Sửa phòng khám"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleToggleRoomStatus(r.id, r.status, r.code)} 
                        className={`p-1.5 rounded-lg transition cursor-pointer ${r.status === 'active' ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700' : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
                        title={r.status === 'active' ? 'Chuyển sang bảo trì' : 'Mở lại hoạt động'}
                      >
                        <Wrench size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(r.id)} 
                        className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition cursor-pointer" 
                        title="Xóa phòng khám"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Quản Lý Danh Mục Phòng Khám</h1>
          <p className="text-slate-500 text-sm mt-1">Cấu hình chi nhánh, chuyên khoa, dịch vụ và danh sách các phòng khám thực tế để phân công bác sĩ.</p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-sm transition cursor-pointer"
        >
          <Plus size={18} />
          <span>
            {activeTab === 'centers' && 'Thêm Mới Chi Nhánh'}
            {activeTab === 'specialties' && 'Thêm Mới Chuyên Khoa'}
            {activeTab === 'services' && 'Thêm Mới Dịch Vụ'}
            {activeTab === 'rooms' && 'Mở Thêm Phòng Khám'}
          </span>
        </button>
      </div>

      {message && <AlertMessage type={message.type} message={message.text} onClose={() => setMessage(null)} />}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 flex-wrap">
          <button
            onClick={() => setActiveTab('centers')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-4 font-semibold text-sm transition cursor-pointer ${activeTab === 'centers' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Building2 size={18} />
            <span>Chi Nhánh Phòng Khám</span>
          </button>
          <button
            onClick={() => setActiveTab('specialties')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-4 font-semibold text-sm transition cursor-pointer ${activeTab === 'specialties' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Stethoscope size={18} />
            <span>Chuyên Khoa</span>
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-4 font-semibold text-sm transition cursor-pointer ${activeTab === 'services' ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Syringe size={18} />
            <span>Dịch Vụ & Bảng Giá</span>
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-4 font-semibold text-sm transition cursor-pointer ${activeTab === 'rooms' ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <DoorOpen size={18} />
            <span>Phòng Khám / Nơi Khám ({rooms.length})</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          {renderTable()}
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`bg-white rounded-2xl w-full ${activeTab === 'centers' ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] flex flex-col overflow-hidden shadow-2xl transition-all`}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {modalMode === 'create' ? 'Thêm Mới' : 'Cập Nhật'}{' '}
                {activeTab === 'centers' && (
                  <span className="flex items-center gap-1.5 text-purple-700">
                    <Building2 size={20} />
                    <span>Chi Nhánh Phòng Khám (Định Vị Bản Đồ)</span>
                  </span>
                )}
                {activeTab === 'specialties' && 'Chuyên Khoa'}
                {activeTab === 'services' && 'Dịch Vụ Khám'}
                {activeTab === 'rooms' && 'Phòng Khám (Clinic Room)'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><XCircle size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              {activeTab === 'centers' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Mã Cơ Sở <span className="text-red-500">*</span>
                      </label>
                      <input 
                        required 
                        placeholder="Ví dụ: MED_CN3" 
                        className="w-full border border-slate-200 p-2.5 rounded-xl font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" 
                        value={formData.code} 
                        onChange={e => setFormData({...formData, code: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Số Điện Thoại Hotline
                      </label>
                      <input 
                        placeholder="Ví dụ: 02839998877" 
                        className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none" 
                        value={formData.phone || ''} 
                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Tên Chi Nhánh Phòng Khám <span className="text-red-500">*</span>
                    </label>
                    <input 
                      required 
                      placeholder="Ví dụ: Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 7" 
                      className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                      <span>Địa Chỉ Chi Nhánh (Google Maps Navigation) <span className="text-red-500">*</span></span>
                      <span className="text-[11px] text-purple-600 font-normal">Tự động cập nhật khi kéo ghim</span>
                    </label>
                    <input 
                      required 
                      placeholder="Kéo ghim trên bản đồ bên dưới để tự động lấy địa chỉ chính xác..." 
                      className="w-full border border-slate-200 p-2.5 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none" 
                      value={formData.address || ''} 
                      onChange={e => setFormData({...formData, address: e.target.value})} 
                    />
                  </div>

                  {/* Bản đồ tương tác kéo thả ghim định vị chi nhánh */}
                  <div className="pt-1">
                    <MapLocationPicker
                      initialAddress={formData.address}
                      initialLat={centerCoordinates.lat}
                      initialLng={centerCoordinates.lng}
                      required={true}
                      onLocationChange={(locData: LocationData) => {
                        setHasPinnedLocation(locData.isPinned);
                        setCenterCoordinates({ lat: locData.lat, lng: locData.lng });
                        if (locData.address) {
                          setFormData((prev: any) => ({
                            ...prev,
                            address: locData.address
                          }));
                        }
                      }}
                    />
                  </div>
                </div>
              )}
              
              {activeTab === 'specialties' && (
                <>
                  <div><label className="block text-xs font-bold mb-1">Thuộc Chi Nhánh</label>
                    <select required className="w-full border p-2 rounded" value={formData.medicalCenterId} onChange={e => setFormData({...formData, medicalCenterId: e.target.value})}>
                      {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs font-bold mb-1">Mã Chuyên Khoa</label><input required className="w-full border p-2 rounded" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold mb-1">Tên Chuyên Khoa</label><input required className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold mb-1">Mô tả (tuỳ chọn)</label><textarea className="w-full border p-2 rounded" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                </>
              )}

              {activeTab === 'services' && (
                <>
                  <div><label className="block text-xs font-bold mb-1">Thuộc Chuyên Khoa</label>
                    <select required className="w-full border p-2 rounded" value={formData.specialtyId} onChange={e => setFormData({...formData, specialtyId: e.target.value})}>
                      {specialties.map(s => <option key={s.id} value={s.id}>{s.name} ({s.medicalCenterName})</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs font-bold mb-1">Mã Dịch Vụ</label><input required className="w-full border p-2 rounded" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold mb-1">Tên Dịch Vụ</label><input required className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                  <div className="flex gap-4">
                    <div className="flex-1"><label className="block text-xs font-bold mb-1">Giá Tiền (VNĐ)</label><input type="number" required className="w-full border p-2 rounded" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} /></div>
                    <div className="flex-1"><label className="block text-xs font-bold mb-1">Thời lượng (Phút)</label><input type="number" required className="w-full border p-2 rounded" value={formData.estimatedDurationMinutes} onChange={e => setFormData({...formData, estimatedDurationMinutes: Number(e.target.value)})} /></div>
                  </div>
                  <div><label className="block text-xs font-bold mb-1">Mô tả</label><textarea className="w-full border p-2 rounded" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                </>
              )}

              {activeTab === 'rooms' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mã Phòng <span className="text-red-500">*</span></label>
                      <input 
                        required 
                        placeholder="Ví dụ: P.209" 
                        className="w-full border border-slate-200 p-2.5 rounded-xl font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500" 
                        value={formData.code} 
                        onChange={e => setFormData({...formData, code: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vị Trí / Tầng <span className="text-red-500">*</span></label>
                      <input 
                        required 
                        placeholder="Ví dụ: Tầng 2" 
                        className="w-full border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500" 
                        value={formData.floor} 
                        onChange={e => setFormData({...formData, floor: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tên Phòng Khám <span className="text-red-500">*</span></label>
                    <input 
                      required 
                      placeholder="Ví dụ: Phòng Khám Tư Vấn Chuyên Sâu & Tiền Phẫu" 
                      className="w-full border border-slate-200 p-2.5 rounded-xl font-medium focus:ring-2 focus:ring-blue-500" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Thuộc Chi Nhánh Phòng Khám</label>
                    <select 
                      className="w-full border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500" 
                      value={formData.medicalCenterName} 
                      onChange={e => setFormData({...formData, medicalCenterName: e.target.value})}
                    >
                      {centers.length > 0 ? (
                        centers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                      ) : (
                        <>
                          <option value="Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 1">Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 1</option>
                          <option value="Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 7">Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 7</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Trang Thiết Bị / Ghi Chú</label>
                    <textarea 
                      rows={2} 
                      placeholder="Ví dụ: Trang bị bàn khám chất lượng cao, máy soi tai mũi họng..." 
                      className="w-full border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" 
                      value={formData.note || ''} 
                      onChange={e => setFormData({...formData, note: e.target.value})} 
                    />
                  </div>
                </>
              )}
              
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 shrink-0">
                <div className="text-xs">
                  {activeTab === 'centers' && (
                    hasPinnedLocation ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={14} />
                        <span>Vị trí bản đồ đã xác thực</span>
                      </span>
                    ) : (
                      <span className="text-amber-600 font-semibold flex items-center gap-1 animate-pulse">
                        <AlertTriangle size={14} />
                        <span>Kéo ghim trên bản đồ để mở khóa lưu</span>
                      </span>
                    )
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer text-sm"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading || (activeTab === 'centers' && !hasPinnedLocation)} 
                    className={`px-6 py-2 font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer text-sm ${
                      activeTab === 'centers' && !hasPinnedLocation 
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75' 
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                    }`}
                  >
                    {loading ? (
                      <span>Đang lưu...</span>
                    ) : (
                      <span>{modalMode === 'create' ? 'Thêm Chi Nhánh' : 'Lưu Thay Đổi'}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
