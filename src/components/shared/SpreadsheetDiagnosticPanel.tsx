import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCode2,
  Globe,
  HelpCircle,
  Lock,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  Unlock,
  Zap,
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import {
  DiagnosticReport,
  runSpreadsheetDiagnostics,
} from '../../services/sheetsDiagnosticService';
import { SpreadsheetSyncLog } from '../../types';

interface SpreadsheetDiagnosticPanelProps {
  webhookUrl?: string;
  spreadsheetUrl?: string;
  onApplySync?: (count: number) => void;
  onSwitchToGviz?: () => void;
}

export const SpreadsheetDiagnosticPanel: React.FC<SpreadsheetDiagnosticPanelProps> = ({
  webhookUrl = '',
  spreadsheetUrl = '',
  onApplySync,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [logs, setLogs] = useState<SpreadsheetSyncLog[]>([]);
  const [copiedLog, setCopiedLog] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'tests' | 'logs' | 'troubleshoot'>('tests');
  const [filterErrorOnly, setFilterErrorOnly] = useState(false);

  // Subscribe to real-time sync logs from dataStorage
  useEffect(() => {
    const unsubscribe = dataStorage.subscribeSyncLogs((newLogs) => {
      setLogs(newLogs);
    });
    return () => unsubscribe();
  }, []);

  const handleRunDiagnostic = async () => {
    setIsRunning(true);
    try {
      const res = await dataStorage.testSpreadsheetDiagnostics(webhookUrl || spreadsheetUrl);
      setReport(res);
    } catch (err: any) {
      console.error('Diagnostic run failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleQuickPull = async () => {
    setIsRunning(true);
    try {
      const res = await dataStorage.pullFromLinkedSpreadsheet(webhookUrl || spreadsheetUrl);
      if (res.success && onApplySync) {
        onApplySync(res.count);
      }
      // Refresh diagnostic status after pull
      await handleRunDiagnostic();
    } catch (err: any) {
      console.error('Pull failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyReport = () => {
    if (!report && logs.length === 0) return;

    let text = `=== LAPORAN DIAGNOSA GOOGLE SHEETS LMS PJOK ===\n`;
    text += `Waktu: ${new Date().toLocaleString('id-ID')}\n`;
    text += `URL Target: ${report?.targetUrl || webhookUrl || spreadsheetUrl || '(Kosong)'}\n`;
    text += `Status Keseluruhan: ${report?.overallStatus?.toUpperCase() || 'BELUM DITES'}\n`;
    text += `Status HTTP: ${report?.httpStatusCode ?? 'N/A'}\n`;
    text += `Latensi: ${report?.latencyMs ? `${report.latencyMs} ms` : 'N/A'}\n`;
    text += `CORS Diblokir: ${report?.isCorsBlocked ? 'YA' : 'TIDAK'}\n`;
    text += `Autentikasi Diperlukan: ${report?.isAuthError ? 'YA' : 'TIDAK'}\n`;
    text += `Data Terdeteksi: ${report?.recordCount ?? 0} baris\n\n`;

    if (report?.tests && report.tests.length > 0) {
      text += `--- DETAIL PEMERIKSAAN LANGKAH-DEMI-LANGKAH ---\n`;
      report.tests.forEach((t) => {
        text += `[${t.status.toUpperCase()}] ${t.step} - ${t.name}: ${t.message}\n`;
        if (t.details) text += `   Detail: ${t.details}\n`;
        if (t.fixAction) text += `   Solusi: ${t.fixAction}\n`;
      });
      text += `\n`;
    }

    if (logs.length > 0) {
      text += `--- RIWAYAT LOG API TERAKHIR (${logs.length} entri) ---\n`;
      logs.slice(0, 5).forEach((l) => {
        text += `[${l.timestamp}] ${l.action} (${l.method}) - HTTP ${l.httpStatus ?? 'N/A'} - ${l.durationMs}ms - Sukses: ${l.success ? 'YA' : 'TIDAK'}\n`;
        text += `Pesan: ${l.message}\n`;
        if (l.details) text += `Detail: ${l.details}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2500);
  };

  const filteredLogs = filterErrorOnly ? logs.filter((l) => !l.success) : logs;

  return (
    <div id="spreadsheet-diagnostic-panel" className="space-y-4">
      {/* Header & Control Actions */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-xl shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                report?.overallStatus === 'passed'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : report?.overallStatus === 'warning'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : report?.overallStatus === 'failed'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              }`}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-sm sm:text-base">
                  Pusat Diagnosa Koneksi Spreadsheet
                </h4>
                {report?.overallStatus === 'passed' && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Koneksi Normal (200 OK)
                  </span>
                )}
                {report?.overallStatus === 'warning' && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Perlu Penyesuaian
                  </span>
                )}
                {report?.overallStatus === 'failed' && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Koneksi Terputus / Error
                  </span>
                )}
                {!report && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    Siap Dites
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Memeriksa kode status HTTP, blokir CORS peramban, pengalihan login 302, dan integritas skema data.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRunDiagnostic}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg transition disabled:opacity-50 shadow-sm"
              title="Jalankan rangkaian tes koneksi ke Google Spreadsheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Mendiagnosa...' : 'Jalankan Tes'}
            </button>

            <button
              type="button"
              onClick={handleQuickPull}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition disabled:opacity-50"
              title="Tarik data langsung dan rekam log status"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
              Tarik Data
            </button>

            <button
              type="button"
              onClick={handleCopyReport}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
              title="Salin laporan diagnostik untuk bantuan teknis"
            >
              {copiedLog ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salin Log</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real-time Metric Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 flex items-center gap-1">
              <Server className="w-3 h-3 text-indigo-400" />
              <span>Kode Status HTTP</span>
            </div>
            <div className="font-mono font-bold mt-1 text-sm">
              {report?.httpStatusCode !== undefined && report?.httpStatusCode !== null ? (
                <span
                  className={
                    report.httpStatusCode === 200
                      ? 'text-emerald-400'
                      : report.httpStatusCode === 0
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }
                >
                  {report.httpStatusCode === 0 ? '0 (CORS Block)' : `HTTP ${report.httpStatusCode}`}
                </span>
              ) : (
                <span className="text-slate-500">-</span>
              )}
            </div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-indigo-400" />
              <span>Status CORS Browser</span>
            </div>
            <div className="font-semibold mt-1 text-sm">
              {report ? (
                report.isCorsBlocked ? (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Diblokir CORS
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Terbuka (OK)
                  </span>
                )
              ) : (
                <span className="text-slate-500">-</span>
              )}
            </div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-indigo-400" />
              <span>Akses & Otorisasi</span>
            </div>
            <div className="font-semibold mt-1 text-sm">
              {report ? (
                report.isAuthError ? (
                  <span className="text-rose-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Minta Login (Privat)
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Unlock className="w-3.5 h-3.5" /> Siapa Saja (Anyone)
                  </span>
                )
              ) : (
                <span className="text-slate-500">-</span>
              )}
            </div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span>Latensi & Data</span>
            </div>
            <div className="font-semibold mt-1 text-sm">
              {report ? (
                <span className="text-indigo-300">
                  {report.latencyMs} ms · {report.recordCount} baris
                </span>
              ) : (
                <span className="text-slate-500">-</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs: Langkah Pemeriksaan, Riwayat Log API, Panduan Solusi */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveSubTab('tests')}
          className={`pb-2 px-1 border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'tests'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Rangkaian Uji ({report?.tests?.length || 0} Langkah)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('logs')}
          className={`pb-2 px-1 border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'logs'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Riwayat Log Sinkronisasi ({logs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('troubleshoot')}
          className={`pb-2 px-1 border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'troubleshoot'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Solusi Masalah Umum (CORS / 302 / 401)
        </button>
      </div>

      {/* TAB 1: Rangkaian Uji Langkah-demi-Langkah */}
      {activeSubTab === 'tests' && (
        <div className="space-y-3">
          {!report && (
            <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
              <Activity className="w-8 h-8 text-indigo-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Belum ada pengujian diagnostik yang dijalankan.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Klik tombol <strong>"Jalankan Tes"</strong> di atas untuk memverifikasi URL, menguji kode status HTTP, mendeteksi CORS, dan memeriksa skema data.
              </p>
              <button
                type="button"
                onClick={handleRunDiagnostic}
                disabled={isRunning}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                Mulai Tes Diagnostik Sekarang
              </button>
            </div>
          )}

          {report && (
            <div className="space-y-2.5">
              {report.tests.map((test, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition ${
                    test.status === 'passed'
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                      : test.status === 'warning'
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
                      : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {test.status === 'passed' && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {test.status === 'warning' && (
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      )}
                      {test.status === 'failed' && (
                        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {test.step}
                        </span>
                        {test.httpStatus !== undefined && test.httpStatus !== null && (
                          <span
                            className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded ${
                              test.httpStatus === 200
                                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            HTTP {test.httpStatus}
                          </span>
                        )}
                      </div>
                      <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                        {test.name}
                      </h5>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                        {test.message}
                      </p>
                      {test.details && (
                        <p className="text-[11px] font-mono bg-white/70 dark:bg-slate-900/70 p-2 rounded mt-2 border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">
                          {test.details}
                        </p>
                      )}
                      {test.fixAction && (
                        <div className="mt-2.5 flex items-start gap-2 bg-amber-500/10 dark:bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                          <Zap className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                          <div>
                            <span className="font-bold">Rekomendasi Perbaikan: </span>
                            {test.fixAction}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Alternative Quick GViz Mode notification */}
              {report.alternativeGvizAvailable && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h6 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                        Jalur Cepat Google Spreadsheet Langsung (GViz) Tersedia!
                      </h6>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                        Spreadsheet Anda dapat diakses langsung tanpa perlu Google Apps Script. Terdeteksi {report.alternativeGvizCount} data murid/guru yang siap disinkronkan.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickPull}
                    className="shrink-0 px-3 py-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-100 bg-emerald-200 dark:bg-emerald-800 hover:bg-emerald-300 rounded-lg transition"
                  >
                    Tarik Sekarang
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Riwayat Log Sinkronisasi */}
      {activeSubTab === 'logs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={filterErrorOnly}
                  onChange={(e) => setFilterErrorOnly(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Hanya Tampilkan Kesalahan (Error Only)</span>
              </label>
            </div>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => dataStorage.clearSyncLogs()}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Log
              </button>
            )}
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs">
              Tidak ada rekaman log sinkronisasi yang cocok.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Waktu</th>
                    <th className="py-2.5 px-3 font-semibold">Aksi</th>
                    <th className="py-2.5 px-3 font-semibold">Metode</th>
                    <th className="py-2.5 px-3 font-semibold">Status HTTP</th>
                    <th className="py-2.5 px-3 font-semibold">Durasi</th>
                    <th className="py-2.5 px-3 font-semibold">Rekaman</th>
                    <th className="py-2.5 px-3 font-semibold">Pesan / Diagnosis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className={
                        log.success
                          ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          : 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                      }
                    >
                      <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap text-slate-500">
                        {log.timestamp}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                            log.action === 'PULL'
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                              : log.action === 'PUSH'
                              ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {log.method}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono font-bold">
                        <span
                          className={
                            log.httpStatus === 200
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : log.httpStatus === 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }
                        >
                          {log.httpStatus !== null && log.httpStatus !== undefined
                            ? log.httpStatus === 0
                              ? '0 (CORS)'
                              : log.httpStatus
                            : '-'}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {log.durationMs}ms
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-semibold">
                        {log.recordsCount !== undefined ? `${log.recordsCount} baris` : '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={log.message}>
                        {log.message}
                        {log.details && (
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {log.details}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Panduan Pemecahan Masalah (Troubleshooting Guide) */}
      {activeSubTab === 'troubleshoot' && (
        <div className="space-y-3 text-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold text-xs">
                1
              </span>
              Mengapa Terjadi Kesalahan CORS (Failed to fetch)?
            </h5>
            <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Google Apps Script Web App secara bawaan akan mengalihkan (HTTP 302) permintaan yang belum diotorisasi ke halaman Login Akun Google. Karena peramban melarang pengalihan lintas-domain tanpa header CORS, peramban memunculkan pesan <code>TypeError: Failed to fetch</code>.
            </p>
            <div className="mt-2.5 p-2.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800/40 text-indigo-950 dark:text-indigo-200">
              <span className="font-bold">Cara Mengatasi:</span>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Buka Google Apps Script (Ekstensi -&gt; Apps Script).</li>
                <li>Klik tombol biru <strong>Terapkan (Deploy)</strong> -&gt; <strong>Kelola penerapan (Manage deployments)</strong>.</li>
                <li>Klik ikon Pensil (Edit) pada penerapan aktif.</li>
                <li>Pastikan <strong>"Jalankan sebagai" (Execute as)</strong> disetel ke <strong>"Saya" (Me)</strong>.</li>
                <li>Pastikan <strong>"Yang memiliki akses" (Who has access)</strong> diubah ke <strong>"Siapa saja" (Anyone)</strong>.</li>
                <li>Klik <strong>Terapkan (Deploy)</strong> dan salin URL Web App yang berakhiran <code>/exec</code>.</li>
              </ol>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs">
                2
              </span>
              Solusi Alternatif: Gunakan Mode Spreadsheet Publik (GViz)
            </h5>
            <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Jika Anda tidak ingin repot menyetel Google Apps Script, sistem LMS PJOK dapat menarik data langsung dari Google Spreadsheet menggunakan Google Visualization API (GViz):
            </p>
            <div className="mt-2.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/40 text-emerald-950 dark:text-emerald-200">
              <span className="font-bold">Langkah Cepat (Tanpa Apps Script):</span>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Buka Google Spreadsheet Anda di Google Drive.</li>
                <li>Klik tombol <strong>Bagikan (Share)</strong> di pojok kanan atas.</li>
                <li>Pada Akses umum, ubah dari Dibatasi menjadi <strong>"Siapa saja yang memiliki tautan" (Anyone with link)</strong> sebagai <strong>Pelihat (Viewer)</strong>.</li>
                <li>Salin link Google Spreadsheet Anda (misal: <code>https://docs.google.com/spreadsheets/d/.../edit</code>).</li>
                <li>Tempelkan ke kolom Tautan Spreadsheet, lalu klik <strong>Tarik Data</strong>!</li>
              </ol>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold text-xs">
                3
              </span>
              Format Nama Kolom yang Dikenali Otomatis
            </h5>
            <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Sistem mengenali nama kolom dalam Bahasa Indonesia maupun Bahasa Inggris pada baris pertama:
            </p>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div className="p-1.5 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                <strong>Nama:</strong> name, nama, namalengkap
              </div>
              <div className="p-1.5 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                <strong>Peran:</strong> role, peran, jabatan (GURU/MURID)
              </div>
              <div className="p-1.5 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                <strong>NIS/NIP:</strong> nis, nip, nisn, nomorinduk
              </div>
              <div className="p-1.5 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                <strong>Username:</strong> username, user, id
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
