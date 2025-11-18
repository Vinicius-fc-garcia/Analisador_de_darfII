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
 * Analyzes a DARF document using Gemini 2.5 Flash.
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
    - A DESCRIÇÃO textual que aparece logo após o código (ex: "IRRF - REND DO TRABALHO").
    - Os valores de Principal, Multa, Juros e Total (desta linha específica).
    
    Regras de Extração:
    - Ignore linhas que não começam com um código de receita numérico.
    - Se houver apenas uma linha principal de arrecadação sem tabela detalhada, extraia essa linha única.
    - A descrição deve ser curta e clara.
    - Converta todos os valores monetários para o formato numérico (float/number), substituindo vírgula decimal por ponto e removendo separadores de milhar. Exemplo: "1.200,50" vira 1200.50.
  `;

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
                description: { type: Type.STRING, description: "Descrição ou nome do tributo ao lado do código." },
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

  try {
    const data = JSON.parse(response.text) as DarfResult;
    return data;
  } catch (e) {
    console.error("JSON Parse Error:", e);
    throw new Error("Falha ao interpretar a resposta da IA.");
  }
};