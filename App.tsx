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
    <div className="min-h-screen bg-[#020617] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] font-sans text-slate-900 pb-20">
      
      {/* Header Transparente */}
      <header className="w-full pt-8 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-2 rounded-xl text-blue-400 shadow-lg">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
             </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">DARF Analyzer <span className="text-blue-500">AI</span></h1>
          </div>
          
          {/* Aviso de Limites */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-blue-950/30 border border-blue-800/30 backdrop-blur-sm">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="text-blue-400 w-4 h-4">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
             </svg>
             <span className="text-xs font-medium text-blue-200">
               Limite gratuito: <span className="text-white font-bold">15 DARFs / minuto</span>
             </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Automação Fiscal Inteligente
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed font-light">
            Arraste seus documentos abaixo para identificar códigos, extrair valores e validar cálculos instantaneamente com IA.
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/50 p-1 mb-16">
          <FileUploader onFilesSelected={handleFilesSelected} />
        </div>

        {/* Results List */}
        {darfs.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="flex items-center justify-between px-2 border-b border-white/10 pb-4 mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  Documentos Processados <span className="bg-blue-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">{darfs.length}</span>
                </h2>
                <button 
                  onClick={() => setDarfs([])}
                  className="text-sm text-slate-400 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-md transition-all"
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
      
      {/* Footer */}
      <footer className="text-center text-slate-500 text-sm py-12">
        &copy; {new Date().getFullYear()} DARF Analyzer AI. Powered by Gemini 2.5 Flash.
      </footer>
    </div>
  );
};

export default App;
