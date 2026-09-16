import { getGoogleAccessToken } from './firebaseAuth';
import { User, UserRole, Materi, PenilaianPraktik, resolveKelasId } from '../types';

export interface SheetMetadata {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  sheets: string[];
}

export const REQUIRED_SHEETS = [
  'USERS',
  'ADMIN',
  'GURU',
  'MURID',
  'KELAS',
  'MATERI',
  'TUGAS',
  'PENGUMPULAN',
  'QUIZ',
  'SOAL',
  'JAWABAN',
  'PRESENSI',
  'NILAI',
  'JURNAL',
  'NOTIFIKASI',
  'SETTING',
];

/**
 * Extract spreadsheet ID from full URL or return ID directly.
 * Handles standard Google Sheets URLs, published web links (/d/e/2PACX-...), and raw IDs.
 */
export const extractSpreadsheetId = (urlOrId: string): string | null => {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // 1. Check published web link: /spreadsheets/d/e/(2PACX-[a-zA-Z0-9_-]+)
  const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)/i);
  if (pubMatch && pubMatch[1]) {
    return pubMatch[1];
  }

  // 2. Check standard edit/view link: /spreadsheets/d/([a-zA-Z0-9_-]{20,})
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/i);
  if (match && match[1]) {
    return match[1];
  }

  // 3. Check if it's already a raw ID (20+ chars, or published 2PACX-...)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  // 4. Fallback: match any segment after /spreadsheets/d/ that is not "e"
  const fallback = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
  if (fallback && fallback[1] && fallback[1].toLowerCase() !== 'e') {
    return fallback[1];
  }

  return null;
};

/**
 * Extract sheet gid (tab ID) from URL if present (e.g. #gid=12345 or ?gid=12345)
 */
export const extractGid = (urlOrId: string): string | null => {
  if (!urlOrId) return null;
  const match = urlOrId.match(/[#&?]gid=([0-9]+)/);
  return match ? match[1] : null;
};

/**
 * Check if the spreadsheet is a published web link (starts with 2PACX- or has /d/e/)
 */
export const isPublishedSpreadsheet = (urlOrId: string): boolean => {
  if (!urlOrId) return false;
  return urlOrId.includes('/d/e/') || urlOrId.startsWith('2PACX-') || urlOrId.includes('2PACX-');
};

export const createPJOKSpreadsheet = async (title: string = 'LMS_PJOK_DATABASE_2026'): Promise<SheetMetadata> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Belum terhubung dengan akun Google. Silakan klik Sambungkan Google.');
  }

  // Create new Spreadsheet with the sheets
  const sheetsConfig = REQUIRED_SHEETS.map((sheetTitle) => ({
    properties: { title: sheetTitle },
  }));

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: sheetsConfig,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gagal membuat Google Spreadsheet: ${response.statusText} (${errorText})`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
    sheets: REQUIRED_SHEETS,
  };
};

export const syncAllDataToSpreadsheet = async (
  spreadsheetId: string,
  allData: Record<string, any[]>
): Promise<{ success: boolean; updatedSheets: number }> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Akses token Google tidak tersedia');
  }

  // Prepare batch value data
  const dataPayload: Array<{ range: string; values: any[][] }> = [];

  for (const sheetName of REQUIRED_SHEETS) {
    const records = allData[sheetName] || [];
    if (records.length === 0) {
      dataPayload.push({
        range: `${sheetName}!A1:Z1`,
        values: [['ID', 'DATA_KOSONG', 'TIMESTAMP']],
      });
      continue;
    }

    // Extract headers
    const sample = records[0];
    const headers = Object.keys(sample);
    const rows = records.map((item) =>
      headers.map((key) => {
        const val = item[key];
        if (typeof val === 'object' && val !== null) {
          return JSON.stringify(val);
        }
        return val !== undefined && val !== null ? String(val) : '';
      })
    );

    dataPayload.push({
      range: `${sheetName}!A1`,
      values: [headers, ...rows],
    });
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataPayload,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal sinkronisasi data: ${errText}`);
  }

  return { success: true, updatedSheets: dataPayload.length };
};

export const fetchSheetData = async (
  spreadsheetId: string,
  sheetName: string
): Promise<any[]> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Akses token Google tidak tersedia');
  }

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z1000`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Gagal membaca sheet ${sheetName}: ${res.statusText}`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0];
  const items = rows.slice(1).map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((h: string, idx: number) => {
      const val = row[idx] ?? '';
      try {
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          obj[h] = JSON.parse(val);
        } else {
          obj[h] = val;
        }
      } catch {
        obj[h] = val;
      }
    });
    return obj;
  });

  return items;
};

/**
 * Fetch all sheets from Google Spreadsheet via official Google Sheets REST API v4.
 * Uses Google OAuth token to access even private documents and discover all sheet tab names.
 */
export const fetchAllSheetsViaGoogleApi = async (
  spreadsheetId: string
): Promise<{
  success: boolean;
  sheets: Record<string, any[]>;
  sheetTitles: string[];
  message: string;
}> => {
  const token = getGoogleAccessToken();
  if (!token) {
    return {
      success: false,
      sheets: {},
      sheetTitles: [],
      message: 'Akses token Google tidak tersedia. Sambungkan Akun Google terlebih dahulu.',
    };
  }

  try {
    // 1. Get spreadsheet metadata (list of all sheets)
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      return {
        success: false,
        sheets: {},
        sheetTitles: [],
        message: `HTTP ${metaRes.status}: Gagal membaca metadata Spreadsheet (${errText.slice(0, 150)})`,
      };
    }

    const meta = await metaRes.json();
    const sheetTitles: string[] = (meta.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);

    if (sheetTitles.length === 0) {
      return {
        success: false,
        sheets: {},
        sheetTitles: [],
        message: 'Tidak ada sheet yang ditemukan dalam Spreadsheet ini.',
      };
    }

    // 2. Fetch data for each sheet tab
    const sheetsData: Record<string, any[]> = {};
    for (const title of sheetTitles) {
      try {
        const rows = await fetchSheetData(spreadsheetId, title);
        sheetsData[title] = rows;
      } catch (sheetErr) {
        console.warn(`Gagal membaca sheet ${title}:`, sheetErr);
        sheetsData[title] = [];
      }
    }

    return {
      success: true,
      sheets: sheetsData,
      sheetTitles,
      message: `Berhasil membaca ${sheetTitles.length} lembar sheet via Google Sheets API.`,
    };
  } catch (err: any) {
    return {
      success: false,
      sheets: {},
      sheetTitles: [],
      message: `Koneksi Google Sheets API gagal: ${err?.message || 'Error tidak diketahui'}`,
    };
  }
};

/**
 * Robust CSV parser that handles commas inside quotes, multi-line values, and tab/semicolon separators.
 */
