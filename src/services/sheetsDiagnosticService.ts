import { DiagnosticTestResult, SpreadsheetSyncLog, User } from '../types';
import {
  extractSpreadsheetId,
  fetchSheetViaGViz,
  parseCSVToUsers,
} from './sheetsService';

export interface DiagnosticReport {
  overallStatus: 'passed' | 'warning' | 'failed';
  urlType: 'APPS_SCRIPT_EXEC' | 'APPS_SCRIPT_DEV' | 'APPS_SCRIPT_EDIT' | 'SPREADSHEET_URL' | 'CSV_URL' | 'UNKNOWN';
  targetUrl: string;
  spreadsheetId: string | null;
  tests: DiagnosticTestResult[];
  logs: SpreadsheetSyncLog[];
  httpStatusCode: number | null;
  latencyMs: number;
  isCorsBlocked: boolean;
  isAuthError: boolean;
  isHtmlResponse: boolean;
  recordCount: number;
  sampleUsers?: User[];
  rawSnippet?: string;
  recommendations: string[];
  alternativeGvizAvailable: boolean;
  alternativeGvizCount?: number;
}

export const runSpreadsheetDiagnostics = async (
  webhookUrl: string,
  spreadsheetUrl?: string
): Promise<DiagnosticReport> => {
  const startTime = Date.now();
  const tests: DiagnosticTestResult[] = [];
  const recommendations: string[] = [];
  const logs: SpreadsheetSyncLog[] = [];

  const rawUrl = (webhookUrl || '').trim();
  const rawSheetUrl = (spreadsheetUrl || '').trim();
  const detectedSheetId = extractSpreadsheetId(rawSheetUrl) || extractSpreadsheetId(rawUrl);

  let urlType: DiagnosticReport['urlType'] = 'UNKNOWN';
  let httpStatusCode: number | null = null;
  let isCorsBlocked = false;
  let isAuthError = false;
  let isHtmlResponse = false;
  let recordCount = 0;
  let sampleUsers: User[] = [];
  let rawSnippet = '';
  let alternativeGvizAvailable = false;
  let alternativeGvizCount = 0;

  // STEP 1: Validasi Sintaks & Format URL
  if (!rawUrl) {
    tests.push({
      step: '1. Sintaks URL',
      name: 'Format URL Webhook / Spreadsheet',
      status: 'failed',
      message: 'URL Webhook belum diisi.',
      details: 'Masukkan URL Webhook Google Apps Script atau URL Google Spreadsheet Anda.',
      fixAction: 'Salin URL Web App Google Apps Script atau URL Google Spreadsheet.',
    });
    recommendations.push(
      'Buka tab "Kode Google Apps Script", pasang kodenya di Spreadsheet Anda (Ekstensi -> Apps Script), lalu deploy sebagai Web App.'
    );
  } else if (rawUrl.includes('script.google.com/macros/s/') && rawUrl.endsWith('/exec')) {
    urlType = 'APPS_SCRIPT_EXEC';
    tests.push({
      step: '1. Sintaks URL',
      name: 'Format URL Webhook Apps Script',
      status: 'passed',
      message: 'Format URL Webhook sudah tepat (Web App endpoint /exec).',
      details: rawUrl,
    });
  } else if (rawUrl.includes('script.google.com/macros/s/') && rawUrl.endsWith('/dev')) {
    urlType = 'APPS_SCRIPT_DEV';
    tests.push({
      step: '1. Sintaks URL',
      name: 'Format URL Webhook Apps Script',
      status: 'warning',
      message: 'URL berakhir dengan /dev (Deployment versi pengembang).',
      details: 'Endpoint /dev selalu meminta autentikasi akun pemilik dan sering gagal diakses dari aplikasi eksternal.',
      fixAction: 'Klik Terapkan (Deploy) -> Penerapan Baru (New deployment) -> pilih Web app -> salin URL yang berakhiran /exec.',
    });
    recommendations.push(
      'Gunakan URL Penerapan Baru (/exec) alih-alih URL pengujian (/dev) agar dapat diakses tanpa login akun Google berulang kali.'
    );
  } else if (rawUrl.includes('script.google.com') && rawUrl.includes('/edit')) {
    urlType = 'APPS_SCRIPT_EDIT';
    tests.push({
      step: '1. Sintaks URL',
      name: 'Format URL Webhook Apps Script',
      status: 'failed',
      message: 'Anda memasukkan link Editor Kode Apps Script (/edit), bukan URL Web App!',
      details: 'URL editor hanya untuk membuka kode di browser dan tidak dapat menerima panggilan API data.',
      fixAction: 'Di Google Apps Script, klik tombol biru Terapkan (Deploy) -> Kelola penerapan -> Salin "URL Aplikasi Web" (/exec).',
    });
    recommendations.push(
      'Jangan gunakan link editor browser. Klik Deploy -> New deployment -> Web app -> Anyone -> Salin Web App URL.'
    );
  } else if (rawUrl.includes('docs.google.com/spreadsheets')) {
    urlType = 'SPREADSHEET_URL';
    tests.push({
      step: '1. Sintaks URL',
      name: 'Deteksi URL Spreadsheet Langsung',
      status: 'warning',
      message: 'Anda memasukkan URL Google Spreadsheet langsung ke kolom Webhook.',
      details: `ID Spreadsheet terdeteksi: ${detectedSheetId || 'Tidak ditemukan'}. Sistem akan mencoba menggunakan jalur akses GViz CSV langsung.`,
      fixAction: 'Sistem dapat membaca data langsung jika Spreadsheet dibagikan dengan akses "Siapa saja dengan link dapat melihat".',
    });
  } else if (rawUrl.includes('output=csv') || rawUrl.includes('tqx=out:csv')) {
    urlType = 'CSV_URL';
    tests.push({
      step: '1. Sintaks URL',
      name: 'Format CSV Publik',
      status: 'passed',
      message: 'Format URL merupakan link ekspor CSV langsung.',
      details: rawUrl,
    });
  } else {
    tests.push({
      step: '1. Sintaks URL',
      name: 'Format URL',
      status: 'warning',
      message: 'URL tidak menggunakan format standar Google Apps Script maupun Google Spreadsheet.',
      details: rawUrl,
    });
  }

  // STEP 2 & 3: Uji Konektivitas Jaringan, HTTP Status & CORS
  if (rawUrl && urlType !== 'APPS_SCRIPT_EDIT') {
    let targetFetchUrl = rawUrl;
    if (urlType === 'SPREADSHEET_URL' && detectedSheetId) {
      targetFetchUrl = `https://docs.google.com/spreadsheets/d/${detectedSheetId}/gviz/tq?tqx=out:csv&sheet=USERS`;
    } else if (urlType === 'APPS_SCRIPT_EXEC' || urlType === 'APPS_SCRIPT_DEV') {
      try {
        const u = new URL(rawUrl);
        u.searchParams.set('action', 'getData');
        u.searchParams.set('sheet', 'USERS');
        targetFetchUrl = u.toString();
      } catch {
        targetFetchUrl = rawUrl;
      }
    }

    const fetchStart = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(targetFetchUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      httpStatusCode = res.status;
      const duration = Date.now() - fetchStart;
      const responseText = await res.text();
      rawSnippet = responseText.slice(0, 500);

      // Check HTTP Status
      if (res.ok) {
        tests.push({
          step: '2. Konektivitas HTTP',
          name: 'Respon Server Google',
          status: 'passed',
          httpStatus: res.status,
          message: `Server merespon sukses dengan status HTTP ${res.status} (${duration} ms).`,
          details: `Endpoint berhasil dihubungi tanpa pemblokiran jaringan.`,
        });
      } else {
        tests.push({
          step: '2. Konektivitas HTTP',
          name: 'Respon Server Google',
          status: 'failed',
          httpStatus: res.status,
          message: `Server Google merespons dengan kode kesalahan HTTP ${res.status}: ${res.statusText}`,
          details: rawSnippet,
          fixAction: 'Periksa kembali URL atau izin deploy Google Apps Script.',
        });
      }

      // Check Content Type & Payload (HTML vs JSON vs CSV)
      isHtmlResponse = responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html');
      const hasGoogleLogin =
        responseText.includes('accounts.google.com') ||
        responseText.includes('Sign in') ||
        responseText.includes('Google Accounts');

      if (isHtmlResponse) {
        if (hasGoogleLogin) {
          isAuthError = true;
          tests.push({
            step: '3. Otorisasi & Autentikasi',
            name: 'Pemeriksaan Hak Akses (Who Has Access)',
            status: 'failed',
            httpStatus: 401,
            message: 'Akses Ditolak: Server Google mengalihkan ke halaman Login Akun Google.',
            details: 'Ini terjadi karena Web App di-deploy dengan pengaturan "Who has access: Only myself" (Hanya saya) atau "Anyone within organization".',
            fixAction: 'Buka Apps Script -> Terapkan (Deploy) -> Kelola penerapan -> Ubah "Who has access" (Siapa yang memiliki akses) menjadi "Anyone" (Siapa saja).',
          });
          recommendations.push(
            'WAJIB: Ubah pengaturan "Who has access" pada Web App Google Apps Script menjadi "Anyone" (Siapa saja) agar aplikasi web dapat membaca data tanpa popup login.'
          );
        } else {
          tests.push({
            step: '3. Format Konten Respons',
            name: 'Tipe Data Respons (MIME Type)',
            status: 'failed',
            httpStatus: res.status,
            message: 'Respons yang diterima adalah halaman web HTML, bukan data terstruktur (JSON/CSV).',
            details: `Cuplikan dokumen:\n${rawSnippet.slice(0, 200)}...`,
            fixAction: 'Pastikan URL Web App mengarah ke fungsi doGet yang mengembalikan ContentService.MimeType.JSON.',
          });
        }
      } else {
        // Parse data
        let rows: any[] = [];
        let parseError = false;

        try {
          const parsed = JSON.parse(responseText);
          if (Array.isArray(parsed)) {
            rows = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.data)) rows = parsed.data;
            else if (Array.isArray(parsed.USERS)) rows = parsed.USERS;
            else if (Array.isArray(parsed.users)) rows = parsed.users;
            else if (Array.isArray(parsed.rows)) rows = parsed.rows;
            else if (parsed.data && typeof parsed.data === 'object' && Array.isArray(parsed.data.USERS)) {
              rows = parsed.data.USERS;
            }
          }
        } catch {
          // If not JSON, try parsing as CSV
          const csvRows = parseCSVToUsers(responseText);
          if (csvRows.length > 0) {
            rows = csvRows;
          } else {
            parseError = true;
          }
        }

        if (parseError) {
          tests.push({
            step: '4. Validasi Struktur Data',
            name: 'Pemeriksaan Format JSON / CSV',
            status: 'failed',
            message: 'Respons dari server tidak dapat diuraikan sebagai format JSON maupun CSV yang valid.',
            details: rawSnippet,
          });
        } else {
          recordCount = rows.length;
          tests.push({
            step: '4. Validasi Struktur Data',
            name: 'Pemeriksaan Format Data',
            status: recordCount > 0 ? 'passed' : 'warning',
            message: `Format data valid. Ditemukan ${recordCount} baris rekaman data.`,
            details: `Jumlah entri data berhasil dibaca dari sheet USERS: ${recordCount}.`,
          });

          // Convert to sample users
          if (rows.length > 0) {
            sampleUsers = rows.slice(0, 5).map((u: any, idx: number) => ({
              id: u.id || u.ID || `usr-${idx + 1}`,
              username: u.username || u.name?.toLowerCase().replace(/\s+/g, '') || `user${idx + 1}`,
              role: (u.role || u.Role || 'MURID').toUpperCase().includes('GURU') ? 'GURU' : 'MURID',
              name: u.name || u.nama || u.Nama || 'Pengguna',
              nis: u.nis || u.nip || u.NIS || '',
              nip: u.nip || u.NIP || '',
              status: u.status || 'Aktif',
              email: u.email || '',
            }));

            // Check columns
            const sample = rows[0];
            const hasName = sample.name || sample.nama || sample.Nama;
            const hasRole = sample.role || sample.Role || sample.peran;
            if (hasName && hasRole) {
              tests.push({
                step: '5. Verifikasi Kolom Pengguna',
                name: 'Skema Kolom Database PJOK',
                status: 'passed',
                message: 'Kolom utama (nama, role/peran, username/nis) ditemukan dengan benar.',
              });
            } else {
              tests.push({
                step: '5. Verifikasi Kolom Pengguna',
                name: 'Skema Kolom Database PJOK',
                status: 'warning',
                message: 'Nama kolom di Spreadsheet mungkin berbeda dari standar (id, username, role, name, nip, email, status).',
                details: `Kolom yang terdeteksi: ${Object.keys(sample).join(', ')}`,
                fixAction: 'Pastikan baris pertama di Google Sheets memiliki header: id, username, role, name, nip, email, status.',
              });
            }
          } else {
            tests.push({
              step: '5. Verifikasi Kolom Pengguna',
              name: 'Isi Lembar Kerja (Sheet USERS)',
              status: 'warning',
              message: 'Lembar kerja USERS ditemukan tetapi belum memiliki baris data (kosong).',
              fixAction: 'Isikan minimal 1 baris data murid/guru di Google Spreadsheet Anda.',
            });
          }
        }
      }
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError';
      const isFetchError = err?.name === 'TypeError' || String(err).includes('fetch');

      if (isFetchError || isAbort) {
        isCorsBlocked = true;
        tests.push({
          step: '2. Konektivitas & CORS',
          name: 'Pemeriksaan Lintas-Domain (CORS)',
          status: 'failed',
          message: isAbort
            ? 'Koneksi waktu habis (Timeout 12 detik) saat menghubungi server Google.'
            : 'Permintaan diblokir oleh kebijakan keamanan peramban (Browser CORS Error).',
          details: isAbort
            ? 'Server Google tidak merespons dalam 12 detik.'
            : 'Peramban memblokir permintaan langsung ke script.google.com. Ini biasanya terjadi ketika Web App Google Apps Script belum disetel "Who has access: Anyone", sehingga Google mengalihkan ke halaman login tanpa header Access-Control-Allow-Origin.',
          fixAction: 'Buka Apps Script -> Terapkan -> Penerapan Baru -> Tipe: Aplikasi Web -> Who has access: Anyone (Siapa saja).',
        });
        recommendations.push(
          'Solusi CORS: Pada jendela Deploy Google Apps Script, pastikan Anda memilih "Execute as: Me" dan "Who has access: Anyone". Jika disetel selain Anyone, Google akan memblokir request browser dengan CORS.'
        );
      } else {
        tests.push({
          step: '2. Konektivitas HTTP',
          name: 'Koneksi Jaringan',
          status: 'failed',
          message: `Gagal menghubungi server: ${err?.message || String(err)}`,
        });
      }
    }
  }

  // STEP 6: Uji Alternatif Akses Spreadsheet Publik (GViz / CSV)
  if (detectedSheetId) {
    try {
      const gvizRes = await fetchSheetViaGViz(detectedSheetId, 'USERS');
      if (gvizRes.success && gvizRes.data.length > 0) {
        alternativeGvizAvailable = true;
        alternativeGvizCount = gvizRes.data.length;
        tests.push({
          step: '6. Jalur Alternatif GViz Langsung',
          name: 'Akses Google Spreadsheet Publik (GViz)',
          status: 'passed',
          message: `Jalur langsung GViz berhasil! Terdeteksi ${gvizRes.data.length} data siswa/guru.`,
          details: 'Spreadsheet ini dapat disinkronkan secara langsung tanpa memerlukan setup Google Apps Script Web App!',
        });
      } else {
        tests.push({
          step: '6. Jalur Alternatif GViz Langsung',
          name: 'Akses Google Spreadsheet Publik (GViz)',
          status: 'warning',
          message: gvizRes.message,
          details: `Status HTTP: ${gvizRes.statusCode}`,
          fixAction: 'Jika ingin menggunakan sinkronisasi instan tanpa Apps Script: buka Spreadsheet -> klik Bagikan (Share) -> ganti ke "Siapa saja yang memiliki link: Pelihat (Viewer)".',
        });
      }
    } catch {
      // Ignored for fallback check
    }
  }

  // Overall status evaluation
  const hasFailed = tests.some((t) => t.status === 'failed');
  const hasWarning = tests.some((t) => t.status === 'warning');
  const overallStatus: DiagnosticReport['overallStatus'] = hasFailed
    ? 'failed'
    : hasWarning
    ? 'warning'
    : 'passed';

  const totalDuration = Date.now() - startTime;

  // Create log entry
  const logEntry: SpreadsheetSyncLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    action: 'TEST_DIAGNOSTIC',
    method: urlType === 'SPREADSHEET_URL' ? 'GVIZ_CSV' : 'WEBHOOK_GET',
    url: rawUrl || '(Kosong)',
    httpStatus: httpStatusCode,
    durationMs: totalDuration,
    success: overallStatus === 'passed',
    recordsCount: recordCount,
    corsDetected: isCorsBlocked,
    authErrorDetected: isAuthError,
    message:
      overallStatus === 'passed'
        ? `Diagnosa sukses: ${recordCount} data terbaca tanpa kendala.`
        : overallStatus === 'warning'
        ? 'Diagnosa selesai dengan beberapa catatan konfigurasi.'
        : 'Diagnosa menemukan kesalahan konfigurasi pada sinkronisasi Spreadsheet.',
    details: tests
      .filter((t) => t.status !== 'passed')
      .map((t) => `[${t.step}] ${t.message}`)
      .join(' | '),
    recommendation: recommendations.join(' \n'),
    rawResponseSnippet: rawSnippet.slice(0, 300),
  };

  logs.push(logEntry);

  return {
    overallStatus,
    urlType,
    targetUrl: rawUrl,
    spreadsheetId: detectedSheetId,
    tests,
    logs,
    httpStatusCode,
    latencyMs: totalDuration,
    isCorsBlocked,
    isAuthError,
    isHtmlResponse,
    recordCount,
    sampleUsers,
    rawSnippet,
    recommendations,
    alternativeGvizAvailable,
    alternativeGvizCount,
  };
};
