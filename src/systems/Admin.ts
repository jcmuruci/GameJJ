/**
 * Modo admin (para testar o jogo): digite "admin" em qualquer tela (ou abra com ?admin na URL).
 * Libera todos os capítulos e liga o piloto automático: os personagens jogam sozinhos.
 * Nada do que acontece no modo admin é salvo no progresso do casal.
 */
const KEY = 'juntos-admin';

class AdminImpl {
  on = false;
  /** Capítulos já assistidos nesta sessão (o mapa não recomeça o mesmo sozinho). */
  readonly watched = new Set<string>();
  private buf = '';
  private badge: HTMLDivElement | null = null;
  private listeners = new Set<(on: boolean) => void>();

  init(): void {
    try { this.on = sessionStorage.getItem(KEY) === '1'; } catch { /* sem armazenamento */ }
    const q = new URLSearchParams(location.search);
    if (q.has('admin')) this.on = q.get('admin') !== '0';
    this.render();
  }

  /** Cada tecla digitada; "admin" liga/desliga. */
  typed(key: string): void {
    if (key.length !== 1) return;
    this.buf = (this.buf + key.toLowerCase()).slice(-5);
    if (this.buf === 'admin') {
      this.buf = '';
      this.set(!this.on);
    }
  }

  set(v: boolean): void {
    this.on = v;
    this.watched.clear();
    try { sessionStorage.setItem(KEY, v ? '1' : '0'); } catch { /* sem armazenamento */ }
    this.render();
    this.flash(v ? 'Modo admin LIGADO: todos os capítulos liberados e piloto automático' : 'Modo admin desligado');
    this.listeners.forEach((fn) => fn(v));
  }

  onChange(fn: (on: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private render(): void {
    if (typeof document === 'undefined') return;
    if (!this.badge) {
      const b = document.createElement('div');
      // no celular fica em cima (embaixo estão o joystick e os botões)
      const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
      b.style.cssText = `position:fixed;left:8px;${touch ? 'top' : 'bottom'}:8px;z-index:50;padding:4px 10px;border-radius:999px;`
        + 'background:#ffd25e;color:#2a1d2e;font:bold 12px monospace;pointer-events:none;box-shadow:0 2px 0 #2a1d2e;';
      b.textContent = 'ADMIN · piloto automático (digite admin para sair)';
      document.body.appendChild(b);
      this.badge = b;
    }
    this.badge.style.display = this.on ? 'block' : 'none';
  }

  private flash(text: string): void {
    if (typeof document === 'undefined') return;
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:51;padding:8px 16px;border-radius:10px;'
      + 'background:#2a1d3a;color:#ffd25e;border:2px solid #ffd6e4;font:bold 14px monospace;pointer-events:none;transition:opacity .4s;';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; }, 2200);
    setTimeout(() => t.remove(), 2700);
  }
}

export const Admin = new AdminImpl();