export const parseCSV = (text: string): string[][] => {
  const clean = text.trim();
  if (!clean) return [];

  const lines: string[][] = [];
  let row: string[] = [];
  let currentVal = '';
  let insideQuote = false;

  // Auto detect delimiter (tab, semicolon, or comma) across the first few lines
  const sampleLines = clean.split(/\r?\n/).slice(0, 5).join('\n');
  let delimiter = ',';
  if (sampleLines.includes('\t')) {
    delimiter = '\t';
  } else if (sampleLines.includes(';') && !sampleLines.includes(',')) {
    delimiter = ';';
  }

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === delimiter && !insideQuote) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal.trim());
      currentVal = '';
      if (row.some((cell) => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
    } else {
      currentVal += char;
    }
  }

  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
};

/**
 * Parse CSV text into User records with intelligent header detection and flexible column matching.
 * Tolerates title banner rows (e.g. school header) and Indonesian school column naming variations.
 */
export const parseCSVToUsers = (csvText: string): User[] => {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  // 1. Detect actual header row (in case row 0-2 contain title banners like "DAFTAR SISWA KELAS XI")
  let headerIndex = 0;
  const headerKeywords = [
    'nama',
    'name',
    'nis',
    'nisn',
    'nip',
    'siswa',
    'murid',
    'user',
    'username',
    'kelas',
    'rombel',
    'gender',
    'jk',
    'role',
    'peran',
  ];

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const rowCells = rows[r].map((c) => c.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
    const matches = rowCells.filter((c) => headerKeywords.some((kw) => c.includes(kw) || kw.includes(c)));
    if (matches.length >= 2) {
      headerIndex = r;
      break;
    }
  }

  const rawHeaders = rows[headerIndex].map((h) => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, ''));
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  // Flexible column retrieval: exact match first, then substring match
  const getCol = (r: string[], colNames: string[]): string => {
    // 1. Exact match
    for (const name of colNames) {
      if (headerMap[name] !== undefined && r[headerMap[name]] !== undefined) {
        const val = r[headerMap[name]].trim();
        if (val) return val;
      }
    }
    // 2. Substring / contains match (e.g., 'namasiswa' matches 'nama')
    for (const name of colNames) {
      for (const [h, colIdx] of Object.entries(headerMap)) {
        if ((h.includes(name) || name.includes(h)) && r[colIdx] !== undefined) {
          const val = r[colIdx].trim();
          if (val) return val;
        }
      }
    }
    return '';
  };

  const users: User[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c)) continue;

    // Check if row is another sub-banner or empty
    const testLine = row.join(' ').toLowerCase();
    if (testLine.includes('daftar siswa') || testLine.includes('tahun pelajaran') || testLine.includes('rekapitulasi')) {
      continue;
    }

    const name = getCol(row, [
      'namasiswa',
      'namamurid',
      'namapesertadidik',
      'namalengkap',
      'nama',
      'name',
      'pesertadidik',
      'siswa',
      'murid',
    ]);
    const nipOrNis = getCol(row, [
      'nis',
      'nisn',
      'noinduk',
      'nomorinduk',
      'induk',
      'nip',
      'nik',
    ]);

    // If both name and nip/nis are missing, skip row
    if (!name && !nipOrNis) continue;

    const id = getCol(row, ['id', 'userid']) || `usr-${Date.now()}-${i}`;
    const username = getCol(row, ['username', 'user']) || nipOrNis || (name ? name.toLowerCase().replace(/[^a-z0-9]/g, '') : `user${i}`);

    let roleStr = getCol(row, ['role', 'peran', 'jabatan', 'tipe']).toUpperCase();
    let role: UserRole = 'MURID';
    if (roleStr.includes('ADMIN')) {
      role = 'ADMIN';
    } else if (roleStr.includes('GURU') || getCol(row, ['nip'])) {
      role = 'GURU';
    } else {
      role = 'MURID';
    }

    const email = getCol(row, ['email', 'surel', 'mail', 'alamatemail']);
    const statusRaw = getCol(row, ['status', 'keaktifan', 'keterangan']);
    const status: 'Aktif' | 'Nonaktif' = statusRaw.toLowerCase().includes('non') ? 'Nonaktif' : 'Aktif';
    const avatar = getCol(row, ['avatar', 'foto', 'image', 'fotoprofil']);

    const user: User = {
      id,
      username,
      role,
      name: name || username,
      email: email || undefined,
      status,
      avatar: avatar || undefined,
    };

    if (role === 'ADMIN' || role === 'GURU') {
      user.nip = nipOrNis || undefined;
      user.mataPelajaran = role === 'GURU' ? 'PJOK Fase E & F' : undefined;
      const rawDiampu = getCol(row, ['kelasdiampu', 'diampu', 'mengajar', 'kelas']);
      if (rawDiampu) {
        user.kelasDiampu = rawDiampu.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
      }
    } else {
      // Murid
      user.nis = nipOrNis || undefined;
      const rawKelas = getCol(row, [
        'kelas',
        'rombel',
        'tingkat',
        'kelassiswa',
        'kelasid',
        'namakelas',
        'idkelas',
        'ruangkelas',
        'class',
      ]);

      const standardKelas: any[] = [
        { id: 'cls-xi-1', nama: 'XI 1', tingkat: 'XI', jurusan: 'Umum' },
        { id: 'cls-xi-2', nama: 'XI 2', tingkat: 'XI', jurusan: 'Umum' },
        { id: 'cls-xi-3', nama: 'XI 3', tingkat: 'XI', jurusan: 'Umum' },
        { id: 'cls-x-1', nama: 'X 1', tingkat: 'X', jurusan: 'Umum' },
        { id: 'cls-x-2', nama: 'X 2', tingkat: 'X', jurusan: 'Umum' },
        { id: 'cls-xii-1', nama: 'XII 1', tingkat: 'XII', jurusan: 'Umum' },
      ];
      const resolved = resolveKelasId(rawKelas, standardKelas as any, 'cls-xi-1');
      user.kelasId = resolved.id;
      user.tahunPelajaran = '2026/2027';

      // Gender from CSV or guess
      const rawJk = getCol(row, ['jk', 'jeniskelamin', 'gender', 'sex', 'lp']).toUpperCase();
      if (rawJk.startsWith('P') || rawJk.includes('PEREMPUAN') || rawJk.includes('WANITA')) {
        user.jenisKelamin = 'P';
      } else if (rawJk.startsWith('L') || rawJk.includes('LAKI') || rawJk.includes('PRIA')) {
        user.jenisKelamin = 'L';
      } else {
        // Detect gender guess from Balinese/Indonesian names
        const lowerName = (name || '').toLowerCase();
        if (
          lowerName.includes('ni ') ||
          lowerName.includes('putu ') ||
          lowerName.includes('dewi') ||
          lowerName.includes('ayu') ||
          lowerName.includes('luh ') ||
          lowerName.includes('komang ayu') ||
          lowerName.includes('savitri') ||
          lowerName.includes('purwani') ||
          lowerName.includes('caitanya') ||
          lowerName.includes('febriana') ||
          lowerName.includes('vitare') ||
          lowerName.includes('sinthya') ||
          lowerName.includes('cintya') ||
          lowerName.includes('sinta') ||
          lowerName.includes('nadine') ||
          lowerName.includes('ida ayu')
        ) {
          user.jenisKelamin = 'P';
        } else {
          user.jenisKelamin = 'L';
        }
      }
    }

    users.push(user);
  }

  return users;
};

