import { IndikatorPraktik } from '../types';

export interface IndikatorTemplate {
  id: string;
  nama: string;
  deskripsi: string;
  kategori?: string;
}

export const MASTER_INDIKATOR_LIBRARY: Record<string, IndikatorTemplate[]> = {
  'voli': [
    {
      id: 'ind-voli-1',
      nama: 'Sikap Awalan & Kuda-kuda Kaki',
      deskripsi: 'Kaki dibuka selebar bahu, lutut ditekuk rileks, berat badan seimbang di ujung kaki.',
    },
    {
      id: 'ind-voli-2',
      nama: 'Posisi Lengan & Ayunan Lurus',
      deskripsi: 'Kedua ibu jari sejajar, siku dikunci lurus rapat, ayunan lengan dari bawah ke depan atas.',
    },
    {
      id: 'ind-voli-3',
      nama: 'Titik Sentuh Bola (Impact Point)',
      deskripsi: 'Perkenaan bola tepat di bagian bidang datar pergelangan tangan, tidak memantul ke samping.',
    },
    {
      id: 'ind-voli-4',
      nama: 'Koordinasi Dorongan Lutut & Panggul',
      deskripsi: 'Mengekstensikan sendi lutut dan pinggul saat menyentuh bola untuk menghasilkan tenaga halus.',
    },
    {
      id: 'ind-voli-5',
      nama: 'Akurasi & Ketinggian Lambungan',
      deskripsi: 'Arah lambungan bola parabola stabil dan terarah tepat ke sasaran pengumpan/setter.',
    },
    {
      id: 'ind-voli-6',
      nama: 'Sikap Akhir & Follow Through',
      deskripsi: 'Keseimbangan terjaga tanpa terjatuh, pandangan mengikuti arah bola, kembali siap siaga.',
    },
    {
      id: 'ind-voli-7',
      nama: 'Sportivitas & Komunikasi Tim',
      deskripsi: 'Memanggil bola aktif dengan suara jelas, mematuhi instruksi guru dan menghargai teman.',
    },
  ],
  'sepak bola': [
    {
      id: 'ind-bola-1',
      nama: 'Posisi Kaki Tumpu di Samping Bola',
      deskripsi: 'Kaki tumpu diletakkan sekitar 15 cm di samping bola, ujung kaki mengarah ke sasaran.',
    },
    {
      id: 'ind-bola-2',
      nama: 'Titik Sentuh & Perkenaan Kaki',
      deskripsi: 'Perkenaan bola tepat di tengah bola menggunakan kaki bagian dalam/luar/kura-kura.',
    },
    {
      id: 'ind-bola-3',
      nama: 'Kontrol Bola & Penguasaan Tubuh',
      deskripsi: 'Bola tidak memantul terlalu jauh dari penguasaan tubuh, badan condong stabil.',
    },
    {
      id: 'ind-bola-4',
      nama: 'Akurasi Operan & Laju Bola',
      deskripsi: 'Bola meluncur datar stabil dan tepat sasaran kepada rekan atau gawang target.',
    },
    {
      id: 'ind-bola-5',
      nama: 'Gerakan Lanjutan (Follow Through)',
      deskripsi: 'Kaki penendang melanjutkan ayunan ke depan mengikuti garis lintasan bola.',
    },
    {
      id: 'ind-bola-6',
      nama: 'Kelincahan & Pandangan Lapangan',
      deskripsi: 'Kepala tegak memindai lapangan, tidak hanya menatap bola saat bergerak.',
    },
  ],
  'bulutangkis': [
    {
      id: 'ind-bad-1',
      nama: 'Pegangan Raket (Grip Forehand/Backhand)',
      deskripsi: 'Ibu jari dan jari telunjuk membentuk huruf V, cengkeraman rileks tidak kaku.',
    },
    {
      id: 'ind-bad-2',
      nama: 'Footwork & Posisi Kaki',
      deskripsi: 'Langkah kaki lincah menjangkau shuttlecock dengan tumpuan kaki dominan di depan.',
    },
    {
      id: 'ind-bad-3',
      nama: 'Titik Kontak Shuttlecock Tertinggi',
      deskripsi: 'Memukul shuttlecock di titik jangkauan optimal di atas kepala atau depan badan.',
    },
    {
      id: 'ind-bad-4',
      nama: 'Akurasi & Penempatan Pukulan',
      deskripsi: 'Shuttlecock jatuh di area bidang target (dalam garis batas lawan).',
    },
    {
      id: 'ind-bad-5',
      nama: 'Recovery Posisi Tengah Lapangan',
      deskripsi: 'Segera kembali ke base camp tengah lapangan setelah melepaskan pukulan.',
    },
  ],
  'senam': [
    {
      id: 'ind-senam-1',
      nama: 'Sikap Awalan & Posisi Telapak Tangan',
      deskripsi: 'Jongkok seimbang, kedua tangan bertumpu di atas matras selebar bahu.',
    },
    {
      id: 'ind-senam-2',
      nama: 'Tengkuk Menyentuh Matras (Dagu Rapat)',
      deskripsi: 'Dagu ditarik rapat ke dada, ubun-ubun kepala tidak membentur matras.',
    },
    {
      id: 'ind-senam-3',
      nama: 'Bentuk Badan Membulat (Tuck Position)',
      deskripsi: 'Lutut dirapatkan ke dada, badan menggulung bulat dengan rapi dan mulus.',
    },
    {
      id: 'ind-senam-4',
      nama: 'Dorongan Tangan & Kecepatan Berguling',
      deskripsi: 'Tolakan kedua tangan kuat dan simetris mendorong tubuh berguling lurus.',
    },
    {
      id: 'ind-senam-5',
      nama: 'Sikap Akhir & Pendaratan Tegak',
      deskripsi: 'Mendarat kembali dengan kedua kaki rapat, bertumpu stabil tanpa terjengkang.',
    },
  ],
  'kebugaran': [
    {
      id: 'ind-fit-1',
      nama: 'Kesesuaian Teknik Postur Gerak',
      deskripsi: 'Posisi tubuh lurus, sudut siku/lutut memenuhi standar penilaian tes fisik.',
    },
    {
      id: 'ind-fit-2',
      nama: 'Konsistensi Irama & Ritme Gerakan',
      deskripsi: 'Mampu menjaga tempo dan ritme stabil tanpa terputus sepanjang repetisi tes.',
    },
    {
      id: 'ind-fit-3',
      nama: 'Kepatuhan Regulasi & Instruksi',
      deskripsi: 'Mematuhi sinyal aba-aba mulai dan selesai dengan penuh kedisiplinan.',
    },
    {
      id: 'ind-fit-4',
      nama: 'Semangat Pantang Menyerah & Daya Juang',
      deskripsi: 'Berupaya mengerahkan kapasitas fisik maksimal secara jujur dan optimal.',
    },
  ],
  'basket': [
    {
      id: 'ind-bsk-1',
      nama: 'Kuda-kuda Triple Threat & Grip Bola',
      deskripsi: 'Kaki siap melangkah, kedua tangan memegang bola kokoh di depan dada.',
    },
    {
      id: 'ind-bsk-2',
      nama: 'Pelepasan Bola & Snap Pergelangan',
      deskripsi: 'Dorongan lurus dari dada dengan lecutan pergelangan tangan (wrist snap).',
    },
    {
      id: 'ind-bsk-3',
      nama: 'Akurasi & Target Lemparan',
      deskripsi: 'Bola meluncur setinggi dada rekan penerima tanpa melambung liar.',
    },
    {
      id: 'ind-bsk-4',
      nama: 'Keseimbangan Tubuh & Kesiapan Gerak',
      deskripsi: 'Keseimbangan kaki terjaga, siap bergerak memotong atau bertahan.',
    },
  ],
  'atletik': [
    {
      id: 'ind-atl-1',
      nama: 'Sikap Kesiapan Start & Aba-aba',
      deskripsi: 'Posisi tubuh stabil mengikuti aba-aba bersedia, siap, dan reaksi cepat pada letupan.',
    },
    {
      id: 'ind-atl-2',
      nama: 'Ayunan Lengan Dinamis & Efisien',
      deskripsi: 'Lengan ditekuk 90 derajat berayun selaras dari pinggul ke depan dada.',
    },
    {
      id: 'ind-atl-3',
      nama: 'Frekuensi & Langkah Kaki Optimal',
      deskripsi: 'Langkah kaki bertenaga pada telapak kaki depan, dorongan panggul optimal.',
    },
    {
      id: 'ind-atl-4',
      nama: 'Sikap Tubuh Menembus Garis Finish',
      deskripsi: 'Dada condong ke depan melintasi garis finish tanpa melompat atau memperlambat.',
    },
  ],
  'umum': [
    {
      id: 'ind-gen-1',
      nama: 'Sikap Awal & Kesiapan Gerakan',
      deskripsi: 'Memposisikan tubuh dengan kuda-kuda kokoh dan siap melakukan gerakan olahraga.',
    },
    {
      id: 'ind-gen-2',
      nama: 'Pelaksanaan Teknik Inti',
      deskripsi: 'Mengeksekusi tahapan teknik gerak sesuai instruksi dan prinsip biomekanika.',
    },
    {
      id: 'ind-gen-3',
      nama: 'Titik Sentuh / Kualitas Hasil Gerak',
      deskripsi: 'Hasil gerakan terarah, akurat, dan memenuhi target capaian pembelajaran.',
    },
    {
      id: 'ind-gen-4',
      nama: 'Keseimbangan & Sikap Akhir',
      deskripsi: 'Menjaga kestabilan tubuh setelah gerakan tuntas (follow through).',
    },
    {
      id: 'ind-gen-5',
      nama: 'Sportivitas, Keselamatan & Etika',
      deskripsi: 'Menghargai keselamatan diri dan orang lain, mematuhi norma olahraga PJOK.',
    },
  ],
};

