// Jarvis: the site's AI assistant, under the phone.
//   Desktop: opening the chat shrinks the phone to the left (Stage Manager style) so nothing is covered.
//   Voice in: Web Speech API (SpeechRecognition), with the mic level driving the orb and the island waveform.
//   Voice out: speechSynthesis, only for questions that were spoken (like Siri).
//   Talks to the assistant Worker (worker/): POST /api/chat and /api/lead.
// It tells the rest of the page what it's doing through DOM events, so nothing here reaches into the fold's internals:
//   'assistant:state' {state, label} → island indicators     'duo:navigate' {id} / 'duo:fold' → src/scripts/fold.ts

type State = 'idle' | 'listening' | 'thinking' | 'speaking';
type Section = 'now' | 'work' | 'ai' | 'experience' | 'skills' | 'contact' | 'none';
type Reply = { answer: string; status: 'answered' | 'unknown' | 'declined'; section: Section; sessionToken?: string; speakToken?: string };
type Turn = { role: 'user' | 'assistant'; content: string };

const root = document.querySelector<HTMLElement>('[data-assistant]');
if (root) init(root);

function init(root: HTMLElement) {
  const api = root.dataset.api!.replace(/\/+$/, '');
  const siteKey = root.dataset.turnstile;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const orbBtn = $<HTMLButtonElement>('[data-orb]');
  const panel = $<HTMLElement>('[data-panel]');
  const log = $<HTMLOListElement>('[data-log]');
  const chips = $<HTMLElement>('[data-chips]');
  const form = $<HTMLFormElement>('[data-form]');
  const input = $<HTMLInputElement>('[data-input]');
  const micBtn = $<HTMLButtonElement>('[data-mic]');
  const toast = $<HTMLElement>('[data-toast]');
  const intro = $<HTMLElement>('[data-intro]');
  const deviceMode = window.matchMedia('(min-width: 1000px) and (min-height: 640px)');

  // ---------- Language: the UI follows the browser; answers follow whatever language the visitor writes in ----------
  const lang: 'zh' | 'en' = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  const T = {
    en: {
      cta: 'Ask Jarvis', title: 'Jarvis', subtitle: 'Kuiduan’s AI assistant · answers from what he’s shared',
      intro: 'Good day. I’m Jarvis, Kuiduan’s assistant. Ask me about his work, his projects, or what he’s building at the moment. I only know what he’s shared with me, so a few things may be beyond me.',
      label: 'Your question', placeholder: 'Ask Jarvis about Kuiduan…', fine: 'Questions are saved to improve the answers.',
      close: 'Close', mic: 'Ask with your voice', send: 'Send', undo: 'Undo',
      listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking',
      shown: 'Showing', see: (s: string) => `See ${s} on the page`,
      chips: ['What does he do at Intuit?', 'Tell me about his projects', 'What’s his iOS stack?', 'What is he working on now?'],
      leadAsk: 'Want Kuiduan to answer this himself? Leave your email.',
      email: 'Email', name: 'Name (optional)', company: 'Company (optional)', leadSend: 'Send', leadDone: 'Thanks! He’ll get back to you soon.',
      errors: { rate_limited: 'That’s a lot of questions at once. Give it a minute.', verify_failed: 'Couldn’t verify you’re human. Reload and try again.', network: 'Can’t reach the assistant right now. Try again in a bit.', bad_email: 'That email doesn’t look right.', mic: 'Microphone access is blocked. You can type instead.' },
      sections: { now: 'Now', work: 'Selected work', ai: 'Building with AI', experience: 'Experience', skills: 'Toolkit', contact: 'Contact' },
    },
    zh: {
      cta: '问问 Jarvis', title: 'Jarvis', subtitle: 'Kuiduan 的 AI 助手 · 根据他分享的资料回答',
      intro: '您好，我是 Jarvis，Kuiduan 的 AI 助手。可以问我他的工作、项目，或者最近在做什么。我只知道他分享过的内容，有些问题可能答不上来。',
      label: '你的问题', placeholder: '问问 Jarvis 关于 Kuiduan 的事…', fine: '提问会被记录，用于改进回答。',
      close: '关闭', mic: '语音提问', send: '发送', undo: '撤销',
      listening: '正在听…', thinking: '思考中…', speaking: '回答中',
      shown: '已跳到', see: (s: string) => `在页面中查看「${s}」`,
      chips: ['他在 Intuit 做什么？', '介绍一下他的项目', '他用什么技术栈？', '他最近在忙什么？'],
      leadAsk: '想让 Kuiduan 亲自回答？留下你的邮箱。',
      email: '邮箱', name: '姓名（选填）', company: '公司（选填）', leadSend: '发送', leadDone: '收到！他会尽快回复你。',
      errors: { rate_limited: '问得有点快，稍等一分钟再试。', verify_failed: '人机验证没通过，请刷新页面再试。', network: '暂时连不上助手，请稍后再试。', bad_email: '邮箱格式好像不对。', mic: '麦克风权限被拦截了，可以改用打字。' },
      sections: { now: '近况', work: '作品', ai: 'AI 实践', experience: '经历', skills: '技能', contact: '联系方式' },
    },
  }[lang];
  if (lang === 'zh') {
    root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => (el.textContent = T[el.dataset.i18n as 'cta']));
    root.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach((el) => el.setAttribute('aria-label', T[el.dataset.i18nLabel as 'close']));
    input.placeholder = T.placeholder;
  }

  // ---------- Conversation state ----------
  const sessionId = (() => {
    try {
      const saved = sessionStorage.getItem('assistant-session');
      if (saved) return saved;
      const id = crypto.randomUUID();
      sessionStorage.setItem('assistant-session', id);
      return id;
    } catch { return crypto.randomUUID(); }
  })();
  let sessionToken: string | undefined;
  const history: Turn[] = [];
  let state: State = 'idle';
  let autoJumped = false; // the page moves by itself once per visit; after that, answers offer a link instead
  let leadSent = false;

  // ---------- State → orb, island indicators, and the waveform level ----------
  const levelEls = () => document.querySelectorAll<HTMLElement>('[data-ai-level]');
  let level = 0;
  let analyser: AnalyserNode | null = null;
  let raf = 0;

  function setState(next: State) {
    state = next;
    root.dataset.state = next;
    const label = next === 'idle' ? '' : T[next];
    document.querySelectorAll<HTMLElement>('[data-ai-indicator]').forEach((el) => (el.dataset.aiState = next));
    document.querySelectorAll<HTMLElement>('[data-ai-label]').forEach((el) => (el.textContent = label));
    document.dispatchEvent(new CustomEvent('assistant:state', { detail: { state: next, label } }));
    cancelAnimationFrame(raf);
    if (next === 'listening' || next === 'speaking') raf = requestAnimationFrame(tick);
    else paintLevel(0);
  }

  const buf = new Uint8Array(256);
  function tick(t: number) {
    if (state === 'listening' && analyser) {
      level += (Math.min(1, rmsOf(analyser) * 4) - level) * 0.35;
    } else if (state === 'speaking' && speechAnalyser) {
      level += (Math.min(1, rmsOf(speechAnalyser) * 3.2) - level) * 0.35; // Jarvis's real voice (Azure audio)
    } else if (state === 'speaking') {
      // speechSynthesis exposes no audio, so the waveform "talks" with a gentle synthetic level.
      level = 0.35 + 0.3 * Math.abs(Math.sin(t / 110) * Math.sin(t / 370));
    } else {
      level *= 0.8;
    }
    paintLevel(level);
    raf = requestAnimationFrame(tick);
  }
  function rmsOf(an: AnalyserNode) {
    an.getByteTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += (v - 128) ** 2;
    return Math.sqrt(sum / buf.length) / 128; // 0..~0.5 for speech
  }
  function paintLevel(v: number) {
    levelEls().forEach((el) => el.style.setProperty('--lvl', v.toFixed(3)));
  }

  // ---------- Stage Manager (desktop): shrink the phone into the space left of the chat window ----------
  const device = document.getElementById('device');
  const MARGIN = 32; // px between the windows and the screen edges
  const GAP = 48;    // px between the phone and the chat: close enough to read as one workspace
  function layoutStage() {
    if (!device) return;
    if (panel.hidden || !deviceMode.matches) {
      device.style.removeProperty('scale');
      device.style.removeProperty('translate');
      panel.style.removeProperty('right');
      return;
    }
    const open = device.classList.contains('is-open') || device.classList.contains('opening');
    const W = device.offsetWidth / 2;          // one screen; layout size, unaffected by transforms
    const visible = open ? 2 * W : W;          // folded, only the cover screen shows (centred by fold.ts's transform)
    const panelW = panel.offsetWidth;
    const avail = innerWidth - panelW - MARGIN * 2 - GAP;
    const scale = Math.min(1, avail / visible, (innerHeight - MARGIN * 2) / device.offsetHeight);
    // Phone and chat sit side by side as one group, centred on screen; on narrow screens the group fills the width.
    const phoneW = visible * scale;
    const left = Math.max(MARGIN, (innerWidth - (phoneW + GAP + panelW)) / 2);
    const shift = left + phoneW / 2 - innerWidth / 2;
    device.style.setProperty('scale', scale.toFixed(3));
    device.style.setProperty('translate', `${Math.round(shift)}px 0`);
    panel.style.setProperty('right', `${Math.round(Math.max(MARGIN, innerWidth - left - phoneW - GAP - panelW))}px`);
  }
  if (device) new MutationObserver(layoutStage).observe(device, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', layoutStage);
  deviceMode.addEventListener('change', layoutStage);

  // ---------- Panel ----------
  function openPanel() {
    panel.hidden = false;
    root.classList.add('is-open');
    layoutStage();
    orbBtn.setAttribute('aria-expanded', 'true');
    if (!log.children.length) renderChips();
    input.focus({ preventScroll: true });
    if (siteKey) loadTurnstile(); // warm up so the first question doesn't wait for it
  }
  function closePanel() {
    panel.hidden = true;
    root.classList.remove('is-open');
    layoutStage();
    orbBtn.setAttribute('aria-expanded', 'false');
    stopListening();
    stopSpeaking();
    setState('idle');
    orbBtn.focus({ preventScroll: true });
  }
  orbBtn.addEventListener('click', () => (panel.hidden ? openPanel() : closePanel()));
  $('[data-close]').addEventListener('click', closePanel);
  // Esc closes the panel only; stop it here so the fold doesn't also close the phone.
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closePanel(); }
  });

  function renderChips() {
    chips.replaceChildren(...T.chips.map((q) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = q;
      b.addEventListener('click', () => ask(q, false));
      return b;
    }));
  }

  // ---------- Messages ----------
  function addMessage(role: 'user' | 'bot', text: string) {
    const li = document.createElement('li');
    li.className = `msg ${role}`;
    li.textContent = text;
    log.append(li);
    li.scrollIntoView({ block: 'nearest' });
    return li;
  }
  function addTyping() {
    const li = addMessage('bot', '');
    li.innerHTML = '<span class="typing" aria-label="…"><i></i><i></i><i></i></span>';
    return li;
  }
  const scrollLog = () => (log.scrollTop = log.scrollHeight);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value, false);
  });

  async function ask(raw: string, spoken: boolean) {
    const question = raw.trim().slice(0, 500);
    if (!question || state === 'thinking') return;
    stopSpeaking();
    chips.replaceChildren();
    intro.hidden = true;
    input.value = '';
    addMessage('user', question);
    history.push({ role: 'user', content: question });
    setState('thinking');
    const bubble = addTyping();

    try {
      const reply = await post<Reply>('/api/chat', { sessionId, messages: history.slice(-13) });
      history.push({ role: 'assistant', content: reply.answer });
      bubble.textContent = reply.answer;
      showSection(reply.section);
      if (reply.status !== 'answered' && !leadSent) addLeadForm(question);
      scrollLog();
      if (spoken) speak(reply.answer, reply.speakToken);
      else setState('idle');
    } catch (err) {
      history.pop(); // let them ask the same thing again
      bubble.classList.add('error');
      bubble.textContent = errorText(err);
      setState('idle');
    }
  }

  // ---------- Networking (with Turnstile on the first request of a visit) ----------
  class ApiError extends Error {}
  async function post<R extends { sessionToken?: string }>(path: string, body: object, retried = false): Promise<R> {
    const auth = sessionToken ? { sessionToken } : { turnstileToken: await turnstileToken() };
    let res: Response;
    try {
      res = await fetch(`${api}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, ...auth }),
      });
    } catch {
      throw new ApiError('network');
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 403 && data.error === 'verify_failed' && sessionToken && !retried) {
      sessionToken = undefined; // expired session: verify again, once
      return post(path, body, true);
    }
    if (!res.ok) throw new ApiError(data.error ?? 'network');
    if (data.sessionToken) sessionToken = data.sessionToken;
    return data as R;
  }
  const errorText = (err: unknown) => {
    const code = err instanceof ApiError ? err.message : 'network';
    return T.errors[code as keyof typeof T.errors] ?? T.errors.network;
  };

  let turnstileReady: Promise<void> | null = null;
  let widgetId: string | undefined;
  function loadTurnstile() {
    turnstileReady ??= new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { turnstileReady = null; reject(new ApiError('network')); };
      document.head.append(s);
    });
    return turnstileReady;
  }
  async function turnstileToken(): Promise<string | undefined> {
    if (!siteKey) return undefined;
    await loadTurnstile();
    const turnstile = (window as unknown as { turnstile: any }).turnstile;
    if (widgetId) turnstile.remove(widgetId);
    return new Promise((resolve) => {
      widgetId = turnstile.render($('[data-turnstile-slot]'), {
        sitekey: siteKey,
        appearance: 'interaction-only', // invisible unless Cloudflare needs the visitor to click
        callback: (token: string) => resolve(token),
        'error-callback': () => resolve(undefined),
      });
    });
  }

  // ---------- The page responds: unfold to the section the answer is about ----------
  const label = (id: Exclude<Section, 'none'>) => T.sections[id];
  function showSection(section: Section) {
    if (section === 'none') return;
    const target = document.getElementById(section);
    if (!target) return; // e.g. "Building with AI" isn't published yet
    if (deviceMode.matches && !autoJumped) {
      autoJumped = true;
      jumpTo(section, target);
    }
    addSeeLink(section);
  }

  function jumpTo(id: Exclude<Section, 'none'>, target: HTMLElement) {
    const wasOpen = document.getElementById('device')?.classList.contains('is-open') ?? true;
    const pane = target.closest<HTMLElement>('.pane');
    const before = pane?.scrollTop ?? 0;
    document.dispatchEvent(new CustomEvent('duo:navigate', { detail: { id } }));
    window.setTimeout(() => highlight(target), wasOpen ? 350 : 1250); // after the unfold settles
    showToast(`${T.shown} ${label(id)}`, () => {
      if (!wasOpen) document.dispatchEvent(new CustomEvent('duo:fold'));
      else pane?.scrollTo({ top: before, behavior: 'smooth' });
    });
  }

  function highlight(el: HTMLElement) {
    el.classList.remove('ai-highlight');
    void el.offsetWidth; // restart the animation
    el.classList.add('ai-highlight');
    window.setTimeout(() => el.classList.remove('ai-highlight'), 2800);
  }

  function addSeeLink(id: Exclude<Section, 'none'>) {
    const a = document.createElement('a');
    a.className = 'see';
    a.href = `/#${id}`;
    a.textContent = `${T.see(label(id))} →`;
    // On phones the sheet covers the page, so step out of the way; fold.ts handles the link on desktop.
    a.addEventListener('click', () => { if (!deviceMode.matches) closePanel(); });
    const li = document.createElement('li');
    li.style.display = 'contents';
    li.append(a);
    log.append(li);
  }

  let toastTimer = 0;
  function showToast(text: string, undo: () => void) {
    $('[data-toast-text]').textContent = text;
    toast.hidden = false;
    const undoBtn = $<HTMLButtonElement>('[data-undo]');
    undoBtn.onclick = () => { undo(); toast.hidden = true; };
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (toast.hidden = true), 6000);
  }

  // ---------- Lead capture: when it doesn't know, offer a way to reach him ----------
  function addLeadForm(question: string) {
    log.querySelector('.lead')?.closest('li')?.remove(); // only one open form at a time
    const li = document.createElement('li');
    li.style.display = 'contents';
    const f = document.createElement('form');
    f.className = 'lead';
    f.innerHTML = `
      <p></p>
      <input type="email" name="email" required autocomplete="email" />
      <div class="two"><input name="name" autocomplete="name" maxlength="100" /><input name="company" autocomplete="organization" maxlength="100" /></div>
      <button type="submit" class="btn glass prominent"></button>`;
    f.querySelector('p')!.textContent = T.leadAsk;
    const [email, name, company] = [...f.querySelectorAll('input')];
    email.placeholder = T.email; email.setAttribute('aria-label', T.email);
    name.placeholder = T.name; name.setAttribute('aria-label', T.name);
    company.placeholder = T.company; company.setAttribute('aria-label', T.company);
    const submit = f.querySelector('button')!;
    submit.textContent = T.leadSend;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      submit.disabled = true;
      try {
        await post('/api/lead', { sessionId, email: email.value, name: name.value, company: company.value, question });
        leadSent = true;
        const done = document.createElement('p');
        done.className = 'done';
        done.textContent = T.leadDone;
        f.replaceChildren(done);
      } catch (err) {
        submit.disabled = false;
        email.setCustomValidity(errorText(err));
        email.reportValidity();
        email.addEventListener('input', () => email.setCustomValidity(''), { once: true });
      }
    });
    li.append(f);
    log.append(li);
  }

  // ---------- Voice ----------
  const Recognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
  let recognition: any = null;
  let micStream: MediaStream | null = null;
  let audioCtx: AudioContext | null = null;
  if (Recognition) micBtn.hidden = false; // Firefox has no speech recognition: typing only

  micBtn.addEventListener('click', () => (recognition ? stopListening() : startListening()));

  // Continuous recognition with our own end-of-speech: the browser's built-in endpointing (continuous = false)
  // stops at the first short pause, which cut people off mid-thought.
  const END_SILENCE_MS = 1200; // quiet this long after speaking → done
  const NO_SPEECH_MS = 8000;   // nothing said at all → give up
  let silenceTimer = 0;

  function startListening() {
    if (state === 'thinking') return;
    stopSpeaking();
    // A spoken question gets a spoken answer: start the playback context now, inside the click, so the browser lets it
    // run when the answer arrives seconds later.
    voiceCtx ??= new AudioContext();
    void voiceCtx.resume().catch(() => {});
    // Start recognising first, synchronously inside the click, so listening begins (and shows) at once.
    recognition = new Recognition();
    recognition.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    let heard = ''; // everything recognised so far, final and interim
    const armSilence = (ms: number) => {
      window.clearTimeout(silenceTimer);
      silenceTimer = window.setTimeout(stopListening, ms);
    };
    recognition.onresult = (e: any) => {
      let text = '';
      for (const r of e.results) text += r[0].transcript;
      heard = text;
      input.value = text;
      armSilence(END_SILENCE_MS);
    };
    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') addMessage('bot', T.errors.mic).classList.add('error');
    };
    recognition.onend = () => {
      window.clearTimeout(silenceTimer);
      releaseMic();
      if (heard.trim()) ask(heard.trim(), true);
      else if (state === 'listening') setState('idle');
    };
    micBtn.setAttribute('aria-pressed', 'true');
    setState('listening');
    recognition.start();
    armSilence(NO_SPEECH_MS);
    startLevelMeter();
  }

  // A parallel mic stream feeds the level meter only. It opens in the background so it never delays listening,
  // and recognition works without it. The AudioContext is created inside the click so browsers let it run.
  function startLevelMeter() {
    const ctx = new AudioContext();
    audioCtx = ctx;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (audioCtx !== ctx) return stream.getTracks().forEach((t) => t.stop()); // already finished listening
      micStream = stream;
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
    }, () => { /* no meter; recognition reports a blocked mic itself */ });
  }

  function stopListening() {
    window.clearTimeout(silenceTimer);
    recognition?.stop(); // onend sends whatever was heard
  }
  function releaseMic() {
    recognition = null;
    micBtn.setAttribute('aria-pressed', 'false');
    micStream?.getTracks().forEach((t) => t.stop());
    micStream = null;
    audioCtx?.close();
    audioCtx = null;
    analyser = null;
  }

  // Jarvis's voice. First choice: Azure neural TTS through the Worker (/api/speak), the same composed British voice
  // for every visitor. It only voices answers the Worker signed (speakToken). Any failure, or no Azure key configured,
  // falls back to the browser's own voices.
  let voiceAudio: HTMLAudioElement | null = null;
  let voiceCtx: AudioContext | null = null;
  let speechAnalyser: AnalyserNode | null = null;

  function stopSpeaking() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    voiceAudio?.pause();
    voiceAudio = null;
    speechAnalyser = null;
  }

  async function speak(text: string, token?: string) {
    if (token !== undefined) {
      try {
        if (await speakNeural(text, token)) return;
      } catch { /* fall through to the browser voice */ }
    }
    speakBrowser(text);
  }

  async function speakNeural(text: string, token: string): Promise<boolean> {
    const res = await fetch(`${api}/api/speak`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, token }),
    });
    if (!res.ok) return false;
    const url = URL.createObjectURL(await res.blob());
    const audio = new Audio(url);
    voiceAudio = audio;
    // Route through an analyser so the avatar's core follows the real voice; play directly if audio is still locked.
    // resume() never settles in a context the browser hasn't allowed to start, so never wait on it for long.
    voiceCtx ??= new AudioContext();
    await Promise.race([voiceCtx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 300))]);
    if (voiceCtx.state === 'running') {
      const an = voiceCtx.createAnalyser();
      an.fftSize = 512;
      voiceCtx.createMediaElementSource(audio).connect(an);
      an.connect(voiceCtx.destination);
      speechAnalyser = an;
    }
    const done = () => {
      URL.revokeObjectURL(url);
      if (voiceAudio === audio) { voiceAudio = null; speechAnalyser = null; }
      if (state === 'speaking') setState('idle');
    };
    audio.onplaying = () => setState('speaking');
    audio.onended = done;
    audio.onerror = done;
    await audio.play();
    return true;
  }

  // Browser fallback: a composed British male where the device has one (Edge's Ryan Natural, macOS's Daniel).
  // Browsers only offer the voices installed on the device, so this is a preference list, not a guarantee.
  const JARVIS_VOICES: Record<string, RegExp[]> = {
    en: [/\bryan\b/i, /\bthomas\b/i, /\bdaniel\b/i, /\boliver\b/i, /\barthur\b/i, /google uk english male/i, /\bguy\b/i, /\bmale\b/i],
    zh: [/yunze|云泽/i, /yunjian|云健/i, /yunyang|云扬/i, /yunxi|云希/i, /google 普通话|google.*mandarin/i, /tingting|ting-ting|婷婷/i, /meijia|美佳/i],
  };
  // Quality beats name: Edge's Natural (neural) voices and Apple's Premium/Enhanced downloads sound close to human;
  // Google's online voices are decent; the rest are the old compact voices.
  const voiceQuality = (v: SpeechSynthesisVoice) =>
    /natural|neural|premium/i.test(v.name) ? 3 : /enhanced/i.test(v.name) ? 2 : /^google/i.test(v.name) ? 1 : 0;
  // macOS novelty voices: never Jarvis.
  const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley/i;
  // Natural pitch: pitch-shifting is what makes browser voices sound robotic.
  const JARVIS_PITCH = 1;
  const JARVIS_RATE = 0.98;

  function speakBrowser(text: string) {
    if (!('speechSynthesis' in window)) return setState('idle');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = /[\u3400-\u9fff]/.test(text) ? 'zh-CN' : 'en-GB';
    const voice = pickVoice(u.lang);
    if (voice) u.voice = voice;
    u.pitch = JARVIS_PITCH;
    u.rate = JARVIS_RATE;
    u.onstart = () => setState('speaking');
    u.onend = u.onerror = () => { if (state === 'speaking') setState('idle'); };
    speechSynthesis.speak(u);
  }
  function pickVoice(langTag: string) {
    const prefix = langTag.slice(0, 2);
    const voices = speechSynthesis.getVoices()
      .filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(prefix) && !NOVELTY.test(v.name));
    // Best quality tier first; within it, Jarvis's preferred names; then any voice in that tier.
    const prefs = JARVIS_VOICES[prefix] ?? [];
    const pref = (v: SpeechSynthesisVoice) => { const i = prefs.findIndex((p) => p.test(v.name)); return i < 0 ? prefs.length : i; };
    return [...voices].sort((a, b) => voiceQuality(b) - voiceQuality(a) || pref(a) - pref(b))[0];
  }
  if ('speechSynthesis' in window) speechSynthesis.getVoices(); // Chrome loads the voice list lazily
}
