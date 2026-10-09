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
  Wrench
} from 'lucide-react';
import { api } from '@/shared/lib/api';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
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
      setFormData(item || { code: '', name: '', address: '', phone: '' });
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
        if (modalMode === 'create') await api.createMedicalCenter(formData);
        else await api.updateMedicalCenter(editingId!, formData);
        setMessage({ type: 'success', text: `Lưu chi nhánh phòng khám thành công!` });
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
              <th className="py-3 px-4">Mã CS</th>
              <th className="py-3 px-4">Tên Chi Nhánh</th>
              <th className="py-3 px-4">Địa Chỉ</th>
              <th className="py-3 px-4">SĐT</th>
              <th className="py-3 px-4">Trạng Thái</th>
              <th className="py-3 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {centers.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-mono font-medium">{c.code}</td>
                <td className="py-3 px-4 font-semibold text-slate-800">{c.name}</td>
                <td className="py-3 px-4 text-slate-600">{c.address}</td>
                <td className="py-3 px-4">{c.phone || '—'}</td>
                <td className="py-3 px-4">
                  {c.active ? (
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-semibold">Hoạt động</span>
                  ) : (
                    <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-semibold border border-red-200 shadow-sm animate-pulse">Phong Tỏa Khẩn CẤp</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button onClick={() => openModal('edit', c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer" title="Sửa thông tin"><Edit2 size={16} /></button>
                  <button 
                    onClick={() => handleToggleLockdown(c.id, c.active, c.name)} 
                    className={`p-1.5 rounded-lg cursor-pointer ${c.active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                    title={c.active ? 'Phong Tỏa Khẩn Cấp (Cháy nổ/Thiên tai)' : 'Khôi Phục Hoạt Động'}
                  >
                    <AlertTriangle size={16} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer" title="Xóa mềm (DevOnly)"><Trash2 size={16} /></button>
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
              <th className="py-3 px-4">Mã Khoa</th>
              <th className="py-3 px-4">Tên Chuyên Khoa</th>
              <th className="py-3 px-4">Thuộc Chi Nhánh</th>
              <th className="py-3 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {specialties.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-mono font-medium">{s.code}</td>
                <td className="py-3 px-4 font-semibold text-slate-800">{s.name}</td>
                <td className="py-3 px-4 text-slate-600">{s.medicalCenterName}</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button onClick={() => openModal('edit', s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 size={16} /></button>
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
              <th className="py-3 px-4">Mã DV</th>
              <th className="py-3 px-4">Tên Dịch Vụ</th>
              <th className="py-3 px-4">Chuyên Khoa</th>
              <th className="py-3 px-4 text-right">Giá (VND)</th>
              <th className="py-3 px-4 text-center">Thời gian</th>
              <th className="py-3 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {services.map(sv => (
              <tr key={sv.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-mono font-medium">{sv.code}</td>
                <td className="py-3 px-4 font-semibold text-slate-800">{sv.name}</td>
                <td className="py-3 px-4 text-slate-600">{sv.specialtyName}</td>
                <td className="py-3 px-4 text-right font-mono font-medium text-emerald-600">{sv.price?.toLocaleString()} đ</td>
                <td className="py-3 px-4 text-center">{sv.estimatedDurationMinutes} phút</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button onClick={() => openModal('edit', sv)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(sv.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 size={16} /></button>
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
              <th className="py-3 px-4">Mã Phòng</th>
              <th className="py-3 px-4">Tên Phòng Khám</th>
              <th className="py-3 px-4">Vị Trí / Tầng</th>
              <th className="py-3 px-4">Thuộc Chi Nhánh</th>
              <th className="py-3 px-4">Ghi Chú / Thiết Bị</th>
              <th className="py-3 px-4">Trạng Thái</th>
              <th className="py-3 px-4 text-right">Thao Tác</th>
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
                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{r.code}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{r.name}</td>
                  <td className="py-3 px-4 text-slate-600">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">
                      {r.floor}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-xs">{r.medicalCenterName}</td>
                  <td className="py-3 px-4 text-slate-500 text-xs max-w-xs truncate" title={r.note || ''}>
                    {r.note || '—'}
                  </td>
                  <td className="py-3 px-4">
                    {r.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        <CheckCircle2 size={12} />
                        Sẵn sàng khám
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        <Wrench size={12} />
                        Đang bảo trì
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button 
                      onClick={() => openModal('edit', r)} 
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer" 
                      title="Sửa phòng khám"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleToggleRoomStatus(r.id, r.status, r.code)} 
                      className={`p-1.5 rounded-lg cursor-pointer ${r.status === 'active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                      title={r.status === 'active' ? 'Chuyển sang bảo trì' : 'Mở lại hoạt động'}
                    >
                      <Wrench size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(r.id)} 
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer" 
                      title="Xóa phòng khám"
                    >
                      <Trash2 size={16} />
                    </button>
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
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">
                {modalMode === 'create' ? 'Thêm Mới' : 'Cập Nhật'}{' '}
                {activeTab === 'centers' && 'Chi Nhánh Phòng Khám'}
                {activeTab === 'specialties' && 'Chuyên Khoa'}
                {activeTab === 'services' && 'Dịch Vụ Khám'}
                {activeTab === 'rooms' && 'Phòng Khám (Clinic Room)'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><XCircle size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {activeTab === 'centers' && (
                <>
                  <div><label className="block text-xs font-bold mb-1">Mã Cơ Sở</label><input required className="w-full border p-2 rounded" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold mb-1">Tên Chi Nhánh</label><input required className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold mb-1">Địa Chỉ</label><input required className="w-full border p-2 rounded" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold mb-1">SĐT</label><input className="w-full border p-2 rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                </>
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
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Hủy</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm cursor-pointer">
                  {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
