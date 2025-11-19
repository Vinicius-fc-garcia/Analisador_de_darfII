import { GoogleGenAI, Type } from "@google/genai";
import { DarfResult } from "../types";

// Initialize the Gemini API client
// Ideally this runs in a backend to protect the key, but for this client-side demo we use env var directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Converts a File object to a Base64 string suitable for the Gemini API.
 */
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the Data URI prefix (e.g., "data:application/pdf;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes a DARF document using Gemini 2.5 Flash with retry logic.
 */
export const analyzeDarfDocument = async (file: File): Promise<DarfResult> => {
  const modelName = "gemini-2.5-flash";
  const filePart = await fileToGenerativePart(file);

  const prompt = `
    Analise este documento DARF (Documento de Arrecadação de Receitas Federais).
    
    Sua tarefa é extrair duas informações principais:
    1. O "Valor Total do Documento" que geralmente aparece no cabeçalho ou rodapé consolidado (campo 10 ou similar).
    2. A lista de itens da seção "Composição do Documento de Arrecadação".
    
    Para cada linha na composição, procure por:
    - Um CÓDIGO numérico no início (ex: 1082, 1138, etc.).
    - A DESCRIÇÃO: É fundamental capturar a Denominação Principal (que está na mesma linha do código) E TAMBÉM o texto da linha imediatamente abaixo (que contém detalhes como '01 CP SEGURADOS...' ou '01 CP PATRONAL...'). Combine as duas linhas em um único texto, separando-as por uma quebra de linha.
    - Os valores de Principal, Multa, Juros e Total (desta linha específica).
    
    Regras de Extração:
    - Ignore linhas que não começam com um código de receita numérico.
    - Se houver apenas uma linha principal de arrecadação sem tabela detalhada, extraia essa linha única.
    - Converta todos os valores monetários para o formato numérico (float/number), substituindo vírgula decimal por ponto e removendo separadores de milhar. Exemplo: "1.200,50" vira 1200.50.
  `;

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            filePart,
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headerTotal: {
                type: Type.NUMBER,
                description: "O valor total declarado no documento (campo Valor Total).",
              },
              items: {
                type: Type.ARRAY,
                description: "Lista de itens encontrados.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    code: { type: Type.STRING, description: "O código da receita (ex: 1082)." },
                    description: { type: Type.STRING, description: "Descrição completa: Denominação principal + Detalhe da linha abaixo." },
                    principal: { type: Type.NUMBER, description: "Valor do principal." },
                    multa: { type: Type.NUMBER, description: "Valor da multa." },
                    juros: { type: Type.NUMBER, description: "Valor dos juros." },
                    total: { type: Type.NUMBER, description: "Valor total desta linha (soma de principal, multa, juros)." }
                  },
                  required: ["code", "principal", "multa", "juros", "total"]
                }
              }
            },
            required: ["headerTotal", "items"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Falha ao analisar o documento: Resposta vazia da IA.");
      }

      const data = JSON.parse(response.text) as DarfResult;
      return data;

    } catch (error: any) {
      attempt++;
      
      // Verifica se é um erro de sobrecarga (503) ou similar
      const isOverloaded = error?.status === 503 || 
                           error?.code === 503 || 
                           (error?.message && error.message.includes('overloaded'));

      if (isOverloaded && attempt < maxRetries) {
        console.warn(`Modelo sobrecarregado. Tentativa ${attempt} de ${maxRetries}. Aguardando...`);
        // Espera 2 segundos (2000ms) antes de tentar de novo
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      // Se não for erro de sobrecarga ou acabaram as tentativas, lança o erro original
      console.error("Erro na API Gemini:", error);
      
      if (isOverloaded) {
         throw new Error("O sistema da IA está temporariamente sobrecarregado. Por favor, aguarde alguns instantes e tente novamente.");
      }
      
      throw new Error("Falha ao interpretar o documento. Verifique se o arquivo está legível.");
    }
  }

  throw new Error("Falha desconhecida após tentativas.");
};
