'use client';

export const dynamic = 'force-static';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronLeft, ChevronRight, Copy, Download, Eye, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import promptData from '@/lib/prompts.json';

type Prompt = (typeof promptData)[number];
type AiTool = 'Any AI assistant' | 'ChatGPT' | 'Claude' | 'Gemini';
const categories = [...new Set(promptData.map((prompt) => prompt.category))];

const toolGuidance: Record<AiTool, string> = {
  'Any AI assistant': '',
  ChatGPT: 'Working style for ChatGPT: Use clear headings. Keep planning notes brief and present the final deliverable in a separate, copy-ready section.',
  Claude: 'Working style for Claude: Briefly state how you interpreted any long source material, then present the final deliverable separately.',
  Gemini: 'Working style for Gemini: Clearly separate details taken from my source material from your inferences, then end with a short verification list.',
};

type ModelContext = {
  registerTool: (tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: object;
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
    execute: (input: unknown) => unknown;
  }, options?: { signal?: AbortSignal }) => void | Promise<void>;
};

function compilePrompt(prompt: Prompt, tool: AiTool, profile: string, details: string) {
  return [
    toolGuidance[tool],
    prompt.prompt,
    `CHURCH PROFILE\n${profile.trim() || '[Add church size, tradition, community, voice, and current focus]'}`,
    `TASK DETAILS OR SOURCE MATERIAL\n${details.trim() || '[Add the details requested in the bracketed fields above]'}`,
  ].filter(Boolean).join('\n\n');
}