export const DEFAULT_STANDAR_INDIKATOR: IndikatorTemplate[] = [
  {
    id: 'ind-std-1',
    nama: '1. Sikap Awalan & Kuda-kuda',
    deskripsi: 'Kesiapan posisi kaki, lutut, dan postur badan sebelum gerakan dimulai.',
  },
  {
    id: 'ind-std-2',
    nama: '2. Eksekusi Teknik Gerak Inti',
    deskripsi: 'Kebenaran pola gerak, koordinasi sendi, dan timing ayunan/dorongan.',
  },
  {
    id: 'ind-std-3',
    nama: '3. Titik Sentuh / Ketepatan Gerakan',
    deskripsi: 'Presisi perkenaan bola/alat/matras dan efektivitas tenaga yang disalurkan.',
  },
  {
    id: 'ind-std-4',
    nama: '4. Sikap Akhir (Follow Through)',
    deskripsi: 'Keseimbangan pendaratan tubuh dan kesiapan kembali ke posisi siaga.',
  },
  {
    id: 'ind-std-5',
    nama: '5. Sportivitas & Kedisiplinan',
    deskripsi: 'Mematuhi instruksi guru, memelihara keselamatan, dan menjunjung sportivitas.',
  },
];

/**
 * Mencari indikator yang paling sesuai berdasarkan judul materi pembelajaran
 */
