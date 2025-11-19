import React, { useState, useCallback } from 'react';
import FileUploader from './components/FileUploader';
import DarfCard from './components/DarfCard';
import { DarfDocument, ProcessingStatus } from './types';
import { analyzeDarfDocument } from './services/geminiService';

const App: React.FC = () => {
  const [darfs, setDarfs] = useState<DarfDocument[]>([]);

  const processDocument = async (id: string, file: File) => {
    try {
      const result = await analyzeDarfDocument(file);
      
      // Calculate total locally to verify
      const calculatedTotal = result.items.reduce((acc, item) => acc + item.total, 0);

      setDarfs(prev => prev.map(doc => {
        if (doc.id === id) {
          return {
            ...doc,
            status: ProcessingStatus.SUCCESS,
            result,
            calculatedTotal
          };
        }
        return doc;
      }));

    } catch (error) {
      setDarfs(prev => prev.map(doc => {
        if (doc.id === id) {
          return {
            ...doc,
            status: ProcessingStatus.ERROR,
            errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
          };
        }
        return doc;
      }));
    }
  };

  const handleFilesSelected = useCallback((files: File[]) => {
    // Create initial entries
    const newDocs: DarfDocument[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      fileName: file.name,
      uploadTimestamp: Date.now(),
      status: ProcessingStatus.PENDING,
    }));

    setDarfs(prev => [...newDocs, ...prev]);

    // Trigger processing for each
    newDocs.forEach(doc => {
       setTimeout(() => {
         setDarfs(prev => prev.map(d => d.id === doc.id ? { ...d, status: ProcessingStatus.PROCESSING } : d));
         processDocument(doc.id, doc.file);
       }, 100);
    });

  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      
      {/* Header Simples */}
      <header className="bg-white border-b border-gray-200 py-4 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="text-blue-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
             </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">DARF Analyzer AI</h1>
          </div>
          
          {/* Aviso de Limites (Discreto) */}
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
             Limite gratuito: <span className="font-semibold text-gray-700">15 DARFs / minuto</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Upload de Documentos
          </h2>
          <p className="text-gray-600 mb-4">
            Arraste seus arquivos DARF (PDF ou Imagem) abaixo. O sistema irá identificar códigos, extrair valores e validar a soma automaticamente.
          </p>
          <FileUploader onFilesSelected={handleFilesSelected} />
        </div>

        {/* Results List */}
        {darfs.length > 0 && (
          <div className="space-y-8">
             <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <h2 className="text-lg font-bold text-gray-800">Resultados da Análise</h2>
                <button 
                  onClick={() => setDarfs([])}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Limpar Tudo
                </button>
             </div>
            
            <div className="grid grid-cols-1 gap-8">
              {darfs.map(doc => (
                <DarfCard key={doc.id} document={doc} />
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
