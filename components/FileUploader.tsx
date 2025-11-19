import React, { useCallback, useState } from 'react';
import { FileUploadProps } from '../types';

const FileUploader: React.FC<FileUploadProps> = ({ onFilesSelected, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files) as File[];
    const validFiles = files.filter(f => 
      f.type === 'application/pdf' || f.type.startsWith('image/')
    );
    
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [onFilesSelected, disabled]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      onFilesSelected(files);
    }
    e.target.value = '';
  }, [onFilesSelected]);

  return (
    <div
      className={`
        relative w-full group
        border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ease-in-out
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        ${isDragging 
          ? 'border-blue-500 bg-blue-50/50' 
          : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept=".pdf,image/*"
        onChange={handleFileInput}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed"
      />
      
      <div className="pointer-events-none flex flex-col items-center justify-center">
        {/* Ícone Nuvem/Upload Moderno */}
        <div className={`
          mb-4 p-4 rounded-full transition-colors duration-200
          ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50'}
        `}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        
        <div className="space-y-1">
          <p className="text-base font-semibold text-slate-700">
            <span className="text-blue-600 hover:underline">Clique para selecionar</span> ou arraste o arquivo
          </p>
          <p className="text-sm text-slate-500">
            PDF, JPG ou PNG
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
