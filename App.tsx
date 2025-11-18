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
       // Small delay to allow UI to render "Pending" briefly or sequential feeling
       setTimeout(() => {
         setDarfs(prev => prev.map(d => d.id === doc.id ? { ...d, status: ProcessingStatus.PROCESSING } : d));
         processDocument(doc.id, doc.file);
       }, 100);
    });

  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="bg-indigo-600 p-1.5 rounded-md text-white">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
             </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">DARF Analyzer <span className="text-indigo-600">AI</span></h1>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">
            Processamento Inteligente de Receitas Federais
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Intro / Instructions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload de Documentos</h2>
          <p className="text-slate-600 max-w-2xl">
            Arraste seus arquivos DARF (PDF ou Imagem) abaixo. O sistema irá identificar códigos, extrair valores e validar a soma automaticamente.
          </p>
        </div>

        {/* Upload Area */}
        <div className="mb-12">
          <FileUploader onFilesSelected={handleFilesSelected} />
        </div>

        {/* Results List */}
        {darfs.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Documentos Processados ({darfs.length})</h2>
                <button 
                  onClick={() => setDarfs([])}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Limpar Tudo
                </button>
             </div>
            
            <div className="grid grid-cols-1 gap-6">
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
