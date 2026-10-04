import React, { useState } from 'react';
import { ImagePickerModal } from './ImagePickerModal';
import { Plus, X, ArrowLeft, ArrowRight, Image as ImageIcon } from 'lucide-react';

interface GalleryManagerFieldProps {
  label?: string;
  images: string[];
  onChange: (updatedImages: string[]) => void;
  helperText?: string;
}

export const GalleryManagerField: React.FC<GalleryManagerFieldProps> = ({
  label = 'Tour Photo Gallery',
  images = [],
  onChange,
  helperText = 'Add multiple high-resolution photos that visitors can browse in the gallery slider.',
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleAddImage = (newPath: string) => {
    if (!images.includes(newPath)) {
      onChange([...images, newPath]);
    }
  };

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleMoveLeft = (index: number) => {
    if (index === 0) return;
    const updated = [...images];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onChange(updated);
  };

  const handleMoveRight = (index: number) => {
    if (index === images.length - 1) return;
    const updated = [...images];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-[#2A3735]">
            {label} ({images.length})
          </label>
          {helperText && (
            <p className="text-[10px] text-[#728280]">{helperText}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Photo</span>
        </button>
      </div>

      {images.length === 0 ? (
        <div
          onClick={() => setModalOpen(true)}
          className="border-2 border-dashed border-[#D5CEC4] hover:border-[#005F5A] rounded-2xl p-6 text-center bg-[#FAF8F5] hover:bg-[#F2ECE4]/40 transition-colors cursor-pointer space-y-1.5"
        >
          <ImageIcon className="w-6 h-6 mx-auto text-[#728280]" />
          <p className="text-xs font-bold text-[#1C2524]">No gallery photos yet</p>
          <p className="text-[10px] text-[#728280]">
            Click here to add photos from the media library or upload your own
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-1">
          {images.map((imgUrl, index) => (
            <div
              key={`${imgUrl}-${index}`}
              className="group relative aspect-4/3 rounded-xl overflow-hidden border border-[#D5CEC4] bg-[#1C2524] shadow-xs"
            >
              <img
                src={imgUrl}
                alt={`Gallery photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                    #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="p-1 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                    title="Remove photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMoveLeft(index)}
                    className="p-1 rounded-md bg-white/80 hover:bg-white text-[#1C2524] disabled:opacity-30 cursor-pointer"
                    title="Move left"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={index === images.length - 1}
                    onClick={() => handleMoveRight(index)}
                    className="p-1 rounded-md bg-white/80 hover:bg-white text-[#1C2524] disabled:opacity-30 cursor-pointer"
                    title="Move right"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add more button tile */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="aspect-4/3 rounded-xl border-2 border-dashed border-[#D5CEC4] hover:border-[#005F5A] bg-[#FAF8F5] hover:bg-[#F2ECE4]/50 flex flex-col items-center justify-center gap-1 text-[#728280] hover:text-[#005F5A] transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span className="text-[10px] font-bold">Add More</span>
          </button>
        </div>
      )}

      <ImagePickerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectImage={handleAddImage}
        title="Add Photo to Gallery"
      />
    </div>
  );
};