export default function Home() {
  const [selectedId, setSelectedId] = useState(1);
  const [tool, setTool] = useState<AiTool>('Any AI assistant');
  const [profile, setProfile] = useState('');
  const [details, setDetails] = useState('');
  const [copied, setCopied] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const selected = promptData.find((prompt) => prompt.id === selectedId) ?? promptData[0];
  const categoryPrompts = promptData.filter((prompt) => prompt.category === selected.category);
  const selectedIndex = promptData.findIndex((prompt) => prompt.id === selected.id);
  const readyPrompt = useMemo(() => compilePrompt(selected, tool, profile, details), [selected, tool, profile, details]);

  useEffect(() => {
    const saved = window.localStorage.getItem('pastor-prompt-library:church-profile');
    if (saved) setProfile(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('pastor-prompt-library:church-profile', profile);
  }, [profile]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'prepare_ministry_prompt',
      title: 'Prepare ministry prompt',
      description: 'Select one of the 77 ministry prompts, add optional church context and task details, and return the copy-ready prompt shown in the library.',
      inputSchema: {
        type: 'object',
        properties: {
          promptId: { type: 'number', minimum: 1, maximum: 77 },
          tool: { type: 'string', enum: ['Any AI assistant', 'ChatGPT', 'Claude', 'Gemini'] },
          churchProfile: { type: 'string' },
          taskDetails: { type: 'string' },
        },
        required: ['promptId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input) {
        const value = input as { promptId?: number; tool?: AiTool; churchProfile?: string; taskDetails?: string };
        const next = promptData.find((prompt) => prompt.id === value.promptId);
        if (!next) throw new Error('Choose a prompt ID from 1 through 77.');
        const nextTool = value.tool ?? 'Any AI assistant';
        const nextProfile = value.churchProfile ?? '';
        const nextDetails = value.taskDetails ?? '';
        setSelectedId(next.id);
        setTool(nextTool);
        setProfile(nextProfile);
        setDetails(nextDetails);
        return { promptId: next.id, title: next.title, prompt: compilePrompt(next, nextTool, nextProfile, nextDetails) };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  function selectPrompt(id: number) {
    setSelectedId(id);
    setDetails('');
    setCopied(false);
    setShowReview(false);
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(readyPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function movePrompt(direction: -1 | 1) {
    const next = Math.min(promptData.length - 1, Math.max(0, selectedIndex + direction));
    selectPrompt(promptData[next].id);
  }

  return (
    <main className="library-shell" id="top">
      <header className="masthead">
        <div className="masthead-inner">
          <a className="wordmark" href="#top" aria-label="Pastor Prompt Library home">
            <span className="wordmark-mark"><BookOpen aria-hidden="true" /></span>
            <span>Pastor Prompt Library</span>
          </a>
          <p>Practical help for the weekly work of ministry</p>
          <div className="masthead-actions">
            <span className="edition">77 prompts · First edition</span>
            <a className="pdf-link" href="./Pastor-Prompt-Library-77-Practical-AI-Prompts.pdf" download>
              <Download aria-hidden="true" />
              <span>Download PDF</span>
            </a>
          </div>
        </div>
      </header>

      <div className="mobile-picker">
        <Select value={selected.category} onValueChange={(value) => {
          const first = promptData.find((prompt) => prompt.category === value);
          if (first) selectPrompt(first.id);
        }}>
          <SelectTrigger className="mobile-select" aria-label="Choose a ministry area"><SelectValue /></SelectTrigger>
          <SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(selected.id)} onValueChange={(value) => value && selectPrompt(Number(value))}>
          <SelectTrigger className="mobile-select" aria-label="Choose a prompt"><SelectValue /></SelectTrigger>
          <SelectContent>{categoryPrompts.map((prompt) => (
            <SelectItem key={prompt.id} value={String(prompt.id)}>{prompt.id}. {prompt.title}</SelectItem>
          ))}</SelectContent>
        </Select>
      </div>

      <div className="library-grid">
        <aside className="catalog">
          <div className="catalog-inner">
            <h2>Ministry areas</h2>
            <nav aria-label="Prompt categories">
              {categories.map((category) => {
                const active = category === selected.category;
                const count = promptData.filter((prompt) => prompt.category === category).length;
                return (
                  <div key={category} className="catalog-section">
                    <button onClick={() => {
                      const first = promptData.find((prompt) => prompt.category === category);
                      if (first) selectPrompt(first.id);
                    }} className={`category-link ${active ? 'is-active' : ''}`}>
                      <span>{category}</span><span>{count}</span>
                    </button>
                    {active && <div className="prompt-index">
                      {categoryPrompts.map((prompt) => (
                        <button key={prompt.id} onClick={() => selectPrompt(prompt.id)} className={prompt.id === selected.id ? 'is-current' : ''}>
                          <span>{prompt.id}</span><span>{prompt.title}</span>
                        </button>
                      ))}
                    </div>}
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="reading-pane">
          <div className="reading-inner">
            <div className="prompt-heading">
              <p>{selected.category} · Prompt {selected.id}</p>
              <h1>{selected.title}</h1>
              <div className="use-note"><span>Best used</span><p>{selected.whenToUse}</p></div>
            </div>

            <article className="prompt-sheet">
              <div className="sheet-toolbar">
                <h2>The prompt</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowReview((value) => !value)}>
                  <Eye aria-hidden="true" />{showReview ? 'Close notes' : 'Editor’s notes'}
                </Button>
              </div>
              {showReview && <div className="review-notes">
                <h3>How this version was strengthened</h3>
                <ul>{selected.improvements.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
              </div>}
              <div className="prompt-copy">{selected.prompt}</div>
              {selected.proMove && <div className="next-step"><span>Follow-up idea</span><p>{selected.proMove}</p></div>}
            </article>

            <nav className="page-turner" aria-label="Prompt pagination">
              <Button variant="ghost" onClick={() => movePrompt(-1)} disabled={selectedIndex === 0}><ChevronLeft aria-hidden="true" /> Previous</Button>
              <span><strong>{selected.id}</strong> / 77</span>
              <Button variant="ghost" onClick={() => movePrompt(1)} disabled={selectedIndex === promptData.length - 1}>Next <ChevronRight aria-hidden="true" /></Button>
            </nav>
          </div>
        </section>

        <aside className="workbench">
          <div className="workbench-inner">
            <h2>Tailor this prompt</h2>
            <p className="workbench-intro">Add your setting and source material, then copy a ready-to-use version.</p>

            <label htmlFor="tool">Use with</label>
            <Select value={tool} onValueChange={(value) => value && setTool(value as AiTool)}>
              <SelectTrigger id="tool" className="workbench-select"><SelectValue /></SelectTrigger>
              <SelectContent align="start">{(['Any AI assistant', 'ChatGPT', 'Claude', 'Gemini'] as AiTool[]).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>

            <label htmlFor="profile">Your church context</label>
            <Textarea id="profile" value={profile} onChange={(event) => setProfile(event.target.value)} className="workbench-textarea profile-field" placeholder="Tradition, church size, community, voice, and present focus" />
            <p className="field-note">Saved only in this browser.</p>

            <label htmlFor="details">Notes or source material</label>
            <Textarea id="details" value={details} onChange={(event) => setDetails(event.target.value)} className="workbench-textarea details-field" placeholder="Paste the sermon, draft, figures, or details this prompt calls for" />

            <div className="privacy-note"><ShieldCheck aria-hidden="true" /><p>Remove private counseling, health, donor, child, and personnel details before using any AI assistant.</p></div>
            <Button onClick={copyPrompt} size="lg" className="copy-button">
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? 'Prompt copied' : `Copy for ${tool}`}
            </Button>
            <p className="copy-note">Nothing entered here is sent from this website.</p>
          </div>
        </aside>
      </div>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <p>Pastor Prompt Library · 77 practical prompts for ministry</p>
          <a href="./Pastor-Prompt-Library-77-Practical-AI-Prompts.pdf" download>
            <Download aria-hidden="true" /> Download the PDF edition
          </a>
        </div>
      </footer>
    </main>
  );
}
