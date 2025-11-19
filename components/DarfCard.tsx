
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
  
  // States para a nova lógica
  const [calcMode, setCalcMode] = useState<CalculationMode>('funcionarios');
  const [irInputValue, setIrInputValue] = useState<string>('');
  const [copyStage, setCopyStage] = useState<CopyStage>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  
  // State para feedback visual da cópia linha a linha
  const [copiedRowIndex, setCopiedRowIndex] = useState<number | null>(null);

  const isSuccess = status === ProcessingStatus.SUCCESS;
  const isError = status === ProcessingStatus.ERROR;
  const isProcessing = status === ProcessingStatus.PROCESSING;

  // Validation Logic
  const difference = isSuccess && result && calculatedTotal !== undefined
    ? Math.abs(result.headerTotal - calculatedTotal)
    : 0;
  const isMatch = difference < 0.05;

  // Categorização dos Itens
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
      const code = item.code.replace(/[^\d]/g, ''); // remove formatação se houver

      if (RETENTION_CODES.includes(code)) {
        // É código de retenção de nota fiscal (5952, 0561, 1062)
        itemsRetIndices.add(idx);
      } else if (desc.includes('individ')) {
        // É Contribuinte Individual
        sumIndiv += item.total;
        itemsIndivIndices.add(idx);
      } else {
        // É Encargos de Funcionários (o resto)
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

  // Valor numérico do Input de IR
  const irValueNumber = useMemo(() => {
    if (!irInputValue) return 0;
    const cleanStr = irInputValue.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  }, [irInputValue]);

  // Cálculo Final baseado no Modo
  const finalValue = useMemo(() => {
    if (calcMode === 'funcionarios') {
      return Math.max(0, categorizedData.baseFuncionarios - irValueNumber);
    } else {
      return categorizedData.baseIndividuais + irValueNumber;
    }
  }, [calcMode, categorizedData, irValueNumber]);

  // Formatação do Input de Moeda
  const handleIrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, '');
    if (value) {
      value = (parseInt(value) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    setIrInputValue(value);
    setCopyStage('idle');
  };

  const initiateCopy = () => {
    setCopyStage('verifying');
    setFeedbackMessage('');
  };

  const handleConfirmCopy = async (hasIr: boolean) => {
    if (hasIr) {
      if (irValueNumber <= 0) {
        setFeedbackMessage('Digite o valor do IR antes de copiar.');
        document.getElementById(`ir-input-${darfDoc.id}`)?.focus();
        return;
      }
    }
    const textToCopy = finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyStage('copied');
      setTimeout(() => setCopyStage('idle'), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Função para copiar valor de linha específica (Apenas Retenção)
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
      if (isRetRow) return 'opacity-70 bg-red-50 text-red-800'; 
      if (isIndivRow) return 'opacity-40'; 
    } else {
      if (isIndivRow) return 'bg-green-50 text-green-900 font-medium';
      if (isRetRow) return 'opacity-70 bg-red-50 text-red-800';
      if (isFuncRow) return 'opacity-40'; 
    }
    return 'text-slate-600';
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
            
            {/* Painel de Controle e Cálculo */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
              
              {/* 1. Chave Seletora */}
              <div className="flex p-1 bg-slate-200 rounded-lg mb-6">
                <button
                  onClick={() => { setCalcMode('funcionarios'); setCopyStage('idle'); }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${
                    calcMode === 'funcionarios' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Encargos de Funcionários
                </button>
                <button
                  onClick={() => { setCalcMode('individuais'); setCopyStage('idle'); }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${
                    calcMode === 'individuais' 
                      ? 'bg-white text-green-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Contribuintes Individuais
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                
                {/* 2. Campo IR */}
                <div className="w-full md:w-1/3">
                  <label htmlFor={`ir-input-${darfDoc.id}`} className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    IR Contribuinte Individual (R$)
                  </label>
                  <div className="relative">
                    <input
                      id={`ir-input-${darfDoc.id}`}
                      type="text"
                      value={irInputValue}
                      onChange={handleIrChange}
                      placeholder="0,00"
                      className="w-full pl-3 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-mono font-medium"
                    />
                    {irValueNumber > 0 && (
                      <div className="absolute right-0 top-full mt-1 text-[10px] text-slate-400">
                        {calcMode === 'funcionarios' ? 'Será deduzido (-)' : 'Será somado (+)'}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Valor Total e Ação */}
                <div className="flex flex-col items-end w-full md:w-2/3">
                   <div className="mb-1 text-xs text-slate-500 uppercase font-semibold">
                     {calcMode === 'funcionarios' ? 'Total Funcionários' : 'Total Individuais'}
                   </div>
                   <div className={`text-3xl font-bold mb-3 ${calcMode === 'funcionarios' ? 'text-blue-700' : 'text-green-700'}`}>
                     {formatCurrency(finalValue)}
                   </div>

                   {/* Área de Ação: Botão Copiar ou Verificação */}
                   <div className="w-full flex flex-col items-end">
                     
                     {copyStage === 'idle' && (
                       <button
                         onClick={initiateCopy}
                         className={`
                           flex items-center justify-center gap-2 w-full md:w-auto px-6 py-2.5 rounded-lg text-sm font-bold transition-all text-white shadow-sm active:scale-95
                           ${calcMode === 'funcionarios' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}
                         `}
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                           <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                           <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                         </svg>
                         Copiar Valor
                       </button>
                     )}

                     {copyStage === 'verifying' && (
                       <div className="flex flex-col items-end animate-in fade-in zoom-in duration-200">
                         <div className="text-sm font-semibold text-slate-700 mb-2 text-right">
                           Existe algum valor para <br/> IR Contribuinte Individual?
                         </div>
                         <div className="flex gap-2">
                           <button
                             onClick={() => handleConfirmCopy(false)}
                             className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-xs font-bold transition-colors"
                           >
                             NÃO
                           </button>
                           <button
                             onClick={() => handleConfirmCopy(true)}
                             className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold transition-colors"
                           >
                             SIM
                           </button>
                         </div>
                         {feedbackMessage && (
                           <span className="text-xs text-red-600 mt-1 font-medium">{feedbackMessage}</span>
                         )}
                       </div>
                     )}

                     {copyStage === 'copied' && (
                       <div className="flex items-center gap-2 px-6 py-2.5 bg-green-100 text-green-800 rounded-lg text-sm font-bold animate-in fade-in">
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                         </svg>
                         Valor Copiado!
                       </div>
                     )}
                   </div>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto border rounded-lg border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-2 py-3 w-10"></th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-full">Descrição</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Principal</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Multa</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Juros</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-slate-900 uppercase tracking-wider whitespace-nowrap">Total</th>
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
                    result.items.map((item, idx) => {
                      const cleanCode = item.code.replace(/[^\d]/g, '');
                      const isRetention = RETENTION_CODES.includes(cleanCode);
                      
                      return (
                        <tr key={`${item.code}-${idx}`} className={`transition-colors duration-200 ${getRowStyle(idx)}`}>
                          {/* Botão de Copiar (Apenas para Códigos de Retenção) */}
                          <td className="px-2 py-2 text-center">
                            {isRetention && (
                              <button
                                onClick={() => handleCopyRowValue(item.total, idx)}
                                title="Copiar valor desta linha"
                                className="p-1.5 rounded-md hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                              >
                                {copiedRowIndex === idx ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-600">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </td>

                          <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-inherit">{item.code}</td>
                          <td className="px-4 py-2 text-xs leading-tight text-inherit max-w-2xl whitespace-pre-line">
                              {item.description || '-'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-inherit text-right font-mono">{formatCurrency(item.principal)}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-inherit text-right font-mono">{formatCurrency(item.multa)}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-inherit text-right font-mono">{formatCurrency(item.juros)}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-inherit text-right font-mono font-semibold">{formatCurrency(item.total)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-slate-100">
                    <tr>
                      <td colSpan={6} className="px-4 py-2 text-xs font-bold text-slate-700 uppercase text-right">Soma Geral Guia</td>
                      <td className="px-4 py-2 text-sm font-bold text-slate-900 text-right font-mono">
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
