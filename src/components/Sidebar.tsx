import React, { useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  School,
  BookOpen,
  FolderKanban,
  FileCheck2,
  CalendarCheck,
  Settings,
  GraduationCap,
  ClipboardList,
  CheckCircle,
  Activity,
  FileText,
  UserCheck,
  BookMarked,
  Award,
  Calendar,
  User,
  LogOut,
  Zap,
  X,
  FileSpreadsheet,
  Sparkles,
  Camera,
  Megaphone,
  ShieldAlert,
  Flame,
  HeartHandshake,
  Users2,
} from 'lucide-react';
import { UserRole, User as UserType } from '../types';
import { dataStorage } from '../services/dataStorage';
import { PWAInstallButton } from './pwa/PWAInstallButton';

interface SidebarProps {
  role: UserRole;
  currentUser?: UserType;
  appLogo?: string;
  activeMenu: string;
  onSelectMenu: (menuId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenGoogleSheets?: () => void;
  onLogout?: () => void;
}

interface MenuSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  currentUser,
  appLogo,
  activeMenu,
  onSelectMenu,
  isOpen = false,
  onClose,
  onOpenGoogleSheets,
  onLogout,
}) => {
  const adminLogoInputRef = useRef<HTMLInputElement>(null);

  const handleDirectLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih berkas gambar yang valid (PNG, JPG, SVG, atau WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png', 0.9);
          dataStorage.updateDatabase((prev) => ({
            ...prev,
            settings: {
              ...prev.settings,
              logoSekolah: dataUrl,
            },
          }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const getAdminSections = (): MenuSection[] => {
    const pendingIzinCount = (dataStorage.getDatabase().pengajuanIzin || []).filter(
      (i) => i.status === 'Menunggu'
    ).length;

    return [
      {
        title: 'UTAMA',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'pengumuman', label: 'Pengumuman', icon: <Megaphone className="w-5 h-5 text-amber-400" /> },
        ],
      },
      {
        title: 'DATA PENGGUNA & PENGAJAR',
        items: [
          { id: 'data-murid', label: 'Data Murid', icon: <GraduationCap className="w-5 h-5" /> },
          { id: 'data-guru', label: 'Data Guru', icon: <UserCheck className="w-5 h-5" /> },
          { id: 'users', label: 'Kelola Pengguna', icon: <Users className="w-5 h-5" /> },
          { id: 'kelas', label: 'Kelas & Rombel', icon: <School className="w-5 h-5" /> },
          { id: 'mapel', label: 'Mata Pelajaran', icon: <BookOpen className="w-5 h-5" /> },
        ],
      },
      {
        title: 'PEMBELAJARAN & ASESMEN',
        items: [
          { id: 'materi', label: 'Konten Materi', icon: <BookMarked className="w-5 h-5" /> },
          { id: 'tugas', label: 'Tugas', icon: <ClipboardList className="w-5 h-5" /> },
          { id: 'quiz', label: 'Quiz & Asesmen', icon: <CheckCircle className="w-5 h-5" /> },
          { id: 'praktik', label: 'Penilaian Praktik', icon: <Activity className="w-5 h-5" /> },
          { id: 'penilaian-harian', label: 'Penilaian Harian', icon: <Flame className="w-5 h-5 text-sky-400" /> },
          { id: 'penilaian-sikap', label: 'Penilaian Sikap', icon: <HeartHandshake className="w-5 h-5 text-emerald-400" /> },
          { id: 'penilaian-teman', label: 'Penilaian Teman Sejawat', icon: <Users2 className="w-5 h-5 text-indigo-400" /> },
          { id: 'refleksi', label: 'Refleksi Pembelajaran', icon: <Sparkles className="w-5 h-5" /> },
        ],
      },
      {
        title: 'JURNAL & PRESENSI',
        items: [
          { id: 'jurnal', label: 'Jurnal Mengajar', icon: <FileText className="w-5 h-5" /> },
          { id: 'presensi', label: 'Presensi Murid', icon: <CalendarCheck className="w-5 h-5" /> },
          {
            id: 'surat-izin',
            label: 'Surat Izin Murid',
            icon: <FileText className="w-5 h-5 text-amber-400" />,
            badge: pendingIzinCount > 0 ? pendingIzinCount : undefined,
          },
        ],
      },
      {
        title: 'REKAPAN',
        items: [
          { id: 'rekap-jurnal', label: 'Rekapan Jurnal', icon: <FileSpreadsheet className="w-5 h-5 text-teal-400" /> },
          { id: 'rekap-absensi', label: 'Rekapan Presensi', icon: <FileSpreadsheet className="w-5 h-5 text-emerald-400" /> },
          { id: 'rekap-penilaian-teman', label: 'Rekapan Penilaian Teman Sejawat', icon: <Users2 className="w-5 h-5 text-indigo-400" /> },
          { id: 'rekap-penilaian-sikap', label: 'Rekapan Penilaian Sikap', icon: <HeartHandshake className="w-5 h-5 text-pink-400" /> },
          { id: 'nilai', label: 'Penilaian & Rapor', icon: <Award className="w-5 h-5" /> },
        ],
      },
      {
        title: 'PENGATURAN',
        items: [
          { id: 'log-aktivitas', label: 'Log & Diagnosa Akses', icon: <ShieldAlert className="w-5 h-5 text-indigo-400" /> },
          { id: 'profil-saya', label: 'Profil Saya', icon: <User className="w-5 h-5" /> },
          { id: 'settings', label: 'Pengaturan Sistem', icon: <Settings className="w-5 h-5" /> },
        ],
      },
    ];
  };

  const getGuruSections = (): MenuSection[] => {
    const pendingIzinCount = (dataStorage.getDatabase().pengajuanIzin || []).filter(
      (i) => i.status === 'Menunggu'
    ).length;

    return [
      {
        title: 'UTAMA',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'pengumuman', label: 'Pengumuman', icon: <Megaphone className="w-5 h-5 text-amber-400" /> },
        ],
      },
      {
        title: 'PEMBELAJARAN',
        items: [
          { id: 'data-murid', label: 'Data Murid', icon: <GraduationCap className="w-5 h-5" /> },
          { id: 'materi', label: 'Materi Pembelajaran', icon: <BookMarked className="w-5 h-5" /> },
          { id: 'tugas', label: 'Tugas', icon: <ClipboardList className="w-5 h-5" /> },
          { id: 'quiz', label: 'Quiz & Asesmen', icon: <CheckCircle className="w-5 h-5" /> },
        ],
      },
      {
        title: 'PENILAIAN & JURNAL',
        items: [
          { id: 'praktik', label: 'Penilaian Praktik', icon: <Activity className="w-5 h-5" /> },
          { id: 'penilaian-harian', label: 'Penilaian Harian', icon: <Flame className="w-5 h-5 text-sky-400" /> },
          { id: 'penilaian-sikap', label: 'Penilaian Sikap', icon: <HeartHandshake className="w-5 h-5 text-emerald-400" /> },
          { id: 'penilaian-teman', label: 'Penilaian Teman Sejawat', icon: <Users2 className="w-5 h-5 text-indigo-400" /> },
          { id: 'refleksi', label: 'Refleksi Pembelajaran', icon: <Sparkles className="w-5 h-5" /> },
          { id: 'jurnal', label: 'Jurnal Mengajar', icon: <FileText className="w-5 h-5" /> },
          { id: 'presensi', label: 'Presensi Murid', icon: <CalendarCheck className="w-5 h-5" /> },
          {
            id: 'surat-izin',
            label: 'Surat Izin Murid',
            icon: <FileText className="w-5 h-5 text-amber-400" />,
            badge: pendingIzinCount > 0 ? pendingIzinCount : undefined,
          },
        ],
      },
      {
        title: 'REKAPAN',
        items: [
          { id: 'rekap-jurnal', label: 'Rekapan Jurnal', icon: <FileSpreadsheet className="w-5 h-5 text-teal-400" /> },
          { id: 'rekap-absensi', label: 'Rekapan Presensi', icon: <FileSpreadsheet className="w-5 h-5 text-emerald-400" /> },
          { id: 'rekap-penilaian-teman', label: 'Rekapan Penilaian Teman Sejawat', icon: <Users2 className="w-5 h-5 text-indigo-400" /> },
          { id: 'rekap-penilaian-sikap', label: 'Rekapan Penilaian Sikap', icon: <HeartHandshake className="w-5 h-5 text-pink-400" /> },
          { id: 'nilai', label: 'Rekapan Nilai', icon: <Award className="w-5 h-5" /> },
        ],
      },
      {
        title: 'PENGATURAN',
        items: [
          { id: 'profil-saya', label: 'Profil Saya', icon: <User className="w-5 h-5" /> },
          { id: 'settings', label: 'Pengaturan & Reset Data', icon: <Settings className="w-5 h-5" /> },
        ],
      },
    ];
  };

  const getMuridSections = (): MenuSection[] => {
    const dbData = dataStorage.getDatabase();
    const myId = currentUser?.id || '';
    const myKelasId = currentUser?.kelasId || '';
    const unreadCount = (dbData.pengumuman || []).filter((p) => {
      if (p.targetRole && p.targetRole !== 'ALL' && p.targetRole !== 'MURID') return false;
      if (p.targetKelasId && p.targetKelasId !== 'ALL' && myKelasId && p.targetKelasId !== myKelasId) {
        return false;
      }
      return !(p.dibacaOleh || []).includes(myId);
    }).length;

    return [
      {
        title: 'Utama',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          {
            id: 'pengumuman',
            label: 'Pengumuman',
            icon: <Megaphone className="w-5 h-5 text-amber-400" />,
            badge: unreadCount > 0 ? unreadCount : undefined,
          },
        ],
      },
      {
        title: 'Aktivitas Belajar',
        items: [
          { id: 'materi-saya', label: 'Materi Pembelajaran', icon: <BookMarked className="w-5 h-5" /> },
          { id: 'tugas-saya', label: 'Tugas Saya', icon: <ClipboardList className="w-5 h-5" /> },
          { id: 'quiz-saya', label: 'Quiz & Asesmen', icon: <CheckCircle className="w-5 h-5" /> },
          { id: 'penilaian-teman-saya', label: 'Penilaian Teman Sejawat', icon: <Users2 className="w-5 h-5 text-indigo-400" /> },
          { id: 'refleksi-saya', label: 'Refleksi Belajar', icon: <Sparkles className="w-5 h-5" /> },
        ],
      },
      {
        title: 'Akademik & Profil',
        items: [
          { id: 'nilai-saya', label: 'Transkrip Nilai', icon: <Award className="w-5 h-5" /> },
          { id: 'sikap-saya', label: 'Penilaian Sikap', icon: <HeartHandshake className="w-5 h-5 text-emerald-500" /> },
          { id: 'presensi-saya', label: 'Riwayat Kehadiran', icon: <Calendar className="w-5 h-5" /> },
          { id: 'profil-saya', label: 'Profil Saya', icon: <User className="w-5 h-5" /> },
        ],
      },
    ];
  };

  const sections =
    role === 'ADMIN' ? getAdminSections() : role === 'GURU' ? getGuruSections() : getMuridSections();

  const sidebarContent = (
    <div className="h-full flex flex-col bg-slate-900 text-slate-300 select-none">
      {/* Brand Header */}
      <div className="min-h-20 py-3.5 flex items-center justify-between px-4 bg-slate-950 shrink-0 border-b border-slate-800/80">
        <div className="flex items-center min-w-0 flex-1 gap-3">
          {/* Logo container with quick change for Admin */}
          <div className="relative group/logo shrink-0">
            <div
              onClick={() => {
                if (role === 'ADMIN') {
                  adminLogoInputRef.current?.click();
                }
              }}
              className={`w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-md overflow-hidden border border-white/10 ${
                role === 'ADMIN' ? 'cursor-pointer hover:ring-2 hover:ring-emerald-400' : ''
              }`}
              title={role === 'ADMIN' ? 'Klik untuk mengganti icon / logo aplikasi' : 'Logo NET PJOK'}
            >
              {appLogo ? (
                <img src={appLogo} alt="Logo NET PJOK" className="w-full h-full object-cover" />
              ) : (
                <Zap className="w-6 h-6 text-white fill-white" />
              )}
              {role === 'ADMIN' && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            {role === 'ADMIN' && (
              <input
                ref={adminLogoInputRef}
                type="file"
                accept="image/*"
                onChange={handleDirectLogoUpload}
                className="hidden"
                id="sidebar-admin-logo-upload"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base tracking-tight text-white block leading-none">
                NET PJOK
              </span>
              <span className="text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.5 rounded leading-none">
                SMANSAKA
              </span>
            </div>
            {/* Tampilkan nama lengkap di bawah logo tulisan NET PJOK nama guru/murid */}
            <div
              className="text-xs font-bold text-emerald-400 block truncate leading-snug mt-1"
              title={currentUser?.name}
            >
              {currentUser?.name || (role === 'ADMIN' ? 'Admin PJOK' : role === 'GURU' ? 'Guru PJOK' : 'Siswa PJOK')}
            </div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wide block truncate">
              {role === 'ADMIN'
                ? 'SMA Negeri 1 Tejakula • Admin'
                : role === 'GURU'
                ? 'SMA Negeri 1 Tejakula • Guru'
                : currentUser?.kelasId
                ? `SMAN 1 Tejakula • Kelas ${currentUser.kelasId}`
                : 'SMA Negeri 1 Tejakula • Siswa'}
            </div>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        {sections.map((section, secIdx) => (
          <div key={secIdx} className="mb-4">
            <div className="px-6 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectMenu(item.id);
                      if (onClose) onClose();
                    }}
                    id={`nav-menu-${item.id}`}
                    className={`w-full flex items-center px-6 py-3 text-sm transition-colors text-left group ${
                      isActive
                        ? 'bg-blue-600 text-white border-r-4 border-blue-400 font-semibold shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/90 hover:text-white'
                    }`}
                  >
                    <span
                      className={`mr-3.5 shrink-0 transition-transform ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate flex-1">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="ml-auto px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black animate-pulse shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quick action: PWA Install in sidebar */}
        <div className="px-4 mt-2">
          <PWAInstallButton variant="banner" />
        </div>

        {/* Logout action */}
        {onLogout && (
          <div className="px-4 mt-2">
            <button
              onClick={() => {
                if (onClose) onClose();
                onLogout();
              }}
              id="btn-sidebar-logout"
              className="w-full flex items-center px-4 py-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 text-xs font-medium text-rose-300 border border-rose-900/40 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2.5 text-rose-400 shrink-0" />
              <span>Keluar Sistem</span>
            </button>
          </div>
        )}
      </nav>

      {/* Footer Version Marker */}
      <div className="p-3.5 bg-slate-950 text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest border-t border-slate-800/80 shrink-0">
        VERSI 2.4.0 - 2026 PJOK SMAN 1 TEJAKULA
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 hidden md:flex h-full border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-2xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
