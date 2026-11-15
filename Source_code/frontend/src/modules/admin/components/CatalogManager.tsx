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
  Navigation,
  ShieldCheck,
  UserCheck,
  UserX,
  Pill,
  PackagePlus,
  PackageCheck,
  ChevronLeft,
  ChevronRight
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
  releaseDoctorRoomToBackup,
  assignDoctorToRoom,
  ROOMS_UPDATED_EVENT 
} from '@/shared/lib/clinicRooms';
import {
  MedicineInventoryItem,
  getMedicines,
  addMedicine,
  updateMedicine,
  importMedicineStock,
  deleteMedicine,
  MEDICINES_UPDATED_EVENT
} from '@/shared/lib/medicineInventory';

type TabType = 'centers' | 'specialties' | 'services' | 'rooms' | 'medicines';

export default function CatalogManager() {
  const [activeTab, setActiveTab] = useState<TabType>('centers');
  
  const [centers, setCenters] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<MedicineInventoryItem[]>([]);
  
  // Medicine filters & quick import states
  const [medBranchFilter, setMedBranchFilter] = useState<string>('ALL');
  const [medStatusFilter, setMedStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'LOW' | 'EMPTY'>('ALL');
  const [medSearchQuery, setMedSearchQuery] = useState<string>('');
  const [medPage, setMedPage] = useState<number>(0);
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [selectedMedForImport, setSelectedMedForImport] = useState<MedicineInventoryItem | null>(null);
  const [importQuantity, setImportQuantity] = useState<number>(100);
  const [importPrice, setImportPrice] = useState<number>(0);
  const [importNote, setImportNote] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [hasPinnedLocation, setHasPinnedLocation] = useState<boolean>(false);
  const [centerCoordinates, setCenterCoordinates] = useState<{ lat?: number; lng?: number }>({});
  const [roomDigits, setRoomDigits] = useState<string>('');
  const [floorNumber, setFloorNumber] = useState<string>('1');

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, s, sv, docs] = await Promise.all([
        api.getMedicalCenters(),
        api.getSpecialties(),
        api.getServices(),
        api.getDoctors().catch(() => [])
      ]);
      setCenters(c);
      setSpecialties(s);
      setServices(sv);
      setDoctors(docs || []);
      setRooms(getClinicRooms());
      setMedicines(getMedicines());
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
    const handleMedicinesUpdate = () => {
      setMedicines(getMedicines());
    };
    window.addEventListener(ROOMS_UPDATED_EVENT, handleRoomsUpdate);
    window.addEventListener(MEDICINES_UPDATED_EVENT, handleMedicinesUpdate);
    return () => {
      window.removeEventListener(ROOMS_UPDATED_EVENT, handleRoomsUpdate);
      window.removeEventListener(MEDICINES_UPDATED_EVENT, handleMedicinesUpdate);
    };
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
      const initCode = item?.code || 'P.103';
      const initFloor = item?.floor || 'Tầng 1';
      const digits = initCode.replace(/^P\./i, '').replace(/\D/g, '');
      const fl = initFloor.replace(/\D/g, '') || '1';
      setRoomDigits(digits);
      setFloorNumber(fl);
      setFormData(item ? { ...item } : { 
        code: digits ? `P.${digits}` : 'P.103', 
        name: '', 
        floor: `Tầng ${fl}`, 
        medicalCenterName: centers[0]?.name || 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trịnh Đình Thảo (ITC)', 
        assignedDoctorId: '',
        assignedDoctorName: '',
        specialtyName: specialties[0]?.name || 'Đa Khoa',
        isBackupRoom: true,
        status: 'active',
        note: '' 
      });
    } else if (activeTab === 'medicines') {
      setFormData(item ? { ...item } : {
        code: '',
        name: '',
        activeIngredient: '',
        unit: 'VIÊN',
        unitPrice: 3000,
        stockQuantity: 100,
        medicalCenterId: centers[0]?.id || 'a1b2c3d4-0001-4000-8000-000000000001',
        isActive: true,
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
        const cleanCode = (formData.code || '').trim().toUpperCase();
        const digits = cleanCode.replace(/^P\./, '').trim();

        // 1. Ràng buộc mã phòng: phải có dạng P.xxx (sau P. chỉ là số, tối thiểu 2 chữ số)
        if (!digits || !/^\d{2,5}$/.test(digits)) {
          setMessage({ 
            type: 'error', 
            text: '⚠️ Mã phòng không hợp lệ! Vui lòng chỉ nhập số phòng (từ 2 đến 5 chữ số, ví dụ: 101, 205 để tạo mã P.101, P.205).' 
          });
          setLoading(false);
          return;
        }

        // 2. Ràng buộc tầng: chỉ là số nguyên dương
        const floorDigits = (formData.floor || '').replace(/\D/g, '');
        if (!floorDigits || Number(floorDigits) < 1) {
          setMessage({ 
            type: 'error', 
            text: '⚠️ Vị trí tầng không hợp lệ! Vui lòng chỉ nhập số tầng (ví dụ: 1, 2, 3...).' 
          });
          setLoading(false);
          return;
        }

        // 3. Ràng buộc tên phòng
        if (!formData.name || !formData.name.trim()) {
          setMessage({
            type: 'error',
            text: '⚠️ Vui lòng nhập tên phòng khám (ví dụ: Phòng Khám Nhi Đồng, Phòng Khám Tai Mũi Họng...)'
          });
          setLoading(false);
          return;
        }

        // 4. Ràng buộc trùng lặp mã phòng
        const currentRooms = getClinicRooms();
        const isDuplicate = currentRooms.some(
          (r) => r.code.toUpperCase() === cleanCode && (modalMode === 'create' || r.id !== editingId)
        );
        if (isDuplicate) {
          setMessage({ 
            type: 'error', 
            text: `⚠️ Mã phòng khám [${cleanCode}] đã tồn tại trong danh mục! Vui lòng chọn số phòng khác.` 
          });
          setLoading(false);
          return;
        }

        const normalizedFloor = `Tầng ${floorDigits}`;

        // Xử lý gán bác sĩ phụ trách và cờ phòng dự phòng
        const assignedDoc = doctors.find(d => (d.userId || d.id) === formData.assignedDoctorId);
        const assignedDoctorId = assignedDoc ? (assignedDoc.userId || assignedDoc.id) : null;
        const assignedDoctorName = assignedDoc ? assignedDoc.fullName : null;
        const isBackupRoom = !assignedDoc;
        const finalSpecialty = formData.specialtyName || assignedDoc?.specialtyName || 'Đa Khoa';

        if (modalMode === 'create') {
          addClinicRoom({
            code: cleanCode,
            name: formData.name.trim(),
            floor: normalizedFloor,
            medicalCenterName: formData.medicalCenterName,
            status: formData.status || 'active',
            note: formData.note?.trim() || '',
            assignedDoctorId,
            assignedDoctorName,
            specialtyName: finalSpecialty,
            isBackupRoom,
          });
          setMessage({ 
            type: 'success', 
            text: `Đã mở mới phòng khám ${cleanCode} (${normalizedFloor})! ${assignedDoc ? `Đã gán riêng cho Bác sĩ ${assignedDoc.fullName}.` : 'Phòng được lưu làm Phòng Dự Phòng.'}` 
          });
        } else {
          updateClinicRoom(editingId!, {
            ...formData,
            code: cleanCode,
            name: formData.name.trim(),
            floor: normalizedFloor,
            assignedDoctorId,
            assignedDoctorName,
            specialtyName: finalSpecialty,
            isBackupRoom,
          });
          setMessage({ 
            type: 'success', 
            text: `Cập nhật phòng khám ${cleanCode} thành công! ${assignedDoc ? `Bác sĩ phụ trách: ${assignedDoc.fullName}.` : 'Đang là Phòng Dự Phòng.'}` 
          });
        }
        setRooms(getClinicRooms());
      } else if (activeTab === 'medicines') {
        const cleanCode = (formData.code || '').trim().toUpperCase();
        if (!cleanCode) {
          setMessage({ type: 'error', text: '⚠️ Vui lòng nhập mã thuốc (ví dụ: MED_PARACET_1)!' });
          setLoading(false);
          return;
        }
        if (!formData.name || !formData.name.trim()) {
          setMessage({ type: 'error', text: '⚠️ Vui lòng nhập tên thuốc và hàm lượng!' });
          setLoading(false);
          return;
        }
        const price = parseFloat(formData.unitPrice);
        if (isNaN(price) || price < 0) {
          setMessage({ type: 'error', text: '⚠️ Đơn giá niêm yết không được âm!' });
          setLoading(false);
          return;
        }
        const stock = parseInt(formData.stockQuantity, 10);
        if (isNaN(stock) || stock < 0) {
          setMessage({ type: 'error', text: '⚠️ Số lượng tồn kho không được âm!' });
          setLoading(false);
          return;
        }

        const selectedCenter = centers.find(c => c.id === formData.medicalCenterId) || centers[0];
        const centerName = selectedCenter ? selectedCenter.name : 'Chi Nhánh MedSched';

        if (modalMode === 'create') {
          addMedicine({
            code: cleanCode,
            name: formData.name.trim(),
            activeIngredient: formData.activeIngredient?.trim() || 'Chưa cập nhật',
            unit: formData.unit || 'VIÊN',
            unitPrice: price,
            stockQuantity: stock,
            medicalCenterId: selectedCenter?.id || 'a1b2c3d4-0001-4000-8000-000000000001',
            medicalCenterName: centerName,
            isActive: formData.isActive !== false,
            note: formData.note?.trim() || ''
          });
          setMessage({ type: 'success', text: `Đã khai báo thuốc "${formData.name.trim()}" vào kho chi nhánh ${centerName} thành công!` });
        } else {
          updateMedicine(editingId!, {
            code: cleanCode,
            name: formData.name.trim(),
            activeIngredient: formData.activeIngredient?.trim() || 'Chưa cập nhật',
            unit: formData.unit || 'VIÊN',
            unitPrice: price,
            stockQuantity: stock,
            medicalCenterId: selectedCenter?.id || formData.medicalCenterId,
            medicalCenterName: centerName,
            isActive: formData.isActive !== false,
            note: formData.note?.trim() || ''
          });
          setMessage({ type: 'success', text: `Cập nhật thông tin thuốc "${formData.name.trim()}" thành công!` });
        }
        setMedicines(getMedicines());
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

    if (activeTab === 'medicines') {
      if (!window.confirm('Bạn có chắc chắn muốn xóa thuốc này khỏi danh mục kho của chi nhánh?')) return;
      deleteMedicine(id);
      setMedicines(getMedicines());
      setMessage({ type: 'success', text: 'Đã xóa thuốc khỏi danh mục kho thành công!' });
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

  const handleReleaseRoomToBackup = (id: string, code: string, doctorName?: string | null) => {
    if (!window.confirm(`Bạn có chắc muốn giải phóng phòng [${code}] của Bác sĩ "${doctorName || 'hiện tại'}" thành Phòng Dự Phòng? Bác sĩ sẽ không còn phòng riêng cố định.`)) return;
    updateClinicRoom(id, {
      assignedDoctorId: null,
      assignedDoctorName: null,
      isBackupRoom: true,
    });
    setRooms(getClinicRooms());
    setMessage({ 
      type: 'success', 
      text: `Đã chuyển buồng khám [${code}] thành Phòng Dự Phòng thành công!` 
    });
  };

  const handleOpenImportModal = (med: MedicineInventoryItem) => {
    setSelectedMedForImport(med);
    setImportQuantity(100);
    setImportPrice(med.unitPrice);
    setImportNote('');
    setImportModalOpen(true);
  };

  const handleSaveImportModal = () => {
    if (!selectedMedForImport) return;
    if (isNaN(importQuantity) || importQuantity <= 0) {
      alert('Vui lòng nhập số lượng nhập thêm hợp lệ (> 0)!');
      return;
    }
    const target = importMedicineStock(selectedMedForImport.id, importQuantity, importPrice, importNote);
    if (target) {
      setMedicines(getMedicines());
      setImportModalOpen(false);
      setMessage({
        type: 'success',
        text: `Đã nhập thêm thành công +${importQuantity} ${target.unit.toLowerCase()} vào kho chi nhánh! Tồn kho mới: ${target.stockQuantity} ${target.unit.toLowerCase()}.`
      });
    }
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
      const doctorsWithoutRoom = doctors.filter(
        d => !rooms.some(r => r.assignedDoctorId === (d.userId || d.id))
      );

      return (
        <div className="space-y-3">
          {doctorsWithoutRoom.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Lưu ý quản lý buồng phòng:</strong> Hiện có <strong>{doctorsWithoutRoom.length}</strong> Bác sĩ chưa có phòng riêng cố định ({doctorsWithoutRoom.map(d => d.fullName).slice(0, 3).join(', ')}{doctorsWithoutRoom.length > 3 ? '...' : ''}). Bạn có thể gán các phòng dự phòng bên dưới cho bác sĩ!
                </span>
              </div>
              <button
                onClick={() => openModal('create')}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0 transition"
              >
                + Mở Phòng Mới
              </button>
            </div>
          )}

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase">
                <th className="py-3 px-3.5 whitespace-nowrap w-20">Mã Phòng</th>
                <th className="py-3 px-3.5 font-bold">Tên Phòng Khám</th>
                <th className="py-3 px-3 whitespace-nowrap">Bác Sĩ Phụ Trách / Dự Phòng</th>
                <th className="py-3 px-2 whitespace-nowrap text-center w-16">Tầng</th>
                <th className="py-3 px-3 whitespace-nowrap w-36">Chi Nhánh</th>
                <th className="py-3 px-3 whitespace-nowrap text-center w-32">Trạng Thái</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap w-28">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Chưa có phòng khám nào được cấu hình. Bấm "Mở Thêm Phòng Khám" để tạo.
                  </td>
                </tr>
              ) : (
                rooms.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3.5 font-mono font-bold text-blue-700 whitespace-nowrap">{r.code}</td>
                    <td className="py-3 px-3.5 font-semibold text-slate-800 leading-snug">
                      <div>{r.name}</div>
                      {r.specialtyName && (
                        <span className="text-[11px] text-slate-500 font-normal">
                          Khoa: {r.specialtyName}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {r.assignedDoctorName ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs shadow-2xs">
                          <Stethoscope size={13} className="text-teal-600 shrink-0" />
                          <span>{r.assignedDoctorName}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold text-xs shadow-2xs">
                          <ShieldCheck size={13} className="text-purple-600 shrink-0" />
                          <span>Phòng Dự Phòng ({r.specialtyName || 'Chung'})</span>
                        </div>
                      )}
                    </td>
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
                        {r.medicalCenterName?.includes('Trần Đại Nghĩa') ? 'CN Trần Đại Nghĩa' : r.medicalCenterName?.includes('Trịnh Đình Thảo') ? 'CN Trịnh Đình Thảo' : r.medicalCenterName?.replace('Phòng Khám Đa Khoa MedSched - ', '') || r.medicalCenterName}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-center">
                      {r.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                          <CheckCircle2 size={12} />
                          Sẵn sàng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                          <Wrench size={12} />
                          Bảo trì
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
                        <button 
                          onClick={() => openModal('edit', r)} 
                          className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition cursor-pointer" 
                          title="Sửa phòng / Gán bác sĩ"
                        >
                          <Edit2 size={16} />
                        </button>
                        {r.assignedDoctorName && (
                          <button 
                            onClick={() => handleReleaseRoomToBackup(r.id, r.code, r.assignedDoctorName)} 
                            className="p-1.5 text-purple-600 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition cursor-pointer" 
                            title="Giải phóng phòng này thành Phòng Dự Phòng"
                          >
                            <UserX size={16} />
                          </button>
                        )}
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
        </div>
      );
    }

    if (activeTab === 'medicines') {
      const filteredMeds = medicines.filter(m => {
        const matchBranch = medBranchFilter === 'ALL' || m.medicalCenterId === medBranchFilter;
        const q = medSearchQuery.trim().toLowerCase();
        const matchQuery = !q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || (m.activeIngredient && m.activeIngredient.toLowerCase().includes(q));
        let matchStatus = true;
        if (medStatusFilter === 'AVAILABLE') matchStatus = m.stockQuantity > 30;
        if (medStatusFilter === 'LOW') matchStatus = m.stockQuantity > 0 && m.stockQuantity <= 30;
        if (medStatusFilter === 'EMPTY') matchStatus = m.stockQuantity === 0;
        return matchBranch && matchQuery && matchStatus;
      });

      const totalStock = medicines.reduce((sum, m) => sum + m.stockQuantity, 0);
      const lowStockCount = medicines.filter(m => m.stockQuantity > 0 && m.stockQuantity <= 30).length;
      const emptyStockCount = medicines.filter(m => m.stockQuantity === 0).length;

      // Pagination (Tối đa 5 loại thuốc / trang)
      const pageSize = 5;
      const totalElements = filteredMeds.length;
      const totalPages = Math.ceil(totalElements / pageSize) || 1;
      const validPage = Math.min(medPage, Math.max(0, totalPages - 1));
      const paginatedMeds = filteredMeds.slice(validPage * pageSize, (validPage + 1) * pageSize);

      return (
        <div className="space-y-3.5 p-3 sm:p-4">
          {/* KPI Cards (Compact) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tổng Mặt Hàng</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-black text-slate-900">{medicines.length}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">hoạt chất</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">💊</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tổng Tồn Khả Dụng</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-black text-slate-900">{totalStock.toLocaleString('vi-VN')}</span>
                  <span className="text-[10px] text-slate-400 font-medium">đơn vị</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">📦</div>
            </div>
            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Sắp Hết Hàng (&lt; 30)</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-black text-amber-600">{lowStockCount}</span>
                  <span className="text-[10px] text-amber-600 font-medium">cần nhập</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">⚠️</div>
            </div>
            <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">Đã Hết Hàng</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-black text-rose-600">{emptyStockCount}</span>
                  <span className="text-[10px] text-rose-600 font-medium">khóa kê đơn</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">🚫</div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 shrink-0">Chi Nhánh:</label>
              <select
                value={medBranchFilter}
                onChange={(e) => {
                  setMedBranchFilter(e.target.value);
                  setMedPage(0);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="ALL">Tất cả chi nhánh MedSched</option>
                {centers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name?.includes('Trần Đại Nghĩa') ? 'CN Trần Đại Nghĩa' : c.name?.includes('Trịnh Đình Thảo') ? 'CN Trịnh Đình Thảo' : c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={medSearchQuery}
                onChange={(e) => {
                  setMedSearchQuery(e.target.value);
                  setMedPage(0);
                }}
                placeholder="Tìm thuốc, hoạt chất, mã..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <Search size={14} className="text-slate-400 absolute left-2.5 top-2" />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => {
                  setMedStatusFilter('ALL');
                  setMedPage(0);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  medStatusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tất cả ({medicines.length})
              </button>
              <button
                onClick={() => {
                  setMedStatusFilter('AVAILABLE');
                  setMedPage(0);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  medStatusFilter === 'AVAILABLE' ? 'bg-emerald-600 text-white' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                }`}
              >
                Còn hàng
              </button>
              <button
                onClick={() => {
                  setMedStatusFilter('LOW');
                  setMedPage(0);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  medStatusFilter === 'LOW' ? 'bg-amber-600 text-white' : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                Sắp hết ({lowStockCount})
              </button>
              <button
                onClick={() => {
                  setMedStatusFilter('EMPTY');
                  setMedPage(0);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  medStatusFilter === 'EMPTY' ? 'bg-rose-600 text-white' : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                }`}
              >
                Hết hàng ({emptyStockCount})
              </button>
            </div>
          </div>

          {/* Table (Compact & Fits within Viewport) */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-28 whitespace-nowrap">Mã Thuốc</th>
                  <th className="py-2.5 px-3">Tên Thuốc &amp; Hoạt Chất</th>
                  <th className="py-2.5 px-3 text-center w-36 whitespace-nowrap">Chi Nhánh</th>
                  <th className="py-2.5 px-2 text-center w-16 whitespace-nowrap">ĐVT</th>
                  <th className="py-2.5 px-3 text-right w-28 whitespace-nowrap">Đơn Giá</th>
                  <th className="py-2.5 px-3 text-center w-32 whitespace-nowrap">Tồn Kho</th>
                  <th className="py-2.5 px-2 text-center w-24 whitespace-nowrap">Trạng Thái</th>
                  <th className="py-2.5 px-3 text-right w-32 whitespace-nowrap">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMeds.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      <p className="text-xl mb-1">🔍</p>
                      <p className="font-semibold text-slate-600">Không tìm thấy thuốc nào phù hợp với bộ lọc</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Vui lòng thay đổi từ khóa hoặc bấm nút "+ Khai Báo Thuốc Mới" ở trên</p>
                    </td>
                  </tr>
                ) : (
                  paginatedMeds.map((m) => {
                    const isOutOfStock = m.stockQuantity === 0;
                    const isLowStock = m.stockQuantity > 0 && m.stockQuantity <= 30;
                    const isTranDaiNghia = m.medicalCenterName?.includes('Trần Đại Nghĩa');
                    const shortCenterName = isTranDaiNghia
                      ? 'Trần Đại Nghĩa'
                      : m.medicalCenterName?.includes('Trịnh Đình Thảo')
                      ? 'Trịnh Đình Thảo'
                      : m.medicalCenterName?.replace(/^Phòng Khám Đa Khoa MedSched - (Chi Nhánh )?/i, '').replace(/\s*\(ITC\)$/i, '') || m.medicalCenterName;

                    return (
                      <tr key={m.id} className={`hover:bg-slate-50 transition ${isOutOfStock ? 'bg-rose-50/20' : ''}`}>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-600 text-[11px] whitespace-nowrap">{m.code}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900">{m.name}</span>
                          {m.activeIngredient && (
                            <span className="text-[10px] text-slate-400 ml-1.5">({m.activeIngredient})</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              isTranDaiNghia
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {shortCenterName}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-700 whitespace-nowrap text-[11px]">{m.unit}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                          {m.unitPrice.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className={`font-bold ${isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-800'} text-[11px]`}>
                            {m.stockQuantity} <span className="text-[10px] font-normal text-slate-400">{m.unit.toLowerCase()}</span>
                          </div>
                          <div className="w-16 h-1 bg-slate-100 rounded-full mx-auto mt-0.5 overflow-hidden">
                            <div
                              className={`h-full ${isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (m.stockQuantity / 400) * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Hết hàng
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Sắp hết
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Còn hàng
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenImportModal(m)}
                              className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded text-[11px] font-bold transition flex items-center gap-0.5 cursor-pointer"
                              title="Nhập thêm số lượng thuốc vào kho"
                            >
                              <PackagePlus size={12} />
                              <span>Nhập kho</span>
                            </button>
                            <button
                              onClick={() => openModal('edit', m)}
                              className="p-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded transition cursor-pointer"
                              title="Sửa thông tin thuốc / Đổi giá niêm yết"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded transition cursor-pointer"
                              title="Xóa thuốc khỏi danh mục"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Footer (Tối đa 5 thuốc / trang) */}
            {filteredMeds.length > 0 && (
              <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>Hiển thị</span>
                  <strong className="text-slate-800 font-bold">
                    {totalElements === 0 ? 0 : validPage * pageSize + 1} - {Math.min((validPage + 1) * pageSize, totalElements)}
                  </strong>
                  <span>trên tổng số</span>
                  <strong className="text-slate-800 font-bold">{totalElements}</strong>
                  <span>mặt hàng thuốc</span>
                  <span className="text-slate-400 font-normal ml-1">(Tối đa {pageSize} thuốc/trang)</span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMedPage(p => Math.max(0, p - 1))}
                      disabled={validPage === 0}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 hover:text-teal-700 transition shadow-2xs cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      <span>Trước</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i).map((pageIdx) => (
                        <button
                          key={pageIdx}
                          type="button"
                          onClick={() => setMedPage(pageIdx)}
                          className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                            validPage === pageIdx
                              ? 'bg-teal-600 text-white border border-teal-600'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-teal-50 hover:text-teal-700'
                          }`}
                        >
                          {pageIdx + 1}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setMedPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={validPage >= totalPages - 1}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 hover:text-teal-700 transition shadow-2xs cursor-pointer"
                    >
                      <span>Sau</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quản Lý Danh Mục Phòng Khám</h1>
          <p className="text-slate-500 text-xs mt-1">Cấu hình chi nhánh, chuyên khoa, dịch vụ, buồng khám và kho dược phẩm niêm yết.</p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="flex items-center gap-2 bg-teal-primary hover:bg-pine-teal text-white px-4 py-2.5 rounded-xl font-bold shadow-xs transition cursor-pointer text-xs"
        >
          <Plus size={16} />
          <span>
            {activeTab === 'centers' && 'Thêm Mới Chi Nhánh'}
            {activeTab === 'specialties' && 'Thêm Mới Chuyên Khoa'}
            {activeTab === 'services' && 'Thêm Mới Dịch Vụ'}
            {activeTab === 'rooms' && 'Mở Thêm Phòng Khám'}
            {activeTab === 'medicines' && 'Khai Báo Thuốc Mới'}
          </span>
        </button>
      </div>

      {message && <AlertMessage pinned type={message.type} message={message.text} onClose={() => setMessage(null)} />}

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
            <span>Phòng Khám ({rooms.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('medicines')}
            className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-4 font-semibold text-sm transition cursor-pointer ${activeTab === 'medicines' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Pill size={18} />
            <span>Kho Thuốc & Dược ({medicines.length})</span>
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
                {activeTab === 'medicines' && 'Thuốc & Dược Phẩm'}
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
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Số / Mã Phòng <span className="text-red-500">*</span>
                      </label>
                      <div className="flex rounded-xl shadow-2xs overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                        <span className="inline-flex items-center px-3.5 bg-blue-50 text-blue-700 text-xs font-black select-none border-r border-slate-200">
                          P.
                        </span>
                        <input 
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          required 
                          maxLength={5}
                          placeholder="101, 205..." 
                          className="w-full p-2.5 font-mono font-black text-blue-700 outline-none text-sm bg-white" 
                          value={roomDigits} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setRoomDigits(val);
                            setFormData({ ...formData, code: val ? `P.${val}` : '' });
                          }} 
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Chỉ nhập số phòng (Lưu: <strong className="text-blue-700">{formData.code || 'P._'}</strong>)
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Vị Trí / Tầng <span className="text-red-500">*</span>
                      </label>
                      <div className="flex rounded-xl shadow-2xs overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                        <span className="inline-flex items-center px-3 bg-slate-100 text-slate-600 text-xs font-bold select-none border-r border-slate-200">
                          Tầng
                        </span>
                        <input 
                          type="number"
                          min={1}
                          max={99}
                          required 
                          placeholder="1, 2, 3..." 
                          className="w-full p-2.5 font-bold text-slate-800 outline-none text-sm bg-white" 
                          value={floorNumber} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setFloorNumber(val);
                            setFormData({ ...formData, floor: val ? `Tầng ${val}` : '' });
                          }} 
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Chỉ nhập số tầng (Lưu: <strong className="text-slate-700">{formData.floor || 'Tầng _'}</strong>)
                      </span>
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

                  {/* Gán Bác sĩ phụ trách chính & Chuyên khoa trang thiết bị */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl">
                    <div>
                      <label className="block text-xs font-bold text-blue-900 uppercase mb-1 flex items-center justify-between">
                        <span>Bác Sĩ Phụ Trách (Phòng Riêng)</span>
                      </label>
                      <select
                        className="w-full border border-blue-200 p-2 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs font-bold bg-white text-slate-800"
                        value={formData.assignedDoctorId || ''}
                        onChange={e => {
                          const docId = e.target.value;
                          const doc = doctors.find(d => (d.userId || d.id) === docId);
                          setFormData({
                            ...formData,
                            assignedDoctorId: docId,
                            assignedDoctorName: doc ? doc.fullName : '',
                            specialtyName: doc?.specialtyName || formData.specialtyName || 'Đa Khoa',
                            isBackupRoom: !docId,
                          });
                        }}
                      >
                        <option value="">📦 Phòng Dự Phòng (Chưa gán bác sĩ)</option>
                        <optgroup label="Bác sĩ ưu tiên (Chưa có phòng riêng)">
                          {doctors.filter(d => !rooms.some(r => r.assignedDoctorId === (d.userId || d.id) && r.id !== editingId)).map(d => (
                            <option key={d.id} value={d.userId || d.id} className="font-bold text-blue-700">
                              ⭐ {d.fullName} ({d.specialtyName || 'Đa khoa'})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Bác sĩ đã có phòng riêng">
                          {doctors.filter(d => rooms.some(r => r.assignedDoctorId === (d.userId || d.id) && r.id !== editingId)).map(d => (
                            <option key={d.id} value={d.userId || d.id} className="text-slate-500">
                              👨‍⚕️ {d.fullName} ({d.specialtyName || 'Đa khoa'}) [Buồng: {d.roomNumber || 'P._'}]
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <span className="text-[10px] text-blue-700 mt-1 block">
                        {formData.assignedDoctorId ? '🎯 Bác sĩ sẽ có buồng khám chính cố định.' : '📦 Phòng lưu dưới dạng Dự phòng dùng chung.'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-blue-900 uppercase mb-1">
                        Chuyên Khoa Trang Thiết Bị <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        className="w-full border border-blue-200 p-2 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs font-bold bg-white text-slate-800"
                        value={formData.specialtyName || 'Đa Khoa'}
                        onChange={e => setFormData({ ...formData, specialtyName: e.target.value })}
                      >
                        <option value="Đa Khoa">Đa Khoa &amp; Cấp Cứu Ban Đầu</option>
                        {specialties.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                        <option value="Tư Vấn & Tiền Phẫu">Tư Vấn Chuyên Sâu &amp; Tiền Phẫu VIP</option>
                      </select>
                      <span className="text-[10px] text-blue-700 mt-1 block">
                        Đảm bảo phòng dự phòng đúng máy móc chuyên môn.
                      </span>
                    </div>
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

              {activeTab === 'medicines' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Mã Thuốc <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="VD: MED_AUGMENTIN_1"
                        className="w-full border border-slate-200 p-2.5 rounded-xl font-mono uppercase text-xs font-bold text-slate-800"
                        value={formData.code || ''}
                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Thuộc Chi Nhánh <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800"
                        value={formData.medicalCenterId}
                        onChange={e => setFormData({ ...formData, medicalCenterId: e.target.value })}
                      >
                        {centers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Tên Thuốc &amp; Biệt Dược <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      placeholder="VD: Augmentin 1g (Hộp 14 viên)"
                      className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 text-sm"
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Hoạt Chất Chính
                      </label>
                      <input
                        placeholder="VD: Amoxicillin, Clavulanate"
                        className="w-full border border-slate-200 p-2.5 rounded-xl text-xs text-slate-800"
                        value={formData.activeIngredient || ''}
                        onChange={e => setFormData({ ...formData, activeIngredient: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Đơn Vị Tính <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-xs text-slate-800"
                        value={formData.unit || 'VIÊN'}
                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                      >
                        <option value="VIÊN">VIÊN</option>
                        <option value="CHAI">CHAI</option>
                        <option value="LỌ">LỌ</option>
                        <option value="TUÝP">TUÝP</option>
                        <option value="GÓI">GÓI</option>
                        <option value="HỘP">HỘP</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Đơn Giá Niêm Yết (VNĐ) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        required
                        className="w-full border border-slate-200 p-2.5 rounded-xl font-black text-emerald-700 text-sm"
                        value={formData.unitPrice ?? 3000}
                        onChange={e => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Khóa cứng khi Bác sĩ kê đơn</span>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Số Lượng Tồn Kho <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        className="w-full border border-slate-200 p-2.5 rounded-xl font-black text-slate-800 text-sm"
                        value={formData.stockQuantity ?? 100}
                        onChange={e => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Tự động trừ theo đơn thuốc</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ghi Chú / Chỉ Dẫn Bảo Quản</label>
                    <textarea
                      rows={2}
                      placeholder="VD: Bảo quản nơi khô ráo dưới 30°C, tránh ánh nắng trực tiếp..."
                      className="w-full border border-slate-200 p-2.5 rounded-xl text-xs"
                      value={formData.note || ''}
                      onChange={e => setFormData({ ...formData, note: e.target.value })}
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
                      <span>
                        {modalMode === 'create' 
                          ? (activeTab === 'centers' ? 'Thêm Chi Nhánh' : activeTab === 'specialties' ? 'Thêm Chuyên Khoa' : activeTab === 'services' ? 'Thêm Dịch Vụ' : activeTab === 'rooms' ? 'Thêm Phòng Khám' : 'Khai Báo Thuốc') 
                          : 'Lưu Thay Đổi'}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Import Stock Modal */}
      {importModalOpen && selectedMedForImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                <PackagePlus size={20} className="text-teal-600" />
                <span>Nhập Thêm Thuốc Vào Kho</span>
              </h3>
              <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Thuốc &amp; Chi Nhánh:</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800">
                  {selectedMedForImport.name} ({selectedMedForImport.medicalCenterName})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tồn kho hiện tại:</label>
                  <input
                    type="text"
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600"
                    value={`${selectedMedForImport.stockQuantity} ${selectedMedForImport.unit.toLowerCase()}`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số lượng nhập thêm (+):</label>
                  <input
                    type="number"
                    min="1"
                    value={importQuantity}
                    onChange={(e) => setImportQuantity(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-white border-2 border-teal-500 rounded-xl font-black text-teal-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Cập nhật đơn giá bán niêm yết (VNĐ):</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={importPrice}
                  onChange={(e) => setImportPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Áp dụng cố định khi Bác sĩ kê đơn viện phí</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ghi chú phiếu nhập / Nhà cung cấp:</label>
                <input
                  type="text"
                  placeholder="VD: Dược Hậu Giang - Lô DHG-2026/A"
                  value={importNote}
                  onChange={(e) => setImportNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                />
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveImportModal}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 transition cursor-pointer"
              >
                Xác Nhận Nhập Kho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
