import React, { useState, useMemo } from 'react';
import {
  Users2,
  Heart,
  Star,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Info,
  ChevronRight,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { User, PenilaianTemanSejawat, getTeacherAssignedClasses } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface PenilaianTemanSejawatManagerProps {
  db: LMSDatabase;
  currentUser: User;
}

export const PenilaianTemanSejawatManager: React.FC<PenilaianTemanSejawatManagerProps> = ({
  db,
  currentUser,
}) => {
  const availableClasses = useMemo(() => {
    if (currentUser.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas;
    }
    return db.kelas;
  }, [currentUser, db.kelas]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    return availableClasses.length > 0 ? availableClasses[0].id : 'cls-xi-1';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formPenilaiId, setFormPenilaiId] = useState('');
  const [formTargetMuridId, setFormTargetMuridId] = useState('');
  const [formKegiatan, setFormKegiatan] = useState('Praktik Permainan Beregu Bola Voli');
  const [formKerjaSama, setFormKerjaSama] = useState(5);
  const [formSportivitas, setFormSportivitas] = useState(5);
  const [formKomunikasi, setFormKomunikasi] = useState(5);
  const [formTanggungJawab, setFormTanggungJawab] = useState(5);
  const [formCatatanPositif, setFormCatatanPositif] = useState('');
  const [formCatatanPerbaikan, setFormCatatanPerbaikan] = useState('');

  const currentKelas = useMemo(() => {
    return (db.kelas || []).find((k) => k.id === selectedKelasId);
  }, [db.kelas, selectedKelasId]);

  const studentsInClass = useMemo(() => {
    return (db.users || [])
      .filter((u) => u.role === 'MURID' && u.kelasId === selectedKelasId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [db.users, selectedKelasId]);

  // Peer records for selected class
  const classPeerRecords = useMemo(() => {
    return (db.penilaianTemanSejawat || [])
      .filter((r) => r.kelasId === selectedKelasId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [db.penilaianTemanSejawat, selectedKelasId]);

  // Aggregated score per target student
  const peerStatsByStudent = useMemo(() => {
    const map = new Map<
      string,
      { count: number; totalScore: number; comments: string[] }
    >();

    classPeerRecords.forEach((r) => {
      const existing = map.get(r.targetMuridId) || { count: 0, totalScore: 0, comments: [] };
      const avgThis =
        r.rataRata || (r.skorKerjaSama + r.skorSportivitas + r.skorKomunikasi + r.skorTanggungJawab) / 4;
      existing.count += 1;
      existing.totalScore += avgThis;
      if (r.catatanPositif) existing.comments.push(r.catatanPositif);
      map.set(r.targetMuridId, existing);
    });

    return map;
  }, [classPeerRecords]);

  // Open modal with defaults
  const handleOpenAddModal = () => {
    if (studentsInClass.length >= 2) {
      setFormPenilaiId(studentsInClass[0].id);
      setFormTargetMuridId(studentsInClass[1].id);
    } else if (studentsInClass.length === 1) {
      setFormPenilaiId(studentsInClass[0].id);
      setFormTargetMuridId(studentsInClass[0].id);
    }
    setFormKerjaSama(5);
    setFormSportivitas(5);
    setFormKomunikasi(5);
    setFormTanggungJawab(5);
    setFormCatatanPositif('Selalu kompak, mau bekerja sama dalam tim, dan sportif.');
    setFormCatatanPerbaikan('');
    setIsModalOpen(true);
  };

  // Submit peer review
  const handleSavePeerReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPenilaiId || !formTargetMuridId) return;
    if (formPenilaiId === formTargetMuridId) {
      alert('Penilai dan murid yang dinilai tidak boleh siswa yang sama!');
      return;
    }

    const penilaiUser = studentsInClass.find((s) => s.id === formPenilaiId);
    const targetUser = studentsInClass.find((s) => s.id === formTargetMuridId);
    if (!penilaiUser || !targetUser) return;

    const avg = (formKerjaSama + formSportivitas + formKomunikasi + formTanggungJawab) / 4;

    const newRecord: PenilaianTemanSejawat = {
      id: `pts-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      penilaiId: penilaiUser.id,
      penilaiNama: penilaiUser.name,
      targetMuridId: targetUser.id,
      targetMuridNama: targetUser.name,
      targetNis: targetUser.nis,
      kelasId: selectedKelasId,
      kelasNama: currentKelas?.nama || selectedKelasId,
      tanggal: new Date().toISOString().slice(0, 10),
      kegiatanPraktik: formKegiatan.trim() || 'Praktik PJOK Bersama',
      skorKerjaSama: formKerjaSama,
      skorSportivitas: formSportivitas,
      skorKomunikasi: formKomunikasi,
      skorTanggungJawab: formTanggungJawab,
      rataRata: Number(avg.toFixed(2)),
      catatanPositif: formCatatanPositif.trim(),
      catatanPerbaikan: formCatatanPerbaikan.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    dataStorage.updateDatabase((prev) => ({
      ...prev,
      penilaianTemanSejawat: [newRecord, ...(prev.penilaianTemanSejawat || [])],
    }));

    setIsModalOpen(false);
  };

  // Delete peer review
  const handleDeletePeerReview = (id: string) => {
    if (!window.confirm('Hapus rekaman penilaian teman sejawat ini?')) return;
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      penilaianTemanSejawat: (prev.penilaianTemanSejawat || []).filter((r) => r.id !== id),
    }));
  };

  const filteredRecords = useMemo(() => {
    return classPeerRecords.filter((r) => {
      const q = searchQuery.toLowerCase();
      return (
        r.targetMuridNama.toLowerCase().includes(q) ||
        r.penilaiNama.toLowerCase().includes(q) ||
        (r.targetNis && r.targetNis.includes(q))
      );
    });
  }, [classPeerRecords, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                <Users2 className="w-3.5 h-3.5 text-indigo-600" /> Kolaborasi & Asesmen Antarteman
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Kurikulum Merdeka</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Penilaian Teman Sejawat
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-3xl mt-1">
              Fasilitasi asesmen autentik antar peserta didik untuk mengamati kerja sama tim, sportivitas permainan, komunikasi positif, dan tanggung jawab selama kegiatan praktik olahraga.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Input Penilaian Antarteman</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden shrink-0"
            >
              {availableClasses.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>

            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama penilai atau yang dinilai..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Total {classPeerRecords.length} Penilaian Terekam di Kelas {currentKelas?.nama}
          </div>
        </div>
      </div>

      {/* Rangkuman Rata-rata Skor Teman Per Siswa */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          Rangkuman Penilaian Rekan Sejawat per Siswa
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {studentsInClass.map((s) => {
            const stat = peerStatsByStudent.get(s.id);
            const avg = stat && stat.count > 0 ? (stat.totalScore / stat.count).toFixed(1) : '-';

            return (
              <div
                key={s.id}
                className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <h3 className="text-xs font-extrabold text-slate-900 truncate">{s.name}</h3>
                  <p className="text-[11px] text-slate-400">
                    Dinilai oleh {stat?.count || 0} rekan
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black ${
                      stat && stat.count > 0
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-slate-200/60 text-slate-500'
                    }`}
                  >
                    ★ {avg}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log Feed Penilaian Teman Sejawat */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Riwayat Lembar Penilaian Teman ({filteredRecords.length})</span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-sm">Belum ada lembar penilaian teman di kelas ini</p>
            <p className="text-xs">
              Klik &quot;+ Input Penilaian Antarteman&quot; untuk mencatat observasi penilaian sesama siswa.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRecords.map((rec) => (
              <div
                key={rec.id}
                className="p-4 sm:p-6 hover:bg-slate-50/60 transition-colors space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      Penilai: {rec.penilaiNama}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">menilai</span>
                    <span className="text-xs font-extrabold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                      {rec.targetMuridNama}
                    </span>
                    <span className="text-[11px] text-slate-400">• {rec.kegiatanPraktik}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-black">
                      Rata-rata: {rec.rataRata?.toFixed(1) || '5.0'} / 5.0
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeletePeerReview(rec.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus penilaian ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Score Pills */}
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                    Kerja Sama: <strong>{rec.skorKerjaSama}/5</strong>
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                    Sportivitas: <strong>{rec.skorSportivitas}/5</strong>
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                    Komunikasi: <strong>{rec.skorKomunikasi}/5</strong>
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                    Tanggung Jawab: <strong>{rec.skorTanggungJawab}/5</strong>
                  </span>
                </div>

                {/* Feedback Comment */}
                {rec.catatanPositif && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed italic">
                    &quot;{rec.catatanPositif}&quot;
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Input Penilaian Teman Sejawat */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Formulir Penilaian Antarteman
                </span>
                <h2 className="text-lg font-black text-slate-900">Input Penilaian Teman Sejawat</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 font-bold flex items-center justify-center cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePeerReview} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Siswa Penilai (Yang Mengamati)
                  </label>
                  <select
                    value={formPenilaiId}
                    onChange={(e) => setFormPenilaiId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden"
                  >
                    {studentsInClass.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Murid Yang Dinilai (Target)
                  </label>
                  <select
                    value={formTargetMuridId}
                    onChange={(e) => setFormTargetMuridId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden"
                  >
                    {studentsInClass.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kegiatan Praktik PJOK
                </label>
                <input
                  type="text"
                  value={formKegiatan}
                  onChange={(e) => setFormKegiatan(e.target.value)}
                  placeholder="Misal: Permainan Bola Voli Beregu..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* 4 Dimension Rating Selectors (1-5) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-800">1. Kerja Sama dalam Tim:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormKerjaSama(val)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          formKerjaSama === val
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-800">2. Sportivitas & Fair Play:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormSportivitas(val)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          formSportivitas === val
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-800">3. Komunikasi Saling Mendukung:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormKomunikasi(val)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          formKomunikasi === val
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-800">4. Tanggung Jawab dalam Peran:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormTanggungJawab(val)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          formTanggungJawab === val
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Catatan Positif */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kesan Positif / Apresiasi untuk Teman
                </label>
                <textarea
                  rows={2}
                  value={formCatatanPositif}
                  onChange={(e) => setFormCatatanPositif(e.target.value)}
                  placeholder="Misal: Sangat lincah saat bertahan dan selalu menyemangati tim..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/80 -mx-6 -mb-6 mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Simpan Penilaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