export function getSuggestedIndicatorsForMateri(materiJudul: string): IndikatorTemplate[] {
  const q = (materiJudul || '').toLowerCase();

  if (q.includes('voli') || q.includes('volley')) {
    return MASTER_INDIKATOR_LIBRARY['voli'];
  }
  if (q.includes('sepak') || q.includes('futsal') || q.includes('bola besar')) {
    return MASTER_INDIKATOR_LIBRARY['sepak bola'];
  }
  if (q.includes('bulutangkis') || q.includes('badminton')) {
    return MASTER_INDIKATOR_LIBRARY['bulutangkis'];
  }
  if (q.includes('senam') || q.includes('lantai') || q.includes('roll')) {
    return MASTER_INDIKATOR_LIBRARY['senam'];
  }
  if (q.includes('kebugaran') || q.includes('jasmani') || q.includes('mft') || q.includes('push up')) {
    return MASTER_INDIKATOR_LIBRARY['kebugaran'];
  }
  if (q.includes('basket')) {
    return MASTER_INDIKATOR_LIBRARY['basket'];
  }
  if (q.includes('lari') || q.includes('atletik') || q.includes('estafet') || q.includes('sprint')) {
    return MASTER_INDIKATOR_LIBRARY['atletik'];
  }

  return DEFAULT_STANDAR_INDIKATOR;
}

