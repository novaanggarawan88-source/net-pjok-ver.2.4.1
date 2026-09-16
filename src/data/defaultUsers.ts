import { User, RekapNilaiMurid } from '../types';

export interface StudentCSVRecord {
  id: string;
  username: string;
  role: string;
  name: string;
  nip: string;
  email?: string;
  status: 'Aktif' | 'Nonaktif';
  avatar?: string;
}

export const RAW_USERS_CSV_DATA: StudentCSVRecord[] = [
  {
    id: 'usr-admin-1',
    username: 'admin',
    role: 'ADMIN',
    name: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
    nip: '198811152022211012',
    email: 'i5123@guru.sma.belajar.id',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-guru-1',
    username: 'guru',
    role: 'GURU',
    name: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
    nip: '198811152022211013',
    email: 'i5123@guru.sma.belajar.id',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-murid-1',
    username: 'murid',
    role: 'MURID',
    name: 'Gede Aditya Pratama',
    nip: '240101', // NIS
    email: 'aditya.pratama@siswa.sman1olahraga.sch.id',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-murid-2',
    username: 'murid1',
    role: 'MURID',
    name: 'Ni Kadek Dwi Lestari',
    nip: '240102', // NIS
    email: 'dwi.lestari@siswa.sman1olahraga.sch.id',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-murid-3',
    username: 'murid2',
    role: 'MURID',
    name: 'I Made Yoga Mahendra',
    nip: '240103', // NIS
    email: 'yoga.mahendra@siswa.sman1olahraga.sch.id',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
  },
];

export const DEFAULT_USERS: User[] = RAW_USERS_CSV_DATA.map((r) => {
  const isMurid = r.role.toLowerCase().includes('murid') || (!r.role.includes('ADMIN') && !r.role.includes('GURU'));
  const isGuru = r.role === 'GURU';
  const isAdmin = r.role === 'ADMIN';

  const user: User = {
    id: r.id,
    username: r.username,
    role: isAdmin ? 'ADMIN' : isGuru ? 'GURU' : 'MURID',
    name: r.name,
    email: r.email || (isMurid ? `${r.username}@siswa.sman1olahraga.sch.id` : `${r.username}@guru.sma.belajar.id`),
    status: r.status,
    avatar: r.avatar,
    password: '123456',
  };

  if (isAdmin || isGuru) {
    user.nip = r.nip;
    if (isGuru) {
      user.mataPelajaran = 'PJOK';
      user.kelasDiampuIds = ['cls-xi-1', 'cls-xi-2'];
      user.kelasDiampu = ['XI 1', 'XI 2'];
    }
  } else {
    user.nis = r.nip;
    user.nisn = `0089${r.nip}`;
    user.kelasId = 'cls-xi-1';
    user.jenisKelamin = r.username === 'murid1' ? 'P' : 'L';
    user.tahunPelajaran = '2026/2027';
  }

  return user;
});

// Rekap Nilai Kosong secara default (akan diisi manual atau diupload)
export const DEFAULT_NILAI: RekapNilaiMurid[] = [];