/**
 * Export users array to CSV matching the user's exact specification:
 * id,username,role,name,nip,kelas,jenisKelamin,email,status,avatar
 */
export const exportUsersToCSV = (users: User[]): string => {
  const headers = ['id', 'username', 'role', 'name', 'nip', 'kelas', 'jenisKelamin', 'email', 'status', 'avatar'];
  const escapeCell = (val: any): string => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = users.map((u) => {
    const nipVal = u.role === 'MURID' ? u.nis || u.nip || '' : u.nip || '';
    const roleVal = u.role === 'MURID' ? (u.username.startsWith('murid') ? u.username : 'MURID') : u.role;
    const kelasVal = u.kelasId || '';
    const jkVal = u.jenisKelamin || '';
    return [
      escapeCell(u.id),
      escapeCell(u.username),
      escapeCell(roleVal),
      escapeCell(u.name),
      escapeCell(nipVal),
      escapeCell(kelasVal),
      escapeCell(jkVal),
      escapeCell(u.email || ''),
      escapeCell(u.status),
      escapeCell(u.avatar || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

/**
 * Send bidirectional data update to Google Apps Script Web App
 */
export const syncViaAppsScriptWebhook = async (
  webhookUrl: string,
  payload: { action: string; table?: string; data: any } | Record<string, any[]>
): Promise<{ success: boolean; message: string; statusCode?: number; details?: string }> => {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    throw new Error('URL Webhook / Google Apps Script tidak valid.');
  }

  const normalizedPayload =
    'action' in payload
      ? payload
      : {
          action: 'syncAll',
          data: payload,
          updatedAt: new Date().toISOString(),
        };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Apps Script accepts text/plain to avoid CORS preflight options issues
      },
      body: JSON.stringify(normalizedPayload),
    });

    const statusCode = res.status;
    const text = await res.text();

    if (!res.ok) {
      throw new Error(`Server Google Apps Script merespons kode HTTP ${statusCode}: ${res.statusText} (${text.slice(0, 200)})`);
    }

    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { status: 'success', message: text.slice(0, 150) };
    }

    return {
      success: true,
      statusCode,
      message: json.message || 'Data berhasil dikirim ke Google Spreadsheet!',
      details: text.slice(0, 300),
    };
  } catch (err: any) {
    const isCors = err?.name === 'TypeError' || String(err).includes('fetch');
    if (isCors) {
      // Note: Google Apps Script Web App redirects with 302, which browser fetch sometimes flags as opaque or cross-origin
      return {
        success: true,
        statusCode: 200,
        message: 'Perintah pembaruan spreadsheet telah dikirimkan ke Google Apps Script.',
        details: 'Permintaan dikirim (background 302 redirect). Cek Google Spreadsheet Anda untuk memastikan data terupdate.',
      };
    }
    return {
      success: false,
      statusCode: 0,
      message: err?.message || 'Gagal mengirim data ke Webhook Google Apps Script.',
      details: String(err),
    };
  }
};

/**
 * Fetch data directly from Google Sheets via Google Visualization API (GViz) CSV or CSV Export.
 * Works if the Google Sheet has "Anyone with the link can view" permission without needing Apps Script!
 * Automatically tries tab aliases, omission of sheet parameter (default sheet), gid, and CSV export.
 */
