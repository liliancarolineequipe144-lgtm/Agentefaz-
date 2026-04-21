import { GoogleGenAI, Type } from "@google/genai";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db, auth, handleFirestoreError } from "../lib/firebase";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Lead {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  niche: string;
  status: 'novo' | 'contatado' | 'interessado' | 'fechado' | 'arquivado';
  websiteFound: boolean;
  whatsappUrl?: string;
  customMessage?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  ownerId: string;
}

export const leadService = {
  async searchLeads(niche: string, location: string): Promise<Partial<Lead>[]> {
    const prompt = `Procure por empresas no nicho "${niche}" na localização "${location}" que PROVAVELMENTE NÃO POSSUEM SITE. 
    Retorne uma lista de leads com Nome, Endereço, Telefone e Email (se disponível). 
    Verifique especificamente se eles têm um domínio próprio (.com.br, .com, etc) ou se usam apenas redes sociais. Priorize os que NÃO têm site.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                address: { type: Type.STRING },
                phone: { type: Type.STRING },
                email: { type: Type.STRING },
                niche: { type: Type.STRING },
                websiteFound: { type: Type.BOOLEAN },
              },
              required: ["name", "address", "phone", "websiteFound"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) return [];
      
      const leadsData = JSON.parse(text);
      return Array.isArray(leadsData) ? leadsData : [];
    } catch (error) {
      console.error("Erro ao buscar leads via AI:", error);
      return [];
    }
  },

  async saveLead(leadData: Partial<Lead>) {
    if (!auth.currentUser) throw new Error("Usuário não autenticado");

    try {
      const docRef = await addDoc(collection(db, "leads"), {
        ...leadData,
        status: 'novo',
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, 'create', 'leads');
    }
  },

  async getLeads(): Promise<Lead[]> {
    if (!auth.currentUser) return [];
    
    try {
      const q = query(
        collection(db, "leads"), 
        where("ownerId", "==", auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];
    } catch (error) {
      handleFirestoreError(error, 'list', 'leads');
    }
  },

  async updateLeadStatus(leadId: string, status: Lead['status']) {
    try {
      const leadRef = doc(db, "leads", leadId);
      await updateDoc(leadRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, 'update', `leads/${leadId}`);
    }
  },

  async deleteLead(leadId: string) {
    try {
      const leadRef = doc(db, "leads", leadId);
      await deleteDoc(leadRef);
    } catch (error) {
      handleFirestoreError(error, 'delete', `leads/${leadId}`);
    }
  },

  generateWhatsAppUrl(phone: string, name: string): string {
    const cleanPhone = phone.replace(/\D/g, "");
    // Se não tiver código de país, assume 55 (Brasil) se tiver tamanho de celular BR
    const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const message = encodeURIComponent(`Olá, sou da Agente Faz. Notei que a ${name} ainda não tem uma presença profissional na web e gostaria de oferecer a criação do seu site. Podemos conversar?`);
    return `https://wa.me/${finalPhone}?text=${message}`;
  }
};
