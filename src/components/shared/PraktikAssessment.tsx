import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  Award,
  CheckCircle2,
  Save,
  Search,
  Users,
  Sparkles,
  CheckSquare,
  Square,
  Filter,
  UserCheck,
  ChevronRight,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  Layers,
  Plus,
  Table as TableIcon,
  X,
  Check,
  Download,
  BookOpen,
  Trash2,
  SlidersHorizontal,
  Edit3,
  ArrowUpFromLine,
  ArrowDownToLine,
} from 'lucide-react';
import { PenilaianPraktik, RubrikPraktik, User, IndikatorPraktik, getTeacherAssignedClasses } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import {
  IndikatorTemplate,
  getSuggestedIndicatorsForMateri,
  calculateIndikatorScore,
  SKALA_INDIKATOR_INFO,
  MASTER_INDIKATOR_LIBRARY,
  DEFAULT_STANDAR_INDIKATOR,
} from '../../utils/praktikIndicators';

interface PraktikAssessmentProps {
  db: LMSDatabase;
  currentUser: User;
}

const DEFAULT_MATERI_LIST = [
  'Permainan Bola Voli - Passing Bawah & Atas',
  'Permainan Sepak Bola - Dribbling & Passing',
  'Bulutangkis - Servis Pendek & Smash',
  'Senam Lantai - Roll Depan & Belakang',
  'Kebugaran Jasmani - Tes MFT & Push Up',
  'Atletik - Lari Cepat & Estafet',
  'Bola Basket - Chest Pass & Dribble',
  'Renang - Gaya Dada & Bebas',
  'Pencak Silat - Jurus Dasar & Kuda-kuda',
];