export const fetchSheetViaGViz = async (
  spreadsheetIdOrUrl: string,
  sheetName: string = 'USERS'
): Promise<{
  success: boolean;
  data: User[];
  csvText: string;
  statusCode: number;
  message: string;
  detectedSheetTitle?: string;
}> => {
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  if (!spreadsheetId) {
    return {
      success: false,
      data: [],
      csvText: '',
      statusCode: 400,
      message: 'ID Google Spreadsheet tidak valid atau tidak ditemukan dalam URL.',
    };
  }

  const gid = extractGid(spreadsheetIdOrUrl);
  const isPub = isPublishedSpreadsheet(spreadsheetIdOrUrl);

  // 1. Try Google Sheets REST API first if OAuth token is available
  const token = getGoogleAccessToken();
  if (token && !isPub) {
    try {
      const apiRes = await fetchAllSheetsViaGoogleApi(spreadsheetId);
      if (apiRes.success && apiRes.sheets) {
        // Find matching sheet
        const sheetKeys = Object.keys(apiRes.sheets);
        let foundUsers: User[] = [];
        let matchedTitle = '';

        for (const title of sheetKeys) {
          const lower = title.toLowerCase();
          if (
            lower.includes('user') ||
            lower.includes('murid') ||
            lower.includes('siswa') ||
            lower.includes('peserta') ||
            title === sheetName
          ) {
            const rawRows = apiRes.sheets[title];
            if (rawRows.length > 0) {
              // Convert object rows back to users
              foundUsers = rawRows.map((r: any, idx: number) => {
                const name = r.name || r.nama || r.namasiswa || r.namalengkap || `Siswa ${idx + 1}`;
                const nis = r.nis || r.nisn || r.noinduk || '';
                const role = (r.role || (r.nip ? 'GURU' : 'MURID')).toUpperCase().includes('GURU') ? 'GURU' : 'MURID';
                return {
                  id: r.id || `usr-${Date.now()}-${idx}`,
                  username: r.username || nis || name.toLowerCase().replace(/[^a-z0-9]/g, ''),
                  name,
                  role,
                  nis: role === 'MURID' ? nis : undefined,
                  nip: role !== 'MURID' ? (r.nip || nis) : undefined,
                  kelasId: r.kelasId || r.kelas || 'cls-xi-1',
                  jenisKelamin: (r.jenisKelamin || r.jk || 'L').toUpperCase().startsWith('P') ? 'P' : 'L',
                  status: 'Aktif',
                } as User;
              });
              matchedTitle = title;
              break;
            }
          }
        }

        // If no specifically named sheet found, but there's at least one sheet with rows
        if (foundUsers.length === 0 && sheetKeys.length > 0) {
          const firstKey = sheetKeys[0];
          const rawRows = apiRes.sheets[firstKey];
          if (rawRows.length > 0) {
            foundUsers = rawRows.map((r: any, idx: number) => ({
              id: r.id || `usr-${Date.now()}-${idx}`,
              username: r.username || r.nis || `user${idx + 1}`,
              name: r.name || r.nama || r.namasiswa || `Siswa ${idx + 1}`,
              role: (r.role || 'MURID').toUpperCase().includes('GURU') ? 'GURU' : 'MURID',
              nis: r.nis || r.nisn || '',
              kelasId: r.kelasId || r.kelas || 'cls-xi-1',
              jenisKelamin: (r.jenisKelamin || r.jk || 'L').toUpperCase().startsWith('P') ? 'P' : 'L',
              status: 'Aktif',
            } as User));
            matchedTitle = firstKey;
          }
        }

        if (foundUsers.length > 0) {
          return {
            success: true,
            data: foundUsers,
            csvText: '',
            statusCode: 200,
            message: `Berhasil menarik ${foundUsers.length} data pengguna dari sheet "${matchedTitle}" via Akun Google!`,
            detectedSheetTitle: matchedTitle,
          };
        }
      }
    } catch (oauthErr) {
      console.warn('OAuth Sheets API attempt failed, proceeding to public GViz/CSV:', oauthErr);
    }
  }

  // 2. Build URL candidates for GViz / CSV Export
  const candidateUrls: Array<{ url: string; label: string }> = [];

  // A. Published Web link
  if (isPub) {
    candidateUrls.push({
      url: `https://docs.google.com/spreadsheets/d/e/${spreadsheetId}/pub?output=csv${gid ? `&gid=${gid}` : ''}`,
      label: 'Published CSV Web Export',
    });
  }

  // B. Specific GID if available in original URL
  if (gid) {
    candidateUrls.push({
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
      label: `GViz with gid=${gid}`,
    });
    candidateUrls.push({
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
      label: `CSV Export with gid=${gid}`,
    });
  }

  // C. Requested sheet name
  if (sheetName && sheetName !== 'ALL') {
    candidateUrls.push({
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`,
      label: `GViz Sheet "${sheetName}"`,
    });
  }

  // D. Common sheet tab names in Indonesian school spreadsheets
  const commonTabNames = [
    'Sheet1',
    'Sheet 1',
    'USERS',
    'users',
    'MURID',
    'Murid',
    'Data Siswa',
    'DATA SISWA',
    'Siswa',
    'SISWA',
    'Data Murid',
    'DATA MURID',
    'Daftar Siswa',
    'Peserta Didik',
    'Lembar1',
    'Lembar 1',
  ];

  for (const tab of commonTabNames) {
    if (tab.toLowerCase() !== (sheetName || '').toLowerCase()) {
      candidateUrls.push({
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`,
        label: `GViz Tab "${tab}"`,
      });
    }
  }

  // E. Primary default tab (no sheet param specified)
  candidateUrls.push({
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`,
    label: 'GViz Primary (Default) Sheet',
  });

  // F. Direct export fallback
  candidateUrls.push({
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`,
    label: 'Google Sheets Direct CSV Export',
  });

  let lastStatusCode = 0;
  let lastText = '';
  let hadPrivateAccessError = false;

  for (const candidate of candidateUrls) {
    try {
      const res = await fetch(candidate.url, { method: 'GET' });
      lastStatusCode = res.status;
      const text = await res.text();
      lastText = text;

      if (!res.ok) {
        // If 401 or 403, sheet is private
        if (res.status === 401 || res.status === 403) {
          hadPrivateAccessError = true;
        }
        continue;
      }

      // Check if Google redirected to HTML login page
      const trimmed = text.trim();
      if (
        trimmed.startsWith('<!DOCTYPE') ||
        trimmed.startsWith('<html') ||
        trimmed.includes('accounts.google.com') ||
        trimmed.includes('ServiceLogin')
      ) {
        hadPrivateAccessError = true;
        continue;
      }

      // Check if GViz returned a query error like "Sheet '...' does not exist"
      if (trimmed.includes('google.visualization.Query.setResponse')) {
        if (trimmed.includes('does not exist') || trimmed.includes('invalid_query')) {
          continue; // Try next tab candidate
        }
      }

      // Attempt parsing
      const users = parseCSVToUsers(text);
      if (users.length > 0) {
        return {
          success: true,
          data: users,
          csvText: text,
          statusCode: 200,
          message: `Berhasil menarik ${users.length} siswa/pengguna (${candidate.label})!`,
          detectedSheetTitle: candidate.label,
        };
      }
    } catch {
      // Network or CORS error on candidate, proceed to next
      continue;
    }
  }

  // If private access was encountered
  if (hadPrivateAccessError) {
    return {
      success: false,
      data: [],
      csvText: lastText.slice(0, 300),
      statusCode: 403,
      message:
        'Spreadsheet bersifat Privat (Akses Ditolak). Silakan buka Spreadsheet Anda -> klik "Bagikan" (Share) di pojok kanan atas -> ubah "Akses umum" menjadi "Siapa saja yang memiliki tautan" (Pelihat / Viewer), atau gunakan tombol "Sambungkan Google" di LMS.',
    };
  }

  // If we got CSV text but no users could be parsed
  if (lastText && lastText.length > 20 && !lastText.startsWith('<')) {
    return {
      success: false,
      data: [],
      csvText: lastText.slice(0, 500),
      statusCode: 200,
      message:
        'Spreadsheet berhasil dihubungi, namun format kolom tidak dikenali. Pastikan baris judul memuat kolom seperti "Nama Siswa" (atau Nama) dan "NIS" (atau No Induk / Kelas).',
    };
  }

  return {
    success: false,
    data: [],
    csvText: '',
    statusCode: lastStatusCode || 0,
    message:
      'Gagal membaca Google Spreadsheet. Pastikan Spreadsheet dapat diakses publik (Akses umum: Siapa saja yang memiliki link) atau periksa koneksi internet Anda.',
  };
};

/**
 * Fetch data from Google Apps Script Web App with comprehensive diagnostics
 */
