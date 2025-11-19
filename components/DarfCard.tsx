import React, { useState, useMemo, useEffect } from 'react';
import { DarfDocument, ProcessingStatus } from '../types';

interface DarfCardProps {
  document: DarfDocument;
}

type CalculationMode = 'funcionarios' | 'individuais';
type CopyStage = 'idle' | 'verifying' | 'copied';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const RETENTION_CODES = ['5952', '0561', '1062'];

const DarfCard: React.FC<DarfCardProps> = ({ document: darfDoc }) => {
  const { fileName, status, result, calculatedTotal, errorMessage } = darfDoc;
  
  // States
  const [calcMode, setCalcMode] = useState<CalculationMode>('funcionarios');
  const [irInputValue, setIrInputValue] = useState<string>('');
  const [copyStage, setCopyStage] = useState<CopyStage>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [copiedRowIndex, setCopiedRowIndex] = useState<number | null>(null);

  const isSuccess = status === ProcessingStatus.SUCCESS;
  const isError = status === ProcessingStatus.ERROR;
  const isProcessing = status === ProcessingStatus.PROCESSING;

  const difference = isSuccess && result && calculatedTotal !== undefined
    ? Math.abs(result.headerTotal - calculatedTotal)
    : 0;
  const isMatch = difference < 0.05;

  const categorizedData = useMemo(() => {
    if (!result) return { 
      baseFuncionarios: 0, 
      baseIndividuais: 0, 
      itemsFuncIndices: new Set<number>(), 
      itemsIndivIndices: new Set<number>(), 
      itemsRetIndices: new Set<number>() 
    };

    let sumFunc = 0;
    let sumIndiv = 0;
    const itemsFuncIndices = new Set<number>();
    const itemsIndivIndices = new Set<number>();
    const itemsRetIndices = new Set<number>();

    result.items.forEach((item, idx) => {
      const desc = (item.description || '').toLowerCase();
      const code = item.code.replace(/[^\d]/g, '');

      if (RETENTION_CODES.includes(code)) {
        itemsRetIndices.add(idx);
      } else if (desc.includes('individ')) {
        sumIndiv += item.total;
        itemsIndivIndices.add(idx);
      } else {
        sumFunc += item.total;
        itemsFuncIndices.add(idx);
      }
    });

    return { 
      baseFuncionarios: sumFunc, 
      baseIndividuais: sumIndiv,
      itemsFuncIndices,
      itemsIndivIndices,
      itemsRetIndices
    };
  }, [result]);

  const irValueNumber = useMemo(() => {
    if (!irInputValue) return 0;
    const cleanStr = irInputValue.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  }, [irInputValue]);

  const finalValue = useMemo(() => {
    if (calcMode === 'funcionarios') {
      return Math.max(0, categorizedData.baseFuncionarios - irValueNumber);
    } else {
      return categorizedData.baseIndividuais + irValueNumber;
    }
  }, [calcMode, categorizedData, irValueNumber]);

  const handleIrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, '');
    if (value) {
      value = (parseInt(value) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    setIrInputValue(value);
    if (copyStage !== 'idle') setCopyStage('idle');
  };

  const performCopy = async () => {
    const textToCopy = finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyStage('copied');
      setTimeout(() => setCopyStage('idle'), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const initiateCopy = () => {
    if (irValueNumber > 0) {
      performCopy();
    } else {
      setCopyStage('verifying');
      setFeedbackMessage('');
    }
  };

  const handleConfirmCopy = async (hasIr: boolean) => {
    if (hasIr) {
      if (irValueNumber <= 0) {
        setFeedbackMessage('Digite o valor do IR antes de copiar.');
        document.getElementById(`ir-input-${darfDoc.id}`)?.focus();
        return;
      }
    }
    await performCopy();
  };

  const handleCopyRowValue = async (value: number, idx: number) => {
    const textToCopy = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedRowIndex(idx);
      setTimeout(() => setCopiedRowIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy row', err);
    }
  };

  const getRowStyle = (idx: number) => {
    const isFuncRow = categorizedData.itemsFuncIndices.has(idx);
    const isIndivRow = categorizedData.itemsIndivIndices.has(idx);
    const isRetRow = categorizedData.itemsRetIndices.has(idx);

    if (calcMode === 'funcionarios') {
      if (isFuncRow) return 'bg-blue-50 text-blue-900 font-medium';
      if (isRetRow) return 'text-red-900'; 
      if (isIndivRow) return 'text-gray-400 bg-gray-50/50'; 
    } else {
      if (isIndivRow) return 'bg-green-50 text-green-900 font-medium';
      if (isRetRow) return 'text-red-900';
      if (isFuncRow) return 'text-gray-400 bg-gray-50/50'; 
    }
    return 'text-gray-700';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded ${isSuccess ? 'bg-blue-100 text-blue-600' : isError ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-md text-lg" title={fileName}>
            {fileName}
          </h3>
        </div>
        
        <div>
          {isProcessing && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span> Processando
            </span>
          )}
          {isError && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
              Erro
            </span>
          )}
          {isSuccess && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${isMatch ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
              {isMatch ? 'Validado' : 'Divergente'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isProcessing && (
           <div className="flex flex-col items-center justify-center py-8 space-y-3">
             <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
             <p className="text-sm text-gray-500">Analisando documento...</p>
           </div>
        )}

        {isError && (
          <div className="p-4 bg-red-50 text-red-700 rounded text-sm border border-red-100">
            <strong>Falha:</strong> {errorMessage || "Não foi possível ler o arquivo."}
          </div>
        )}

        {isSuccess && result && (
          <div className="space-y-6">
            
            {/* Painel de Controle (Estilo Limpo) */}
            <div className="bg-gray-50 rounded border border-gray-200 p-5">
              
              {/* Tabs */}
              <div className="flex bg-white border border-gray-300 rounded mb-6 overflow-hidden">
                <button
                  onClick={() => { setCalcMode('funcionarios'); setCopyStage('idle'); }}
                  className={`flex-1 py-2 px-4 text-sm font-bold transition-colors ${
                    calcMode === 'funcionarios' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Encargos de Funcionários
                </button>
                <div className="w-px bg-gray-300"></div>
                <button
                  onClick={() => { setCalcMode('individuais'); setCopyStage('idle'); }}
                  className={`flex-1 py-2 px-4 text-sm font-bold transition-colors ${
                    calcMode === 'individuais' 
                      ? 'bg-green-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Contribuintes Individuais
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                
                {/* Campo IR */}
                <div className="w-full md:w-1/3">
                  <label htmlFor={`ir-input-${darfDoc.id}`} className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    IR Contribuinte Individual
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <span className="text-gray-500 font-bold">R$</span>
                    </div>
                    <input
                      id={`ir-input-${darfDoc.id}`}
                      type="text"
                      value={irInputValue}
                      onChange={handleIrChange}
                      placeholder="0,00"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-mono font-bold"
                    />
                    {irValueNumber > 0 && (
                      <div className={`absolute right-2 top-2 text-[10px] font-bold uppercase px-1 rounded ${calcMode === 'funcionarios' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {calcMode === 'funcionarios' ? 'Deduzir' : 'Somar'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Valor Total */}
                <div className="flex flex-col items-end w-full md:w-2/3">
                   <div className="mb-1 text-xs text-gray-500 uppercase font-bold">
                     {calcMode === 'funcionarios' ? 'Total a Pagar (Funcionários)' : 'Total a Pagar (Individuais)'}
                   </div>
                   <div className={`text-4xl font-bold mb-4 ${calcMode === 'funcionarios' ? 'text-blue-700' : 'text-green-700'}`}>
                     {formatCurrency(finalValue)}
                   </div>

                   {/* Ações */}
                   <div className="w-full flex flex-col items-end">
                     
                     {copyStage === 'idle' && (
                       <button
                         onClick={initiateCopy}
                         className={`
                           flex items-center justify-center gap-2 w-full md:w-auto px-6 py-2 rounded text-sm font-bold text-white shadow-sm hover:shadow transition-all active:scale-[0.98]
                           ${calcMode === 'funcionarios' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}
                         `}
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                           <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                         </svg>
                         Copiar Valor
                       </button>
                     )}

                     {copyStage === 'verifying' && (
                       <div className="flex flex-col items-end bg-white p-3 rounded border border-gray-200 shadow-lg z-10">
                         <div className="text-sm font-semibold text-gray-800 mb-2 text-right">
                           Existe valor para <br/> <span className="text-gray-500">IR Contribuinte Individual</span>?
                         </div>
                         <div className="flex gap-2">
                           <button
                             onClick={() => handleConfirmCopy(false)}
                             className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-bold transition-colors"
                           >
                             NÃO
                           </button>
                           <button
                             onClick={() => handleConfirmCopy(true)}
                             className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors"
                           >
                             SIM
                           </button>
                         </div>
                         {feedbackMessage && (
                           <span className="text-xs text-red-600 mt-1 font-medium block text-right">{feedbackMessage}</span>
                         )}
                       </div>
                     )}

                     {copyStage === 'copied' && (
                       <div className="flex items-center gap-2 px-6 py-2 bg-green-50 text-green-700 border border-green-200 rounded text-sm font-bold">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                         </svg>
                         Copiado!
                       </div>
                     )}
                   </div>
                </div>
              </div>
            </div>

            {/* Tabela (Tema Claro) */}
            <div className="overflow-hidden border rounded border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-3 w-16"></th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Código</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-full">Descrição</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Principal</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Multa</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Juros</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-gray-500 italic">
                        Nenhum dado encontrado.
                      </td>
                    </tr>
                  ) : (
                    result.items.map((item, idx) => {
                      const cleanCode = item.code.replace(/[^\d]/g, '');
                      const isRetention = RETENTION_CODES.includes(cleanCode);
                      
                      return (
                        <tr key={`${item.code}-${idx}`} className={`transition-colors duration-150 ${getRowStyle(idx)} hover:bg-gray-50`}>
                          <td className="px-2 py-3 text-center">
                            {isRetention && (
                              <button
                                onClick={() => handleCopyRowValue(item.total, idx)}
                                title="Copiar valor da linha"
                                className="w-8 h-8 flex items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95"
                              >
                                {copiedRowIndex === idx ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="text-white">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                  </svg>
                                )}
                              </button>
                            )}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-inherit">{item.code}</td>
                          <td className="px-4 py-3 text-xs leading-snug text-inherit whitespace-pre-line">
                              {item.description || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-inherit text-right">{formatCurrency(item.principal)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-inherit text-right">{formatCurrency(item.multa)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-inherit text-right">{formatCurrency(item.juros)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-inherit text-right font-bold">{formatCurrency(item.total)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-xs font-bold text-gray-500 uppercase text-right tracking-wider">Soma Geral Guia</td>
                      <td className="px-4 py-4 text-lg font-bold text-gray-900 text-right font-mono">
                        {formatCurrency(calculatedTotal || 0)}
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