export const PraktikAssessment: React.FC<PraktikAssessmentProps> = ({ db, currentUser }) => {
  const availableClasses = useMemo(() => {
    if (currentUser.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas;
    }
    return db.kelas;
  }, [currentUser, db.kelas]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    if (availableClasses.length > 0) {
      return availableClasses[0].id;
    }
    return db.kelas.length > 0 ? db.kelas[0].id : 'cls-xi-1';
  });

  useEffect(() => {
    if (availableClasses.length > 0 && !availableClasses.some((k) => k.id === selectedKelasId)) {
      setSelectedKelasId(availableClasses[0].id);
      setSelectedMuridIds([]);
    }
  }, [availableClasses, selectedKelasId]);
  const [selectedMateriJudul, setSelectedMateriJudul] = useState<string>(
    'Permainan Bola Voli - Passing Bawah & Atas'
  );
  const [searchMurid, setSearchMurid] = useState<string>('');
  const [mainViewMode, setMainViewMode] = useState<'rubrik' | 'matriks'>('rubrik');

  // Multi student selection (can select more than 1 student)
  const [selectedMuridIds, setSelectedMuridIds] = useState<string[]>([]);

  // Active Indicators for the selected material
  const [activeIndicators, setActiveIndicators] = useState<IndikatorTemplate[]>(() => {
    return getSuggestedIndicatorsForMateri('Permainan Bola Voli - Passing Bawah & Atas');
  });

  // Modal Add New Materi
  const [showAddMateriModal, setShowAddMateriModal] = useState<boolean>(false);
  const [newMateriName, setNewMateriName] = useState<string>('');

  // Modal Manage / Add Indicators
  const [showIndikatorModal, setShowIndikatorModal] = useState<boolean>(false);
  const [customIndikatorNama, setCustomIndikatorNama] = useState<string>('');
  const [customIndikatorDesc, setCustomIndikatorDesc] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState<boolean>(false);

  const handlePushNilaiToSheets = async () => {
    setSyncLoading(true);
    setToastMessage(null);
    try {
      const res = await dataStorage.syncNilaiToLinkedSpreadsheet();
      if (res.success) {
        setToastMessage('Seluruh rekap nilai praktik berhasil dikirim dan tersimpan di Google Spreadsheet (Sheet NILAI)!');
      } else {
        setToastMessage(res.message || 'Gagal mengirim nilai ke Spreadsheet. Pastikan URL Webhook telah diisi di menu Integrasi Google Sheets.');
      }
    } catch (e: any) {
      setToastMessage('Gagal menyinkronkan nilai ke Spreadsheet: ' + (e?.message || ''));
    } finally {
      setSyncLoading(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handlePullNilaiFromSheets = async () => {
    setSyncLoading(true);
    setToastMessage(null);
    try {
      const res = await dataStorage.pullFromLinkedSpreadsheet();
      if (res.success) {
        setToastMessage(`Berhasil menarik data nilai dan materi dari Google Spreadsheet! (${res.nilaiCount ?? 0} nilai & ${res.materiCount ?? 0} materi diperbarui)`);
      } else {
        setToastMessage(res.message || 'Gagal menarik nilai dari Spreadsheet.');
      }
    } catch (e: any) {
      setToastMessage('Gagal menarik nilai dari Spreadsheet: ' + (e?.message || ''));
    } finally {
      setSyncLoading(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  // Local state for scores keyed by `${materiJudul}_${muridId}`
  // Contains score per indicatorId and notes
  const [muridAssessments, setMuridAssessments] = useState<
    Record<string, { scores: Record<string, number>; catatan: string }>
  >({});

  // When selectedMateriJudul changes, adjust suggested indicators if user hasn't heavily customized
  useEffect(() => {
    const suggested = getSuggestedIndicatorsForMateri(selectedMateriJudul);
    setActiveIndicators(suggested);
  }, [selectedMateriJudul]);

  // Dynamic list of available practical materials
  const availableMateriList = useMemo(() => {
    const fromStorage = db.materiPraktikList || [];
    const fromLMSMateri = (db.materi || []).map((m) => m.judul);
    const existingAssessments = (db.penilaianPraktik || []).map(
      (p) => p.materiJudul || p.materi || ''
    );
    const combined = Array.from(
      new Set([...fromStorage, ...DEFAULT_MATERI_LIST, ...fromLMSMateri, ...existingAssessments])
    ).filter(Boolean);
    return combined;
  }, [db.materiPraktikList, db.materi, db.penilaianPraktik]);

  // Students in selected class
  const muridInKelas = useMemo(() => {
    const targetId = (selectedKelasId || '').toLowerCase().trim();
    const targetKelasObj = (db.kelas || []).find((k) => k.id === selectedKelasId);
    const targetNama = (targetKelasObj?.nama || '').toLowerCase().trim();

    return (db.users || []).filter((u) => {
      if (u.role !== 'MURID') return false;
      const uKelas = (u.kelasId || '').toLowerCase().trim();
      return uKelas === targetId || (targetNama && uKelas === targetNama);
    });
  }, [db.users, selectedKelasId, db.kelas]);

  // Filtered searched students
  const searchedMurid = useMemo(() => {
    if (!searchMurid.trim()) return muridInKelas;
    const q = searchMurid.toLowerCase();
    return muridInKelas.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.nis && m.nis.includes(q))
    );
  }, [muridInKelas, searchMurid]);

  // On first load or class change, initialize selection with first 4 students if none selected
  useEffect(() => {
    if (selectedMuridIds.length === 0 && muridInKelas.length > 0) {
      // Auto-select first 4 students to immediately give a productive view
      setSelectedMuridIds(muridInKelas.slice(0, 4).map((m) => m.id));
    }
  }, [selectedKelasId, muridInKelas]);

  // Get or compute assessment data for a student on current material
  const getMuridAssessment = (muridId: string) => {
    const cacheKey = `${selectedMateriJudul}_${muridId}`;
    if (muridAssessments[cacheKey]) {
      return muridAssessments[cacheKey];
    }

    // Check if existing saved assessment exists in database
    const existing = (db.penilaianPraktik || []).find(
      (p) =>
        p.muridId === muridId &&
        ((p.materiJudul || p.materi || '').trim().toLowerCase() ===
          selectedMateriJudul.trim().toLowerCase())
    );

    const initialScores: Record<string, number> = {};

    if (existing) {
      if (existing.indikatorPenilaian && existing.indikatorPenilaian.length > 0) {
        existing.indikatorPenilaian.forEach((ind) => {
          initialScores[ind.id] = ind.skor ?? 3;
        });
      } else if (existing.rubrik) {
        // Fallback map standard rubrik
        activeIndicators.forEach((ind, i) => {
          const rubricKeys: (keyof RubrikPraktik)[] = [
            'sikapAwal',
            'pelaksanaanTeknik',
            'hasilGerakan',
            'sikapAkhir',
            'sportivitas',
            'kerjaSama',
          ];
          const key = rubricKeys[i % rubricKeys.length];
          initialScores[ind.id] = (existing.rubrik as any)?.[key] ?? 3;
        });
      }

      // Ensure all active indicators have at least a default score of 3
      activeIndicators.forEach((ind) => {
        if (!initialScores[ind.id]) initialScores[ind.id] = 3;
      });

      return {
        scores: initialScores,
        catatan: existing.catatanEvaluasi || existing.catatanGuru || '',
      };
    }

    // Default: all active indicators get 3 (Baik)
    activeIndicators.forEach((ind) => {
      initialScores[ind.id] = 3;
    });

    return {
      scores: initialScores,
      catatan: 'Penguasaan teknik gerakan sudah baik, pertahankan konsistensi latihan.',
    };
  };

  // Helper to get array of IndikatorPraktik for a student
  const getStudentIndikatorList = (muridId: string): IndikatorPraktik[] => {
    const assessment = getMuridAssessment(muridId);
    return activeIndicators.map((tmpl) => ({
      id: tmpl.id,
      nama: tmpl.nama,
      deskripsi: tmpl.deskripsi,
      skor: assessment.scores[tmpl.id] ?? 3,
    }));
  };

  // Handle single indicator score change for a specific student
  const handleScoreChange = (muridId: string, indikatorId: string, score: number) => {
    const current = getMuridAssessment(muridId);
    const cacheKey = `${selectedMateriJudul}_${muridId}`;

    setMuridAssessments((prev) => ({
      ...prev,
      [cacheKey]: {
        ...current,
        scores: {
          ...current.scores,
          [indikatorId]: score,
        },
      },
    }));
  };

  // Handle student feedback note change
  const handleCatatanChange = (muridId: string, catatan: string) => {
    const current = getMuridAssessment(muridId);
    const cacheKey = `${selectedMateriJudul}_${muridId}`;

    setMuridAssessments((prev) => ({
      ...prev,
      [cacheKey]: {
        ...current,
        catatan,
      },
    }));
  };

  // Toggle student selection
  const toggleSelectMurid = (id: string) => {
    setSelectedMuridIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const selectAllStudents = () => {
    setSelectedMuridIds(muridInKelas.map((m) => m.id));
  };

  const clearSelection = () => {
    setSelectedMuridIds([]);
  };

  const selectSmallGroup = (groupSize: number = 4) => {
    const unassessed = muridInKelas.filter((m) => {
      return !(db.penilaianPraktik || []).some(
        (p) =>
          p.muridId === m.id &&
          (p.materiJudul || p.materi || '').trim().toLowerCase() ===
            selectedMateriJudul.trim().toLowerCase()
      );
    });
    const targetPool = unassessed.length >= groupSize ? unassessed : muridInKelas;
    const slice = targetPool.slice(0, groupSize).map((m) => m.id);
    setSelectedMuridIds(slice);
  };

  // Copy one student's scores to all other selected students
  const applyStudentScoresToAll = (sourceMuridId: string) => {
    if (selectedMuridIds.length <= 1) {
      alert('Pilih lebih dari 1 murid terlebih dahulu untuk menyalin nilai.');
      return;
    }
    const sourceAssessment = getMuridAssessment(sourceMuridId);
    const updated = { ...muridAssessments };

    selectedMuridIds.forEach((id) => {
      if (id !== sourceMuridId) {
        const cacheKey = `${selectedMateriJudul}_${id}`;
        updated[cacheKey] = {
          scores: { ...sourceAssessment.scores },
          catatan: sourceAssessment.catatan,
        };
      }
    });

    setMuridAssessments(updated);
    setToastMessage(
      `Nilai berhasil disalin ke seluruh ${selectedMuridIds.length} murid terpilih!`
    );
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Quick batch score for all selected students
  const handleQuickBatchScore = (score: number) => {
    if (selectedMuridIds.length === 0) {
      alert('Pilih minimal satu murid terlebih dahulu.');
      return;
    }

    const updated = { ...muridAssessments };
    selectedMuridIds.forEach((id) => {
      const cacheKey = `${selectedMateriJudul}_${id}`;
      const current = getMuridAssessment(id);
      const newScores: Record<string, number> = {};
      activeIndicators.forEach((ind) => {
        newScores[ind.id] = score;
      });
      updated[cacheKey] = {
        ...current,
        scores: newScores,
      };
    });

    setMuridAssessments(updated);
    setToastMessage(
      `Berhasil mengatur semua indikator menjadi ${
        score === 4 ? 'Sangat Baik (4)' : score === 3 ? 'Baik (3)' : score
      } untuk ${selectedMuridIds.length} murid!`
    );
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add custom indicator
  const handleAddCustomIndikator = (e: React.FormEvent) => {
    e.preventDefault();
    const nama = customIndikatorNama.trim();
    if (!nama) return;

    const newIndikator: IndikatorTemplate = {
      id: `ind-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nama,
      deskripsi:
        customIndikatorDesc.trim() ||
        'Menilai penguasaan teknik, ketepatan, dan konsistensi gerakan olahraga.',
    };

    setActiveIndicators((prev) => [...prev, newIndikator]);
    setCustomIndikatorNama('');
    setCustomIndikatorDesc('');
    setToastMessage(`Indikator baru "${nama}" berhasil ditambahkan!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Remove an active indicator
  const handleRemoveIndikator = (indId: string) => {
    if (activeIndicators.length <= 1) {
      alert('Penilaian praktik membutuhkan minimal 1 indikator penilaian.');
      return;
    }
    setActiveIndicators((prev) => prev.filter((i) => i.id !== indId));
  };

  // Add new materi
  const handleAddNewMateriSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMateriName.trim();
    if (!trimmed) return;

    dataStorage.addMateriPraktik(trimmed);
    setSelectedMateriJudul(trimmed);
    setNewMateriName('');
    setShowAddMateriModal(false);
    setToastMessage(`Materi praktik baru "${trimmed}" berhasil ditambahkan!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Save assessments for target students AND connect directly to student accounts
  const handleSaveStudents = (targetIds: string[]) => {
    if (targetIds.length === 0) {
      alert('Silakan pilih minimal satu murid untuk disimpan penilaiannya.');
      return;
    }

    const currentKelas = (db.kelas || []).find((k) => k.id === selectedKelasId);
    const kelasNama = currentKelas?.nama || selectedKelasId;

    const newAssessments: PenilaianPraktik[] = [];

    targetIds.forEach((muridId) => {
      const muridObj = db.users.find((u) => u.id === muridId);
      if (!muridObj) return;

      const assessmentData = getMuridAssessment(muridId);
      const indikatorList = getStudentIndikatorList(muridId);
      const scoreCalc = calculateIndikatorScore(indikatorList);

      // Map back to rubrik for legacy backward compatibility
      const rubrikBackward: RubrikPraktik = {
        sikapAwal: indikatorList[0]?.skor ?? 3,
        pelaksanaanTeknik: indikatorList[1]?.skor ?? 3,
        hasilGerakan: indikatorList[2]?.skor ?? 3,
        sikapAkhir: indikatorList[3]?.skor ?? 3,
        sportivitas: indikatorList[4]?.skor ?? 4,
        kerjaSama: indikatorList[5]?.skor ?? 4,
      };

      newAssessments.push({
        id: `prk-${muridId}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        muridId: muridId,
        muridNama: muridObj.name,
        nis: muridObj.nis || muridObj.nip || '',
        kelasId: selectedKelasId,
        kelasNama: kelasNama,
        materiJudul: selectedMateriJudul,
        materi: selectedMateriJudul,
        tanggal: new Date().toISOString().slice(0, 10),
        statusPublikasi: 'Publish',
        indikatorPenilaian: indikatorList,
        rubrik: rubrikBackward,
        aspekNilai: {
          sikapAwal: (rubrikBackward.sikapAwal as any) || 3,
          teknikGerakan: (rubrikBackward.pelaksanaanTeknik as any) || 3,
          ketepatan: (rubrikBackward.hasilGerakan as any) || 3,
          koordinasi: (rubrikBackward.sikapAkhir as any) || 3,
          sportivitas: (rubrikBackward.sportivitas as any) || 4,
          kerjaSama: (rubrikBackward.kerjaSama as any) || 4,
        },
        totalSkor: scoreCalc.totalSkor,
        rataRata: scoreCalc.rataRataSkala4,
        nilaiTotal: scoreCalc.nilai100,
        nilaiAkhir: scoreCalc.nilai100,
        predikat: scoreCalc.predikat,
        catatanEvaluasi: assessmentData.catatan,
        catatanGuru: assessmentData.catatan,
        guruPenilai: currentUser.name,
        guruNama: currentUser.name,
      });
    });

    dataStorage.updateDatabase((prev) => {
      // 1. Update PenilaianPraktik list
      const filtered = (prev.penilaianPraktik || []).filter(
        (p) =>
          !(
            targetIds.includes(p.muridId) &&
            ((p.materiJudul || p.materi || '').trim().toLowerCase() ===
              selectedMateriJudul.trim().toLowerCase())
          )
      );

      const allCombined = [...filtered, ...newAssessments];

      // 2. CRITICAL: Connect to Student Accounts (db.nilai / RekapNilaiMurid)
      // Ensure EVERY student in targetIds has a record in db.nilai, whether newly created or updated
      const existingNilaiMap = new Map((prev.nilai || []).map((n) => [n.muridId, { ...n }]));

      targetIds.forEach((muridId) => {
        const studentObj = prev.users.find((u) => u.id === muridId);
        const studentAssessments = allCombined.filter((p) => p.muridId === muridId);

        const avgPraktik =
          studentAssessments.length > 0
            ? Math.round(
                studentAssessments.reduce(
                  (sum, a) => sum + (a.nilaiAkhir || a.nilaiTotal || 80),
                  0
                ) / studentAssessments.length
              )
            : 80;

        let existingRecord = existingNilaiMap.get(muridId);

        if (!existingRecord) {
          // If student didn't exist in db.nilai, create their report card record now!
          const tugas = 85;
          const quiz = 80;
          const sikap = 90;
          const pengetahuan = Math.round((tugas + quiz) / 2);
          const keterampilan = avgPraktik;
          const nilaiAkhir = Math.round(pengetahuan * 0.3 + keterampilan * 0.5 + sikap * 0.2);
          const predikat = (calculateIndikatorScore([]).predikat || 'B') as any;

          existingRecord = {
            id: `nil-${muridId}`,
            muridId: muridId,
            muridNama: studentObj?.name || 'Murid PJOK',
            nis: studentObj?.nis || studentObj?.nip || '',
            kelasId: selectedKelasId,
            kelasNama: kelasNama,
            semester: '1 (Ganjil)',
            tugas,
            quiz,
            praktik: avgPraktik,
            pengetahuan,
            keterampilan,
            sikap,
            nilaiAkhir,
            predikat,
          };
        } else {
          // Update existing record
          const tugas = existingRecord.tugas || 85;
          const quiz = existingRecord.quiz || 80;
          const sikap = existingRecord.sikap || 90;
          const pengetahuan = Math.round((tugas + quiz) / 2);
          const keterampilan = avgPraktik;
          const nilaiAkhir = Math.round(pengetahuan * 0.3 + keterampilan * 0.5 + sikap * 0.2);
          const pred =
            nilaiAkhir >= 88 ? 'A' : nilaiAkhir >= 78 ? 'B' : nilaiAkhir >= 65 ? 'C' : 'D';

          existingRecord.praktik = avgPraktik;
          existingRecord.keterampilan = keterampilan;
          existingRecord.nilaiAkhir = nilaiAkhir;
          existingRecord.predikat = pred as any;
        }

        existingNilaiMap.set(muridId, existingRecord);
      });

      return {
        ...prev,
        penilaianPraktik: allCombined,
        nilai: Array.from(existingNilaiMap.values()),
      };
    });

    setToastMessage(
      db.settings?.spreadsheetWebhookUrl
        ? `Berhasil menyimpan penilaian ${newAssessments.length} murid! Nilai otomatis tersinkronisasi ke Google Spreadsheet & Akun Murid.`
        : `Berhasil menyimpan penilaian untuk ${newAssessments.length} murid! Nilai telah langsung terhubung ke Akun Murid.`
    );
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Distinct materials that actually have scores in this class (for Matrix View)
  const assessedMaterialsInClass = useMemo(() => {
    const classStudentIds = muridInKelas.map((m) => m.id);
    const setMateri = new Set<string>();
    (db.penilaianPraktik || []).forEach((p) => {
      if (classStudentIds.includes(p.muridId)) {
        const mTitle = p.materiJudul || p.materi;
        if (mTitle) setMateri.add(mTitle);
      }
    });
    setMateri.add(selectedMateriJudul);
    return Array.from(setMateri);
  }, [muridInKelas, db.penilaianPraktik, selectedMateriJudul]);

  // Export Matrix to CSV
  const handleExportMatrixCSV = () => {
    const headers = [
      'No',
      'NIS',
      'Nama Siswa',
      'Kelas',
      ...assessedMaterialsInClass.map((m) => `"${m.replace(/"/g, '""')}"`),
      'Rata-rata Praktik',
      'Predikat',
    ];

    const rows = muridInKelas.map((m, idx) => {
      const studentAll = (db.penilaianPraktik || []).filter((p) => p.muridId === m.id);
      let totalScore = 0;
      let count = 0;

      const scores = assessedMaterialsInClass.map((mat) => {
        const found = studentAll.find(
          (p) =>
            (p.materiJudul || p.materi || '').trim().toLowerCase() === mat.trim().toLowerCase()
        );
        if (found) {
          const sc = found.nilaiAkhir || found.nilaiTotal || 0;
          totalScore += sc;
          count++;
          return sc;
        }
        return '-';
      });

      const avg = count > 0 ? Math.round(totalScore / count) : 0;
      const pred =
        avg >= 88 ? 'A' : avg >= 78 ? 'B' : avg >= 65 ? 'C' : avg > 0 ? 'D' : '-';

      return [
        idx + 1,
        m.nis || '-',
        `"${m.name.replace(/"/g, '""')}"`,
        `"${db.kelas.find((k) => k.id === selectedKelasId)?.nama || selectedKelasId}"`,
        ...scores,
        avg || '-',
        pred,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Rekap_Nilai_Praktik_${selectedKelasId}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedStudents = muridInKelas.filter((m) => selectedMuridIds.includes(m.id));

  return (
    <div className="space-y-6 pb-24 sm:pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in fade-in slide-in-from-top-3">
          <div className="p-4 rounded-2xl shadow-2xl bg-emerald-600 text-white flex items-center gap-3 text-xs font-bold ring-2 ring-white/20">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-200" />
            <span className="flex-1">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Banner & Control Deck */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-950 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-md text-teal-200">
              <Activity className="w-3.5 h-3.5" />
              <span>Instrumen Penilaian Praktik PJOK • Multi-Murid & Multi-Indikator</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
              Penilaian Praktik & Rubrik Kompetensi
            </h2>
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
              Pilih kelas, pilih satu atau lebih murid, pilih materi, lalu kelola indikator penilaian.
              Semua indikator akan tampil langsung di bawah nama setiap murid yang dipilih dan otomatis terhubung ke akun murid.
            </p>
          </div>

          {/* View Mode Switch & Sheets Sync */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Quick Sheets Sync Buttons */}
            <button
              type="button"
              onClick={handlePullNilaiFromSheets}
              disabled={syncLoading}
              title="Tarik nilai praktik terbaru dari Google Spreadsheet"
              className="px-3 py-2 rounded-xl text-xs font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/30 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <ArrowDownToLine className={`w-3.5 h-3.5 text-sky-300 ${syncLoading ? 'animate-bounce' : ''}`} />
              <span>Tarik dari Sheets</span>
            </button>

            <button
              type="button"
              onClick={handlePushNilaiToSheets}
              disabled={syncLoading}
              title="Kirim seluruh nilai praktik ke lembar kerja NILAI di Google Spreadsheet"
              className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <ArrowUpFromLine className={`w-3.5 h-3.5 text-emerald-300 ${syncLoading ? 'animate-bounce' : ''}`} />
              <span>Kirim ke Sheets</span>
            </button>

            <div className="bg-white/10 p-1 rounded-xl flex items-center gap-1 border border-white/15">
              <button
                type="button"
                onClick={() => setMainViewMode('rubrik')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  mainViewMode === 'rubrik'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-teal-200 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Formulir Penilaian</span>
              </button>
              <button
                type="button"
                onClick={() => setMainViewMode('matriks')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  mainViewMode === 'matriks'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-teal-200 hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Rekap Matriks Kelas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters & Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 mt-5 pt-4 border-t border-white/15">
          {/* 1. Pilih Kelas */}
          <div className="md:col-span-3">
            <label className="text-[11px] font-extrabold text-teal-200 block mb-1">
              1. Pilih Kelas ({availableClasses.length} {currentUser.role === 'GURU' ? 'Kelas Diampu' : 'Kelas Aktif'})
            </label>
            <select
              value={selectedKelasId}
              onChange={(e) => {
                setSelectedKelasId(e.target.value);
                setSelectedMuridIds([]);
              }}
              className="w-full bg-slate-900/90 border border-teal-500/30 text-white rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-400 cursor-pointer"
            >
              {availableClasses.map((k) => (
                <option key={k.id} value={k.id} className="bg-slate-900 text-white font-medium">
                  Kelas {k.nama} (Tingkat {k.tingkat})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Pilih Materi */}
          <div className="md:col-span-5">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-extrabold text-teal-200">
                2. Pilih Materi yang Dinilai
              </label>
              <button
                type="button"
                onClick={() => setShowAddMateriModal(true)}
                className="text-[11px] font-bold text-amber-300 hover:text-amber-200 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Materi Baru</span>
              </button>
            </div>
            <select
              value={selectedMateriJudul}
              onChange={(e) => setSelectedMateriJudul(e.target.value)}
              className="w-full bg-slate-900/90 border border-teal-500/30 text-white rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-400 cursor-pointer truncate"
            >
              {availableMateriList.map((materi) => (
                <option key={materi} value={materi} className="bg-slate-900 text-white">
                  {materi}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Tombol Tambah / Kelola Indikator */}
          <div className="md:col-span-4 flex flex-col justify-end">
            <label className="text-[11px] font-extrabold text-teal-200 block mb-1">
              3. Indikator Penilaian
            </label>
            <button
              type="button"
              onClick={() => setShowIndikatorModal(true)}
              className="w-full px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-900" />
              <span>+ Tambah Indikator ({activeIndicators.length} Dipilih)</span>
            </button>
          </div>
        </div>
      </div>

      {mainViewMode === 'rubrik' ? (
        <div className="space-y-6">
          {/* Student Selector Card with Multi-Select Checkboxes */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Pilih Nama Murid (Bisa Lebih dari 1 Murid)
                  </h3>
                  <span className="px-2.5 py-0.5 bg-teal-100 text-teal-900 font-extrabold text-[11px] rounded-full">
                    {selectedMuridIds.length} Terpilih dari {muridInKelas.length} Siswa
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Centang murid yang akan dinilai pada materi <strong className="text-teal-700">{selectedMateriJudul}</strong>.
                </p>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={selectAllStudents}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Pilih Semua</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectSmallGroup(4)}
                  className="px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Kelompok (4 Siswa)</span>
                </button>
                {selectedMuridIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-3 py-1.5 text-slate-500 hover:text-rose-600 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari murid berdasarkan nama atau NIS..."
                value={searchMurid}
                onChange={(e) => setSearchMurid(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-400"
              />
            </div>

            {/* Multi-Select Student Grid/Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {searchedMurid.length === 0 ? (
                <div className="col-span-full text-center py-6 text-slate-400 text-xs">
                  Tidak ada murid ditemukan di kelas ini.
                </div>
              ) : (
                searchedMurid.map((murid, idx) => {
                  const isChecked = selectedMuridIds.includes(murid.id);
                  const isAlreadyAssessed = (db.penilaianPraktik || []).some(
                    (p) =>
                      p.muridId === murid.id &&
                      ((p.materiJudul || p.materi || '').trim().toLowerCase() ===
                        selectedMateriJudul.trim().toLowerCase())
                  );

                  return (
                    <div
                      key={murid.id}
                      onClick={() => toggleSelectMurid(murid.id)}
                      className={`p-2.5 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isChecked
                          ? 'border-teal-500 bg-teal-50/50 shadow-xs ring-1 ring-teal-500/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-slate-400 hover:text-teal-600 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-teal-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <img
                          src={
                            murid.avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${murid.name}`
                          }
                          alt={murid.name}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 truncate block text-[11px]">
                            {idx + 1}. {murid.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            NIS: {murid.nis || '-'}
                          </span>
                        </div>
                      </div>

                      {isAlreadyAssessed && (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[9px] rounded-md shrink-0">
                          Dinilai
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Indicators Summary Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-slate-800">
                Indikator Aktif ({activeIndicators.length}):
              </span>
              {activeIndicators.map((ind, i) => (
                <span
                  key={ind.id}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200 flex items-center gap-1.5"
                >
                  <span>
                    {i + 1}. {ind.nama}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveIndikator(ind.id);
                    }}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Hapus indikator ini"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowIndikatorModal(true)}
                className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah / Pilih Indikator</span>
              </button>
            </div>
          </div>

          {/* MAIN ASSESSMENT SECTION:
              Render all selected indicators UNDERNEATH each selected student's name! */}
          {selectedMuridIds.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-xs text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">
                Belum Ada Murid yang Dipilih
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Silakan pilih atau centang satu atau beberapa nama murid pada kotak di atas.
                Semua indikator penilaian yang dipilih akan langsung ditampilkan di bawah nama masing-masing murid.
              </p>
              <button
                type="button"
                onClick={selectAllStudents}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Pilih Semua Murid Kelas Ini</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Batch Action Toolbar */}
              <div className="bg-gradient-to-r from-slate-900 to-teal-950 rounded-2xl p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-200">
                    Menampilkan Penilaian untuk:
                  </span>
                  <span className="px-2.5 py-0.5 bg-teal-500/30 text-teal-200 rounded-lg text-xs font-black">
                    {selectedStudents.length} Murid Terpilih
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-300 font-medium">Beri Nilai Cepat:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickBatchScore(4)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                  >
                    Semua Sangat Baik (4)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickBatchScore(3)}
                    className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                  >
                    Semua Baik (3)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveStudents(selectedMuridIds)}
                    className="px-4 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer ml-1"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan {selectedStudents.length} Siswa</span>
                  </button>
                </div>
              </div>

              {/* STUDENT CARDS LIST:
                  Each card displays the student's name, followed by all chosen indicators underneath! */}
              <div className="space-y-5">
                {selectedStudents.map((murid, studentIdx) => {
                  const assessmentData = getMuridAssessment(murid.id);
                  const indikatorList = getStudentIndikatorList(murid.id);
                  const scoreCalc = calculateIndikatorScore(indikatorList);

                  return (
                    <div
                      key={murid.id}
                      className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-5"
                    >
                      {/* Student Header */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50 to-slate-50 border border-teal-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              murid.avatar ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${murid.name}`
                            }
                            alt={murid.name}
                            className="w-12 h-12 rounded-2xl ring-2 ring-teal-500 bg-white object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-teal-800">
                                Murid #{studentIdx + 1}
                              </span>
                              <h3 className="text-base font-black text-slate-900">{murid.name}</h3>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              NIS: <strong className="text-slate-700">{murid.nis || '-'}</strong> •
                              Kelas:{' '}
                              <strong className="text-slate-700">
                                {db.kelas.find((k) => k.id === selectedKelasId)?.nama ||
                                  selectedKelasId}
                              </strong>{' '}
                              • Materi: <span className="font-bold text-teal-700">{selectedMateriJudul}</span>
                            </p>
                          </div>
                        </div>

                        {/* Live Score Display & Quick Apply */}
                        <div className="flex items-center gap-3 self-start sm:self-auto">
                          <div className="text-right">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                              Nilai Praktik
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-2xl font-black text-teal-700">
                                {scoreCalc.nilai100}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                                  scoreCalc.predikat === 'A'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : scoreCalc.predikat === 'B'
                                    ? 'bg-sky-100 text-sky-800'
                                    : scoreCalc.predikat === 'C'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {scoreCalc.predikatLabel}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Total Skor: {scoreCalc.totalSkor} / {scoreCalc.maxSkor} (Rata-rata:{' '}
                              {scoreCalc.rataRataSkala4}/4)
                            </span>
                          </div>

                          {selectedStudents.length > 1 && (
                            <button
                              type="button"
                              onClick={() => applyStudentScoresToAll(murid.id)}
                              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Salin nilai murid ini ke semua murid terpilih"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                              <span className="hidden md:inline">Salin ke Semua</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* INDIKATOR SECTION:
                          Render all chosen indicators directly below this student's name */}
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-teal-600" />
                            <span>Indikator Penilaian Praktik ({activeIndicators.length} Indikator):</span>
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            Pilih Skala 1 (Kurang) s/d 4 (Sangat Baik)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {activeIndicators.map((ind, indIdx) => {
                            const currentScore = assessmentData.scores[ind.id] ?? 3;

                            return (
                              <div
                                key={ind.id}
                                className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50/70 transition space-y-2.5"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                        {indIdx + 1}
                                      </span>
                                      <h5 className="text-xs sm:text-sm font-extrabold text-slate-900">
                                        {ind.nama}
                                      </h5>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1 pl-7">
                                      {ind.deskripsi}
                                    </p>
                                  </div>

                                  <div className="pl-7 sm:pl-0 shrink-0">
                                    <span
                                      className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                        currentScore === 4
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : currentScore === 3
                                          ? 'bg-sky-100 text-sky-800'
                                          : currentScore === 2
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      Skor:{' '}
                                      {currentScore === 4
                                        ? '4 (Sangat Baik)'
                                        : currentScore === 3
                                        ? '3 (Baik)'
                                        : currentScore === 2
                                        ? '2 (Cukup)'
                                        : '1 (Kurang)'}
                                    </span>
                                  </div>
                                </div>

                                {/* Clickable Scale Buttons 1, 2, 3, 4 */}
                                <div className="grid grid-cols-4 gap-2 pt-1 pl-0 sm:pl-7">
                                  {[1, 2, 3, 4].map((scale) => {
                                    const isSelected = currentScore === scale;
                                    const meta = SKALA_INDIKATOR_INFO[scale];

                                    return (
                                      <button
                                        type="button"
                                        key={scale}
                                        onClick={() =>
                                          handleScoreChange(murid.id, ind.id, scale)
                                        }
                                        className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                                          isSelected
                                            ? meta.activeBg
                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        <div className="text-sm font-black">{scale}</div>
                                        <div className="text-[10px] font-bold truncate">
                                          {meta.short}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Teacher's Individual Note */}
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 block">
                            Catatan Evaluasi Gerakan Siswa:
                          </label>
                          <input
                            type="text"
                            value={assessmentData.catatan || ''}
                            onChange={(e) => handleCatatanChange(murid.id, e.target.value)}
                            placeholder="Tuliskan catatan khusus perkembangan teknik gerakan siswa..."
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-400 bg-slate-50/50"
                          />
                        </div>
                      </div>

                      {/* Save this individual student button */}
                      <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleSaveStudents([murid.id])}
                          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan Penilaian {murid.name}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Big Save Button */}
              <div className="sticky bottom-4 z-30 p-4 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
                <div>
                  <div className="text-xs font-bold text-teal-300">
                    Siap Menyimpan & Menghubungkan ke Akun Murid
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {selectedStudents.length} murid terpilih pada materi "{selectedMateriJudul}"
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveStudents(selectedMuridIds)}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Penilaian Semua Murid Terpilih ({selectedStudents.length})</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: REKAP MATRIKS KELAS */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-800">
                Matriks Nilai Seluruh Materi Praktik Siswa
              </h3>
              <p className="text-xs text-slate-500">
                Membandingkan pencapaian nilai praktik setiap murid di berbagai cabang olahraga PJOK.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportMatrixCSV}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Rekap CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar Nilai</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-2 w-[44px] min-w-[44px] max-w-[44px] text-center sticky left-0 bg-slate-50 z-20">No</th>
                  <th className="py-3 px-3 w-[100px] min-w-[100px] max-w-[100px] sticky left-[44px] bg-slate-50 z-20">NIS</th>
                  <th className="py-3 px-4 w-[220px] min-w-[220px] max-w-[260px] sticky left-[144px] bg-slate-50 z-20 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)] border-r-2 border-slate-300">
                    Nama Siswa
                  </th>

                  {assessedMaterialsInClass.map((materi) => (
                    <th
                      key={materi}
                      className="py-3 px-3 text-center min-w-[120px] border-l border-slate-200/60"
                      title={materi}
                    >
                      <div className="font-extrabold text-slate-800 truncate max-w-[130px]">
                        {materi}
                      </div>
                      <div className="text-[9px] text-teal-600 font-medium">Praktik</div>
                    </th>
                  ))}

                  <th className="py-3 px-3 text-center min-w-[90px] bg-emerald-50 border-l border-emerald-200 font-black text-emerald-900">
                    Rata-Rata
                  </th>
                  <th className="py-3 px-3 text-center min-w-[80px] bg-slate-50 border-l border-slate-200">
                    Predikat
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {searchedMurid.map((m, idx) => {
                  const studentAll = (db.penilaianPraktik || []).filter((p) => p.muridId === m.id);
                  let sumScore = 0;
                  let count = 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-2 w-[44px] min-w-[44px] max-w-[44px] text-center text-slate-400 sticky left-0 bg-white z-10">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 w-[100px] min-w-[100px] max-w-[100px] font-mono text-slate-500 sticky left-[44px] bg-white z-10">
                        {m.nis || '-'}
                      </td>
                      <td className="py-2.5 px-4 w-[220px] min-w-[220px] max-w-[260px] font-bold text-slate-800 sticky left-[144px] bg-white z-10 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)] border-r-2 border-slate-300 truncate">
                        {m.name}
                      </td>

                      {assessedMaterialsInClass.map((mat) => {
                        const found = studentAll.find(
                          (p) =>
                            (p.materiJudul || p.materi || '').trim().toLowerCase() ===
                            mat.trim().toLowerCase()
                        );
                        if (found) {
                          const sc = found.nilaiAkhir || found.nilaiTotal || 0;
                          sumScore += sc;
                          count++;
                          return (
                            <td
                              key={mat}
                              className="py-2.5 px-3 text-center border-l border-slate-100 font-extrabold text-slate-800"
                            >
                              <span className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded-md">
                                {sc}
                              </span>
                            </td>
                          );
                        }
                        return (
                          <td
                            key={mat}
                            className="py-2.5 px-3 text-center border-l border-slate-100 text-slate-300"
                          >
                            -
                          </td>
                        );
                      })}

                      {(() => {
                        const avg = count > 0 ? Math.round(sumScore / count) : 0;
                        const pred =
                          avg >= 88 ? 'A' : avg >= 78 ? 'B' : avg >= 65 ? 'C' : avg > 0 ? 'D' : '-';
                        return (
                          <>
                            <td className="py-2.5 px-3 text-center font-black text-emerald-800 bg-emerald-50/40 border-l border-emerald-100">
                              {avg || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700 border-l border-slate-100">
                              {pred}
                            </td>
                          </>
                        );
                      })()}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: KELOLA & TAMBAH INDIKATOR PENILAIAN */}
      {showIndikatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    Kelola Indikator Penilaian Praktik
                  </h3>
                  <p className="text-xs text-slate-500">
                    Materi: <strong className="text-teal-700">{selectedMateriJudul}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIndikatorModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Active Indicators */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Indikator Terpilih ({activeIndicators.length})
                </h4>
                <span className="text-[11px] text-teal-700 font-bold">
                  Bisa memilih lebih dari 1 indikator
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeIndicators.map((ind, idx) => (
                  <div
                    key={ind.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <strong className="text-slate-800 truncate block">{ind.nama}</strong>
                        <p className="text-[11px] text-slate-500 truncate">{ind.deskripsi}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveIndikator(ind.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0"
                      title="Hapus indikator ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Indicators Library for this sport */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Pilih dari Bank Indikator Standar PJOK:
              </h4>
              <p className="text-[11px] text-slate-500">
                Klik untuk menambah atau mengaktifkan indikator standar ke formulir penilaian Anda:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {(MASTER_INDIKATOR_LIBRARY['voli'] || DEFAULT_STANDAR_INDIKATOR).map((tmpl) => {
                  const isAlreadyActive = activeIndicators.some((ai) => ai.nama === tmpl.nama);

                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => {
                        if (isAlreadyActive) {
                          setActiveIndicators((prev) => prev.filter((i) => i.nama !== tmpl.nama));
                        } else {
                          setActiveIndicators((prev) => [...prev, tmpl]);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs transition flex items-start justify-between gap-2 cursor-pointer ${
                        isAlreadyActive
                          ? 'border-teal-500 bg-teal-50 text-teal-900 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-[11px]">{tmpl.nama}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">
                          {tmpl.deskripsi}
                        </div>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        {isAlreadyActive ? (
                          <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        ) : (
                          <Plus className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add Custom Indicator Form */}
            <form onSubmit={handleAddCustomIndikator} className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                + Tambah Indikator Kustom Sendiri
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Nama Indikator *
                  </label>
                  <input
                    type="text"
                    required
                    value={customIndikatorNama}
                    onChange={(e) => setCustomIndikatorNama(e.target.value)}
                    placeholder="Contoh: Ketinggian Lompatan & Pendaratan"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Deskripsi / Kriteria Indikator
                  </label>
                  <input
                    type="text"
                    value={customIndikatorDesc}
                    onChange={(e) => setCustomIndikatorDesc(e.target.value)}
                    placeholder="Contoh: Kaki menolak maksimal dan mendarat seimbang"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambahkan Indikator Ini</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowIndikatorModal(false)}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Terapkan ke Penilaian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH MATERI BARU */}
      {showAddMateriModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-100 text-teal-800 rounded-xl">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-800">
                  Tambah Materi Praktik PJOK Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMateriModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewMateriSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Judul Materi Praktik PJOK *
                </label>
                <input
                  type="text"
                  required
                  value={newMateriName}
                  onChange={(e) => setNewMateriName(e.target.value)}
                  placeholder="Contoh: Tenis Meja - Servis & Forehand Drive"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-400 bg-slate-50/50 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMateriModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Simpan Materi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
