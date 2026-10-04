import React, { useState, useEffect, useRef } from 'react';
import { PROJECT_MEDIA_LIBRARY, MediaItem } from '../../data/projectMediaLibrary';
import {
  X,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Search,
  Check,
  Sparkles,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imagePathOrDataUrl: string) => void;
  currentImage?: string;
  title?: string;
}

type PickerTab = 'library' | 'upload' | 'url';

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  currentImage,
  title = 'Select or Upload Image',
}) => {
  const [activeTab, setActiveTab] = useState<PickerTab>('library');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState<string>(currentImage || '');

  // Upload Tab States
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL Tab States
  const [customUrl, setCustomUrl] = useState('');
  const [urlPreviewValid, setUrlPreviewValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedPath(currentImage || '');
      setUploadPreview(null);
      setUploadError(null);
      setCustomUrl('');
      setUrlPreviewValid(null);
    }
  }, [isOpen, currentImage]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter project media library
  const filteredMedia = PROJECT_MEDIA_LIBRARY.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.path.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Client-side image compression via Canvas
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    setIsProcessing(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max resolution 1400px to maintain crisp retina display while keeping payload ~150KB
          const MAX_DIM = 1400;
          if (width > height && width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context unavailable');

          ctx.drawImage(img, 0, 0, width, height);

          // Export as compressed WebP (or JPEG fallback)
          const dataUrl = canvas.toDataURL('image/webp', 0.85);
          setUploadPreview(dataUrl);
          setSelectedPath(dataUrl);
          setIsProcessing(false);
        } catch {
          // If canvas fails, fallback to direct data URL
          const rawData = e.target?.result as string;
          setUploadPreview(rawData);
          setSelectedPath(rawData);
          setIsProcessing(false);
        }
      };
      img.onerror = () => {
        setUploadError('Failed to load selected image file.');
        setIsProcessing(false);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setUploadError('Error reading file from your device.');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmSelection = () => {
    if (!selectedPath) return;
    onSelectImage(selectedPath);
    onClose();
  };

  const categories = [
    { id: 'all', label: `All (${PROJECT_MEDIA_LIBRARY.length})` },
    { id: 'hero', label: 'Highlights' },
    { id: 'medina', label: 'Medina & Heritage' },
    { id: 'daytrips', label: 'Day Trips' },
    { id: 'food', label: 'Food & Tastings' },
    { id: 'team', label: 'Guides & Team' },
    { id: 'tips', label: 'Travel Tips' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#E7E2DA] flex flex-col max-h-[90vh] overflow-hidden text-[#1C2524]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E7E2DA] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#005F5A]/10 text-[#005F5A] flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1C2524]">{title}</h3>
              <p className="text-[11px] text-[#728280]">
                Select from project media, upload from your device, or paste a link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#728280] hover:text-[#1C2524] rounded-full hover:bg-[#F2ECE4] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[#E7E2DA] bg-[#FAF8F5]">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'library'
                ? 'border-[#005F5A] text-[#005F5A]'
                : 'border-transparent text-[#728280] hover:text-[#1C2524]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Curated Media Library ({PROJECT_MEDIA_LIBRARY.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'border-[#005F5A] text-[#005F5A]'
                : 'border-transparent text-[#728280] hover:text-[#1C2524]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload from Device</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'url'
                ? 'border-[#005F5A] text-[#005F5A]'
                : 'border-transparent text-[#728280] hover:text-[#1C2524]'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>Paste Web URL</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[350px]">
          {/* TAB 1: CURATED MEDIA LIBRARY */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              {/* Search & Category Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#728280] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search photos by landmark, activity, city..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#005F5A]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-[#728280] hover:text-[#1C2524]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer text-xs ${
                        selectedCategory === cat.id
                          ? 'bg-[#005F5A] text-white shadow-xs'
                          : 'bg-[#F2ECE4] text-[#52605E] hover:bg-[#E7E2DA]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Photos */}
              {filteredMedia.length === 0 ? (
                <div className="py-12 text-center text-[#728280] space-y-2">
                  <ImageIcon className="w-10 h-10 mx-auto text-[#D5CEC4]" />
                  <p className="text-xs">No photos matching your search query.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredMedia.map((item: MediaItem) => {
                    const isSelected = selectedPath === item.path;
                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => setSelectedPath(item.path)}
                        className={`group relative aspect-4/3 rounded-2xl overflow-hidden border-2 text-left transition-all cursor-pointer bg-[#1C2524] ${
                          isSelected
                            ? 'border-[#005F5A] ring-3 ring-[#005F5A]/20 scale-[0.98]'
                            : 'border-transparent hover:border-[#005F5A]/40'
                        }`}
                      >
                        <img
                          src={item.path}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2 text-white">
                          <p className="text-[11px] font-bold line-clamp-1 leading-tight">
                            {item.name}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#005F5A] text-white flex items-center justify-center shadow-md">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD FROM DEVICE */}
          {activeTab === 'upload' && (
            <div className="max-w-xl mx-auto space-y-4 py-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#D5CEC4] hover:border-[#005F5A] rounded-3xl p-8 text-center bg-[#FAF8F5] hover:bg-[#F2ECE4]/40 transition-colors cursor-pointer space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processImageFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-[#005F5A]/10 text-[#005F5A] flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1C2524]">
                    Drag & drop an image here, or browse files
                  </p>
                  <p className="text-xs text-[#728280] mt-1">
                    Supports JPG, PNG, WebP up to 10MB (Automatically optimized for web)
                  </p>
                </div>
              </div>

              {isProcessing && (
                <div className="p-3 rounded-xl bg-blue-50 text-blue-800 text-xs text-center flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Optimizing and compressing image...</span>
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadPreview && (
                <div className="p-4 rounded-2xl bg-white border border-[#E7E2DA] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C2524]">Image Preview:</span>
                    <span className="text-[11px] text-[#005F5A] font-semibold">Ready to Use</span>
                  </div>
                  <div className="aspect-16/9 rounded-xl overflow-hidden bg-[#1C2524] relative">
                    <img
                      src={uploadPreview}
                      alt="Upload preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PASTE WEB URL */}
          {activeTab === 'url' && (
            <div className="max-w-xl mx-auto space-y-4 py-4">
              <div>
                <label className="block text-xs font-bold text-[#2A3735] mb-1">
                  External Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setCustomUrl(val);
                      if (val) {
                        setSelectedPath(val);
                      }
                    }}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 px-3 py-2.5 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#005F5A]"
                  />
                </div>
                <p className="text-[11px] text-[#728280] mt-1">
                  Paste any direct HTTPS image link from Unsplash, Pexels, or your CDN.
                </p>
              </div>

              {customUrl && (
                <div className="p-4 rounded-2xl bg-white border border-[#E7E2DA] space-y-3">
                  <span className="text-xs font-bold text-[#1C2524] block">Live URL Preview:</span>
                  <div className="aspect-16/9 rounded-xl overflow-hidden bg-[#1C2524] relative">
                    <img
                      src={customUrl}
                      alt="URL Preview"
                      onLoad={() => setUrlPreviewValid(true)}
                      onError={() => setUrlPreviewValid(false)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {urlPreviewValid === false && (
                    <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>Could not load image from this URL. Please verify the link.</span>
                    </div>
                  )}
                  {urlPreviewValid === true && (
                    <div className="p-2 rounded-lg bg-green-50 text-green-700 text-xs flex items-center gap-1.5 font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Valid image URL loaded successfully!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E7E2DA] bg-[#FAF8F5] flex items-center justify-between gap-3">
          <div className="text-xs text-[#728280] truncate max-w-sm">
            {selectedPath ? (
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#005F5A]" />
                <span className="font-semibold text-[#1C2524] truncate">
                  {selectedPath.startsWith('data:')
                    ? 'Uploaded Device Photo'
                    : selectedPath.split('/').pop()}
                </span>
              </span>
            ) : (
              <span>No image selected</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-[#D5CEC4] hover:bg-white text-[#52605E] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedPath}
              onClick={handleConfirmSelection}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#005F5A] hover:bg-[#004A46] disabled:opacity-50 text-white transition-colors cursor-pointer shadow-xs"
            >
              Use Selected Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