export const fetchViaAppsScriptWebhook = async (
  webhookUrl: string,
  sheetName: string = 'USERS'
): Promise<{
  success: boolean;
  data?: any;
  status?: string;
  message?: string;
  statusCode: number;
  rawText?: string;
  isHtml?: boolean;
  corsBlocked?: boolean;
  authError?: boolean;
}> => {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return {
      success: false,
      statusCode: 400,
      message: 'URL Webhook / Google Apps Script tidak valid atau kosong.',
    };
  }

  // Detect if user mistakenly pasted a Google Spreadsheet URL into the Webhook field
  if (webhookUrl.includes('docs.google.com/spreadsheets')) {
    const targetSheet = sheetName === 'ALL' ? 'USERS' : sheetName;
    const gvizRes = await fetchSheetViaGViz(webhookUrl, targetSheet);
    return {
      success: gvizRes.success,
      data: gvizRes.data,
      status: gvizRes.success ? 'success' : 'error',
      message: gvizRes.message,
      statusCode: gvizRes.statusCode,
      rawText: gvizRes.csvText.slice(0, 300),
    };
  }

  let url: URL;
  try {
    url = new URL(webhookUrl);
    url.searchParams.set('action', 'getData');
    url.searchParams.set('sheet', sheetName);
  } catch {
    return {
      success: false,
      statusCode: 400,
      message: 'Format URL Webhook tidak dapat di-parse sebagai URL valid.',
    };
  }

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
    });

    const statusCode = res.status;
    const text = await res.text();
    const isHtml = text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html');

    if (isHtml) {
      // Check if it's Google Accounts login page
      const isGoogleLogin = text.includes('accounts.google.com') || text.includes('Sign in') || text.includes('Google Accounts');
      return {
        success: false,
        statusCode: 401,
        isHtml: true,
        authError: isGoogleLogin,
        rawText: text.slice(0, 400),
        message: isGoogleLogin
          ? 'Google Apps Script meminta login (Autentikasi diperlukan). Pastikan saat Deploy disetel "Who has access: Anyone (Siapa saja)".'
          : 'Webhook mengembalikan halaman HTML alih-alih data JSON. Periksa URL deployment Web App.',
      };
    }

    if (!res.ok) {
      return {
        success: false,
        statusCode,
        rawText: text.slice(0, 400),
        message: `HTTP ${statusCode}: Google Apps Script mengembalikan status error (${res.statusText}).`,
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Not JSON, might be CSV text or plain string
      return {
        success: false,
        statusCode,
        rawText: text.slice(0, 400),
        message: 'Respons dari Google Apps Script bukan format JSON yang valid.',
      };
    }

    // Normalizing parsed response structure
    let extractedData: any = [];
    if (Array.isArray(parsed)) {
      extractedData = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
        // Multi-table payload
        extractedData = parsed.data;
      } else if (parsed.USERS || parsed.users || parsed.MATERI || parsed.materi || parsed.NILAI || parsed.nilai) {
        // Direct multi-table object
        extractedData = parsed;
      } else if (Array.isArray(parsed.data)) {
        extractedData = parsed.data;
      } else if (Array.isArray(parsed.USERS)) {
        extractedData = parsed.USERS;
      } else if (Array.isArray(parsed.users)) {
        extractedData = parsed.users;
      } else if (Array.isArray(parsed.rows)) {
        extractedData = parsed.rows;
      } else {
        extractedData = parsed;
      }
    }

    const hasData = Array.isArray(extractedData) ? extractedData.length > 0 : Object.keys(extractedData || {}).length > 0;
    const isSuccess = parsed.status === 'success' || parsed.success === true || hasData;

    return {
      success: isSuccess,
      data: extractedData,
      status: parsed.status || (isSuccess ? 'success' : 'error'),
      message: parsed.message || (isSuccess ? 'Berhasil menerima data dari Google Apps Script.' : 'Tidak ada data yang ditemukan.'),
      statusCode,
      rawText: text.slice(0, 400),
    };
  } catch (err: any) {
    const isCors = err?.name === 'TypeError' || String(err).includes('fetch');
    return {
      success: false,
      statusCode: 0,
      corsBlocked: isCors,
      message: isCors
        ? 'Gagal menghubungi Webhook (Terhalang CORS / Browser Security). Penyebab umum: Google Apps Script Web App belum disetel "Who has access: Anyone (Siapa saja)", atau URL bukan Web App /exec yang valid.'
        : `Kesalahan jaringan: ${err?.message || 'Tidak dapat terhubung ke server Google.'}`,
      rawText: String(err),
    };
  }
};

/**
 * Fetch from published Google Sheets CSV link
 */
