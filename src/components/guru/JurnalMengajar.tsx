import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Calendar,
  Clock,
  School,
  Save,
  Trash2,
  Edit2,
  X,
  Filter,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LayoutGrid,
  Table,
} from 'lucide-react';
import { JurnalMengajar, User, getTeacherAssignedClasses } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface JurnalMengajarProps {
  db: LMSDatabase;
  currentUser: User;
}

export const JurnalMengajarView: React.FC<JurnalMengajarProps> = ({ db, currentUser }) => {
  const availableClasses = useMemo(() => {
    if (currentUser?.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas;
    }
    return db.kelas;
  }, [currentUser, db.kelas]);

  const [selectedFilterKelasId, setSelectedFilterKelasId] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJurnal, setEditingJurnal] = useState<JurnalMengajar | null>(null);

  const [formData, setFormData] = useState<Partial<JurnalMengajar>>({
    tanggal: new Date().toISOString().slice(0, 10),
    jamKe: '1 - 3 (07.15 - 09.30 WIB)',
    kelasId: availableClasses[0]?.id || 'cls-xi-1',
    materiJudul: 'Permainan Bola Voli - Passing Bawah & Passing Atas',
    kegiatan:
      'Pemanasan dinamis, demonstrasi teknik perkenaan bola pada lengan, latihan passing berpasangan 20 kali, dan evaluasi gerak.',
    jumlahHadir: 32,
    jumlahTidakHadir: 0,
    catatanKhusus:
      'Semua siswa aktif dan antusias. Siswa mampu memahami koordinasi ayunan lengan dengan dorongan lutut.',
    hambatan: '3 siswa masih ragu saat perkenaan bola pada forearm sehingga bola memantul liar.',
    tindakLanjut: 'Diberikan bimbingan khusus berpasangan dengan teman sebaya yang sudah mahir.',
  });

  const handleOpenAdd = () => {
    setEditingJurnal(null);
    setFormData({
      tanggal: new Date().toISOString().slice(0, 10),
      jamKe: '1 - 3 (07.15 - 09.30 WIB)',
      kelasId: availableClasses[0]?.id || 'cls-xi-1',
      materiJudul: '',
      kegiatan: '',
      jumlahHadir: 32,
      jumlahTidakHadir: 0,
      catatanKhusus: '',
      hambatan: '',
      tindakLanjut: '',
    });
    setIsModalOpen(true);
  };

  const filteredJurnal = useMemo(() => {
    return (db.jurnal || []).filter((j) => {
      // If teacher, only show their assigned classes
      if (currentUser?.role === 'GURU') {
        const isAssigned = availableClasses.some((k) => k.id === j.kelasId || k.nama === j.kelasNama);
        if (!isAssigned) return false;
      }
      if (selectedFilterKelasId !== 'ALL') {
        return j.kelasId === selectedFilterKelasId;
      }
      return true;
    });
  }, [db.jurnal, currentUser, availableClasses, selectedFilterKelasId]);

  const handleOpenEdit = (j: JurnalMengajar) => {
    setEditingJurnal(j);
    setFormData(j);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus catatan jurnal mengajar ini?')) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        jurnal: prev.jurnal.filter((item) => item.id !== id),
      }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const kelasObj = (db.kelas || []).find((k) => k.id === formData.kelasId);

    if (editingJurnal) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        jurnal: prev.jurnal.map((item) =>
          item.id === editingJurnal.id
            ? ({
                ...item,
                ...formData,
                kelasNama: kelasObj?.nama || item.kelasNama,
              } as JurnalMengajar)
            : item
        ),
      }));
    } else {
      const newJurnal: JurnalMengajar = {
        id: `jr-${Date.now()}`,
        tanggal: formData.tanggal || new Date().toISOString().slice(0, 10),
        jamKe: formData.jamKe || '1 - 3',
        kelasId: formData.kelasId || 'cls-xi-1',
        kelasNama: kelasObj?.nama || 'XI 1',
        guruId: currentUser.id,
        guruNama: currentUser.name,
        materiJudul: formData.materiJudul || 'PJOK',
        kegiatan: formData.kegiatan || '',
        jumlahHadir: Number(formData.jumlahHadir) || 32,
        jumlahTidakHadir: Number(formData.jumlahTidakHadir) || 0,
        catatanKhusus: formData.catatanKhusus || '',
        hambatan: formData.hambatan || '',
        tindakLanjut: formData.tindakLanjut || '',
      };
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        jurnal: [newJurnal, ...prev.jurnal],
      }));
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            Jurnal Mengajar Guru PJOK
          </h2>
          <p className="text-xs text-slate-500">
            Dokumentasi agenda harian pembelajaran, materi gerak, kehadiran siswa, dan catatan refleksi
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          Tulis Jurnal Baru
        </button>
      </div>

      {/* Filter and Actions Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-600 shrink-0">Filter Kelas:</span>
          <select
            value={selectedFilterKelasId}
            onChange={(e) => setSelectedFilterKelasId(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">
              {currentUser?.role === 'GURU' ? 'Semua Kelas Diampu' : 'Semua Kelas'}
            </option>
            {availableClasses.map((k) => (
              <option key={k.id} value={k.id}>
                Kelas {k.nama} (Tingkat {k.tingkat})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kartu</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabel Kolom</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            {filteredJurnal.length} Catatan
          </div>
        </div>
      </div>

      {/* Jurnal View: Table or Cards */}
      {filteredJurnal.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
          Belum ada catatan jurnal mengajar untuk kelas ini. Klik tombol "Tulis Jurnal Baru" untuk menambahkan.
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-3 text-center w-10">No</th>
                  <th className="py-3.5 px-3 min-w-[120px]">Tgl & Jam</th>
                  <th className="py-3.5 px-3 w-20">Kelas</th>
                  <th className="py-3.5 px-3 min-w-[220px]">Materi & Kegiatan</th>
                  <th className="py-3.5 px-3 text-center min-w-[90px]">Presensi</th>
                  <th className="py-3.5 px-3 min-w-[180px] bg-amber-50/60 text-amber-900 border-x border-amber-100">
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Hambatan</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-3 min-w-[180px] bg-emerald-50/60 text-emerald-900 border-r border-emerald-100">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tindak Lanjut</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-3 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJurnal.map((j, idx) => (
                  <tr key={j.id} className="hover:bg-slate-50/60 transition-colors align-top">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">{j.tanggal}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{j.jamKe}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        {j.kelasNama}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-extrabold text-slate-800 text-xs mb-1">{j.materiJudul}</div>
                      <div className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">{j.kegiatan}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[11px] font-semibold text-slate-700">
                        H: <strong className="text-emerald-700">{j.jumlahHadir}</strong>
                        <br />
                        T: <strong className="text-rose-600">{j.jumlahTidakHadir}</strong>
                      </span>
                    </td>
                    <td className="py-3 px-3 bg-amber-50/20 border-x border-amber-100/60">
                      {j.hambatan ? (
                        <p className="text-[11px] text-amber-950 leading-relaxed font-medium">
                          {j.hambatan}
                        </p>
                      ) : (
                        <span className="text-slate-300 italic text-[11px]">- Tidak ada kendala -</span>
                      )}
                    </td>
                    <td className="py-3 px-3 bg-emerald-50/20 border-r border-emerald-100/60">
                      {j.tindakLanjut ? (
                        <p className="text-[11px] text-emerald-950 leading-relaxed font-medium">
                          {j.tindakLanjut}
                        </p>
                      ) : (
                        <span className="text-slate-300 italic text-[11px]">- Belum ada tindak lanjut -</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(j)}
                          className="p-1 text-slate-400 hover:text-sky-600 rounded-md hover:bg-sky-50"
                          title="Edit Jurnal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(j.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                          title="Hapus Jurnal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="space-y-4">
          {filteredJurnal.map((j) => (
            <div
              key={j.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black text-xs">
                    {j.kelasNama}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">{j.materiJudul}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Calendar className="w-3.5 h-3.5" /> {j.tanggal}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Jam: {j.jamKe}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg">
                    Hadir: <strong className="text-emerald-700">{j.jumlahHadir}</strong> • Tidak:{' '}
                    <strong className="text-rose-600">{j.jumlahTidakHadir}</strong>
                  </span>
                  <button
                    onClick={() => handleOpenEdit(j)}
                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(j.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-xs space-y-3 text-slate-700">
                <div>
                  <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider mb-0.5">
                    Kegiatan Pembelajaran:
                  </span>
                  <p className="leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    {j.kegiatan}
                  </p>
                </div>

                {/* Hambatan & Tindak Lanjut Kolom Baru */}
                {(j.hambatan || j.tindakLanjut) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {j.hambatan && (
                      <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] uppercase tracking-wider">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Hambatan / Kendala:</span>
                        </div>
                        <p className="text-amber-950 text-xs leading-relaxed font-medium">
                          {j.hambatan}
                        </p>
                      </div>
                    )}
                    {j.tindakLanjut && (
                      <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px] uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Tindak Lanjut / Solusi:</span>
                        </div>
                        <p className="text-emerald-950 text-xs leading-relaxed font-medium">
                          {j.tindakLanjut}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {j.catatanKhusus && (
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider mb-0.5">
                      Catatan Refleksi & Evaluasi:
                    </span>
                    <p className="leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 text-slate-700">
                      {j.catatanKhusus}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-800 mb-4">
              {editingJurnal ? 'Edit Jurnal Mengajar' : 'Tulis Jurnal Mengajar Baru'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal || ''}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Jam Ke</label>
                  <input
                    type="text"
                    required
                    value={formData.jamKe || ''}
                    onChange={(e) => setFormData({ ...formData, jamKe: e.target.value })}
                    placeholder="1 - 3 (07.15 - 09.30 WIB)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Kelas</label>
                  <select
                    value={formData.kelasId || 'cls-xi-1'}
                    onChange={(e) => setFormData({ ...formData, kelasId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    {availableClasses.map((k) => (
                      <option key={k.id} value={k.id}>
                        Kelas {k.nama} (Tingkat {k.tingkat})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Jumlah Siswa Hadir
                  </label>
                  <input
                    type="number"
                    value={formData.jumlahHadir || 32}
                    onChange={(e) =>
                      setFormData({ ...formData, jumlahHadir: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Materi yang Diajarkan
                </label>
                <input
                  type="text"
                  required
                  value={formData.materiJudul || ''}
                  onChange={(e) => setFormData({ ...formData, materiJudul: e.target.value })}
                  placeholder="Permainan Bola Voli - Passing Bawah dan Atas"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Kegiatan Pembelajaran (Apersepsi, Inti, Penutup)
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.kegiatan || ''}
                  onChange={(e) => setFormData({ ...formData, kegiatan: e.target.value })}
                  placeholder="Uraian langkah kegiatan di lapangan, metode, dan media..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Kolom Hambatan & Tindak Lanjut */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-amber-900 uppercase text-xs mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Hambatan / Kendala
                  </label>
                  <textarea
                    rows={2}
                    value={formData.hambatan || ''}
                    onChange={(e) => setFormData({ ...formData, hambatan: e.target.value })}
                    placeholder="Kendala sarana, cuaca, atau kesulitan siswa..."
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-900 uppercase text-xs mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Tindak Lanjut / Solusi
                  </label>
                  <textarea
                    rows={2}
                    value={formData.tindakLanjut || ''}
                    onChange={(e) => setFormData({ ...formData, tindakLanjut: e.target.value })}
                    placeholder="Solusi, pendampingan, modifikasi materi/alat..."
                    className="w-full px-3 py-2 bg-emerald-50/40 border border-emerald-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Catatan Khusus / Refleksi
                </label>
                <textarea
                  rows={2}
                  value={formData.catatanKhusus || ''}
                  onChange={(e) => setFormData({ ...formData, catatanKhusus: e.target.value })}
                  placeholder="Kendala sarana, catatan siswa berbakat, atau evaluasi gerak..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Simpan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
