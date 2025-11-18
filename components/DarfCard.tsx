
import React, { useState, useMemo } from 'react';
import { DarfDocument, ProcessingStatus } from '../types';

interface DarfCardProps {
  document: DarfDocument;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const DarfCard: React.FC<DarfCardProps> = ({ document }) => {
  const { fileName, status, result, calculatedTotal, errorMessage } = document;
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [copyFeedback, setCopyFeedback] = useState(false);

  const isSuccess = status === ProcessingStatus.SUCCESS;
  const isError = status === ProcessingStatus.ERROR;
  const isProcessing = status === ProcessingStatus.PROCESSING;

  // Validation Logic
  const difference = isSuccess && result && calculatedTotal !== undefined
    ? Math.abs(result.headerTotal - calculatedTotal)
    : 0;
  
  // Allow a small tolerance for floating point math
  const isMatch = difference < 0.05;

  // Selection Logic
  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedIndices);
    
    // Lógica simplificada: Seleciona apenas a linha clicada, não agrupa mais por código.
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }

    setSelectedIndices(newSet);
  };

  const toggleAll = () => {
    if (!result) return;
    if (selectedIndices.size === result.items.length) {
      setSelectedIndices(new Set());
    } else {
      const allIndices = new Set(result.items.map((_, i) => i));
      setSelectedIndices(allIndices);
    }
  };

  // Calculate Selected Total
  const selectedTotal = useMemo(() => {
    if (!result) return 0;
    return result.items.reduce((acc, item, idx) => {
      return selectedIndices.has(idx) ? acc + item.total : acc;
    }, 0);
  }, [result, selectedIndices]);

  const handleCopySelected = async () => {
    const text = selectedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md mb-4">
      {/* Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isSuccess ? 'bg-blue-100 text-blue-700' : isError ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="font-medium text-slate-700 truncate max-w-[200px] sm:max-w-md" title={fileName}>
            {fileName}
          </h3>
        </div>
        
        <div>
          {isProcessing && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">
              Processando...
            </span>
          )}
          {isError && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Erro
            </span>
          )}
          {isSuccess && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${isMatch ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
              {isMatch ? 'Validado' : 'Divergente'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isProcessing && (
           <div className="flex flex-col items-center justify-center py-8 space-y-4">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-sm text-slate-500">Lendo documento e extraindo dados...</p>
           </div>
        )}

        {isError && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
            <strong>Falha no processamento:</strong> {errorMessage || "Não foi possível ler o arquivo."}
          </div>
        )}

        {isSuccess && result && (
          <div className="space-y-6">
            
            {/* Comparison Banner */}
            <div className={`p-4 rounded-lg flex items-center justify-between ${isMatch ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
              <div>
                <p className={`text-sm font-medium ${isMatch ? 'text-green-800' : 'text-orange-800'}`}>
                  {isMatch ? 'Os valores coincidem perfeitamente.' : 'Atenção: Divergência identificada.'}
                </p>
                {!isMatch && (
                   <p className="text-xs text-orange-600 mt-1">
                     Documento diz {formatCurrency(result.headerTotal)}, mas a soma é {formatCurrency(calculatedTotal || 0)}. Diferença: {formatCurrency(difference)}.
                   </p>
                )}
              </div>
              <div className="text-right">
                 <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Calculado</div>
                 <div className={`text-xl font-bold ${isMatch ? 'text-green-700' : 'text-orange-700'}`}>
                   {formatCurrency(calculatedTotal || 0)}
                 </div>
              </div>
            </div>

            {/* Selection Action Bar */}
            <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-md border border-indigo-100">
               <div className="flex items-center gap-2">
                 <span className="text-sm font-medium text-indigo-900">Soma Selecionada:</span>
                 <span className="text-lg font-bold text-indigo-700">{formatCurrency(selectedTotal)}</span>
               </div>
               <button
                 onClick={handleCopySelected}
                 disabled={selectedTotal === 0}
                 className={`
                   flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                   ${selectedTotal === 0 
                     ? 'bg-indigo-200 text-indigo-400 cursor-not-allowed' 
                     : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:transform active:scale-95'}
                 `}
               >
                 {copyFeedback ? (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                       <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                     </svg>
                     Copiado!
                   </>
                 ) : (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                       <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0118 6.621V16.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 16.5v-13z" />
                       <path fillRule="evenodd" d="M4.25 5a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h9.5a.75.75 0 00.75-.75v-1.25a.75.75 0 00-1.5 0v.5h-8V6.5h.5a.75.75 0 000-1.5h-1.25z" clipRule="evenodd" />
                     </svg>
                     Copiar Total
                   </>
                 )}
               </button>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto border rounded-lg border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 w-10 text-center">
                       <input 
                          type="checkbox" 
                          className="w-6 h-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={result.items.length > 0 && selectedIndices.size === result.items.length}
                          onChange={toggleAll}
                          disabled={result.items.length === 0}
                       />
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-full">Descrição</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Principal</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Multa</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Juros</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-900 uppercase tracking-wider whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {result.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-center text-sm text-slate-500">
                        Nenhum código numérico identificado na composição.
                      </td>
                    </tr>
                  ) : (
                    result.items.map((item, idx) => (
                      <tr key={`${item.code}-${idx}`} className={selectedIndices.has(idx) ? 'bg-indigo-50/40' : 'hover:bg-slate-50'}>
                        <td className="px-4 py-2 text-center">
                          <input 
                            type="checkbox" 
                            className="w-6 h-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={selectedIndices.has(idx)}
                            onChange={() => toggleSelection(idx)}
                          />
                        </td>
                        {/* Fonte reduzida para text-xs */}
                        <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-slate-800">{item.code}</td>
                        
                        {/* Ajuste da descrição: text-[11px], whitespace-pre-line para aceitar quebra de linha vinda da IA */}
                        <td className="px-4 py-2 text-[11px] leading-tight text-slate-600 max-w-2xl whitespace-pre-line">
                             {item.description || '-'}
                        </td>

                        {/* Fonte reduzida para text-xs nas colunas de valor */}
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-600 text-right font-mono">{formatCurrency(item.principal)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-600 text-right font-mono">{formatCurrency(item.multa)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-600 text-right font-mono">{formatCurrency(item.juros)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-900 text-right font-mono font-semibold">{formatCurrency(item.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100">
                    <tr>
                      <td colSpan={6} className="px-4 py-2 text-xs font-bold text-slate-700 uppercase text-right">Soma Geral</td>
                      <td className="px-4 py-2 text-sm font-bold text-slate-900 text-right font-mono">
                        {formatCurrency(calculatedTotal || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={6} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase border-t border-slate-200 text-right">Doc. Total</td>
                      <td className="px-4 py-2 text-sm font-bold text-slate-600 text-right font-mono border-t border-slate-200">
                         {formatCurrency(result.headerTotal)}
                      </td>
                    </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DarfCard;