export const fetchFromPublicSheetCSV = async (csvUrl: string): Promise<string> => {
  let url = csvUrl.trim();
  // If user pasted normal edit link, convert to CSV export link
  const sheetId = extractSpreadsheetId(url);
  if (sheetId && !url.includes('output=csv') && !url.includes('tqx=out:csv')) {
    url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gagal mengambil data CSV Google Sheet: ${res.statusText}`);
  }
  return await res.text();
};

/**
 * Parse CSV text to partial Materi objects with intelligent header detection
 */
export const parseCSVToMateri = (csvText: string): Partial<Materi>[] => {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  // Detect header row
  let headerIndex = 0;
  const keywords = ['judul', 'materi', 'topik', 'fase', 'kategori', 'capaian', 'tujuan'];
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const rowCells = rows[r].map((c) => c.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
    if (rowCells.some((c) => keywords.some((kw) => c.includes(kw)))) {
      headerIndex = r;
      break;
    }
  }

  const rawHeaders = rows[headerIndex].map((h) => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, ''));
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  const getCol = (r: string[], colNames: string[]): string => {
    for (const name of colNames) {
      if (headerMap[name] !== undefined && r[headerMap[name]] !== undefined) {
        const v = r[headerMap[name]].trim();
        if (v) return v;
      }
    }
    for (const name of colNames) {
      for (const [h, colIdx] of Object.entries(headerMap)) {
        if ((h.includes(name) || name.includes(h)) && r[colIdx] !== undefined) {
          const v = r[colIdx].trim();
          if (v) return v;
        }
      }
    }
    return '';
  };

  const list: Partial<Materi>[] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    const judul = getCol(r, ['judul', 'materi', 'title', 'nama', 'topik', 'namamateri']);
    if (!judul) continue;

    list.push({
      id: getCol(r, ['id', 'materiid', 'kodemateri']) || `mtr-${Date.now()}-${i}`,
      judul,
      subJudul: getCol(r, ['subjudul', 'sub_judul', 'subtitle']),
      kategori: getCol(r, ['kategori', 'category', 'cabangolahraga']) || 'Permainan Bola Besar',
      fase: (getCol(r, ['fase']) || 'F') as 'E' | 'F',
      tujuanPembelajaran: getCol(r, ['tujuanpembelajaran', 'tujuan', 'capaian', 'tp']),
      deskripsi: getCol(r, ['deskripsi', 'uraian', 'konsep', 'konsepgerak']),
      materiInti: getCol(r, ['materiinti', 'materi_inti', 'kontenteks', 'konten']),
      kontenTeks: getCol(r, ['kontenteks', 'materiinti', 'konten']),
      videoUrl: getCol(r, ['videourl', 'video', 'linkvideo']),
      fileUrl: getCol(r, ['fileurl', 'file', 'pdfurl', 'dokumen']),
      status: (getCol(r, ['status', 'statuspublikasi']) || 'Publish') as 'Publish' | 'Draft',
      guruNama: getCol(r, ['gurunama', 'guru', 'dibuatoleh', 'pengampu']),
      dibuatOleh: getCol(r, ['dibuatoleh', 'gurunama', 'guru']),
      dibuatPada: getCol(r, ['dibuatpada', 'tanggal', 'date']) || new Date().toISOString().slice(0, 10),
    });
  }
  return list;
};

/**
 * Parse CSV text to partial PenilaianPraktik objects with intelligent header detection
 */
export const parseCSVToNilai = (csvText: string): Partial<PenilaianPraktik>[] => {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  let headerIndex = 0;
  const keywords = ['murid', 'siswa', 'nama', 'nilai', 'skor', 'materi', 'predikat'];
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const rowCells = rows[r].map((c) => c.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
    if (rowCells.some((c) => keywords.some((kw) => c.includes(kw)))) {
      headerIndex = r;
      break;
    }
  }

  const rawHeaders = rows[headerIndex].map((h) => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, ''));
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  const getCol = (r: string[], colNames: string[]): string => {
    for (const name of colNames) {
      if (headerMap[name] !== undefined && r[headerMap[name]] !== undefined) {
        const v = r[headerMap[name]].trim();
        if (v) return v;
      }
    }
    for (const name of colNames) {
      for (const [h, colIdx] of Object.entries(headerMap)) {
        if ((h.includes(name) || name.includes(h)) && r[colIdx] !== undefined) {
          const v = r[colIdx].trim();
          if (v) return v;
        }
      }
    }
    return '';
  };

  const list: Partial<PenilaianPraktik>[] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    const muridNama = getCol(r, ['muridnama', 'nama', 'namamurid', 'siswa', 'namasiswa', 'pesertadidik']);
    if (!muridNama) continue;

    const nilaiAkhirNum = parseFloat(getCol(r, ['nilaiakhir', 'nilai', 'skorakhir', 'angka'])) || 0;
    const totalSkorNum = parseFloat(getCol(r, ['totalskor', 'skor', 'poin'])) || 0;

    list.push({
      id: getCol(r, ['id', 'nilaiid']) || `nil-${Date.now()}-${i}`,
      muridNama,
      nis: getCol(r, ['nis', 'nisn']),
      materi: getCol(r, ['materi', 'materijudul', 'judul']),
      materiJudul: getCol(r, ['materi', 'materijudul', 'judul']),
      kelasNama: getCol(r, ['kelasnama', 'kelas', 'rombel']),
      nilaiAkhir: nilaiAkhirNum,
      totalSkor: totalSkorNum,
      predikat: (getCol(r, ['predikat', 'grade']) || 'B') as any,
      catatanGuru: getCol(r, ['catatanguru', 'catatan', 'evaluasi']),
      guruNama: getCol(r, ['gurunama', 'gurupenilai', 'guru']),
      tanggal: getCol(r, ['tanggal', 'date']) || new Date().toISOString().slice(0, 10),
    });
  }
  return list;
};

/**
 * Fetch table from Google Sheets directly via Google Visualization API (GViz)
 * Tries tab aliases if the requested tab doesn't exist
 */
export const fetchSheetTableViaGViz = async (
  spreadsheetIdOrUrl: string,
  sheetName: string
): Promise<{
  success: boolean;
  data: any[];
  csvText: string;
  statusCode: number;
  message: string;
}> => {
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  if (!spreadsheetId) {
    return {
      success: false,
      data: [],
      csvText: '',
      statusCode: 400,
      message: 'ID Google Spreadsheet tidak valid atau tidak ditemukan dalam URL.',
    };
  }

  // Candidate tabs for common tables
  const aliases: Record<string, string[]> = {
    MATERI: ['MATERI', 'Materi', 'Bahan Ajar', 'BAHAN AJAR', 'Modul'],
    NILAI: ['NILAI', 'Nilai', 'Rekap Nilai', 'REKAP NILAI', 'Penilaian Praktik', 'Penilaian'],
    USERS: ['USERS', 'users', 'MURID', 'Murid', 'Data Siswa', 'Siswa'],
  };

  const candidateNames = aliases[sheetName] || [sheetName];

  for (const tab of candidateNames) {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;

    try {
      const res = await fetch(gvizUrl, { method: 'GET' });
      const statusCode = res.status;
      const text = await res.text();

      if (!res.ok) continue;

      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        return {
          success: false,
          data: [],
          csvText: text.slice(0, 300),
          statusCode: 403,
          message: 'Google Spreadsheet bersifat Privat. Ubah akses di menu Bagikan menjadi "Siapa saja yang memiliki tautan".',
        };
      }

      if (text.includes('google.visualization.Query.setResponse') && (text.includes('does not exist') || text.includes('invalid_query'))) {
        continue;
      }

      const rows = parseCSV(text);
      if (rows.length < 2) {
        continue;
      }

      const headers = rows[0].map((h) => h.trim());
      const dataList: any[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const obj: Record<string, any> = {};
        headers.forEach((header, idx) => {
          obj[header] = row[idx] !== undefined ? row[idx] : '';
        });
        dataList.push(obj);
      }

      return {
        success: true,
        data: dataList,
        csvText: text,
        statusCode,
        message: `Berhasil membaca ${dataList.length} baris dari sheet "${tab}"!`,
      };
    } catch {
      continue;
    }
  }

  return {
    success: false,
    data: [],
    csvText: '',
    statusCode: 404,
    message: `Sheet "${sheetName}" tidak ditemukan dalam Spreadsheet.`,
  };
};

/**
 * Provides ready-to-copy Google Apps Script code for users to paste into Google Sheet Extensions -> Apps Script
 */
export const generateGoogleAppsScriptCode = (spreadsheetId?: string): string => {
  const openCode = spreadsheetId
    ? `var ss = SpreadsheetApp.openById("${spreadsheetId}");`
    : `var ss = SpreadsheetApp.getActiveSpreadsheet();`;

  return `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - SINKRONISASI 2 ARAH (BIDIRECTIONAL) LMS PJOK
 * =========================================================================
 * Mendukung sinkronisasi penuh antara Google Spreadsheet & Aplikasi LMS:
 * - USERS & GURU (termasuk pembagian kelas diampu guru: "XI 1, XI 2, dll")
 * - MURID & KELAS (data rombel dan penugasan guru)
 * - MATERI (input materi di aplikasi masuk ke spreadsheet, dan sebaliknya)
 * - NILAI (penilaian praktik dan rekap nilai otomatis)
 * - PRESENSI, TUGAS, QUIZ, & JURNAL
 * 
 * ATURAN DAN PANDUAN PENERAPAN (DEPLOY):
 * 1. Buka Spreadsheet Google Anda.
 * 2. Klik menu 'Ekstensi' (Extensions) -> 'Apps Script'.
 * 3. Hapus seluruh isi kode lama di Apps Script, lalu tempel (paste) kode ini.
 * 4. Klik tombol 'Deploy' (Terapkan) berwarna biru -> 'New deployment' (Penerapan baru).
 *    (Jika sudah pernah deploy: Klik 'Manage deployments' -> Edit -> Versi Baru).
 * 5. Pilih tipe: 'Web app' (Aplikasi web).
 * 6. Set 'Execute as': 'Me' (Saya / Akun Anda).
 * 7. PENTING: Set 'Who has access': 'Anyone' (Siapa saja).
 * 8. Klik 'Deploy', izinkan akses (Grant Access), lalu salin 'Web app URL'.
 * 9. Tempelkan URL Web App tersebut ke modal Sinkronisasi di aplikasi LMS!
 * =========================================================================
 */

function doGet(e) {
  ${openCode}
  var sheetName = (e && e.parameter && (e.parameter.sheet || e.parameter.table)) ? (e.parameter.sheet || e.parameter.table) : 'ALL';
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

  function readTable(sheet) {
    if (!sheet) return [];
    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return [];
    var headers = values[0];
    var rows = [];
    for (var i = 1; i < values.length; i++) {
      var obj = {};
      var hasData = false;
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        if (!key) continue;
        var val = values[i][j];

        // Format dates into YYYY-MM-DD
        if (val instanceof Date) {
          try {
            val = Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Makassar', 'yyyy-MM-dd');
          } catch(dErr) {
            val = val.toISOString().slice(0, 10);
          }
        } else if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try { val = JSON.parse(val); } catch(err) {}
        }

        obj[key] = val;
        if (val !== '' && val !== null && val !== undefined) hasData = true;
      }
      if (hasData) rows.push(obj);
    }
    return rows;
  }

  // Jika minta SEMUA tabel (ALL) atau action=getAll
  if (sheetName === 'ALL' || action === 'getAll') {
    var allData = {};
    var sheets = ss.getSheets();
    for (var s = 0; s < sheets.length; s++) {
      var sName = sheets[s].getName();
      allData[sName] = readTable(sheets[s]);
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      success: true,
      data: allData,
      USERS: allData['USERS'] || [],
      GURU: allData['GURU'] || [],
      MURID: allData['MURID'] || [],
      KELAS: allData['KELAS'] || [],
      MATERI: allData['MATERI'] || [],
      NILAI: allData['NILAI'] || [],
      PRESENSI: allData['PRESENSI'] || [],
      TUGAS: allData['TUGAS'] || []
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Jika minta sheet spesifik (misal: MATERI, USERS, atau NILAI)
  var targetSheet = ss.getSheetByName(sheetName);
  var rows = readTable(targetSheet);
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    success: true,
    sheet: sheetName,
    count: rows.length,
    data: rows
  })).setMimeType(ContentService.MimeType.JSON);
}

