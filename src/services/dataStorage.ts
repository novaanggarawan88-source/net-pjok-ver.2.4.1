import {
  User,
  Kelas,
  MataPelajaran,
  Materi,
  Tugas,
  PengumpulanTugas,
  Quiz,
  Soal,
  JawabanQuiz,
  PenilaianPraktik,
  PresensiRecord,
  JurnalMengajar,
  NotifikasiItem,
  RekapNilaiMurid,
  PengaturanSekolah,
  SpreadsheetSyncLog,
  RefleksiPembelajaran,
  JawabanRefleksiMurid,
  SoalRefleksi,
  PengajuanIzin,
  Pengumuman,
  ActivityLog,
  PenilaianSikap,
  PenilaianTemanSejawat,
  PenilaianHarian,
  DimensiTemanSejawatConfig,
  DimensiAsesmenItem,
} from '../types';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { firestore, handleFirestoreError, OperationType } from './firestore';
import { auth } from './firebaseAuth';
import { DEFAULT_USERS, DEFAULT_NILAI } from '../data/defaultUsers';
import {
  syncViaAppsScriptWebhook,
  fetchViaAppsScriptWebhook,
  fetchSheetViaGViz,
  fetchSheetTableViaGViz,
  exportUsersToCSV,
  parseCSVToUsers,
  parseCSVToMateri,
  parseCSVToNilai,
  extractSpreadsheetId,
} from './sheetsService';
import { runSpreadsheetDiagnostics, DiagnosticReport } from './sheetsDiagnosticService';

export interface LMSDatabase {
  users: User[];
  kelas: Kelas[];
  mataPelajaran: MataPelajaran[];
  materi: Materi[];
  tugas: Tugas[];
  pengumpulanTugas: PengumpulanTugas[];
  quiz: Quiz[];
  jawabanQuiz: JawabanQuiz[];
  penilaianPraktik: PenilaianPraktik[];
  presensi: PresensiRecord[];
  jurnal: JurnalMengajar[];
  notifikasi: NotifikasiItem[];
  pengumuman?: Pengumuman[];
  nilai: RekapNilaiMurid[];
  settings: PengaturanSekolah;
  pengajuanIzin?: PengajuanIzin[];
  refleksi?: RefleksiPembelajaran[];
  jawabanRefleksi?: JawabanRefleksiMurid[];
  materiPraktikList?: string[];
  penilaianSikap?: PenilaianSikap[];
  penilaianTemanSejawat?: PenilaianTemanSejawat[];
  dimensiTemanSejawat?: DimensiTemanSejawatConfig[];
  penilaianHarian?: PenilaianHarian[];
  isCleanSlate?: boolean;
  cleanSlateTimestamp?: string;
  isNilaiPresensiReset?: boolean;
  activityLogs?: ActivityLog[];
}

const STORAGE_KEY = 'lms_pjok_db_v6_clean';

export const DEFAULT_DIMENSI_TEMAN_SEJAWAT: DimensiAsesmenItem[] = [
  { id: 'dim-1', nama: 'Kerja Sama & Kekompakan Tim' },
  { id: 'dim-2', nama: 'Sportivitas & Fair Play' },
  { id: 'dim-3', nama: 'Komunikasi Saling Mendukung' },
  { id: 'dim-4', nama: 'Tanggung Jawab dalam Peran Kelompok' },
];

