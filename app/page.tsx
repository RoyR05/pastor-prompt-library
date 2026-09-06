'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Eye,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import promptData from '@/lib/prompts.json';

type Prompt = (typeof promptData)[number];
type AiTool = 'Any AI assistant' | 'ChatGPT' | 'Claude' | 'Gemini';

const categories = [...new Set(promptData.map((prompt) => prompt.category))];

const toolGuidance: Record<AiTool, string> = {
  'Any AI assistant': '',
  ChatGPT:
    'Working style for ChatGPT: Use clear headings. Keep planning notes brief and present the final deliverable in a separate, copy-ready section.',
  Claude:
    'Working style for Claude: Briefly state how you interpreted any long source material, then present the final deliverable separately.',
  Gemini:
    'Working style for Gemini: Clearly separate details taken from my source material from your inferences, then end with a short verification list.',
};

type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

function compilePrompt(prompt: Prompt, tool: AiTool, profile: string, details: string) {
  const sections = [
    toolGuidance[tool],
    prompt.prompt,
    `CHURCH PROFILE\n${profile.trim() || '[Add church size, tradition, community, voice, and current focus]'}`,
    `TASK DETAILS OR SOURCE MATERIAL\n${details.trim() || '[Add the details requested in the bracketed fields above]'}`,
  ];

  return sections.filter(Boolean).join('\n\n');
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
  const readyPrompt = useMemo(
    () => compilePrompt(selected, tool, profile, details),
    [selected, tool, profile, details],
  );

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

    void Promise.resolve(
      context.registerTool(
        {
          name: 'prepare_ministry_prompt',
          title: 'Prepare ministry prompt',
          description:
            'Select one of the 77 ministry prompts, add optional church context and task details, and return the copy-ready prompt shown in the library.',
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
            const value = input as {
              promptId?: number;
              tool?: AiTool;
              churchProfile?: string;
              taskDetails?: string;
            };
            const next = promptData.find((prompt) => prompt.id === value.promptId);
            if (!next) throw new Error('Choose a prompt ID from 1 through 77.');
            const nextTool = value.tool ?? 'Any AI assistant';
            const nextProfile = value.churchProfile ?? '';
            const nextDetails = value.taskDetails ?? '';
            setSelectedId(next.id);
            setTool(nextTool);
            setProfile(nextProfile);
            setDetails(nextDetails);
            return {
              promptId: next.id,
              title: next.title,
              prompt: compilePrompt(next, nextTool, nextProfile, nextDetails),
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  function selectPrompt(id: number) {
    setSelectedId(id);
    setDetails('');
    setCopied(false);
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
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-[#101a24] text-white">
        <div className="mx-auto flex max-w-[1580px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full border border-cyan-300/40 bg-cyan-300/10 text-cyan-200">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-cyan-200">Field guide</p>
              <h1 className="text-lg font-semibold tracking-tight">Pastor Prompt Library</h1>
            </div>
          </div>
          <p className="hidden text-sm text-slate-300 md:block">77 practical prompts · no branding · works with major AI assistants</p>
        </div>
      </header>

      <div className="border-b bg-white px-5 py-3 lg:hidden">
        <div className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-2">
          <Select
            value={selected.category}
            onValueChange={(value) => {
              const first = promptData.find((prompt) => prompt.category === value);
              if (first) selectPrompt(first.id);
            }}
          >
            <SelectTrigger className="h-11 w-full text-base"><SelectValue /></SelectTrigger>
            <SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(selected.id)} onValueChange={(value) => value && selectPrompt(Number(value))}>
            <SelectTrigger className="h-11 w-full text-base"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categoryPrompts.map((prompt) => (
                <SelectItem key={prompt.id} value={String(prompt.id)}>
                  {String(prompt.id).padStart(2, '0')} · {prompt.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1580px] lg:grid-cols-[320px_minmax(0,1fr)_390px]">
        <aside className="hidden bg-[#13212d] p-6 text-slate-100 lg:block lg:min-h-[calc(100vh-73px)] lg:border-r lg:border-white/10">
          <div className="sticky top-5 max-h-[calc(100vh-40px)] overflow-y-auto pr-1">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Browse by ministry area</p>
            <nav aria-label="Prompt categories" className="space-y-1">
              {categories.map((category, index) => {
                const active = category === selected.category;
                return (
                  <div key={category}>
                    <button
                      onClick={() => {
                        const first = promptData.find((prompt) => prompt.category === category);
                        if (first) selectPrompt(first.id);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${active ? 'bg-cyan-300 text-[#10202a]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                    >
                      <span className="font-mono text-xs opacity-65">{String(index + 1).padStart(2, '0')}</span>
                      <span>{category}</span>
                    </button>
                    {active && (
                      <div className="ml-5 mt-1 border-l border-cyan-200/20 py-1 pl-3">
                        {categoryPrompts.map((prompt) => (
                          <button
                            key={prompt.id}
                            onClick={() => selectPrompt(prompt.id)}
                            className={`flex w-full gap-2 rounded-md px-2 py-2 text-left text-[0.82rem] leading-5 transition ${prompt.id === selected.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-100'}`}
                          >
                            <span className="font-mono text-cyan-200/65">{String(prompt.id).padStart(2, '0')}</span>
                            <span>{prompt.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="relative min-w-0 px-5 py-8 lg:px-9 lg:py-10 xl:px-12">
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-px bg-cyan-500/20 lg:block" />
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex items-start justify-between gap-5 border-b border-border pb-6">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-primary">{selected.category}</p>
                <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">{selected.title}</h2>
              </div>
              <span className="mt-1 shrink-0 font-mono text-5xl font-light text-cyan-600/35">{String(selected.id).padStart(2, '0')}</span>
            </div>

            <div className="mb-5 grid gap-3 rounded-xl border border-cyan-900/10 bg-cyan-50 p-4 sm:grid-cols-[110px_1fr]">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-900">When to use</p>
              <p className="text-[0.95rem] leading-6 text-slate-700">{selected.whenToUse}</p>
            </div>

            <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_70px_rgba(21,41,53,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Improved prompt</p>
                <Button variant="ghost" size="sm" onClick={() => setShowReview((value) => !value)}>
                  <Eye aria-hidden="true" />
                  {showReview ? 'Hide review' : 'What changed'}
                </Button>
              </div>
              {showReview && (
                <div className="border-b border-emerald-100 bg-emerald-50/70 px-5 py-4">
                  <p className="mb-2 text-sm font-semibold text-emerald-950">Review notes</p>
                  <ul className="grid gap-1.5 text-sm text-emerald-900 sm:grid-cols-2">
                    {selected.improvements.map((item) => (
                      <li key={item} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <pre className="max-h-[620px] overflow-y-auto whitespace-pre-wrap px-5 py-6 font-sans text-[0.98rem] leading-7 text-slate-700">{selected.prompt}</pre>
              {selected.proMove && (
                <div className="border-t border-border bg-slate-50 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Try this next</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{selected.proMove}</p>
                </div>
              )}
            </article>

            <div className="mt-5 flex items-center justify-between">
              <Button variant="outline" onClick={() => movePrompt(-1)} disabled={selectedIndex === 0}>
                <ChevronLeft aria-hidden="true" /> Previous
              </Button>
              <span className="text-sm tabular-nums text-slate-500">{selected.id} of 77</span>
              <Button variant="outline" onClick={() => movePrompt(1)} disabled={selectedIndex === promptData.length - 1}>
                Next <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>

        <aside className="border-t bg-[#f7f8f9] p-5 lg:min-h-[calc(100vh-73px)] lg:border-l lg:border-t-0 lg:p-7">
          <div className="sticky top-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Make it yours</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Add your context</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Your church profile is saved only on this device. Nothing is sent from this site.</p>

            <label className="mt-6 block text-sm font-semibold" htmlFor="tool">AI assistant</label>
            <Select value={tool} onValueChange={(value) => value && setTool(value as AiTool)}>
              <SelectTrigger id="tool" className="mt-2 h-11 w-full bg-white px-3 text-base"><SelectValue /></SelectTrigger>
              <SelectContent align="start">
                {(['Any AI assistant', 'ChatGPT', 'Claude', 'Gemini'] as AiTool[]).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs leading-5 text-slate-500">The core prompt stays the same. A short working-style note is added for the selected tool.</p>

            <label className="mt-5 block text-sm font-semibold" htmlFor="profile">Church profile</label>
            <Textarea
              id="profile"
              value={profile}
              onChange={(event) => setProfile(event.target.value)}
              className="mt-2 min-h-28 resize-y bg-white text-base"
              placeholder="Church size, tradition, community, voice, current focus…"
            />

            <label className="mt-5 block text-sm font-semibold" htmlFor="details">Task details or source material</label>
            <Textarea
              id="details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="mt-2 min-h-40 resize-y bg-white text-base"
              placeholder="Paste notes, a draft, data, or the answers requested in the prompt…"
            />

            <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>Remove private counseling, health, donor, child, and personnel details before pasting into any AI assistant.</p>
            </div>

            <Button onClick={copyPrompt} size="lg" className="mt-5 h-12 w-full bg-[#0b6177] text-base hover:bg-[#084d5e]">
              {copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
              {copied ? 'Copied' : `Copy for ${tool}`}
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}
