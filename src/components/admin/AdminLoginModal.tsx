import React, { useState } from 'react';
import { X, Lock, ShieldCheck, KeyRound } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default PIN: 1234 or fez2026
    if (pin === '1234' || pin === 'fez2026') {
      setError(false);
      setPin('');
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-[#E7E2DA] p-6 sm:p-8 text-[#1C2524] space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#728280] hover:text-[#1C2524] rounded-full hover:bg-[#F2ECE4] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-[#005F5A]/10 text-[#005F5A] rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-extrabold text-[#1C2524]">
            Admin CMS Portal
          </h3>
          <p className="text-xs text-[#52605E]">
            Enter your management PIN to add, edit, or remove tours, pages, and blog posts.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#2A3735] mb-1">
              Admin PIN
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#728280] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
                }}
                placeholder="Default PIN: 1234"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] text-sm font-mono text-center tracking-widest focus:outline-hidden focus:ring-2 focus:ring-[#005F5A]"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-xs text-[#C84B31] font-semibold mt-1 text-center">
                Incorrect PIN. (Default PIN: 1234)
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Access Dashboard
          </button>
        </form>

        <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E2DA] flex items-center gap-2 text-[11px] text-[#728280]">
          <ShieldCheck className="w-4 h-4 text-[#005F5A] shrink-0" />
          <span>Secured FezGuideTours local admin session</span>
        </div>
      </div>
    </div>
  );
};