function writeSheetTable(ss, sheetName, dataList) {
  if (!dataList || !dataList.length) return;
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  // Ambil semua nama kolom unik
  var headerSet = {};
  var headers = [];
  for (var i = 0; i < dataList.length; i++) {
    var item = dataList[i];
    if (item && typeof item === 'object') {
      var keys = Object.keys(item);
      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        if (!headerSet[key]) {
          headerSet[key] = true;
          headers.push(key);
        }
      }
    }
  }

  if (headers.length === 0) return;

  var rows = [headers];
  for (var r = 0; r < dataList.length; r++) {
    var record = dataList[r] || {};
    var row = [];
    for (var c = 0; c < headers.length; c++) {
      var col = headers[c];
      var cell = record[col];
      if (cell === null || cell === undefined) {
        row.push('');
      } else if (typeof cell === 'object') {
        row.push(JSON.stringify(cell));
      } else {
        row.push(String(cell));
      }
    }
    rows.push(row);
  }

  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);

  // Rapikan format lembar kerja
  try {
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#0f766e')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    for (var colIdx = 1; colIdx <= Math.min(headers.length, 12); colIdx++) {
      sheet.autoResizeColumn(colIdx);
    }
  } catch(e) {}
}

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var payload = JSON.parse(contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Sinkronisasi SEMUA Tabel (Multi-Sheet Payload dari LMS)
    if (payload.action === 'syncAll' && payload.data) {
      var dataObj = payload.data;
      var updatedCount = 0;
      if (typeof dataObj === 'object' && !Array.isArray(dataObj)) {
        for (var key in dataObj) {
          if (dataObj.hasOwnProperty(key) && Array.isArray(dataObj[key])) {
            writeSheetTable(ss, key, dataObj[key]);
            updatedCount++;
          }
        }
      } else if (Array.isArray(dataObj)) {
        var target = payload.table || payload.sheet || 'USERS';
        writeSheetTable(ss, target, dataObj);
        updatedCount++;
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        success: true,
        message: 'Berhasil menyinkronkan ' + updatedCount + ' tabel ke Spreadsheet!',
        updatedSheets: updatedCount
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Sinkronisasi Tabel Tunggal (misal: hanya MATERI, NILAI, atau USERS)
    if ((payload.action === 'syncTable' || payload.action === 'syncMateri' || payload.action === 'syncNilai' || payload.action === 'syncUsers') && Array.isArray(payload.data)) {
      var tblName = payload.table || (payload.action === 'syncMateri' ? 'MATERI' : payload.action === 'syncNilai' ? 'NILAI' : 'USERS');
      writeSheetTable(ss, tblName, payload.data);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        success: true,
        message: 'Tabel ' + tblName + ' berhasil diperbarui di Spreadsheet!'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Upsert Materi Tunggal (Materi baru/diedit di aplikasi masuk langsung ke Spreadsheet)
    if (payload.action === 'upsertMateri' && payload.data) {
      var m = payload.data;
      var mSheet = ss.getSheetByName('MATERI');
      if (!mSheet) mSheet = ss.insertSheet('MATERI');
      var mValues = mSheet.getDataRange().getValues();
      var mHeaders = mValues.length > 0 ? mValues[0] : [
        'id', 'judul', 'subJudul', 'kategori', 'fase', 'semester', 'tujuanPembelajaran', 'deskripsi', 'materiInti', 'videoUrl', 'status', 'guruNama', 'dibuatPada'
      ];
      if (mValues.length === 0) {
        mSheet.appendRow(mHeaders);
        mSheet.getRange(1, 1, 1, mHeaders.length).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
      }
      
      var foundMRow = -1;
      for (var mr = 1; mr < mValues.length; mr++) {
        if (mValues[mr][0] == m.id || (m.judul && mValues[mr][1] == m.judul)) {
          foundMRow = mr + 1;
          break;
        }
      }
      var newMRow = [
        m.id || ('mtr-' + new Date().getTime()),
        m.judul || '',
        m.subJudul || '',
        m.kategori || 'Permainan Bola Besar',
        m.fase || 'F',
        m.semester || '1',
        m.tujuanPembelajaran || '',
        m.deskripsi || '',
        m.materiInti || m.kontenTeks || '',
        m.videoUrl || '',
        m.status || 'Publish',
        m.guruNama || m.dibuatOleh || '',
        m.dibuatPada || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Makassar', 'yyyy-MM-dd')
      ];
      if (foundMRow > 0) {
        mSheet.getRange(foundMRow, 1, 1, newMRow.length).setValues([newMRow]);
      } else {
        mSheet.appendRow(newMRow);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        success: true,
        message: 'Materi "' + (m.judul || '') + '" berhasil disimpan ke Spreadsheet!'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Upsert User Tunggal (termasuk kelasDiampu untuk multi-guru)
    if (payload.action === 'upsertUser' && payload.data) {
      var u = payload.data;
      var uSheet = ss.getSheetByName('USERS');
      if (!uSheet) uSheet = ss.insertSheet('USERS');
      var uValues = uSheet.getDataRange().getValues();
      var uHeaders = uValues.length > 0 ? uValues[0] : [
        'id', 'username', 'role', 'name', 'nip', 'nis', 'email', 'status', 'kelasDiampu', 'kelasId'
      ];
      if (uValues.length === 0) {
        uSheet.appendRow(uHeaders);
        uSheet.getRange(1, 1, 1, uHeaders.length).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
      }

      var foundURow = -1;
      for (var ur = 1; ur < uValues.length; ur++) {
        if (uValues[ur][0] == u.id || uValues[ur][1] == u.username) {
          foundURow = ur + 1;
          break;
        }
      }
      var newURow = [
        u.id || ('usr-' + new Date().getTime()),
        u.username || '',
        u.role || 'MURID',
        u.name || '',
        u.nip || '',
        u.nis || '',
        u.email || '',
        u.status || 'Aktif',
        Array.isArray(u.kelasDiampu) ? u.kelasDiampu.join(', ') : (u.kelasDiampu || ''),
        u.kelasId || ''
      ];
      if (foundURow > 0) {
        uSheet.getRange(foundURow, 1, 1, newURow.length).setValues([newURow]);
      } else {
        uSheet.appendRow(newURow);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        success: true,
        message: 'Pengguna "' + (u.name || '') + '" berhasil disimpan di Spreadsheet!'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Upsert Nilai Praktik Tunggal
    if (payload.action === 'upsertNilai' && payload.data) {
      var n = payload.data;
      var nSheet = ss.getSheetByName('NILAI');
      if (!nSheet) nSheet = ss.insertSheet('NILAI');
      var nValues = nSheet.getDataRange().getValues();
      var nHeaders = nValues.length > 0 ? nValues[0] : [
        'id', 'tanggal', 'kelasNama', 'muridNama', 'nis', 'materi', 'totalSkor', 'nilaiAkhir', 'predikat', 'catatanGuru', 'guruNama'
      ];
      if (nValues.length === 0) {
        nSheet.appendRow(nHeaders);
        nSheet.getRange(1, 1, 1, nHeaders.length).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
      }

      var foundNRow = -1;
      for (var nr = 1; nr < nValues.length; nr++) {
        if (nValues[nr][0] == n.id || (nValues[nr][3] == n.muridNama && nValues[nr][5] == (n.materi || n.materiJudul))) {
          foundNRow = nr + 1;
          break;
        }
      }
      var newNRow = [
        n.id || ('nil-' + new Date().getTime()),
        n.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Makassar', 'yyyy-MM-dd'),
        n.kelasNama || '',
        n.muridNama || '',
        n.nis || '',
        n.materi || n.materiJudul || '',
        n.totalSkor || 0,
        n.nilaiAkhir || 0,
        n.predikat || 'B',
        n.catatanGuru || '',
        n.guruNama || n.guruPenilai || ''
      ];
      if (foundNRow > 0) {
        nSheet.getRange(foundNRow, 1, 1, newNRow.length).setValues([newNRow]);
      } else {
        nSheet.appendRow(newNRow);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        success: true,
        message: 'Nilai siswa "' + (n.muridNama || '') + '" berhasil disimpan di Spreadsheet!'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 6. Upsert Presensi
    if (payload.action === 'upsertPresensi' && payload.data) {
      var pr = payload.data;
      var prSheet = ss.getSheetByName('PRESENSI');
      if (!prSheet) prSheet = ss.insertSheet('PRESENSI');
      var prValues = prSheet.getDataRange().getValues();
      var prHeaders = prValues.length > 0 ? prValues[0] : [
        'id', 'tanggal', 'kelasId', 'kelasNama', 'pertemuanKe', 'materi', 'waktuMulai', 'guruNama', 'totalHadir', 'totalIzin', 'totalSakit', 'totalAlpa'
      ];
      if (prValues.length === 0) {
        prSheet.appendRow(prHeaders);
        prSheet.getRange(1, 1, 1, prHeaders.length).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
      }

      var recordsList = pr.records || [];
      var hadir = 0, izin = 0, sakit = 0, alpa = 0;
      for (var rk = 0; rk < recordsList.length; rk++) {
        var st = recordsList[rk].status;
        if (st === 'H') hadir++;
        else if (st === 'I') izin++;
        else if (st === 'S') sakit++;
        else if (st === 'A') alpa++;
      }

      var foundPRRow = -1;
      for (var prr = 1; prr < prValues.length; prr++) {
        if (prValues[prr][0] == pr.id || (prValues[prr][1] == pr.tanggal && prValues[prr][2] == pr.kelasId)) {
          foundPRRow = prr + 1;
          break;
        }
      }
      var newPRRow = [
        pr.id || ('prs-' + new Date().getTime()),
        pr.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Makassar', 'yyyy-MM-dd'),
        pr.kelasId || '',
        pr.kelasNama || '',
        pr.pertemuanKe || 1,
        pr.materi || '',
        pr.waktuMulai || '',
        pr.guruNama || '',
        hadir,
        izin,
        sakit,
        alpa
      ];
      if (foundPRRow > 0) {
        prSheet.getRange(foundPRRow, 1, 1, newPRRow.length).setValues([newPRRow]);
      } else {
        prSheet.appendRow(newPRRow);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        success: true,
        message: 'Presensi kelas ' + (pr.kelasNama || '') + ' berhasil disimpan di Spreadsheet!'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', success: true, message: 'Operasi selesai.' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', success: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;
};

