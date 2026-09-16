import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Pin,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User as UserIcon,
  Calendar,
  AlertCircle,
  FileText,
  BookOpen,
  ClipboardList,
  Info,
  X,
  ExternalLink,
  Users,
  Eye,
} from 'lucide-react';
import { LMSDatabase, dataStorage } from '../../services/dataStorage';
import { User, Pengumuman, KategoriPengumuman } from '../../types';

interface PengumumanManagerProps {
  db: LMSDatabase;
  currentUser: User;
}

export const PengumumanManager: React.FC<PengumumanManagerProps> = ({ db, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Pengumuman | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<string>('SEMUA');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const defaultGuruNama =
    currentUser.role === 'GURU'
      ? currentUser.name
      : db.settings?.guruPjokNama || db.settings?.namaGuruPJOKUtama || 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.';

  const defaultGuruNip =
    currentUser.role === 'GURU'
      ? currentUser.nip || ''
      : db.settings?.guruPjokNip || db.settings?.nipGuruPJOKUtama || '19881115 202221 1 012';

  const [formData, setFormData] = useState<Partial<Pengumuman>>({
    judul: '',
    isi: '',
    kategori: 'Informasi',
    disematkan: false,
    prioritas: 'Biasa',
    targetRole: 'ALL',
    targetKelasId: 'ALL',
    targetKelasNama: 'Semua Rombel',
    lampiranUrl: '',
    namaLampiran: '',
    guruId: currentUser.id,
    guruNama: defaultGuruNama,
    guruNip: defaultGuruNip,
    guruMataPelajaran: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      judul: '',
      isi: '',
      kategori: 'Informasi',
      disematkan: false,
      prioritas: 'Biasa',
      targetRole: 'ALL',
      targetKelasId: 'ALL',
      targetKelasNama: 'Semua Rombel',
      lampiranUrl: '',
      namaLampiran: '',
      guruId: currentUser.id,
      guruNama: defaultGuruNama,
      guruNip: defaultGuruNip,
      guruAvatar: currentUser.avatar,
      guruMataPelajaran: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Pengumuman) => {
    setEditingItem(p);
    setFormData(p);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, judul: string) => {
    if (window.confirm(`Hapus pengumuman "${judul}"?`)) {
      dataStorage.deletePengumuman(id);
      showToast('Pengumuman berhasil dihapus');
    }
  };

  const handleTogglePin = (id: string) => {
    dataStorage.togglePinPengumuman(id);
    showToast('Status sematan pengumuman berhasil diperbarui');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    let targetKelasNama = 'Semua Rombel';
    if (formData.targetKelasId && formData.targetKelasId !== 'ALL') {
      const k = (db.kelas || []).find((item) => item.id === formData.targetKelasId);
      if (k) targetKelasNama = `Kelas ${k.nama}`;
    }

    if (editingItem) {
      const updated: Pengumuman = {
        ...editingItem,
        ...formData,
        targetKelasNama,
        guruNama: formData.guruNama || defaultGuruNama,
        guruNip: formData.guruNip || defaultGuruNip,
        guruAvatar: currentUser.avatar || editingItem.guruAvatar,
      } as Pengumuman;

      dataStorage.savePengumuman(updated);
      showToast('Pengumuman berhasil diperbarui');
    } else {
      const newItem: Pengumuman = {
        id: `ann-${Date.now()}`,
        judul: formData.judul || 'Pengumuman Baru',
        isi: formData.isi || '',
        kategori: (formData.kategori as KategoriPengumuman) || 'Informasi',
        disematkan: Boolean(formData.disematkan),
        prioritas: formData.prioritas || 'Biasa',
        targetRole: 'ALL',
        targetKelasId: formData.targetKelasId || 'ALL',
        targetKelasNama,
        lampiranUrl: formData.lampiranUrl || '',
        namaLampiran: formData.namaLampiran || '',
        guruId: currentUser.id,
        guruNama: formData.guruNama || defaultGuruNama,
        guruNip: formData.guruNip || defaultGuruNip,
        guruAvatar: currentUser.avatar,
        guruMataPelajaran: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
        tanggalDibuat: new Date().toISOString(),
        dibacaOleh: [],
      };

      dataStorage.savePengumuman(newItem);
      showToast('Pengumuman baru berhasil diterbitkan untuk murid');
    }

    setIsModalOpen(false);
  };

  // Filtered announcements
  const announcements = (db.pengumuman || []).filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = p.judul.toLowerCase().includes(q);
      const matchBody = p.isi.toLowerCase().includes(q);
      const matchGuru = (p.guruNama || '').toLowerCase().includes(q);
      if (!matchTitle && !matchBody && !matchGuru) return false;
    }
    if (selectedKategori !== 'SEMUA') {
      const cat = p.kategori || 'Informasi';
      if (cat.toLowerCase() !== selectedKategori.toLowerCase()) return false;
    }
    return true;
  });

  return (
    <div id="pengumuman-manager-root" className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 uppercase tracking-wider">
              Portal Guru & Admin
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Kelola Pengumuman Pembelajaran PJOK
          </h2>
          <p className="text-xs text-slate-500">
            Terbitkan siaran instruksi penting, materi praktik, atau informasi tugas yang akan tampil di halaman pengumuman murid.
          </p>
        </div>

        <button
          type="button"
          id="btn-add-pengumuman"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengumuman Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari pengumuman..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['SEMUA', 'Penting', 'Tugas', 'Materi', 'Informasi'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedKategori(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors cursor-pointer ${
                selectedKategori === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat === 'SEMUA' ? 'Semua Kategori' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-dashed border-slate-300 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Megaphone className="w-7 h-7" />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-bold text-slate-800">Belum Ada Pengumuman Terbit</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Tekan tombol "Buat Pengumuman Baru" di atas untuk mempublikasikan pengumuman pertama Anda kepada seluruh siswa atau rombel kelas tertentu.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Buat Pengumuman Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {announcements.map((p) => {
            const readersCount = (p.dibacaOleh || []).length;
            return (
              <div
                key={p.id}
                className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all hover:shadow-md space-y-4 ${
                  p.disematkan ? 'border-amber-300 bg-amber-50/20 shadow-xs' : 'border-slate-200/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.disematkan && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs">
                        <Pin className="w-3 h-3 fill-white rotate-45" />
                        DISEMATKAN
                      </span>
                    )}

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        p.kategori === 'Penting'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : p.kategori === 'Tugas'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : p.kategori === 'Materi'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}
                    >
                      {p.kategori || 'Informasi'}
                    </span>

                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {p.targetKelasNama || 'Semua Rombel'}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                      <Eye className="w-3 h-3 text-slate-400" />
                      {readersCount} Siswa Membaca
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePin(p.id)}
                      title={p.disematkan ? 'Lepas Sematan' : 'Sematkan ke Bagian Atas'}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        p.disematkan
                          ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Pin className="w-3.5 h-3.5 rotate-45" />
                      <span className="hidden sm:inline">
                        {p.disematkan ? 'Disematkan' : 'Sematkan'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(p)}
                      title="Edit Pengumuman"
                      className="p-2 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors border border-slate-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.judul)}
                      title="Hapus Pengumuman"
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800">{p.judul}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {p.isi}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">{p.guruNama}</span>
                    {p.guruNip && <span>(NIP. {p.guruNip})</span>}
                  </div>

                  <div className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Diterbitkan: {new Date(p.tanggalDibuat).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-8">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-800 mb-1">
              {editingItem ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Pengumuman akan langsung disiarkan ke beranda dan menu pengumuman siswa.
            </p>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Judul Pengumuman *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jadwal Praktik Senam Irama & Pakaian Olahraga"
                  value={formData.judul || ''}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kategori Pengumuman *
                  </label>
                  <select
                    value={formData.kategori || 'Informasi'}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value as KategoriPengumuman })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Informasi">Informasi Umum</option>
                    <option value="Penting">Penting / Mendesak</option>
                    <option value="Tugas">Tugas PJOK</option>
                    <option value="Materi">Materi Pembelajaran</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target Rombel Kelas *
                  </label>
                  <select
                    value={formData.targetKelasId || 'ALL'}
                    onChange={(e) => setFormData({ ...formData, targetKelasId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Semua Rombel (Seluruh Siswa)</option>
                    {db.kelas.map((k) => (
                      <option key={k.id} value={k.id}>
                        Kelas {k.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pin Checkbox */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center">
                    <Pin className="w-4 h-4 rotate-45" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      Sematkan Pengumuman (Prioritas Teratas)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Pengumuman akan ditempatkan di panel khusus teratas pada halaman siswa.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="checkbox-disematkan"
                  checked={Boolean(formData.disematkan)}
                  onChange={(e) => setFormData({ ...formData, disematkan: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Isi Pesan Pengumuman *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tuliskan isi pengumuman secara jelas untuk siswa..."
                  value={formData.isi || ''}
                  onChange={(e) => setFormData({ ...formData, isi: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Guru Pengunggah
                  </label>
                  <input
                    type="text"
                    value={formData.guruNama || ''}
                    onChange={(e) => setFormData({ ...formData, guruNama: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    NIP Guru
                  </label>
                  <input
                    type="text"
                    value={formData.guruNip || ''}
                    onChange={(e) => setFormData({ ...formData, guruNip: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tautan Lampiran Dokumen / Link (Opsional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formData.lampiranUrl || ''}
                  onChange={(e) => setFormData({ ...formData, lampiranUrl: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-submit-pengumuman"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Terbitkan Pengumuman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
