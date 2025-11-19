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

  // Styles
  const containerStyle: React.CSSProperties = {
    borderWidth: '2px',
    borderStyle: 'dashed',
    borderColor: isDragging ? '#2563eb' : '#d1d5db', // blue-600 : gray-300
    backgroundColor: isDragging ? '#eff6ff' : '#f9fafb', // blue-50 : gray-50
    borderRadius: '0.5rem',
    padding: '3rem',
    textAlign: 'center',
    width: '100%',
    position: 'relative',
    transition: 'all 0.2s ease',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1
  };

  return (
    <div
      className="group"
      style={containerStyle}
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
      
      <div className="pointer-events-none">
        <svg 
          className={`mx-auto h-12 w-12 mb-4 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`}
          stroke="currentColor" 
          fill="none" 
          viewBox="0 0 48 48" 
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
          />
        </svg>
        
        <div className="flex text-sm text-gray-600 justify-center">
          <span className="relative rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
            <span className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 shadow-sm">
              Escolher Ficheiros
            </span>
          </span>
          <p className="pl-2 self-center">Nenhum ficheiro selecionado</p>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Arraste DARFs ou clique para selecionar
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Suporta múltiplos arquivos (PDF, JPG, PNG)
        </p>
      </div>
    </div>
  );
};

export default FileUploader;