/**
 * Konversi daftar template indikator menjadi objek IndikatorPraktik dengan skor awal (default 3 / Baik)
 */
export function createDefaultIndikatorPraktikList(
  templates: IndikatorTemplate[],
  defaultScore: number = 3
): IndikatorPraktik[] {
  return templates.map((t) => ({
    id: t.id || `ind-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nama: t.nama,
    deskripsi: t.deskripsi,
    skor: defaultScore,
  }));
}

/**
 * Menghitung nilai akhir 0-100 dan predikat dari kumpulan indikator
 */
export function calculateIndikatorScore(indikatorList: IndikatorPraktik[]): {
  totalSkor: number;
  maxSkor: number;
  nilai100: number;
  rataRataSkala4: number;
  predikat: 'A' | 'B' | 'C' | 'D';
  predikatLabel: string;
} {
  if (!indikatorList || indikatorList.length === 0) {
    return {
      totalSkor: 0,
      maxSkor: 4,
      nilai100: 75,
      rataRataSkala4: 3.0,
      predikat: 'B',
      predikatLabel: 'B (Baik)',
    };
  }

  const totalSkor = indikatorList.reduce((sum, ind) => sum + (Number(ind.skor) || 1), 0);
  const maxSkor = indikatorList.length * 4;
  const nilai100 = Math.min(100, Math.max(0, Math.round((totalSkor / maxSkor) * 100)));
  const rataRataSkala4 = Number((totalSkor / indikatorList.length).toFixed(2));

  let predikat: 'A' | 'B' | 'C' | 'D' = 'C';
  let predikatLabel = 'C (Cukup)';

  if (nilai100 >= 88) {
    predikat = 'A';
    predikatLabel = 'A (Sangat Baik)';
  } else if (nilai100 >= 78) {
    predikat = 'B';
    predikatLabel = 'B (Baik)';
  } else if (nilai100 >= 65) {
    predikat = 'C';
    predikatLabel = 'C (Cukup)';
  } else {
    predikat = 'D';
    predikatLabel = 'D (Kurang)';
  }

  return {
    totalSkor,
    maxSkor,
    nilai100,
    rataRataSkala4,
    predikat,
    predikatLabel,
  };
}

export const SKALA_INDIKATOR_INFO: Record<
  number,
  { label: string; badge: string; short: string; bg: string; text: string; activeBg: string }
> = {
  1: {
    label: 'Kurang (1)',
    short: 'Kurang',
    badge: 'K',
    bg: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    text: 'text-rose-700',
    activeBg: 'bg-rose-600 text-white border-rose-600 shadow-xs font-bold ring-2 ring-rose-400',
  },
  2: {
    label: 'Cukup (2)',
    short: 'Cukup',
    badge: 'C',
    bg: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    text: 'text-amber-700',
    activeBg: 'bg-amber-500 text-white border-amber-500 shadow-xs font-bold ring-2 ring-amber-400',
  },
  3: {
    label: 'Baik (3)',
    short: 'Baik',
    badge: 'B',
    bg: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
    text: 'text-sky-700',
    activeBg: 'bg-sky-600 text-white border-sky-600 shadow-xs font-bold ring-2 ring-sky-400',
  },
  4: {
    label: 'Sangat Baik (4)',
    short: 'Sangat Baik',
    badge: 'SB',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    text: 'text-emerald-700',
    activeBg: 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold ring-2 ring-emerald-400',
  },
};