export function safeStringTrim(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

const DEFAULT_QUIZ_SOAL: Soal[] = [
  {
    id: 'soal-1',
    quizId: 'qz-1',
    nomor: 1,
    pertanyaan:
      'Ketika seorang pemain menerima smash keras lawan, mengapa posisi tangan passing bawah harus dikunci lurus dan siku tidak boleh tertekuk?',
    tipe: 'Pilihan Ganda',
    kategoriSoal: 'HOTS',
    pilihan: [
      'Agar pantulan bola stabil dan arah lambungan mudah dikontrol ke arah setter',
      'Agar bola langsung kembali ke lapangan lawan tanpa disentuh setter',
      'Untuk menghindari terjadinya pelanggaran double touch oleh wasit',
      'Agar kecepatan bola meningkat tajam saat memantul ke atas',
      'Untuk meredam kekuatan smash tanpa mengubah arah lintas bola',
    ],
    kunciJawaban: 'Agar pantulan bola stabil dan arah lambungan mudah dikontrol ke arah setter',
    pembahasan:
      'Siku yang dikunci lurus menciptakan bidang datar solid pada lengan bawah, meminimalkan getaran dan menghasilkan pantulan elastis yang terarah.',
    bobot: 20,
  },
  {
    id: 'soal-2',
    quizId: 'qz-1',
    nomor: 2,
    pertanyaan:
      'Dalam sistem rotasi bola voli modern, rotasi dilakukan searah jarum jam setiap kali regu penerima servis berhasil mematikan bola lawan dan merebut hak servis.',
    tipe: 'Benar/Salah',
    kategoriSoal: 'AKM',
    pilihan: ['Benar', 'Salah'],
    kunciJawaban: 'Benar',
    pembahasan:
      'Rotasi searah jarum jam (posisi 1 ke 6, 6 ke 5, dst) dilakukan saat tim berhasil merebut hak servis dari lawan.',
    bobot: 15,
  },
  {
    id: 'soal-3',
    quizId: 'qz-1',
    nomor: 3,
    pertanyaan:
      'Cocokkan gambar teknik olahraga di bawah ini dengan nama teknik gerak dasar yang paling tepat!',
    tipe: 'Mencocokkan Gambar',
    kategoriSoal: 'HOTS',
    gambarUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80',
    pilihan: [
      'Passing Bawah Bola Voli',
      'Smash Keras Menukik',
      'Block / Bendungan Net',
      'Servis Atas Mengapung',
      'Passing Atas (Set Up)',
    ],
    kunciJawaban: 'Passing Bawah Bola Voli',
    pembahasan:
      'Gambar menunjukkan posisi kedua tangan rapat lurus ke depan bawah dengan lutut sedikit ditekuk untuk menerima bola.',
    matchingPairs: [
      {
        id: 'mp-1',
        left: 'Passing Bawah',
        right: 'Menerima servis dan smash lawan di depan bawah',
        imageUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&auto=format&fit=crop&q=80',
      },
      {
        id: 'mp-2',
        left: 'Lay-Up Shoot',
        right: 'Tembakan melayang dua langkah ke papan pantul basket',
        imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80',
      },
      {
        id: 'mp-3',
        left: 'Smash Bulutangkis',
        right: 'Pukulan overhead keras menukik tajam ke area lawan',
        imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&auto=format&fit=crop&q=80',
      },
    ],
    bobot: 25,
  },
  {
    id: 'soal-4',
    quizId: 'qz-1',
    nomor: 4,
    pertanyaan:
      'Tarik garis / jodohkan peran pemain bola voli (Kolom A) dengan tugas taktis utamanya di lapangan (Kolom B)!',
    tipe: 'Tarik Garis',
    kategoriSoal: 'AKM',
    pilihan: [],
    matchingPairs: [
      { left: 'Tosser / Setter', right: 'Mengatur serangan dan mengumpan bola matang untuk spiker' },
      { left: 'Libero', right: 'Pemain bertahan murni, dilarang menyerang dan servis' },
      { left: 'Spiker / Smasher', right: 'Mengeksekusi bola di atas net untuk mencetak poin serangan' },
      { left: 'Blocker', right: 'Membendung serangan smash lawan di dekat bibir net' },
    ],
    kunciJawaban: 'Tosser=Mengatur serangan, Libero=Pemain bertahan murni, Spiker=Mengeksekusi bola, Blocker=Membendung serangan',
    pembahasan:
      'Setiap posisi dalam bola voli memiliki spesialisasi peran yang saling melengkapi dalam formasi taktik regu.',
    bobot: 25,
  },
  {
    id: 'soal-5',
    quizId: 'qz-1',
    nomor: 5,
    pertanyaan:
      'Berapa jumlah sentuhan maksimal yang diperbolehkan bagi satu regu sebelum bola harus diseberangkan ke daerah lawan (tidak termasuk sentuhan bendungan/block)?',
    tipe: 'Pilihan Ganda',
    kategoriSoal: 'Standar',
    pilihan: [
      '1 kali sentuhan langsung',
      '2 kali sentuhan beruntun',
      '3 kali sentuhan tim',
      '4 kali sentuhan bebas',
      '5 kali sentuhan dalam reli panjang',
    ],
    kunciJawaban: '3 kali sentuhan tim',
    pembahasan:
      'Berdasarkan regulasi resmi FIVB, satu tim berhak menyentuh bola maksimal 3 kali sebelum melewati net.',
    bobot: 15,
  },
  {
    id: 'soal-6',
    quizId: 'qz-1',
    nomor: 6,
    pertanyaan:
      'Pada saat mendarat setelah melakukan loncatan smash atau block bola voli, sendi manakah yang harus ditekuk untuk meredam gaya tumbukan (shock absorption) agar mencegah cedera ligamen lutut?',
    tipe: 'Isian',
    kategoriSoal: 'HOTS',
    pilihan: [],
    kunciJawaban: 'Lutut dan pergelangan kaki',
    pembahasan:
      'Analisis Evaluasi Gerakan Motorik: Fleksi sendi lutut (knee flexion) bersama sendi pergelangan kaki (ankle) dan panggul bertindak sebagai peredam kejut mekanis tubuh (deceleration phase). Mendarat dengan tungkai kaku atau lurus meningkatkan risiko cedera robekan ligamen ACL secara drastis.',
    bobot: 20,
  },
];

export const INITIAL_CLASSES: Kelas[] = [
  {
    id: 'cls-xi-1',
    nama: 'XI 1',
    tingkat: 'XI',
    waliKelasId: 'usr-guru-1',
    waliKelasNama: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
    guruPengampuId: 'usr-guru-1',
    guruPengampuNama: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
    tahunPelajaran: '2026/2027',
    totalMurid: 32,
  },
  {
    id: 'cls-xi-2',
    nama: 'XI 2',
    tingkat: 'XI',
    waliKelasId: 'usr-guru-1',
    waliKelasNama: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
    guruPengampuId: 'usr-guru-1',
    guruPengampuNama: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
    tahunPelajaran: '2026/2027',
    totalMurid: 30,
  },
  {
    id: 'cls-x-1',
    nama: 'X 1',
    tingkat: 'X',
    waliKelasId: 'usr-guru-1',
    waliKelasNama: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
    guruPengampuId: 'usr-guru-1',
    guruPengampuNama: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
    tahunPelajaran: '2026/2027',
    totalMurid: 34,
  },
  {
    id: 'cls-xii-1',
    nama: 'XII 1',
    tingkat: 'XII',
    waliKelasId: 'usr-guru-1',
    waliKelasNama: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
    guruPengampuId: 'usr-guru-1',
    guruPengampuNama: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
    tahunPelajaran: '2026/2027',
    totalMurid: 28,
  },
];

export const INITIAL_DATABASE: LMSDatabase = {
  settings: {
    namaSekolah: 'SMA Negeri 1 Tejakula (SMANSAKA)',
    logoSekolah: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=150&auto=format&fit=crop&q=80',
    tahunPelajaran: '2026/2027',
    semester: 'Ganjil',
    namaKepalaSekolah: 'Nyoman Sukrada, S.Pd., M.Pd.',
    nipKepalaSekolah: '19680105 199103 1 020',
    namaGuruPJOKUtama: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
    nipGuruPJOKUtama: '19881115 202221 1 012',
    mataPelajaran: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
    temaWarna: 'Biru & Hijau Sportif',
    terakhirSinkron: new Date().toISOString(),
    autoSyncSpreadsheet: true,
  },
  users: DEFAULT_USERS,
  kelas: INITIAL_CLASSES,
  mataPelajaran: [],
  materi: [],
  tugas: [],
  pengumpulanTugas: [],
  quiz: [],
  jawabanQuiz: [],
  penilaianPraktik: [],
  presensi: [],
  jurnal: [],
  notifikasi: [],
  pengumuman: [],
  nilai: [],
  refleksi: [],
  jawabanRefleksi: [],
  materiPraktikList: [],
  pengajuanIzin: [],
  penilaianSikap: [],
  penilaianTemanSejawat: [],
  penilaianHarian: [],
  isCleanSlate: true,
  cleanSlateTimestamp: new Date().toISOString(),
  isNilaiPresensiReset: true,
  activityLogs: [
    {
      id: 'log-sys-init',
      timestamp: new Date().toISOString(),
      category: 'DB_SYNC',
      actorName: 'Sistem Audit LMS',
      actorRole: 'SYSTEM',
      action: 'Inisialisasi Sistem & Modul Log Aktivitas',
      details: 'Audit trail aktif. Mencatat seluruh aktivitas login pengguna dan modifikasi basis data.',
      status: 'INFO',
    },
  ],
};

export type FirestoreSyncStatus = 'connecting' | 'synced' | 'syncing' | 'offline' | 'error';

class DataStorageService {
  private db: LMSDatabase;
  private listeners: Array<(db: LMSDatabase) => void> = [];
  private syncStatus: FirestoreSyncStatus = 'connecting';
  private lastSyncTime: Date | null = null;
  private statusListeners: Array<(status: FirestoreSyncStatus, lastSync?: Date | null) => void> = [];
  private isApplyingRemoteUpdate = false;
  private isSyncingToFirestore = false;
  private unsubscribeFirestore: Unsubscribe | null = null;
  private syncLogs: SpreadsheetSyncLog[] = [];
  private logListeners: Array<(logs: SpreadsheetSyncLog[]) => void> = [];

  constructor() {
    const CLEAN_KEY = 'lms_hard_clean_v6_done';
    if (typeof window !== 'undefined') {
      try {
        if (localStorage.getItem(CLEAN_KEY) !== 'yes') {
          // Remove old storage versions
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('lms_pjok_db_') || k.startsWith('lms_pengajuan_') || k === 'lms_pjok_current_user')) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
          sessionStorage.clear();
          localStorage.setItem(CLEAN_KEY, 'yes');
        }
      } catch (e) {}
    }

    this.db = this.loadFromLocalStorage();

    // Pastikan akun murid selalu ada dan aktif agar siswa tidak terkunci keluar
    const initialMuridCount = (this.db.users || []).filter((u) => u.role === 'MURID').length;
    if (initialMuridCount === 0) {
      const sampleMurid = DEFAULT_USERS.filter((u) => u.role === 'MURID');
      this.db.users = [...(this.db.users || []), ...sampleMurid];
      this.saveToLocalStorage(this.db);
    }

    this.initFirestoreSync();
    this.loadSyncLogsFromStorage();
  }

  /**
   * Mengosongkan seluruh rekap nilai (tugas, kuis, praktik) dan riwayat absensi
   * Siswa, Guru, Kelas, Materi, dan Tugas tetap aman tersimpan.
   */
  public resetNilaiDanPresensi(notifyUser: boolean = true): void {
    this.updateDatabase((prev) => ({
      ...prev,
      nilai: [],
      presensi: [],
      penilaianPraktik: [],
      penilaianSikap: [],
      penilaianTemanSejawat: [],
      penilaianHarian: [],
      jawabanQuiz: [],
      pengumpulanTugas: [],
      isNilaiPresensiReset: true,
      notifikasi: notifyUser
        ? [
            {
              id: `notif-reset-nilai-${Date.now()}`,
              judul: 'Nilai dan Absensi Direset ke Nol',
              pesan: 'Seluruh rekap nilai dan riwayat absensi telah dikosongkan. Siap mulai mengisi dari nol.',
              tipe: 'pengumuman',
              waktu: 'Baru saja',
              dibaca: false,
            },
            ...(prev.notifikasi || []),
          ]
        : prev.notifikasi,
    }));
    this.seedAllToFirestore();
  }

  private loadSyncLogsFromStorage() {
    try {
      const stored = localStorage.getItem('lms_pjok_sheet_logs');
      if (stored) {
        this.syncLogs = JSON.parse(stored);
      }
    } catch {
      this.syncLogs = [];
    }
  }

  public getSyncLogs(): SpreadsheetSyncLog[] {
    return [...this.syncLogs];
  }

  public addSyncLog(log: SpreadsheetSyncLog) {
    this.syncLogs = [log, ...this.syncLogs].slice(0, 50); // Keep last 50
    try {
      localStorage.setItem('lms_pjok_sheet_logs', JSON.stringify(this.syncLogs));
    } catch {}
    this.logListeners.forEach((fn) => fn([...this.syncLogs]));
  }

  public clearSyncLogs() {
    this.syncLogs = [];
    try {
      localStorage.removeItem('lms_pjok_sheet_logs');
    } catch {}
    this.logListeners.forEach((fn) => fn([]));
  }

  public subscribeSyncLogs(listener: (logs: SpreadsheetSyncLog[]) => void): () => void {
    this.logListeners.push(listener);
    listener([...this.syncLogs]);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== listener);
    };
  }

  public async testSpreadsheetDiagnostics(url?: string): Promise<DiagnosticReport> {
    const targetUrl = url || this.db.settings?.spreadsheetWebhookUrl || this.db.settings?.spreadsheetUrl || '';
    const report = await runSpreadsheetDiagnostics(targetUrl, this.db.settings?.spreadsheetUrl);
    report.logs.forEach((l) => this.addSyncLog(l));
    return report;
  }

  /**
   * Menginisialisasi pendengar real-time Firestore agar perubahan di satu perangkat
   * (misal laptop guru) langsung otomatis diterima di perangkat lain (misal HP siswa)
   * serta mendukung mode Standby / Offline tanpa gangguan.
   */
  private async initFirestoreSync() {
    try {
      // Pasang deteksi status jaringan browser
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          console.info('Koneksi internet terdeteksi online. Memulai sinkronisasi otomatis Cloud Firestore...');
          this.updateSyncStatus('syncing');
          this.forceRefreshFromFirestore().catch(() => {});
        });

        window.addEventListener('offline', () => {
          console.warn('Mode Standby / Offline aktif. Data tersimpan aman di IndexedDB & LocalStorage.');
          this.updateSyncStatus('offline');
        });
      }

      // Pastikan ada sesi autentikasi Firebase di background
      if (!auth.currentUser) {
        signInAnonymously(auth).catch((err) => {
          console.info('Anonymous sign-in status:', err?.code || 'bypassed');
        });
      }

      this.updateSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connecting');
      const recordsCol = collection(firestore, 'lms_records');

      // Pasang listener real-time onSnapshot dengan includeMetadataChanges untuk mendeteksi cache & server state
      this.unsubscribeFirestore = onSnapshot(
        recordsCol,
        { includeMetadataChanges: true },
        (snapshot) => {
          this.lastSyncTime = new Date();
          const isFromCache = snapshot.metadata.fromCache;
          const hasPendingWrites = snapshot.metadata.hasPendingWrites;

          if (snapshot.empty) {
            console.log('Firestore masih kosong, mengunggah data inisial sistem ke Firestore...');
            this.seedAllToFirestore();
            return;
          }

          // Jangan timpa jika sedang dalam proses upload lokal kita sendiri
          if (this.isSyncingToFirestore) {
            this.updateSyncStatus(isFromCache && typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced');
            return;
          }

          this.isApplyingRemoteUpdate = true;
          try {
            const incoming: Partial<LMSDatabase> = {};
            let hasIncomingData = false;

            snapshot.forEach((docSnap) => {
              const docId = docSnap.id;
              const data = docSnap.data();

              if (docId === 'settings' && data?.data) {
                const s = { ...data.data };
                if (!s.namaSekolah || s.namaSekolah.includes('Kintamani')) {
                  s.namaSekolah = 'SMA Negeri 1 Tejakula (SMANSAKA)';
                }
                incoming.settings = { ...this.db.settings, ...s };
                hasIncomingData = true;
              } else if (data && Array.isArray(data.items)) {
                if (docId === 'pengajuanIzin') {
                  const serverItems: PengajuanIzin[] = data.items;
                  const localItems: PengajuanIzin[] = Array.isArray(this.db.pengajuanIzin) ? this.db.pengajuanIzin : [];
                  const map = new Map<string, PengajuanIzin>();
                  serverItems.forEach((it) => map.set(it.id, it));
                  localItems.forEach((it) => {
                    if (!map.has(it.id)) map.set(it.id, it);
                  });
                  incoming.pengajuanIzin = Array.from(map.values());
                } else if (docId === 'presensi') {
                  const serverItems: PresensiRecord[] = data.items;
                  const localItems: PresensiRecord[] = Array.isArray(this.db.presensi) ? this.db.presensi : [];
                  const map = new Map<string, PresensiRecord>();
                  serverItems.forEach((it) => map.set(it.id, it));
                  localItems.forEach((it) => {
                    if (!map.has(it.id)) map.set(it.id, it);
                  });
                  incoming.presensi = Array.from(map.values());
                } else if (docId === 'users') {
                  const serverUsers: User[] = Array.isArray(data.items) ? data.items : [];
                  const localUsers: User[] = Array.isArray(this.db.users) ? this.db.users : [];
                  const userMap = new Map<string, User>();

                  // Keep local users first
                  localUsers.forEach((u) => {
                    if (u.id) userMap.set(u.id, u);
                  });
                  // Merge server users over local
                  serverUsers.forEach((u) => {
                    if (u.id) userMap.set(u.id, u);
                  });

                  let merged = Array.from(userMap.values()).filter((u) => {
                    if (u.id === 'usr-guru-2' || u.id === 'usr-guru-3' || u.username === 'ratna' || u.username === 'haryono') {
                      return false;
                    }
                    if (u.name === 'Ratna Sartika, S.Pd.' || u.name === 'Haryono, S.Pd.Jas') {
                      return false;
                    }
                    return Boolean(u.id && u.name);
                  });

                  // Ensure default accounts exist if missing
                  const hasAdmin = merged.some((u) => u.id === 'usr-admin-1' || u.username === 'admin');
                  if (!hasAdmin) {
                    const adminUser = DEFAULT_USERS.find((u) => u.role === 'ADMIN');
                    if (adminUser) merged.unshift(adminUser);
                  }
                  const hasGuru = merged.some((u) => u.role === 'GURU');
                  if (!hasGuru) {
                    const guruUser = DEFAULT_USERS.find((u) => u.role === 'GURU');
                    if (guruUser) merged.push(guruUser);
                  }
                  const hasMurid = merged.some((u) => u.role === 'MURID');
                  if (!hasMurid) {
                    const sampleMurid = DEFAULT_USERS.filter((u) => u.role === 'MURID');
                    merged = [...merged, ...sampleMurid];
                  }

                  // Guarantee student accounts are in an active, login-ready state
                  merged = merged.map((u) => {
                    if (u.role === 'MURID') {
                      const cleanNis = safeStringTrim(u.nis) || safeStringTrim(u.nip) || (u.username === 'murid' ? '240101' : u.username === 'murid1' ? '240102' : '240103');
                      return {
                        ...u,
                        status: u.status === 'Nonaktif' ? 'Aktif' : (u.status || 'Aktif'),
                        password: u.password || '123456',
                        kelasId: u.kelasId || 'cls-xi-1',
                        nis: cleanNis,
                      };
                    }
                    return u;
                  });

                  incoming.users = merged;
                } else if (docId === 'kelas') {
                  const serverKelas: Kelas[] = Array.isArray(data.items) ? data.items : [];
                  const filtered = serverKelas.filter((k) => !/^cls-(x|xi|xii)-\d+$/.test(k.id));
                  incoming.kelas = filtered;
                } else if (docId === 'mataPelajaran') {
                  const serverMp: MataPelajaran[] = Array.isArray(data.items) ? data.items : [];
                  const filtered = serverMp.filter((m) => !/^mp-pjok-(x|xi|xii)$/.test(m.id));
                  incoming.mataPelajaran = filtered;
                } else if (['materi', 'tugas', 'quiz', 'jurnal', 'notifikasi', 'pengumuman', 'refleksi', 'penilaianPraktik'].includes(docId)) {
                  // Filter out legacy mock demo items so empty slate is respected
                  const legacyMockIds = new Set([
                    'mat-1', 'mat-2', 'mat-3', 'mat-4',
                    'tug-1', 'tug-2',
                    'qz-1',
                    'jrn-1',
                    'notif-1', 'notif-2', 'notif-3', 'notif-4',
                    'ann-1', 'ann-2',
                    'ref-1', 'ref-2',
                    'pen-1', 'pen-2',
                  ]);
                  const filtered = Array.isArray(data.items)
                    ? (data.items as any[]).filter((item) => !legacyMockIds.has(item.id))
                    : [];
                  (incoming as any)[docId] = filtered;
                } else {
                  (incoming as any)[docId] = data.items;
                }
                hasIncomingData = true;
              }
            });

            if (hasIncomingData) {
              const currentNamaSekolah = incoming.settings?.namaSekolah || this.db.settings?.namaSekolah;
              const cleanNamaSekolah =
                !currentNamaSekolah || currentNamaSekolah.includes('Kintamani')
                  ? 'SMA Negeri 1 Tejakula (SMANSAKA)'
                  : currentNamaSekolah;

              this.db = {
                ...this.db,
                ...incoming,
                settings: {
                  ...(incoming.settings || this.db.settings),
                  namaSekolah: cleanNamaSekolah,
                },
              };

              this.saveToLocalStorage(this.db);
              this.notifyLocalListeners();
            }

            if (typeof navigator !== 'undefined' && !navigator.onLine) {
              this.updateSyncStatus('offline');
            } else if (hasPendingWrites) {
              this.updateSyncStatus('syncing');
            } else {
              this.updateSyncStatus('synced');
            }
          } catch (err) {
            console.error('Gagal menerapkan update real-time dari Firestore:', err);
            this.updateSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
          } finally {
            this.isApplyingRemoteUpdate = false;
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot notice (offline fallback active):', error?.message || error);
          this.updateSyncStatus('offline');
          if (
            error?.code === 'permission-denied' ||
            error?.message?.includes('Missing or insufficient permissions')
          ) {
            handleFirestoreError(error, OperationType.GET, 'lms_records');
          }
        }
      );
    } catch (error) {
      console.warn('Gagal menghubungkan listener real-time Firestore:', error);
      this.updateSyncStatus('offline');
    }
  }

  /**
   * Mengunggah seluruh data inisial ke Firestore (digunakan saat koleksi baru dibuat)
   */
  public async seedAllToFirestore(): Promise<void> {
    try {
      this.updateSyncStatus('syncing');
      const sections: (keyof LMSDatabase)[] = [
        'settings',
        'users',
        'kelas',
        'mataPelajaran',
        'materi',
        'tugas',
        'pengumpulanTugas',
        'quiz',
        'jawabanQuiz',
        'penilaianPraktik',
        'presensi',
        'jurnal',
        'notifikasi',
        'pengumuman',
        'nilai',
        'refleksi',
        'jawabanRefleksi',
        'materiPraktikList',
        'pengajuanIzin',
        'penilaianSikap',
        'penilaianTemanSejawat',
        'penilaianHarian',
        'activityLogs',
      ];

      for (const sec of sections) {
        const docRef = doc(firestore, 'lms_records', sec);
        const rawVal = this.db[sec] || [];
        const cleanVal = JSON.parse(JSON.stringify(rawVal));

        const payload =
          sec === 'settings'
            ? { data: cleanVal, section: sec, updatedAt: new Date().toISOString() }
            : { items: cleanVal, section: sec, updatedAt: new Date().toISOString() };

        await setDoc(docRef, payload);
      }

      this.lastSyncTime = new Date();
      this.updateSyncStatus('synced');
      console.log('Seluruh database awal berhasil disinkronkan ke Firestore cloud.');
    } catch (err) {
      console.error('Gagal melakukan seed database ke Firestore:', err);
      this.updateSyncStatus('error');
    }
  }

  /**
   * Sinkronkan bagian yang berubah ke Firestore secara otomatis
   */
  private async syncChangesToFirestore(prev: LMSDatabase, next: LMSDatabase) {
    if (this.isApplyingRemoteUpdate) {
      return;
    }

    try {
      this.isSyncingToFirestore = true;
      this.updateSyncStatus('syncing');

      const sections: (keyof LMSDatabase)[] = [
        'settings',
        'users',
        'kelas',
        'mataPelajaran',
        'materi',
        'tugas',
        'pengumpulanTugas',
        'quiz',
        'jawabanQuiz',
        'penilaianPraktik',
        'presensi',
        'jurnal',
        'notifikasi',
        'pengumuman',
        'nilai',
        'refleksi',
        'jawabanRefleksi',
        'materiPraktikList',
        'pengajuanIzin',
        'penilaianSikap',
        'penilaianTemanSejawat',
        'penilaianHarian',
        'activityLogs',
      ];

      const changedSections = sections.filter((sec) => prev[sec] !== next[sec]);

      for (const sec of changedSections) {
        const docRef = doc(firestore, 'lms_records', sec);
        const rawVal = next[sec] ?? (sec === 'settings' ? {} : []);
        const cleanVal = JSON.parse(JSON.stringify(rawVal));

        const payload =
          sec === 'settings'
            ? { data: cleanVal, section: sec, updatedAt: new Date().toISOString() }
            : { items: cleanVal, section: sec, updatedAt: new Date().toISOString() };

        await setDoc(docRef, payload, { merge: true });
      }

      this.lastSyncTime = new Date();
      this.updateSyncStatus('synced');
    } catch (err: any) {
      console.warn('Gagal sinkronisasi ke Firestore (data tetap aman di penyimpanan lokal):', err?.message || err);
      this.updateSyncStatus('offline');
      if (
        err?.code === 'permission-denied' ||
        err?.message?.includes('Missing or insufficient permissions')
      ) {
        handleFirestoreError(err, OperationType.WRITE, 'lms_records');
      }
    } finally {
      this.isSyncingToFirestore = false;
    }
  }

  private updateSyncStatus(status: FirestoreSyncStatus) {
    this.syncStatus = status;
    this.statusListeners.forEach((l) => l(status, this.lastSyncTime));
  }

  public getSyncStatus(): FirestoreSyncStatus {
    return this.syncStatus;
  }

  public getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  public onSyncStatusChange(
    listener: (status: FirestoreSyncStatus, lastSync?: Date | null) => void
  ): () => void {
    this.statusListeners.push(listener);
    listener(this.syncStatus, this.lastSyncTime);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  public async forceRefreshFromFirestore(): Promise<void> {
    try {
      this.updateSyncStatus('syncing');
      const recordsCol = collection(firestore, 'lms_records');
      const snapshot = await getDocs(recordsCol);

      if (!snapshot.empty) {
        const incoming: Partial<LMSDatabase> = {};
        snapshot.forEach((docSnap) => {
          const docId = docSnap.id;
          const data = docSnap.data();
          if (docId === 'settings' && data?.data) {
            incoming.settings = data.data;
          } else if (data && Array.isArray(data.items)) {
            if (docId === 'pengajuanIzin') {
              const serverItems: PengajuanIzin[] = data.items;
              const localItems: PengajuanIzin[] = Array.isArray(this.db.pengajuanIzin) ? this.db.pengajuanIzin : [];
              const map = new Map<string, PengajuanIzin>();
              serverItems.forEach((it) => map.set(it.id, it));
              localItems.forEach((it) => {
                if (!map.has(it.id)) map.set(it.id, it);
              });
              incoming.pengajuanIzin = Array.from(map.values());
            } else if (docId === 'presensi') {
              const serverItems: PresensiRecord[] = data.items;
              const localItems: PresensiRecord[] = Array.isArray(this.db.presensi) ? this.db.presensi : [];
              const map = new Map<string, PresensiRecord>();
              serverItems.forEach((it) => map.set(it.id, it));
              localItems.forEach((it) => {
                if (!map.has(it.id)) map.set(it.id, it);
              });
              incoming.presensi = Array.from(map.values());
            } else if (docId === 'users') {
              const serverUsers: User[] = Array.isArray(data.items) ? data.items : [];
              const localUsers: User[] = Array.isArray(this.db.users) ? this.db.users : [];
              const userMap = new Map<string, User>();

              localUsers.forEach((u) => {
                if (u.id) userMap.set(u.id, u);
              });
              serverUsers.forEach((u) => {
                if (u.id) userMap.set(u.id, u);
              });

              let merged = Array.from(userMap.values()).filter((u) => {
                if (u.id === 'usr-guru-2' || u.id === 'usr-guru-3' || u.username === 'ratna' || u.username === 'haryono') return false;
                if (u.name === 'Ratna Sartika, S.Pd.' || u.name === 'Haryono, S.Pd.Jas') return false;
                return Boolean(u.id && u.name);
              });

              if (!merged.some((u) => u.role === 'MURID')) {
                const sampleMurid = DEFAULT_USERS.filter((u) => u.role === 'MURID');
                merged = [...merged, ...sampleMurid];
              }

              merged = merged.map((u) => {
                if (u.role === 'MURID') {
                  const cleanNis = safeStringTrim(u.nis) || safeStringTrim(u.nip) || (u.username === 'murid' ? '240101' : u.username === 'murid1' ? '240102' : '240103');
                  return {
                    ...u,
                    status: u.status === 'Nonaktif' ? 'Aktif' : (u.status || 'Aktif'),
                    password: u.password || '123456',
                    kelasId: u.kelasId || 'cls-xi-1',
                    nis: cleanNis,
                  };
                }
                return u;
              });

              incoming.users = merged;
            } else if (['materi', 'tugas', 'quiz', 'jurnal', 'notifikasi', 'pengumuman', 'refleksi', 'penilaianPraktik'].includes(docId)) {
              const filtered = (data.items || []).filter((item: any) => {
                if (!item) return false;
                const j = (item.judul || item.topik || item.materi || '').toLowerCase();
                const g = (item.guruNama || '').toLowerCase();
                if (j.includes('demo') || j.includes('contoh template') || g.includes('ratna') || g.includes('haryono')) {
                  return false;
                }
                return true;
              });
              (incoming as any)[docId] = filtered;
            } else {
              (incoming as any)[docId] = data.items;
            }
          }
        });

        this.db = {
          ...this.db,
          ...incoming,
          settings: incoming.settings || this.db.settings,
        };
        this.saveToLocalStorage(this.db);
        this.notifyLocalListeners();
      }
      this.lastSyncTime = new Date();
      this.updateSyncStatus('synced');
    } catch (err: any) {
      console.error('Gagal mengambil data paksa dari Firestore:', err?.message || err);
      this.updateSyncStatus('error');
      if (
        err?.code === 'permission-denied' ||
        err?.message?.includes('Missing or insufficient permissions')
      ) {
        handleFirestoreError(err, OperationType.LIST, 'lms_records');
      }
    }
  }

  public getCurrentUser(): User | null {
    try {
      const savedUser = localStorage.getItem('lms_pjok_current_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (
          !u ||
          !u.id ||
          u?.id === 'usr-guru-2' ||
          u?.id === 'usr-guru-3' ||
          u?.username === 'ratna' ||
          u?.username === 'haryono'
        ) {
          this.clearCurrentUser();
          return null;
        }
        return u;
      }
    } catch (e) {
      // fallback
    }
    return null;
  }

  public setCurrentUser(user: User | null) {
    try {
      if (user) {
        localStorage.setItem('lms_pjok_current_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('lms_pjok_current_user');
      }
    } catch (e) {
      console.error('Failed to save current user:', e);
    }
  }

  public clearCurrentUser() {
    try {
      localStorage.removeItem('lms_pjok_current_user');
      sessionStorage.removeItem('lms_pjok_session_active');
    } catch (e) {
      console.error('Failed to clear current user:', e);
    }
  }

  public resetToDefault() {
    this.resetToDefaults();
  }

  private loadFromLocalStorage(): LMSDatabase {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);

        let loadedUsers: User[] = Array.isArray(parsed?.users) && parsed.users.length > 0 ? parsed.users : DEFAULT_USERS;
        // Filter out legacy mock teachers
        loadedUsers = loadedUsers.filter((u) => {
          if (u.id === 'usr-guru-2' || u.id === 'usr-guru-3' || u.username === 'ratna' || u.username === 'haryono') return false;
          if (u.name === 'Ratna Sartika, S.Pd.' || u.name === 'Haryono, S.Pd.Jas') return false;
          if (!u.id || !u.name) return false;
          return true;
        });

        // Ensure default staff accounts are present
        const hasAdmin = loadedUsers.some((u) => u.id === 'usr-admin-1' || u.username === 'admin');
        if (!hasAdmin) {
          const adminUser = DEFAULT_USERS.find((u) => u.role === 'ADMIN');
          if (adminUser) loadedUsers.unshift(adminUser);
        }
        const hasGuru = loadedUsers.some((u) => u.role === 'GURU');
        if (!hasGuru) {
          const guruUser = DEFAULT_USERS.find((u) => u.role === 'GURU');
          if (guruUser) loadedUsers.push(guruUser);
        }

        // Ensure student accounts exist so that students can always log in
        const hasMurid = loadedUsers.some((u) => u.role === 'MURID');
        if (!hasMurid) {
          const sampleMurid = DEFAULT_USERS.filter((u) => u.role === 'MURID');
          loadedUsers = [...loadedUsers, ...sampleMurid];
        }

        // Guarantee all student accounts are active, have password and valid class assignment
        loadedUsers = loadedUsers.map((u) => {
          if (u.role === 'MURID') {
            const cleanNis = safeStringTrim(u.nis) || safeStringTrim(u.nip) || (u.username === 'murid' ? '240101' : u.username === 'murid1' ? '240102' : '240103');
            return {
              ...u,
              status: u.status === 'Nonaktif' ? 'Aktif' : (u.status || 'Aktif'),
              password: u.password || '123456',
              kelasId: u.kelasId || 'cls-xi-1',
              nis: cleanNis,
            };
          }
          return u;
        });

        // Exclude the 15 mock classes and ensure initial classes exist
        let loadedKelas: Kelas[] = Array.isArray(parsed?.kelas) ? parsed.kelas : [];
        loadedKelas = loadedKelas.filter((k) => !/^cls-(x|xi|xii)-\d+$/.test(k.id));
        if (loadedKelas.length === 0) {
          loadedKelas = INITIAL_CLASSES;
        }

        // Exclude legacy demo subjects
        let loadedMp: MataPelajaran[] = Array.isArray(parsed?.mataPelajaran) ? parsed.mataPelajaran : [];
        loadedMp = loadedMp.filter((m) => !/^mp-pjok-(x|xi|xii)$/.test(m.id));

        // Filter mock IDs from educational content
        const legacyMockIds = new Set([
          'mat-1', 'mat-2', 'mat-3', 'mat-4',
          'tug-1', 'tug-2',
          'qz-1',
          'jrn-1',
          'notif-1', 'notif-2', 'notif-3', 'notif-4',
          'ann-1', 'ann-2',
          'ref-1', 'ref-2',
          'pen-1', 'pen-2',
        ]);

        const loadedMateri = (Array.isArray(parsed?.materi) ? parsed.materi : []).filter((m: any) => !legacyMockIds.has(m.id));
        const loadedTugas = (Array.isArray(parsed?.tugas) ? parsed.tugas : []).filter((t: any) => !legacyMockIds.has(t.id));
        const loadedQuiz = (Array.isArray(parsed?.quiz) ? parsed.quiz : []).filter((q: any) => !legacyMockIds.has(q.id));
        const loadedJurnal = (Array.isArray(parsed?.jurnal) ? parsed.jurnal : []).filter((j: any) => !legacyMockIds.has(j.id));
        const loadedNotif = (Array.isArray(parsed?.notifikasi) ? parsed.notifikasi : []).filter((n: any) => !legacyMockIds.has(n.id));
        const loadedPengumuman = (Array.isArray(parsed?.pengumuman) ? parsed.pengumuman : []).filter((p: any) => !legacyMockIds.has(p.id));
        const loadedRefleksi = (Array.isArray(parsed?.refleksi) ? parsed.refleksi : []).filter((r: any) => !legacyMockIds.has(r.id));
        const loadedPraktik = (Array.isArray(parsed?.penilaianPraktik) ? parsed.penilaianPraktik : []).filter((p: any) => !legacyMockIds.has(p.id));

        const loadedLogs = Array.isArray(parsed?.activityLogs) && parsed.activityLogs.length > 0
          ? parsed.activityLogs
          : INITIAL_DATABASE.activityLogs;

        return {
          ...INITIAL_DATABASE,
          ...parsed,
          isCleanSlate: true,
          isNilaiPresensiReset: true,
          users: loadedUsers,
          kelas: loadedKelas,
          mataPelajaran: loadedMp,
          materi: loadedMateri,
          tugas: loadedTugas,
          pengumpulanTugas: Array.isArray(parsed?.pengumpulanTugas) ? parsed.pengumpulanTugas : [],
          quiz: loadedQuiz,
          jawabanQuiz: Array.isArray(parsed?.jawabanQuiz) ? parsed.jawabanQuiz : [],
          penilaianPraktik: loadedPraktik,
          presensi: Array.isArray(parsed?.presensi) ? parsed.presensi : [],
          jurnal: loadedJurnal,
          notifikasi: loadedNotif,
          pengumuman: loadedPengumuman,
          nilai: Array.isArray(parsed?.nilai) ? parsed.nilai : [],
          refleksi: loadedRefleksi,
          jawabanRefleksi: Array.isArray(parsed?.jawabanRefleksi) ? parsed.jawabanRefleksi : [],
          materiPraktikList: [],
          pengajuanIzin: Array.isArray(parsed?.pengajuanIzin) ? parsed.pengajuanIzin : [],
          penilaianSikap: Array.isArray(parsed?.penilaianSikap) ? parsed.penilaianSikap : [],
          penilaianTemanSejawat: Array.isArray(parsed?.penilaianTemanSejawat) ? parsed.penilaianTemanSejawat : [],
          penilaianHarian: Array.isArray(parsed?.penilaianHarian) ? parsed.penilaianHarian : [],
          activityLogs: loadedLogs,
          settings: {
            ...INITIAL_DATABASE.settings,
            ...(parsed?.settings || {}),
          },
        };
      }
    } catch (e) {
      console.error('Failed to load local DB, resetting to defaults:', e);
    }
    this.saveToLocalStorage(INITIAL_DATABASE);
    return INITIAL_DATABASE;
  }

  private saveToLocalStorage(data: LMSDatabase) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (Array.isArray(data.pengajuanIzin) && data.pengajuanIzin.length > 0) {
        localStorage.setItem('lms_pengajuan_izin_backup', JSON.stringify(data.pengajuanIzin));
      }
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      try {
        if (Array.isArray(data.pengajuanIzin)) {
          localStorage.setItem('lms_pengajuan_izin_backup', JSON.stringify(data.pengajuanIzin));
        }
      } catch (err) {
        // ignore
      }
    }
  }

  public getDatabase(): LMSDatabase {
    if (this.db?.settings?.namaSekolah && this.db.settings.namaSekolah.includes('Kintamani')) {
      this.db.settings.namaSekolah = 'SMA Negeri 1 Tejakula (SMANSAKA)';
      this.saveToLocalStorage(this.db);
    }
    return this.db;
  }

  public subscribe(listener: (db: LMSDatabase) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyLocalListeners() {
    this.listeners.forEach((l) => l(this.db));
  }

  private notify() {
    this.saveToLocalStorage(this.db);
    this.notifyLocalListeners();
  }

  private autoSyncTimer: any = null;

  public scheduleAutoSyncToSpreadsheet() {
    if (!this.db.settings?.spreadsheetWebhookUrl) return;
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
    }
    this.autoSyncTimer = setTimeout(() => {
      this.syncToLinkedSpreadsheet().catch((e) => {
        console.warn('Auto-sync to Google Spreadsheet:', e?.message || e);
      });
    }, 2500);
  }

  public updateDatabase(updater: (prev: LMSDatabase) => LMSDatabase) {
    const prev = { ...this.db };
    const next = updater(prev);
    if (next.settings?.namaSekolah && next.settings.namaSekolah.includes('Kintamani')) {
      next.settings.namaSekolah = 'SMA Negeri 1 Tejakula (SMANSAKA)';
    }
    this.db = next;
    this.notify();
    // Sinkronkan perubahan secara asinkron ke Firestore
    this.syncChangesToFirestore(prev, next);
    // Sinkronkan perubahan secara otomatis ke Google Spreadsheet jika webhook terhubung
    this.scheduleAutoSyncToSpreadsheet();
  }

  public resetToDefaults() {
    this.db = JSON.parse(JSON.stringify(INITIAL_DATABASE));
    this.notify();
    this.seedAllToFirestore();
  }

  /**
   * Mengosongkan seluruh data pembelajaran, siswa, kuis, tugas, dan nilai agar bisa diisi dari nol.
   * Tetap mempertahankan:
   * 1. Akun Admin dan Guru utama (agar tidak terkunci keluar)
   * 2. Pengaturan sekolah dan konfigurasi Google Spreadsheet / Webhook
   */
  public resetToCleanSlate(keepAdminAndGuru: boolean = true) {
    const currentSettings = this.db.settings || INITIAL_DATABASE.settings;

    let retainedUsers: User[] = [];
    if (keepAdminAndGuru) {
      retainedUsers = (this.db.users || []).filter((u) => u.role === 'ADMIN' || u.role === 'GURU');
      if (!retainedUsers.some((u) => u.role === 'ADMIN')) {
        retainedUsers.unshift(DEFAULT_USERS[0]);
      }
      if (!retainedUsers.some((u) => u.role === 'GURU')) {
        const defaultTeacher = DEFAULT_USERS.find((u) => u.role === 'GURU') || DEFAULT_USERS[1];
        retainedUsers.push(defaultTeacher);
      }
    } else {
      retainedUsers = [DEFAULT_USERS[0], DEFAULT_USERS[1]];
    }

    const resetKelas = (this.db.kelas || INITIAL_DATABASE.kelas).map((k) => ({
      ...k,
      totalMurid: 0,
    }));

    const cleanDb: LMSDatabase = {
      isCleanSlate: true,
      cleanSlateTimestamp: new Date().toISOString(),
      settings: {
        ...currentSettings,
        terakhirSinkron: new Date().toISOString(),
      },
      users: retainedUsers,
      kelas: resetKelas,
      mataPelajaran: this.db.mataPelajaran || INITIAL_DATABASE.mataPelajaran,
      materi: [],
      tugas: [],
      pengumpulanTugas: [],
      quiz: [],
      jawabanQuiz: [],
      penilaianPraktik: [],
      presensi: [],
      jurnal: [],
      notifikasi: [
        {
          id: `notif-clean-${Date.now()}`,
          judul: 'Database Telah Direset ke Nol',
          pesan: 'Data pembelajaran, tugas, kuis, nilai, dan murid telah dibersihkan. Anda dapat mulai mengisi dari nol atau mengimpor dari Google Sheets.',
          tipe: 'pengumuman',
          waktu: 'Baru saja',
          dibaca: false,
        },
      ],
      pengumuman: [],
      nilai: [],
      refleksi: [],
      jawabanRefleksi: [],
      materiPraktikList: this.db.materiPraktikList || INITIAL_DATABASE.materiPraktikList,
      pengajuanIzin: [],
      isNilaiPresensiReset: true,
    };

    this.db = cleanDb;
    this.saveToLocalStorage(cleanDb);
    this.notify();
    this.seedAllToFirestore();
  }

  // ==========================================
  // ACTIVITY AUDIT LOGS & DIAGNOSTICS METHODS
  // ==========================================

  public logActivity(logData: Omit<ActivityLog, 'id' | 'timestamp'>): ActivityLog {
    const newLog: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...logData,
    };

    this.updateDatabase((prev) => {
      const existingLogs = Array.isArray(prev.activityLogs) ? prev.activityLogs : [];
      // Keep up to 300 logs
      const updatedLogs = [newLog, ...existingLogs].slice(0, 300);
      return {
        ...prev,
        activityLogs: updatedLogs,
      };
    });

    return newLog;
  }

  public getActivityLogs(): ActivityLog[] {
    return Array.isArray(this.db.activityLogs) ? this.db.activityLogs : [];
  }

  public clearActivityLogs(): void {
    this.updateDatabase((prev) => ({
      ...prev,
      activityLogs: [
        {
          id: `act-clean-${Date.now()}`,
          timestamp: new Date().toISOString(),
          category: 'DATA_MODIFICATION',
          actorName: 'Administrator',
          actorRole: 'ADMIN',
          action: 'Pembersihan Riwayat Log',
          details: 'Seluruh riwayat log aktivitas sebelumnya telah dibersihkan oleh Administrator.',
          status: 'INFO',
        },
      ],
    }));
  }

  public seedSampleStudents(): void {
    const sampleStudents = DEFAULT_USERS.filter((u) => u.role === 'MURID');
    this.updateDatabase((prev) => {
      const existingMuridUsernames = new Set(
        (prev.users || []).filter((u) => u.role === 'MURID').map((u) => u.username.toLowerCase())
      );
      const toAdd = sampleStudents.filter((s) => !existingMuridUsernames.has(s.username.toLowerCase()));

      let currentKelas = Array.isArray(prev.kelas) && prev.kelas.length > 0 ? prev.kelas : INITIAL_CLASSES;

      return {
        ...prev,
        users: [...toAdd, ...(prev.users || [])],
        kelas: currentKelas,
      };
    });

    this.logActivity({
      category: 'USER_CREATE',
      actorName: 'Administrator',
      actorRole: 'ADMIN',
      action: 'Pemulihan Akun Murid Percontohan',
      details: 'Menambahkan 3 akun murid aktif percontohan dengan NIS dan kelas terdaftar.',
      status: 'SUCCESS',
    });
  }

  public repairAllMuridAccounts(): { repairedCount: number; message: string } {
    let repairedCount = 0;
    this.updateDatabase((prev) => {
      const defaultKelasId = prev.kelas?.[0]?.id || 'cls-xi-1';
      const updatedUsers = (prev.users || []).map((u) => {
        if (u.role === 'MURID') {
          let modified = false;
          const updated = { ...u };
          if (updated.status !== 'Aktif') {
            updated.status = 'Aktif';
            modified = true;
          }
          if (!updated.password || updated.password.trim() === '') {
            updated.password = '123456';
            modified = true;
          }
          if (!updated.kelasId || updated.kelasId.trim() === '') {
            updated.kelasId = defaultKelasId;
            modified = true;
          }
          if (updated.nis !== undefined && updated.nis !== null) {
            const cleanNis = safeStringTrim(updated.nis);
            if (cleanNis !== updated.nis) {
              updated.nis = cleanNis;
              modified = true;
            }
          }
          if (modified) repairedCount++;
          return updated;
        }
        return u;
      });

      const updatedKelas = Array.isArray(prev.kelas) && prev.kelas.length > 0 ? prev.kelas : INITIAL_CLASSES;

      return {
        ...prev,
        users: updatedUsers,
        kelas: updatedKelas,
      };
    });

    this.logActivity({
      category: 'USER_UPDATE',
      actorName: 'Administrator',
      actorRole: 'ADMIN',
      action: 'Perbaikan Massal Akun Murid',
      details: `Pemeriksaan otomatis berhasil memeriksa ${repairedCount} akun murid (status aktif, password default '123456', pembersihan spasi, penugasan kelas).`,
      status: 'SUCCESS',
    });

    return {
      repairedCount,
      message: `Pemeriksaan selesai. Berhasil menstabilkan ${repairedCount} data akun murid. Semua murid berstatus Aktif dengan password default 123456.`,
    };
  }

  public diagnoseStudentAccount(identifierOrId: string) {
    const raw = identifierOrId.trim();
    const cleanId = raw.toLowerCase();
    const allUsers = this.db.users || [];
    const muridList = allUsers.filter((u) => u.role === 'MURID');

    const found = muridList.find(
      (u) =>
        u.id === raw ||
        u.username.toLowerCase() === cleanId ||
        (u.nis && safeStringTrim(u.nis).toLowerCase() === cleanId) ||
        (u.nisn && safeStringTrim(u.nisn).toLowerCase() === cleanId) ||
        (u.nip && safeStringTrim(u.nip).toLowerCase() === cleanId) ||
        u.name.toLowerCase().includes(cleanId)
    );

    if (!found) {
      return {
        found: false,
        user: null,
        issues: [`Akun dengan identitas '${raw}' tidak ditemukan di daftar murid database (Total murid terdaftar: ${muridList.length}).`],
        canLogin: false,
        recommendedAction: 'Pastikan NIS atau Username sudah terdaftar di menu Pengguna > Murid atau klik tombol "Pulihkan Akun Murid Percontohan".',
      };
    }

    const issues: string[] = [];
    let canLogin = true;

    if (found.status === 'Nonaktif') {
      issues.push("Status akun adalah 'Nonaktif'. Siswa ditolak sistem saat mencoba masuk.");
      canLogin = false;
    }

    if (!found.kelasId) {
      issues.push("Akun belum memiliki rombel/kelas yang terhubung (kelasId kosong).");
    } else {
      const kelasExists = (this.db.kelas || []).some((k) => k.id === found.kelasId);
      if (!kelasExists) {
        issues.push(`Kelas ID '${found.kelasId}' tidak ditemukan di master data kelas.`);
      }
    }

    if (found.nis && String(found.nis) !== safeStringTrim(found.nis)) {
      issues.push("NIS mengandung karakter spasi tersembunyi di awal atau akhir yang dapat menyebabkan kegagalan login.");
    }

    return {
      found: true,
      user: found,
      issues,
      canLogin,
      recommendedAction: issues.length > 0 ? issues.join(' ') : 'Akun murid dalam kondisi sehat dan siap digunakan login.',
    };
  }

  // Helper getters
  public getMuridList(kelasId?: string): User[] {
    return this.db.users.filter(
      (u) => u.role === 'MURID' && (!kelasId || u.kelasId === kelasId)
    );
  }

  public getGuruList(): User[] {
    return this.db.users.filter((u) => u.role === 'GURU');
  }

  public getKelasList(): Kelas[] {
    return this.db.kelas;
  }

  public getMateriList(kelasId?: string): Materi[] {
    return this.db.materi.filter((m) => !kelasId || m.kelasId === kelasId);
  }

  public getTugasList(kelasId?: string): Tugas[] {
    return this.db.tugas.filter((t) => !kelasId || t.kelasId === kelasId);
  }

  public getQuizList(kelasId?: string): Quiz[] {
    return this.db.quiz.filter((q) => !kelasId || q.kelasId === kelasId);
  }

  // Refleksi helpers
  public saveRefleksi(item: RefleksiPembelajaran) {
    this.updateDatabase((prev) => {
      const existingList = prev.refleksi || [];
      const idx = existingList.findIndex((r) => r.id === item.id);
      let updated: RefleksiPembelajaran[];
      if (idx >= 0) {
        updated = [...existingList];
        updated[idx] = item;
      } else {
        updated = [item, ...existingList];
      }
      return {
        ...prev,
        refleksi: updated,
      };
    });
  }

  public deleteRefleksi(id: string) {
    this.updateDatabase((prev) => ({
      ...prev,
      refleksi: (prev.refleksi || []).filter((r) => r.id !== id),
      jawabanRefleksi: (prev.jawabanRefleksi || []).filter((j) => j.refleksiId !== id),
    }));
  }

  public submitJawabanRefleksi(jawaban: JawabanRefleksiMurid) {
    this.updateDatabase((prev) => {
      const list = prev.jawabanRefleksi || [];
      const existingIdx = list.findIndex(
        (j) => j.refleksiId === jawaban.refleksiId && j.muridId === jawaban.muridId
      );
      let updated: JawabanRefleksiMurid[];
      if (existingIdx >= 0) {
        updated = [...list];
        updated[existingIdx] = { ...list[existingIdx], ...jawaban };
      } else {
        updated = [jawaban, ...list];
      }
      return {
        ...prev,
        jawabanRefleksi: updated,
      };
    });
  }

  public tanggapiRefleksi(jawabanId: string, catatanGuru: string) {
    this.updateDatabase((prev) => {
      const list = (prev.jawabanRefleksi || []).map((j) => {
        if (j.id === jawabanId) {
          return {
            ...j,
            catatanGuru,
            tanggalTanggapanGuru: new Date().toISOString().slice(0, 10),
          };
        }
        return j;
      });
      return {
        ...prev,
        jawabanRefleksi: list,
      };
    });
  }

  // Pengumuman Helpers & Notifications
  public savePengumuman(item: Pengumuman) {
    this.updateDatabase((prev) => {
      const existing = prev.pengumuman || [];
      const idx = existing.findIndex((p) => p.id === item.id);
      let updated: Pengumuman[];
      if (idx >= 0) {
        updated = [...existing];
        updated[idx] = item;
      } else {
        updated = [item, ...existing];
      }

      // If new announcement, generate a notification item for students
      let updatedNotifikasi = [...(prev.notifikasi || [])];
      if (idx < 0) {
        const targetDesc = item.targetKelasNama || (item.targetKelasId && item.targetKelasId !== 'ALL' ? item.targetKelasId : 'Semua Kelas');
        const notif: NotifikasiItem = {
          id: `notif-ann-${Date.now()}`,
          judul: `Pengumuman Guru: ${item.judul}`,
          pesan: `${item.guruNama} menyiarkan pengumuman (${targetDesc}): "${item.isi.slice(0, 100)}${item.isi.length > 100 ? '...' : ''}"`,
          waktu: 'Baru saja',
          tipe: 'pengumuman',
          dibaca: false,
          targetRole: 'MURID',
          targetId: item.id,
          isUrgentDeadline: item.prioritas === 'Mendesak' || item.prioritas === 'Penting',
        };
        updatedNotifikasi = [notif, ...updatedNotifikasi];
      }

      return {
        ...prev,
        pengumuman: updated,
        notifikasi: updatedNotifikasi,
      };
    });
  }

  public deletePengumuman(id: string) {
    this.updateDatabase((prev) => ({
      ...prev,
      pengumuman: (prev.pengumuman || []).filter((p) => p.id !== id),
      notifikasi: (prev.notifikasi || []).filter((n) => n.targetId !== id),
    }));
  }

  public togglePinPengumuman(id: string) {
    this.updateDatabase((prev) => {
      const list = (prev.pengumuman || []).map((p) => {
        if (p.id === id) {
          return { ...p, disematkan: !p.disematkan };
        }
        return p;
      });
      return {
        ...prev,
        pengumuman: list,
      };
    });
  }

  public markPengumumanDibaca(id: string, userId: string) {
    this.updateDatabase((prev) => {
      const list = (prev.pengumuman || []).map((p) => {
        if (p.id === id) {
          const readers = p.dibacaOleh || [];
          if (!readers.includes(userId)) {
            return { ...p, dibacaOleh: [...readers, userId] };
          }
        }
        return p;
      });
      const notifList = (prev.notifikasi || []).map((n) => {
        if (n.targetId === id) {
          return { ...n, dibaca: true };
        }
        return n;
      });
      return {
        ...prev,
        pengumuman: list,
        notifikasi: notifList,
      };
    });
  }

  // Delete User helper (Murid / Guru / Admin)
  public deleteUser(userId: string) {
    this.updateDatabase((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== userId),
      presensi: prev.presensi.filter((p) => p.muridId !== userId),
      penilaianPraktik: (prev.penilaianPraktik || []).filter((p) => p.muridId !== userId),
      pengumpulanTugas: prev.pengumpulanTugas.filter((t) => t.muridId !== userId),
      jawabanQuiz: prev.jawabanQuiz.filter((q) => q.muridId !== userId),
      jawabanRefleksi: (prev.jawabanRefleksi || []).filter((j) => j.muridId !== userId),
      pengajuanIzin: (prev.pengajuanIzin || []).filter((iz) => iz.muridId !== userId),
    }));
  }

  // Materi Praktik & Penilaian Multi-Materi helpers
  public addMateriPraktik(judulMateri: string) {
    const trimmed = judulMateri.trim();
    if (!trimmed) return;
    this.updateDatabase((prev) => {
      const current = prev.materiPraktikList || [];
      if (current.includes(trimmed)) return prev;
      return {
        ...prev,
        materiPraktikList: [...current, trimmed],
      };
    });
  }

  public savePenilaianPraktikBatch(newItems: PenilaianPraktik[]) {
    this.updateDatabase((prev) => {
      const existing = [...(prev.penilaianPraktik || [])];
      newItems.forEach((newItem) => {
        const targetMateri = newItem.materiJudul || newItem.materi || '';
        const idx = existing.findIndex(
          (p) =>
            p.muridId === newItem.muridId &&
            ((p.materiJudul || p.materi || '').trim().toLowerCase() === targetMateri.trim().toLowerCase())
        );
        if (idx >= 0) {
          existing[idx] = newItem;
        } else {
          existing.push(newItem);
        }
      });
      return {
        ...prev,
        penilaianPraktik: existing,
      };
    });
  }

  // CSV & Spreadsheet Integration Methods
  public exportUsersCSV(): string {
    return exportUsersToCSV(this.db.users);
  }

  public importUsersCSV(csvText: string): { count: number; message: string } {
    const importedUsers = parseCSVToUsers(csvText);
    if (importedUsers.length === 0) {
      return { count: 0, message: 'Tidak ada data pengguna yang valid ditemukan dalam CSV.' };
    }

    this.updateDatabase((prev) => {
      // Merge users by ID or username
      const existingMap = new Map(prev.users.map((u) => [u.id, u]));
      for (const u of importedUsers) {
        existingMap.set(u.id, {
          ...(existingMap.get(u.id) || {}),
          ...u,
        });
      }
      return {
        ...prev,
        users: Array.from(existingMap.values()),
        settings: {
          ...prev.settings,
          terakhirSinkron: new Date().toISOString(),
        },
      };
    });

    return {
      count: importedUsers.length,
      message: `Berhasil mengimpor ${importedUsers.length} data pengguna dari Spreadsheet / CSV!`,
    };
  }

  public async syncToLinkedSpreadsheet(webhookUrl?: string): Promise<{ success: boolean; message: string; log?: SpreadsheetSyncLog }> {
    const startTime = Date.now();
    const url = webhookUrl || this.db.settings?.spreadsheetWebhookUrl;
    if (!url) {
      const errLog: SpreadsheetSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        action: 'PUSH',
        method: 'WEBHOOK_POST',
        url: '(Belum diatur)',
        httpStatus: null,
        durationMs: 0,
        success: false,
        message: 'URL Webhook Google Apps Script belum dikonfigurasi.',
        recommendation: 'Buka pengaturan Spreadsheet dan masukkan URL Web App Google Apps Script (/exec).',
      };
      this.addSyncLog(errLog);
      return {
        success: false,
        message: 'URL Webhook Google Apps Script belum dikonfigurasi.',
        log: errLog,
      };
    }

    try {
      const payload = this.toSheetsPayload();
      const res = await syncViaAppsScriptWebhook(url, payload);
      const durationMs = Date.now() - startTime;

      if (res.success) {
        this.updateDatabase((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            terakhirSinkron: new Date().toISOString(),
          },
        }));
      }

      const log: SpreadsheetSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        action: 'PUSH',
        method: 'WEBHOOK_POST',
        url,
        httpStatus: res.statusCode ?? 200,
        durationMs,
        success: res.success,
        message: res.message,
        details: res.details,
      };
      this.addSyncLog(log);

      return {
        success: res.success,
        message: res.message,
        log,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const log: SpreadsheetSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        action: 'PUSH',
        method: 'WEBHOOK_POST',
        url,
        httpStatus: 0,
        durationMs,
        success: false,
        message: err?.message || 'Gagal menyinkronkan data ke Spreadsheet Webhook.',
        details: String(err),
      };
      this.addSyncLog(log);
      return {
        success: false,
        message: err?.message || 'Gagal menyinkronkan data ke Spreadsheet Webhook.',
        log,
      };
    }
  }

  public async pullFromLinkedSpreadsheet(
    webhookUrl?: string
  ): Promise<{
    success: boolean;
    count: number;
    materiCount?: number;
    nilaiCount?: number;
    message: string;
    log?: SpreadsheetSyncLog;
  }> {
    const startTime = Date.now();
    const targetUrl = webhookUrl || this.db.settings?.spreadsheetWebhookUrl || this.db.settings?.spreadsheetUrl;
    const fallbackSheetUrl = this.db.settings?.spreadsheetUrl;

    if (!targetUrl) {
      const errLog: SpreadsheetSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        action: 'PULL',
        method: 'WEBHOOK_GET',
        url: '(Belum diatur)',
        httpStatus: null,
        durationMs: 0,
        success: false,
        message: 'URL Webhook maupun URL Google Spreadsheet belum dikonfigurasi.',
        recommendation: 'Masukkan URL Google Apps Script atau URL Google Spreadsheet di modal sinkronisasi.',
      };
      this.addSyncLog(errLog);
      return {
        success: false,
        count: 0,
        message: 'URL Webhook maupun URL Google Spreadsheet belum dikonfigurasi.',
        log: errLog,
      };
    }

    try {
      let rawUsers: any[] = [];
      let rawMateri: any[] = [];
      let rawNilai: any[] = [];
      let statusCode = 200;
      let usedMethod: SpreadsheetSyncLog['method'] = 'WEBHOOK_GET';
      let syncMessage = '';
      let lastErrorMessage = '';

      // 1. Direct Spreadsheet URL via GViz CSV
      if (targetUrl.includes('docs.google.com/spreadsheets')) {
        usedMethod = 'GVIZ_CSV';
        const gvizUsers = await fetchSheetViaGViz(targetUrl, 'USERS');
        statusCode = gvizUsers.statusCode;
        if (gvizUsers.success && gvizUsers.data.length > 0) {
          rawUsers = gvizUsers.data;
        } else {
          lastErrorMessage = gvizUsers.message;
        }

        const gvizMateri = await fetchSheetTableViaGViz(targetUrl, 'MATERI');
        if (gvizMateri.success && gvizMateri.data.length > 0) {
          rawMateri = gvizMateri.data;
        }

        const gvizNilai = await fetchSheetTableViaGViz(targetUrl, 'NILAI');
        if (gvizNilai.success && gvizNilai.data.length > 0) {
          rawNilai = gvizNilai.data;
        }
      } else {
        // 2. Apps Script Webhook (Request ALL sheets)
        const res = await fetchViaAppsScriptWebhook(targetUrl, 'ALL');
        statusCode = res.statusCode;

        if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
          rawUsers = res.data.USERS || res.data.users || res.data.MURID || res.data.murid || [];
          rawMateri = res.data.MATERI || res.data.materi || [];
          rawNilai = res.data.NILAI || res.data.nilai || [];
        } else if (Array.isArray(res.data)) {
          rawUsers = res.data;
        }

        if (!res.success) {
          lastErrorMessage = res.message || '';
        }

        // Fallback to GViz if Webhook yielded no users and fallback URL exists
        if (rawUsers.length === 0 && fallbackSheetUrl) {
          const sheetId = extractSpreadsheetId(fallbackSheetUrl);
          if (sheetId) {
            const fallbackRes = await fetchSheetViaGViz(sheetId, 'USERS');
            if (fallbackRes.success && fallbackRes.data.length > 0) {
              usedMethod = 'GVIZ_CSV';
              rawUsers = fallbackRes.data;
              const mRes = await fetchSheetTableViaGViz(sheetId, 'MATERI');
              if (mRes.success) rawMateri = mRes.data;
              const nRes = await fetchSheetTableViaGViz(sheetId, 'NILAI');
              if (nRes.success) rawNilai = nRes.data;
            } else if (!lastErrorMessage) {
              lastErrorMessage = fallbackRes.message;
            }
          }
        }
      }

      // 3. Normalize Users
      const mappedUsers: User[] = rawUsers.map((u: any, idx: number) => {
        const rawRole = String(u.role || u.Role || u.peran || u.Peran || 'MURID').toUpperCase();
        const role = rawRole.includes('GURU') ? 'GURU' : rawRole.includes('ADMIN') ? 'ADMIN' : 'MURID';
        const rawName = u.name || u.nama || u.Nama || u.NAMA || u.namalengkap || u.nama_lengkap || `Pengguna ${idx + 1}`;
        const rawUsername = u.username || u.Username || u.nis || u.nip || rawName.toLowerCase().replace(/\s+/g, '') || `user${idx + 1}`;

        // Parse kelas diampu for teachers
        const rawDiampu = u.kelasDiampu || u.kelas_diampu || u.diampu || '';
        let parsedKelasDiampu: string[] | undefined = undefined;
        let parsedKelasDiampuIds: string[] | undefined = undefined;
        if (role === 'GURU' && rawDiampu) {
          const list = Array.isArray(rawDiampu)
            ? rawDiampu.map(String)
            : String(rawDiampu).split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
          parsedKelasDiampu = list;
          parsedKelasDiampuIds = list.map((nama) => {
            const found = this.db.kelas.find(
              (k) => k.nama.toLowerCase() === nama.toLowerCase() || k.id.toLowerCase() === nama.toLowerCase()
            );
            return found ? found.id : nama;
          });
        }

        return {
          id: u.id || u.ID || `usr-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
          username: rawUsername,
          password: u.password || u.kata_sandi || undefined,
          role,
          name: rawName,
          email: u.email || u.Email || '',
          status: (u.status || u.Status || 'Aktif') === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
          nis: u.nis || u.NIS || u.nisn || (role === 'MURID' ? u.nip : '') || '',
          nip: u.nip || u.NIP || (role === 'GURU' ? u.nis : '') || '',
          avatar: u.avatar || u.foto || '',
          kelasId: u.kelasId || u.kelas || u.rombel || 'cls-xi-1',
          kelasDiampu: parsedKelasDiampu,
          kelasDiampuIds: parsedKelasDiampuIds,
          tahunPelajaran: u.tahunPelajaran || u.tahun_ajaran || '2026/2027',
          jenisKelamin: (u.jenisKelamin || u.gender || 'L').toUpperCase().startsWith('P') ? 'P' : 'L',
        };
      });

      // 4. Normalize Materi
      const mappedMateri: Materi[] = rawMateri
        .filter((m: any) => m.judul || m.Judul || m.materi || m.title)
        .map((m: any, idx: number) => {
          const judul = m.judul || m.Judul || m.materi || m.title || `Materi ${idx + 1}`;
          const materiInti = m.materiInti || m.kontenTeks || m.konten || m.materi_inti || '';
          return {
            id: m.id || m.ID || `mtr-${Date.now()}-${idx}`,
            judul,
            subJudul: m.subJudul || m.sub_judul || '',
            kategori: m.kategori || m.Kategori || 'Permainan Bola Besar',
            fase: (m.fase || 'F') as 'E' | 'F',
            semester: (m.semester || '1') as '1' | '2',
            tujuanPembelajaran: m.tujuanPembelajaran || m.tujuan || m.capaian || '',
            deskripsi: m.deskripsi || m.Deskripsi || m.uraian || '',
            materiInti,
            kontenTeks: materiInti,
            videoUrl: m.videoUrl || m.video || '',
            fileUrl: m.fileUrl || m.file || '',
            status: (m.status === 'Draft' ? 'Draft' : 'Publish') as 'Publish' | 'Draft',
            guruNama: m.guruNama || m.guru || m.dibuatOleh || 'I Ketut Sukadana, S.Pd',
            dibuatOleh: m.dibuatOleh || m.guruNama || 'I Ketut Sukadana, S.Pd',
            dibuatPada: m.dibuatPada || m.tanggal || new Date().toISOString().slice(0, 10),
            kelasIds: this.db.kelas.map((k) => k.id),
          };
        });

      // 5. Normalize Nilai
      const mappedNilai: PenilaianPraktik[] = rawNilai
        .filter((n: any) => n.muridNama || n.nama || n.siswa)
        .map((n: any, idx: number) => {
          const muridNama = n.muridNama || n.nama || n.siswa || '';
          const nilaiAkhirNum = parseFloat(n.nilaiAkhir || n.nilai || 0) || 0;
          const totalSkorNum = parseFloat(n.totalSkor || n.skor || 0) || 0;
          const rawPred = String(n.predikat || 'B').toUpperCase();
          const predikat = (['A', 'B', 'C', 'D'].includes(rawPred) ? rawPred : 'B') as any;

          return {
            id: n.id || `nil-${Date.now()}-${idx}`,
            muridId: n.muridId || `murid-${idx}`,
            muridNama,
            nis: n.nis || '',
            kelasId: n.kelasId || 'cls-xi-1',
            kelasNama: n.kelasNama || n.kelas || 'XI 1',
            materi: n.materi || n.materiJudul || 'PJOK',
            materiJudul: n.materiJudul || n.materi || 'PJOK',
            tanggal: n.tanggal || new Date().toISOString().slice(0, 10),
            totalSkor: totalSkorNum,
            nilaiAkhir: nilaiAkhirNum,
            predikat,
            catatanGuru: n.catatanGuru || n.catatan || '',
            guruNama: n.guruNama || n.guruPenilai || 'I Ketut Sukadana, S.Pd',
            guruPenilai: n.guruPenilai || n.guruNama || 'I Ketut Sukadana, S.Pd',
          };
        });

      // 6. Merge into Database
      this.updateDatabase((prev) => {
        let newUsers = [...prev.users];
        if (mappedUsers.length > 0) {
          const userMap = new Map(newUsers.map((u) => [u.id, u]));
          const usernameMap = new Map(newUsers.map((u) => [u.username.toLowerCase(), u.id]));
          mappedUsers.forEach((u) => {
            const existingId = usernameMap.get(u.username.toLowerCase());
            if (existingId && existingId !== u.id) {
              userMap.set(existingId, { ...userMap.get(existingId), ...u, id: existingId });
            } else {
              userMap.set(u.id, { ...(userMap.get(u.id) || {}), ...u });
            }
          });
          newUsers = Array.from(userMap.values());
        }

        let newMateri = [...prev.materi];
        if (mappedMateri.length > 0) {
          const materiMap = new Map(newMateri.map((m) => [m.id, m]));
          const judulMap = new Map(newMateri.map((m) => [m.judul.trim().toLowerCase(), m.id]));
          mappedMateri.forEach((m) => {
            const existingId = judulMap.get(m.judul.trim().toLowerCase());
            if (existingId) {
              materiMap.set(existingId, { ...materiMap.get(existingId), ...m, id: existingId });
            } else {
              materiMap.set(m.id, { ...(materiMap.get(m.id) || {}), ...m });
            }
          });
          newMateri = Array.from(materiMap.values());
        }

        let newNilai = [...(prev.penilaianPraktik || [])];
        if (mappedNilai.length > 0) {
          const nilaiMap = new Map(newNilai.map((n) => [n.id, n]));
          const pairMap = new Map(newNilai.map((n) => [`${n.muridNama}_${n.materi || n.materiJudul}`.toLowerCase(), n.id]));
          mappedNilai.forEach((n) => {
            const key = `${n.muridNama}_${n.materi || n.materiJudul}`.toLowerCase();
            const existingId = pairMap.get(key);
            if (existingId) {
              nilaiMap.set(existingId, { ...nilaiMap.get(existingId), ...n, id: existingId });
            } else {
              nilaiMap.set(n.id, { ...(nilaiMap.get(n.id) || {}), ...n });
            }
          });
          newNilai = Array.from(nilaiMap.values());
        }

        return {
          ...prev,
          users: newUsers,
          materi: newMateri,
          penilaianPraktik: newNilai,
          settings: {
            ...prev.settings,
            terakhirSinkron: new Date().toISOString(),
          },
        };
      });

      const durationMs = Date.now() - startTime;

      if (mappedUsers.length === 0 && mappedMateri.length === 0 && mappedNilai.length === 0) {
        const failureMsg =
          lastErrorMessage ||
          'Tidak ada data yang berhasil ditarik dari Spreadsheet. Pastikan Spreadsheet memiliki data dan dibagikan secara publik (Akses umum: Siapa saja yang memiliki tautan: Pelihat), atau klik "Sambungkan Google" di menu sinkronisasi.';

        const errLog: SpreadsheetSyncLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          action: 'PULL',
          method: usedMethod,
          url: targetUrl,
          httpStatus: statusCode || 404,
          durationMs,
          success: false,
          recordsCount: 0,
          message: failureMsg,
          recommendation: 'Periksa izin akses Spreadsheet ("Siapa saja yang memiliki link: Pelihat") atau jalankan "Uji Koneksi & Diagnostik".',
        };
        this.addSyncLog(errLog);

        return {
          success: false,
          count: 0,
          materiCount: 0,
          nilaiCount: 0,
          message: failureMsg,
          log: errLog,
        };
      }

      syncMessage = `Berhasil menarik data dari Spreadsheet: ${mappedUsers.length} pengguna, ${mappedMateri.length} materi pembelajaran, dan ${mappedNilai.length} rekap nilai!`;

      const successLog: SpreadsheetSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        action: 'PULL',
        method: usedMethod,
        url: targetUrl,
        httpStatus: statusCode,
        durationMs,
        success: true,
        recordsCount: mappedUsers.length + mappedMateri.length + mappedNilai.length,
        message: syncMessage,
      };
      this.addSyncLog(successLog);

      return {
        success: true,
        count: mappedUsers.length,
        materiCount: mappedMateri.length,
        nilaiCount: mappedNilai.length,
        message: syncMessage,
        log: successLog,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errMsg = err?.message || 'Gagal menarik data dari Google Spreadsheet.';
      const isCors = errMsg.includes('CORS') || errMsg.includes('TypeError') || errMsg.includes('fetch');
      const isAuth = errMsg.includes('Autentikasi') || errMsg.includes('login') || errMsg.includes('Privat');

      const errLog: SpreadsheetSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        action: 'PULL',
        method: targetUrl.includes('docs.google.com') ? 'GVIZ_CSV' : 'WEBHOOK_GET',
        url: targetUrl,
        httpStatus: isCors ? 0 : isAuth ? 401 : 500,
        durationMs,
        success: false,
        recordsCount: 0,
        corsDetected: isCors,
        authErrorDetected: isAuth,
        message: errMsg,
        details: String(err),
        recommendation: isCors
          ? 'Pastikan Google Apps Script di-deploy dengan "Who has access: Anyone (Siapa saja)". Atau gunakan link Google Spreadsheet dengan izin "Siapa saja dengan link dapat melihat".'
          : isAuth
          ? 'Akses Spreadsheet ditolak oleh Google. Ubah izin berbagi Google Sheets menjadi "Siapa saja yang memiliki tautan" sebagai Pelihat.'
          : 'Periksa URL dan pastikan tab USERS dan MATERI tersedia.',
      };
      this.addSyncLog(errLog);

      return {
        success: false,
        count: 0,
        message: errMsg,
        log: errLog,
      };
    }
  }

  // Khusus sinkronisasi Materi ke Google Sheets (Push)
  public async syncMateriToLinkedSpreadsheet(webhookUrl?: string): Promise<{ success: boolean; message: string }> {
    const url = webhookUrl || this.db.settings?.spreadsheetWebhookUrl;
    if (!url) {
      return { success: false, message: 'URL Webhook Google Apps Script belum diatur.' };
    }
    const payload = this.toSheetsPayload();
    const res = await syncViaAppsScriptWebhook(url, {
      action: 'syncMateri',
      table: 'MATERI',
      data: payload.MATERI,
    });
    return res;
  }

  // Khusus sinkronisasi Nilai ke Google Sheets (Push)
  public async syncNilaiToLinkedSpreadsheet(webhookUrl?: string): Promise<{ success: boolean; message: string }> {
    const url = webhookUrl || this.db.settings?.spreadsheetWebhookUrl;
    if (!url) {
      return { success: false, message: 'URL Webhook Google Apps Script belum diatur.' };
    }
    const payload = this.toSheetsPayload();
    const res = await syncViaAppsScriptWebhook(url, {
      action: 'syncNilai',
      table: 'NILAI',
      data: payload.NILAI,
    });
    return res;
  }

  // Format data for Google Sheets tables
  public toSheetsPayload(): Record<string, any[]> {
    return {
      USERS: this.db.users.map((u) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        name: u.name,
        nip: u.nip || '',
        nis: u.nis || '',
        email: u.email || '',
        status: u.status || 'Aktif',
        kelasDiampu: u.kelasDiampu ? u.kelasDiampu.join(', ') : '',
        kelasId: u.kelasId || '',
        jenisKelamin: u.jenisKelamin || '',
        tahunPelajaran: u.tahunPelajaran || '2026/2027',
      })),
      ADMIN: this.db.users.filter((u) => u.role === 'ADMIN').map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        nip: u.nip || '',
        email: u.email || '',
      })),
      GURU: this.db.users.filter((u) => u.role === 'GURU').map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        nip: u.nip || '',
        mataPelajaran: u.mataPelajaran || 'PJOK',
        email: u.email || '',
        kelasDiampu: u.kelasDiampu ? u.kelasDiampu.join(', ') : '',
        status: u.status || 'Aktif',
      })),
      MURID: this.db.users.filter((u) => u.role === 'MURID').map((u) => {
        const kObj = this.db.kelas.find((k) => k.id === u.kelasId);
        return {
          id: u.id,
          nis: u.nis || '',
          nisn: u.nisn || '',
          name: u.name,
          kelasId: u.kelasId || 'cls-xi-1',
          kelasNama: kObj?.nama || u.kelasId || 'XI 1',
          jenisKelamin: u.jenisKelamin || 'L',
          status: u.status || 'Aktif',
        };
      }),
      KELAS: this.db.kelas,
      MATERI: this.db.materi.map((m) => ({
        id: m.id,
        judul: m.judul,
        subJudul: m.subJudul || '',
        kategori: m.kategori || 'Permainan Bola Besar',
        fase: m.fase || 'F',
        semester: m.semester || '1',
        tujuanPembelajaran: m.tujuanPembelajaran || '',
        deskripsi: m.deskripsi || '',
        materiInti: m.materiInti || m.kontenTeks || '',
        videoUrl: m.videoUrl || '',
        fileUrl: m.fileUrl || '',
        status: m.status || 'Publish',
        guruNama: m.guruNama || m.dibuatOleh || 'I Ketut Sukadana, S.Pd',
        dibuatPada: m.dibuatPada || '',
      })),
      NILAI: (this.db.penilaianPraktik || []).map((p) => ({
        id: p.id,
        tanggal: p.tanggal || new Date().toISOString().slice(0, 10),
        kelasNama: p.kelasNama || '',
        muridNama: p.muridNama || '',
        nis: p.nis || '',
        materi: p.materi || p.materiJudul || '',
        totalSkor: p.totalSkor || 0,
        nilaiAkhir: p.nilaiAkhir || 0,
        predikat: p.predikat || 'B',
        catatanGuru: p.catatanGuru || '',
        guruNama: p.guruNama || p.guruPenilai || 'I Ketut Sukadana, S.Pd',
      })),
      TUGAS: this.db.tugas,
      PENGUMPULAN: this.db.pengumpulanTugas,
      QUIZ: this.db.quiz.map((q: any) => {
        const list = q.soalList || q.soal || [];
        const { soalList, soal, ...rest } = q;
        return {
          ...rest,
          jumlahSoal: list.length,
        };
      }),
      SOAL: this.db.quiz.flatMap((q) => q.soalList || q.soal || []),
      JAWABAN: this.db.jawabanQuiz,
      PRESENSI: this.db.presensi,
      JURNAL: this.db.jurnal,
      NOTIFIKASI: this.db.notifikasi,
      SETTING: [this.db.settings],
    };
  }
}

export const dataStorage = new DataStorageService();
