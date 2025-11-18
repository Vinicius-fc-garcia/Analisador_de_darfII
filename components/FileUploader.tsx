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
    // Filter for PDF or Images
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
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [onFilesSelected]);

  // Estilos inline para garantir visibilidade mesmo sem CSS externo
  const containerStyle: React.CSSProperties = {
    borderWidth: '2px',
    borderStyle: 'dashed',
    borderColor: isDragging ? '#3b82f6' : '#cbd5e1', // blue-500 : slate-300
    backgroundColor: isDragging ? '#eff6ff' : '#ffffff', // blue-50 : white
    padding: '2rem',
    borderRadius: '0.75rem',
    width: '100%',
    position: 'relative',
    transition: 'all 0.2s ease-in-out',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1
  };

  return (
    <div
      className={`
        relative w-full p-8 border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
      `}
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
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
      />
      
      <div className="flex flex-col items-center justify-center text-center pointer-events-none">
        <div className="mb-4 p-3 bg-slate-100 rounded-full text-slate-500" style={{ backgroundColor: '#f1f5f9', borderRadius: '9999px', padding: '0.75rem', marginBottom: '1rem', display: 'inline-block' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-700" style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155' }}>
          Arraste DARFs ou clique para selecionar
        </h3>
        <p className="mt-1 text-sm text-slate-500" style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: '#64748b' }}>
          Suporta múltiplos arquivos (PDF, JPG, PNG)
        </p>
      </div>
    </div>
  );
};

export default FileUploader;