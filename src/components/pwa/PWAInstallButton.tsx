import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'button' | 'banner' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running in standalone mode, do not show install prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else {
      // If beforeinstallprompt hasn't fired yet or browser is iOS / unsupported, show visual guide
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          onClick={handleInstallClick}
          id="btn-pwa-install-compact"
          title="Pasang Aplikasi (PWA / Tambah ke Layar Utama)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition shadow-2xs"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden md:inline">Install Aplikasi</span>
        </button>
      ) : variant === 'banner' ? (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm">Install LMS PJOK SMANSAKA</p>
              <p className="text-[11px] text-emerald-100">
                Buka langsung seperti aplikasi asli (native) tanpa bilah URL browser
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstalling ? 'Memasang...' : 'Pasang Sekarang'}</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleInstallClick}
          id="btn-pwa-install"
          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition"
        >
          <Download className="w-4 h-4" />
          <span>Pasang Aplikasi (PWA)</span>
        </button>
      )}

      {/* Manual Installation Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isIOS ? 'Pasang di iPhone / iPad' : 'Pasang ke Layar Utama'}
                </h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Aplikasi ini mendukung <strong>Progressive Web App (PWA)</strong> sehingga dapat dibuka langsung
                tanpa membuka browser berulang kali.
              </p>

              {isIOS ? (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      Ketuk tombol <strong>Bagikan / Share</strong> (<Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" />) pada bilah navigasi Safari di bagian bawah layar.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      Gulir ke bawah dan pilih opsi <strong>Tambah ke Layar Utama (Add to Home Screen)</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-emerald-600" />).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas. Ikon LMS PJOK akan muncul di layar depan HP Anda.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      Buka menu browser Anda (ikon <strong>titik tiga ⋮</strong> di kanan atas Chrome/Edge).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      Pilih menu <strong>Install aplikasi</strong> atau <strong>Tambahkan ke Layar Utama</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      Konfirmasi pemasangan. Aplikasi akan langsung berjalan dalam jendela penuh mandiri.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5">
              <button
                onClick={() => setShowGuide(false)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Mengerti & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
