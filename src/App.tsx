/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Plus, 
  Download, 
  MessageCircle, 
  CheckCircle2, 
  Building2, 
  MapPin, 
  Phone, 
  Mail,
  Loader2,
  Trash2,
  ExternalLink,
  LogOut,
  User,
  Filter,
  Copy,
  Layout,
  Sparkles
} from "lucide-react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  signInAnonymously,
  User as FirebaseUser 
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { leadService, Lead } from "@/services/leadService";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Toaster } from "@/components/ui/sonner.tsx";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Label } from "@/components/ui/label.tsx";
import { NICHES, LOCATIONS } from "@/constants";
import Papa from "papaparse";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchResults, setSearchResults] = useState<Partial<Lead>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        loadLeads();
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Login realizado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fazer login.");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setLeads([]);
      setSearchResults([]);
      setActiveTab("dashboard");
      toast.success("Logout realizado.");
    } catch (error) {
      console.error(error);
    }
  };

  const loadLeads = async () => {
    const data = await leadService.getLeads();
    setLeads(data);
    if (!selectedLeadId && data.length > 0) {
      setSelectedLeadId(data[0].id!);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !location) {
      toast.error("Preencha o nicho e a localização.");
      return;
    }
    setIsSearching(true);
    setSearchResults([]);
    try {
      const results = await leadService.searchLeads(niche, location);
      setSearchResults(results);
      if (results.length === 0) {
        toast.info("Nenhum lead encontrado com esses critérios.");
      } else {
        toast.success(`${results.length} leads encontrados!`);
      }
    } catch (error) {
      toast.error("Erro na busca.");
    } finally {
      setIsSearching(false);
    }
  };

  const saveLead = async (lead: Partial<Lead>) => {
    try {
      await leadService.saveLead(lead);
      toast.success("Lead salvo!");
      loadLeads();
    } catch (error) {
      toast.error("Erro ao salvar lead.");
    }
  };

  const updateStatus = async (leadId: string, status: Lead['status']) => {
    try {
      await leadService.updateLeadStatus(leadId, status);
      setLeads(leads.map(l => l.id === leadId ? { ...l, status } : l));
      toast.success("Status atualizado.");
    } catch (error) {
      toast.error("Erro ao atualizar status.");
    }
  };

  const deleteLead = async (leadId: string) => {
    try {
      await leadService.deleteLead(leadId);
      setLeads(leads.filter(l => l.id !== leadId));
      toast.success("Lead excluído.");
    } catch (error) {
      toast.error("Erro ao excluir lead.");
    }
  };

  const exportLeads = () => {
    const csvData = leads.map(l => ({
      Nome: l.name,
      Endereço: l.address,
      Telefone: l.phone,
      Email: l.email,
      Nicho: l.niche,
      Status: l.status,
      CriadoEm: l.createdAt ? new Date(l.createdAt.toMillis()).toLocaleString() : ''
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Leads exportados para CSV!");
  };

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 text-foreground">
      <div className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-8 gap-4 p-4 h-auto md:h-screen min-h-[800px]">
        {/* Header Grid Item */}
        <header className="md:col-span-12 md:row-span-1 bento-card flex-row items-center justify-between py-2 px-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Agente Faz <span className="text-muted-foreground font-normal text-sm ml-2 font-mono">v2.4</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-secondary rounded-full">
              {user.photoURL && <img src={user.photoURL} alt="" className="h-5 w-5 rounded-full" />}
              <span className="text-xs font-medium">{user.isAnonymous ? 'Modo Visitante' : user.displayName}</span>
            </div>
            {!user.isAnonymous && (
              <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8">
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            {user.isAnonymous && (
              <Button variant="ghost" size="sm" onClick={login} className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Login Google
              </Button>
            )}
          </div>
        </header>

        {/* Search Config Card */}
        <aside className="md:col-span-3 md:row-span-3 bento-card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Configuração de Busca
          </h3>
          <form onSubmit={handleSearch} className="space-y-4 flex-grow">
            <div className="space-y-1.5">
              <Label htmlFor="niche" className="text-[10px] uppercase font-bold text-muted-foreground">Nicho de Atuação</Label>
              <select 
                id="niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full rounded-lg bg-background border border-border text-xs h-9 px-3 focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Selecione um nicho...</option>
                {NICHES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-[10px] uppercase font-bold text-muted-foreground">Região / Cidade</Label>
              <select 
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg bg-background border border-border text-xs h-9 px-3 focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Selecione uma cidade...</option>
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={isSearching} className="w-full rounded-lg h-10 gap-2 text-sm">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
              Ativar Filtro "Sem Site"
            </Button>
          </form>
        </aside>

        {/* Stats 1 */}
        <div className="md:col-span-2 md:row-span-1 bento-card justify-center items-center text-center py-2 h-full">
          <span className="stat-value">{leads.length}</span>
          <span className="stat-label">Leads Totais</span>
        </div>

        {/* Stats 2 */}
        <div className="md:col-span-2 md:row-span-1 bento-card justify-center items-center text-center py-2 h-full">
          <span className="stat-value">{leads.filter(l => !l.websiteFound).length || 0}</span>
          <span className="stat-label">Sem Website</span>
        </div>

        {/* Main Content Area (Results or Saved Leads) */}
        <div className="md:col-span-7 md:row-span-5 bento-card overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0 overflow-x-auto overflow-y-hidden">
              <TabsList className="bg-secondary p-0.5 rounded-lg">
                <TabsTrigger value="search" className="rounded-md px-4 text-xs h-8">Resultados</TabsTrigger>
                <TabsTrigger value="saved" className="rounded-md px-4 text-xs h-8">Qualificados ({leads.length})</TabsTrigger>
              </TabsList>
              
              {activeTab === 'saved' && leads.length > 0 && (
                <Button onClick={exportLeads} variant="secondary" size="sm" className="rounded-lg h-8 text-xs gap-1">
                  <Download className="h-3 w-3" />
                  Excel (CSV)
                </Button>
              )}
            </div>

            <ScrollArea className="flex-grow rounded-lg border border-border/50 bg-background/30 pr-4">
              <TabsContent value="search" className="m-0 focus-visible:outline-none">
                {searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center h-[300px]">
                    <Search className="h-12 w-12 text-muted-foreground/20 mb-4" />
                    <p className="text-muted-foreground text-sm">Os resultados da busca aparecerão aqui.</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {searchResults.map((result, idx) => (
                      <div key={idx} className="p-4 bg-card rounded-xl border border-border/50 group hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="space-y-1">
                            <h4 className="font-bold text-base text-primary">{result.name}</h4>
                            <Badge variant="secondary" className="rounded-md px-2 py-0 h-5 text-[9px] uppercase tracking-widest font-bold">
                              {result.niche}
                            </Badge>
                          </div>
                          <Button 
                            onClick={() => saveLead(result)} 
                            size="sm"
                            className="rounded-lg h-9 px-6 text-[10px] uppercase font-bold shadow-lg shadow-primary/20"
                          >
                            <Plus className="h-3 w-3 mr-1.5" /> Adicionar aos Leads
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <div className="bg-secondary p-1.5 rounded-md">
                              <MapPin className="h-3.5 w-3.5 text-primary/70" />
                            </div>
                            <span className="truncate">{result.address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <div className="bg-secondary p-1.5 rounded-md">
                              <Phone className="h-3.5 w-3.5 text-primary/70" />
                            </div>
                            <span>{result.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <div className="bg-secondary p-1.5 rounded-md">
                              <Mail className="h-3.5 w-3.5 text-primary/70" />
                            </div>
                            <span className="truncate">{result.email || 'E-mail não disponível'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="saved" className="m-0 focus-visible:outline-none">
                {leads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center h-[300px]">
                    <Building2 className="h-12 w-12 text-muted-foreground/20 mb-4" />
                    <p className="text-muted-foreground text-sm">Salve leads qualificados para gerenciar sua prospecção.</p>
                  </div>
                ) : (
                  <Table className="w-full">
                    <TableHeader className="bg-secondary/50">
                      <TableRow className="border-border">
                        <TableHead className="text-[10px] uppercase font-bold text-muted-foreground h-10">Empresa / Nicho</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-muted-foreground h-10">Localização</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-muted-foreground h-10">Contatos</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-muted-foreground h-10">Status</TableHead>
                        <TableHead className="text-right text-[10px] uppercase font-bold text-muted-foreground h-10">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead) => (
                        <TableRow key={lead.id} className="border-border hover:bg-secondary/20 transition-colors">
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-primary">{lead.name}</span>
                              <span className="text-[9px] bg-secondary w-fit px-1.5 py-0.5 rounded text-muted-foreground uppercase font-bold tracking-tighter">
                                {lead.niche}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="text-[10px] text-muted-foreground leading-tight block max-w-[150px]">
                              {lead.address}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-1 text-[10px]">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Phone className="h-3 w-3 text-primary/50" /> {lead.phone}
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Mail className="h-3 w-3 text-primary/50" /> {lead.email || '-'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <select 
                              value={lead.status}
                              onChange={(e) => updateStatus(lead.id!, e.target.value as Lead['status'])}
                              className="bg-secondary/50 border border-border/40 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest focus:outline-none cursor-pointer text-primary"
                            >
                              <option value="novo">Novo</option>
                              <option value="contatado">Contatado</option>
                              <option value="interessado">Interessado</option>
                              <option value="fechado">Fechado</option>
                              <option value="arquivado">Arquivado</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <div className="flex justify-end gap-2 text-foreground">
                              <a 
                                href={leadService.generateWhatsAppUrl(lead.phone, lead.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-8 px-4 text-[9px] font-bold uppercase rounded-lg bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg shadow-green-900/20 transition-all no-underline"
                                onClick={() => updateStatus(lead.id!, 'contatado')}
                              >
                                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                              </a>
                              <Button 
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                                onClick={() => deleteLead(lead.id!)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Stats 3 */}
        <div className="md:col-span-2 md:row-span-1 bento-card justify-center items-center text-center py-2 h-full">
          <span className="stat-value">{leads.filter(l => l.status === 'contatado').length}</span>
          <span className="stat-label">Contatados</span>
        </div>

        {/* Stats 4 */}
        <div className="md:col-span-2 md:row-span-1 bento-card justify-center items-center text-center py-2 h-full">
          <span className="stat-value">R$ {leads.length * 500}</span>
          <span className="stat-label">Proj. Vendas</span>
        </div>

        {/* AI Seller Tool Card */}
        <div className="md:col-span-3 md:row-span-4 bento-card">
          <div className="mb-4">
            <Label className="text-[10px] uppercase font-bold text-primary mb-2 block">Personalizar para:</Label>
            <select 
              value={selectedLeadId || ""} 
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full bg-secondary/50 border border-border/40 rounded-lg p-2 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none font-bold"
            >
              {leads.length === 0 ? (
                <option value="">Nenhum lead qualificado</option>
              ) : (
                <>
                  <option value="">Selecione um lead...</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          <Tabs defaultValue="script">
            <TabsList className="w-full bg-secondary/50 p-0.5 rounded-lg mb-4">
              <TabsTrigger value="script" className="flex-1 text-[10px] font-bold uppercase py-1.5 h-auto">Script Zap</TabsTrigger>
              <TabsTrigger value="landing" className="flex-1 text-[10px] font-bold uppercase py-1.5 h-auto">Prompt LP</TabsTrigger>
            </TabsList>
            
            <TabsContent value="script" className="space-y-4 m-0 focus-visible:outline-none">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Script de Abordagem
              </h3>
              <div className="relative group">
                <div className="bg-background border border-border border-dashed p-4 rounded-xl text-xs text-muted-foreground leading-relaxed h-[120px] overflow-y-auto">
                  {selectedLead ? (
                    `"Olá! Sou da Agente Faz. Notei que a ${selectedLead.name} aqui em ${selectedLead.address.split(',')[0]} ainda não tem um site profissional. Gostaria de ver o modelo que criei para vocês hoje?"`
                  ) : (
                    "Selecione um lead acima para gerar um script personalizado."
                  )}
                </div>
                {selectedLead && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      const text = `Olá! Sou da Agente Faz. Notei que a ${selectedLead.name} aqui em ${selectedLead.address.split(',')[0]} ainda não tem um site profissional. Gostaria de ver o modelo que criei para vocês hoje?`;
                      navigator.clipboard.writeText(text);
                      toast.success("Copiado!");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Template</Label>
                  <select className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none">
                    <option>Oferta de Site One-Page</option>
                    <option>Google Meu Negócio</option>
                  </select>
                </div>
                <Button variant="secondary" className="w-full rounded-lg h-10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all text-xs font-bold uppercase tracking-widest">
                  Configurar Automação
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="landing" className="space-y-4 m-0 focus-visible:outline-none">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Prompt para Landing Page
              </h3>
              <div className="relative group">
                <div className="bg-background border border-border border-dashed p-4 rounded-xl text-[10px] text-muted-foreground leading-relaxed h-[160px] overflow-y-auto">
                  {selectedLead ? (
                    `Crie uma Landing Page de alta conversão para a empresa "${selectedLead.name}", do nicho "${selectedLead.niche}", localizada em ${selectedLead.address}.

Estrutura:
1. Hero Section com headline chamativa: "A melhor solução em ${selectedLead.niche} de ${selectedLead.address.split(',')[0]}".
2. Seção de Serviços focada em problemas e soluções locais.
3. Prova Social e Depoimentos.
4. FAQ para quebrar objeções.
5. Botão flutuante do WhatsApp para ${selectedLead.phone}.

Estilo: Moderno, Minimalista, Trustworthy. Cores: Escuras com destaque em Azul Real.`
                  ) : (
                    "Selecione um lead acima para gerar um prompt personalizado."
                  )}
                </div>
                {selectedLead && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      const text = `Crie uma Landing Page de alta conversão para a empresa "${selectedLead.name}", do nicho "${selectedLead.niche}", localizada em ${selectedLead.address}.\n\nEstrutura:\n1. Hero Section com headline chamativa: "A melhor solução em ${selectedLead.niche} de ${selectedLead.address.split(',')[0]}".\n2. Seção de Serviços focada em problemas e soluções locais.\n3. Prova Social e Depoimentos.\n4. FAQ para quebrar objeções.\n5. Botão flutuante do WhatsApp para ${selectedLead.phone}.\n\nEstilo: Moderno, Minimalista, Trustworthy. Cores: Escuras com destaque em Azul Real.`;
                      navigator.clipboard.writeText(text);
                      toast.success("Prompt copiado!");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <p className="text-[9px] text-muted-foreground italic">
                Aperte no ícone de cópia e use em sua ferramenta de IA favorita (Cursor, V0, etc).
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Logs / History Small Card */}
        <div className="md:col-span-2 md:row-span-2 bento-card bg-black border-border/50 font-mono text-[10px] p-4 gap-2">
          <div className="text-green-400">[{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}] LeadHunter AI pronto.</div>
          <div className="text-muted-foreground">Verificando domínios...</div>
          <div className="text-muted-foreground">Aguardando comando de busca.</div>
        </div>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
