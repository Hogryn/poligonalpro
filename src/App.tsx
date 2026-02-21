import React, { useState, useRef } from 'react';
import { Upload, Settings, MapPin, Trash2, Download, Rocket, Instagram, BookOpen, PlayCircle, FileText, Menu, X } from 'lucide-react';
import { processKmlLogic, PRO_MODE, FREE_STEP_MIN, FREE_STEP_MAX, FREE_WATERMARK } from './lib/kml';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [stepVal, setStepVal] = useState(15.0);
  const [positionMode, setPositionMode] = useState('DENTRO');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ kml?: string, count?: number, error?: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.toLowerCase().endsWith('.kml')) {
        setFile(droppedFile);
        setResult(null);
      } else {
        alert('Por favor, envie apenas arquivos .kml');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleGenerate = async () => {
    if (!file) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const text = await file.text();
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const modeText = positionMode === 'DENTRO' ? 'Dentro' : 'Fora';
      const kmlInternalName = `${baseName}_${FREE_WATERMARK}_${modeText}`;

      // Run logic (simulating async to allow UI update)
      setTimeout(() => {
        const res = processKmlLogic(text, kmlInternalName, positionMode, stepVal, false, 5.0, 0.0);
        if (res.error) {
          setResult({ error: res.error });
        } else {
          setResult({ kml: res.kml, count: res.count });
        }
        setIsProcessing(false);
      }, 100);
    } catch (err: any) {
      setResult({ error: err.message });
      setIsProcessing(false);
    }
  };

  const downloadKml = () => {
    if (!result?.kml || !file) return;
    const blob = new Blob([result.kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const modeText = positionMode === 'DENTRO' ? 'Dentro' : 'Fora';
    a.href = url;
    a.download = `${baseName}_${FREE_WATERMARK}_${modeText}_${result.count}.kml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-[#F4F6F8] font-sans text-[#2C3E50] overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-[260px] bg-[#2C3E50] text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col h-full overflow-y-auto`}>
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Poligonal <span className="text-white">PRO</span>
          </h2>
          <div className="mt-2 inline-block bg-[#EF4444] text-white text-xs font-bold px-2 py-1 rounded">
            V27.9 [AVALIAÇÃO]
          </div>
        </div>

        <div className="p-6 flex-1 space-y-8">
          {/* Geometria */}
          <section>
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings size={16} /> 1. GEOMETRIA
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm gap-2">
                <span className="leading-tight">Tamanho Máximo do Degrau (m)</span>
                <span className="font-mono text-[#2563EB] bg-white/10 px-1.5 py-0.5 rounded text-xs whitespace-nowrap">{stepVal.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min={FREE_STEP_MIN}
                max={FREE_STEP_MAX}
                step="0.5"
                value={stepVal}
                onChange={(e) => setStepVal(parseFloat(e.target.value))}
                className="w-full accent-[#2563EB]"
              />
            </div>
          </section>

          {/* Posição */}
          <section>
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin size={16} /> 2. POSIÇÃO
            </h3>
            <div className="text-sm mb-2">Regra de Contenção</div>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded cursor-pointer border-l-4 ${positionMode === 'DENTRO' ? 'bg-[#2563EB]/15 border-[#2563EB]' : 'border-transparent hover:bg-white/5'}`}>
                <input type="radio" name="pos" checked={positionMode === 'DENTRO'} onChange={() => setPositionMode('DENTRO')} className="mt-1" />
                <div>
                  <div className="font-bold">DENTRO (Recuar)</div>
                  <div className="text-xs text-white/60">Poligonal recua</div>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 rounded cursor-not-allowed opacity-60 border-l-4 border-transparent">
                <input type="radio" name="pos" disabled className="mt-1" />
                <div>
                  <div className="font-bold flex items-center gap-1">🔒 FORA (Expandir)</div>
                  <div className="text-xs text-white/60">Expandir ao exterior</div>
                </div>
              </label>
              
              <div className="text-xs text-[#EF4444] mt-2">Modo FORA disponível no Kit Completo</div>
              <a href="https://pay.kiwify.com.br/UbpIN0S" target="_blank" rel="noreferrer" className="text-xs text-[#2563EB] hover:underline block mt-1">
                🚀 Adquirir Kit Completo
              </a>
            </div>

            <div className="mt-4 opacity-50 cursor-not-allowed flex items-center gap-2 text-sm">
              <input type="checkbox" disabled />
              <span>🔒 Modo Robusto</span>
            </div>
          </section>

          {/* Limpeza */}
          <section>
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Trash2 size={16} /> 3. LIMPEZA
            </h3>
            <div className="space-y-2 opacity-50 cursor-not-allowed">
              <div className="flex justify-between text-sm">
                <span>🔒 Fundir Detalhes</span>
                <span className="font-mono">0 m</span>
              </div>
              <input type="range" disabled value="0" className="w-full" />
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-white/10 text-xs text-white/50">
          <div className="font-bold text-white mb-2">Poligonal PRO® V27.9</div>
          <div>2026 — Todos os direitos reservados</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative">
        <header className="md:hidden p-4 bg-white border-b border-[#E0E4E8] flex items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-[#2C3E50]">
            <Menu size={24} />
          </button>
          <h1 className="ml-4 text-lg font-bold">Poligonal PRO®</h1>
        </header>

        <div className="flex-1 p-6 md:p-10 max-w-[800px] mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-[28px] font-bold text-[#2C3E50] mb-2">Gerador de Poligonal</h1>
            <p className="text-[#7F8C8D]">Versão de avaliação · Geração automática de poligonais ortogonais (ANM)</p>
          </div>

          {/* Upload Area */}
          <div className="bg-white rounded-xl border border-[#E0E4E8] p-6 mb-6 shadow-sm">
            <h2 className="text-xs font-bold text-[#7F8C8D] uppercase tracking-wider mb-4">ARQUIVO KML DE ENTRADA</h2>
            
            <div 
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer
                ${isDragOver ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#D1D5DB] hover:border-[#2563EB] hover:bg-gray-50'}
              `}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept=".kml" 
                className="hidden" 
              />
              
              <Upload className="mx-auto text-[#7F8C8D] mb-4" size={40} />
              
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium text-[#2C3E50]">{file.name}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                    className="text-[#EF4444] hover:bg-red-50 p-1 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-[#2C3E50] mb-1">Arraste o arquivo KML aqui</p>
                  <p className="text-sm text-[#7F8C8D]">ou clique para selecionar</p>
                </div>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!file || isProcessing}
            className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)]
              ${!file || isProcessing ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'}
            `}
          >
            <Settings size={20} className={isProcessing ? 'animate-spin' : ''} />
            {isProcessing ? 'Processando...' : 'Gerar Poligonal'}
          </button>

          {/* Result Area */}
          {result && (
            <div className="mt-8 bg-white rounded-xl border border-[#E0E4E8] p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xs font-bold text-[#7F8C8D] uppercase tracking-wider mb-4">RESULTADO</h2>
              
              {result.error ? (
                <div className="bg-red-50 text-[#EF4444] p-4 rounded-lg border border-red-100 flex items-start gap-3">
                  <X className="mt-0.5" size={20} />
                  <div>
                    <div className="font-bold">Erro ao processar arquivo</div>
                    <div className="text-sm mt-1">{result.error}</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-emerald-50 text-[#10B981] p-4 rounded-lg border border-emerald-100 font-medium mb-6 flex items-center gap-2">
                    ✅ Poligonal gerada! {result.count} vértices
                  </div>

                  <div className="mb-6">
                    <div className="text-sm text-[#7F8C8D] mb-3">KML: Conferência e Validação</div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={downloadKml}
                        className="flex-1 bg-white border-2 border-[#E0E4E8] hover:border-[#2C3E50] text-[#2C3E50] font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download size={18} /> Baixar KML
                      </button>
                      <a 
                        href="https://pay.kiwify.com.br/UbpIN0S" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 bg-white border-2 border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF] font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download size={18} /> Baixar CSV
                      </a>
                    </div>
                  </div>

                  {/* Upgrade Banner */}
                  <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2C3E50] p-6 rounded-xl text-center">
                    <h3 className="text-white text-lg font-bold mb-2">
                      📐 Inclua mais área do seu terreno na poligonal ANM
                    </h3>
                    <p className="text-slate-300 text-sm mb-6">
                      Com degraus de <strong className="text-blue-400">0.5m</strong>, sua poligonal acompanha o terreno com precisão máxima.
                    </p>
                    <a 
                      href="https://pay.kiwify.com.br/UbpIN0S" 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-block bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-3 px-8 rounded-lg shadow-[0_4px_14px_rgba(37,99,235,0.35)] transition-colors"
                    >
                      Adquirir Kit Completo
                    </a>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Bottom Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {/* Card 1 */}
            <a 
              href="https://www.instagram.com/poligonalpro?igsh=YzBwbHg3anF0dzkz&utm_source=qr" 
              target="_blank" 
              rel="noreferrer"
              className="bg-white p-5 rounded-xl border border-[#E0E4E8] hover:border-[#2563EB] hover:-translate-y-1 transition-all group block"
            >
              <Instagram className="text-[#5E35B1] mb-3" size={28} />
              <h3 className="font-bold text-[#2C3E50] mb-2">Instagram Oficial</h3>
              <p className="text-sm text-[#7F8C8D]">Siga @poligonalpro para dicas de regularização na ANM.</p>
            </a>

            {/* Card 2 */}
            <a 
              href="https://pay.kiwify.com.br/UbpIN0S" 
              target="_blank" 
              rel="noreferrer"
              className="bg-white p-5 rounded-xl border-2 border-[#2563EB] hover:bg-[#EFF6FF] transition-all block"
            >
              <Rocket className="text-[#2563EB] mb-3" size={28} />
              <h3 className="font-bold text-[#2C3E50] mb-3">Adquira Kit Completo</h3>
              <ul className="text-sm text-[#7F8C8D] space-y-2 list-disc pl-4 marker:text-[#2563EB]">
                <li><strong className="text-[#2C3E50]">Precisão Superior:</strong> Degraus menores e Modo Fora Robusto ativado.</li>
                <li><strong className="text-[#2C3E50]">Kit Completo:</strong> Baixe o CSV e a Planilha Excel.</li>
                <li><strong className="text-[#2C3E50]">Economia Inteligente:</strong> Economize na Taxa Anual por Hectare(TAH).</li>
                <li><strong className="text-[#2C3E50]">Maximização:</strong> Inclua a maior área de terreno possível na sua poligonal.</li>
              </ul>
            </a>

            {/* Card 3 */}
            <div className="bg-white p-5 rounded-xl border border-[#E0E4E8] flex flex-col">
              <BookOpen className="text-[#2C3E50] mb-3" size={28} />
              <h3 className="font-bold text-[#2C3E50] mb-2">Suporte & Treinamento</h3>
              <p className="text-sm text-[#7F8C8D] mb-4 flex-1">Acesse o material de apoio para dominar a geração de poligonais.</p>
              <div className="flex gap-2">
                <a 
                  href="https://youtube.com/@poligonalpro?si=Yi2GXOBT5OsLIY2s" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold py-2 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                >
                  <PlayCircle size={14} /> Assistir
                </a>
                <a 
                  href="https://drive.google.com/file/d/1QlrvOa3BhKOtrlU5pT_aZ9saaUT-N504/view?usp=sharing" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex-1 border border-[#2C3E50] text-[#2C3E50] hover:bg-[#2C3E50] hover:text-white text-xs font-bold py-2 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                >
                  <FileText size={14} /> Manual
                </a>
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
