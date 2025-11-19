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
    borderColor: isDragging ? '#3b82f6' : '#e2e8f0', // blue-500 : slate-200
    backgroundColor: isDragging ? '#eff6ff' : '#ffffff', // blue-50 : white
    borderRadius: '1rem',
    width: '100%',
    position: 'relative',
    transition: 'all 0.3s ease',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1
  };

  return (
    <div className="w-full bg-white rounded-2xl overflow-hidden">
      {/* Topo decorativo */}
      <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 w-full"></div>
      
      <div className="p-8 md:p-12">
        <div
          className={`
            relative w-full py-16 px-4 rounded-xl transition-all duration-300 ease-out group
            ${isDragging ? 'scale-[1.01] shadow-lg' : ''}
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
            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed"
          />
          
          <div className="flex flex-col items-center justify-center text-center pointer-events-none">
            <div className={`
                mb-6 p-4 rounded-full transition-colors duration-300
                ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'}
              `}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-blue-700 transition-colors">
              Upload de Documentos
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-8 font-medium text-sm">
              Arraste e solte arquivos DARF (PDF ou Imagem) ou clique para buscar no computador.
            </p>

            <span className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/30 group-hover:bg-blue-700 transition-all transform group-hover:-translate-y-0.5">
              Selecionar Arquivos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
