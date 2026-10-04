import React, { useState } from 'react';
import { ImagePickerModal } from './ImagePickerModal';
import { Image as ImageIcon, Upload, X, Eye } from 'lucide-react';

interface ImagePickerFieldProps {
  label: string;
  value: string;
  onChange: (newPath: string) => void;
  helperText?: string;
  aspectRatio?: 'landscape' | 'square' | 'portrait';
}

export const ImagePickerField: React.FC<ImagePickerFieldProps> = ({
  label,
  value,
  onChange,
  helperText,
  aspectRatio = 'landscape',
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square max-w-[140px]'
      : aspectRatio === 'portrait'
      ? 'aspect-3/4 max-w-[140px]'
      : 'aspect-16/9 max-w-[240px]';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-bold text-[#2A3735]">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-[11px] font-bold text-[#005F5A] hover:underline cursor-pointer"
          >
            Change Photo
          </button>
        )}
      </div>

      {value ? (
        <div className="relative group rounded-2xl overflow-hidden border border-[#D5CEC4] bg-[#1C2524] p-1">
          <div className={`${aspectClass} rounded-xl overflow-hidden relative`}>
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white text-[#1C2524] text-xs font-bold shadow-md cursor-pointer hover:bg-[#FAF8F5] transition-colors"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-1.5 rounded-lg bg-red-600 text-white shadow-md cursor-pointer hover:bg-red-700 transition-colors"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="px-2 py-1 text-[10px] text-[#728280] font-mono truncate">
            {value.startsWith('data:') ? 'Uploaded Device Photo' : value}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full p-4 border-2 border-dashed border-[#D5CEC4] hover:border-[#005F5A] rounded-2xl bg-[#FAF8F5] hover:bg-[#F2ECE4]/50 transition-colors flex items-center justify-center gap-2.5 text-[#52605E] cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-white border border-[#E7E2DA] flex items-center justify-center group-hover:text-[#005F5A] transition-colors">
            <Upload className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="text-xs font-bold block text-[#1C2524]">Select or Upload Photo</span>
            <span className="text-[10px] text-[#728280]">Browse 70+ library photos or upload from device</span>
          </div>
        </button>
      )}

      {helperText && (
        <p className="text-[10px] text-[#728280] mt-1">{helperText}</p>
      )}

      {/* Media Picker Modal */}
      <ImagePickerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectImage={(newPath) => onChange(newPath)}
        currentImage={value}
        title={`Choose image for: ${label}`}
      />
    </div>
  );
};
