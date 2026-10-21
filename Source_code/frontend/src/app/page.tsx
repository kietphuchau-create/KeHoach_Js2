import React from "react";
import HeroCarousel from "@/modules/home/components/HeroCarousel";
import ClinicSimpleAbout from "@/modules/home/components/ClinicSimpleAbout";
import ClinicSpecialtiesDirectory from "@/modules/home/components/ClinicSpecialtiesDirectory";
import ClinicSimpleWorkflow from "@/modules/home/components/ClinicSimpleWorkflow";

export default function HomePage() {
  return (
    <div className="w-full flex flex-col pb-10">
      {/* 1. Banner Carousel chính: Full tràn viền chạm 2 bên, trên dưới, không bo tròn */}
      <HeroCarousel />

      {/* Các khối nội dung bên dưới đặt trong container căn giữa */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14 mt-8 sm:mt-10">
        {/* 2. Quy Trình Khám Bệnh Nhanh Chóng 3 Bước (Đem 3 Card lên ngay dưới Carousel) */}
        <ClinicSimpleWorkflow />

        {/* 3. Giới Thiệu Phòng Khám MedSched (Gần gũi, tận tâm, không chờ đợi) */}
        <ClinicSimpleAbout />

        {/* 4. Danh Mục Các Chuyên Khoa Ngoại Trú Thiết Yếu (01 – 06) */}
        <ClinicSpecialtiesDirectory />
      </div>
    </div>
  );
}
