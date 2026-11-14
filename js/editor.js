// ============================================================================
// PERSONA 5 PORTFOLIO - PAINEL EDITOR COMPLETO (7 ABAS + GERADOR DE data.js)
// ============================================================================

class P5VisualEditor {
  constructor() {
    this.activeTab = "profile";
    this.statusMessage = "";
  }

  escapeAttr(val) {
    return String(val == null ? "" : val)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Garante que qualquer link digitado sem "https://" (ex: "alivegg.gamer.free") receba "https://" automaticamente!
  normalizeExternalUrl(rawUrl) {
    const u = String(rawUrl || "").trim();
    if (!u || u === "#") return u;
    if (/^(https?:\/\/|mailto:|tel:|data:|#)/i.test(u)) return u;
    return `https://${u.replace(/^\/+/, "")}`;
  }

  // Converte um arquivo de imagem (PNG, SVG, JPG, WEBP) em DataURL leve para salvar no Supabase!
  // Se trimBottom=true (usado para o PNG de personagem), remove qualquer margem transparente na base para colar 100% na borda!
  processLogoFile(file, callback, maxDim = 128, trimBottom = false) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width || 64;
        let h = img.height || 64;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        if (trimBottom) {
          const imgData = ctx.getImageData(0, 0, w, h).data;
          let lastNonEmptyY = h - 1;
          for (let y = h - 1; y >= 0; y--) {
            let rowHasPixel = false;
            for (let x = 0; x < w; x++) {
              if (imgData[(y * w + x) * 4 + 3] > 15) {
                rowHasPixel = true;
                break;
              }
            }
            if (rowHasPixel) {
              lastNonEmptyY = y;
              break;
            }
          }
          if (lastNonEmptyY < h - 1 && lastNonEmptyY > 10) {
            const trimmedH = lastNonEmptyY + 1;
            const outCanvas = document.createElement("canvas");
            outCanvas.width = w;
            outCanvas.height = trimmedH;
            outCanvas.getContext("2d").drawImage(canvas, 0, 0, w, trimmedH, 0, 0, w, trimmedH);
            callback(outCanvas.toDataURL("image/png"));
            return;
          }
        }

        callback(canvas.toDataURL("image/png"));
      };
      img.onerror = () => callback(ev.target.result);
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Salva todo o objeto PORTFOLIO_DATA no localStorage e atualiza o site ao vivo
  saveAllToStorage(appCallbacks) {
    try {
      localStorage.setItem("p5_portfolio_full_data", JSON.stringify(window.PORTFOLIO_DATA));
    } catch (e) {
      console.warn("Storage limit or restricted:", e);
    }
    this.applyThemeAndAvatar(appCallbacks.charMainEl);
    if (appCallbacks.syncProfileHUD) appCallbacks.syncProfileHUD();
    if (appCallbacks.renderArcMenu) appCallbacks.renderArcMenu();
    window.p5Audio.playConfirm();
  }

  // Aplica a cor do tema e avatar customizado (se existir)
  applyThemeAndAvatar(charMainEl) {
    const p = window.PORTFOLIO_DATA.profile;
    const color = p.themeColor || "#ff2220";
    document.documentElement.style.setProperty("--p5-red", color);

    const redSlash = document.getElementById("p5-red-slash-poly");
    if (redSlash) {
      redSlash.setAttribute("fill", color);
    }

    if (charMainEl) {
      if (p.customAvatarDataUrl) {
        charMainEl.src = p.customAvatarDataUrl;
        charMainEl.classList.add("is-custom-photo");
      } else {
        charMainEl.src = "assets/joker-cutout.png?v=2";
        charMainEl.classList.remove("is-custom-photo");
      }
    }
  }

  // Gera e baixa o arquivo js/data.js pronto para substituir na pasta do projeto!
  downloadDataJsFile() {
    window.p5Audio.playCallingCard();
    const jsonString = JSON.stringify(window.PORTFOLIO_DATA, null, 2);
    const fileContent = `// ============================================================================
// PERSONA 5 PORTFOLIO - DADOS GERADOS PELO PAINEL EDITOR VISUAL
// ============================================================================
// Substitua o arquivo js/data.js do seu projeto por este arquivo para publicar
// todas as suas alterações para todos os visitantes!

window.PORTFOLIO_DATA = ${jsonString};
`;

    const blob = new Blob([fileContent], { type: "application/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Renderiza o painel dentro do container da sub-tela SISTEMA
  // Se não estiver logado no Supabase Auth, mostra apenas opções de áudio/idioma + tela de Login Admin!
  async render(containerEl, appCallbacks) {
    const adminUser = window.p5Supabase ? await window.p5Supabase.checkAdminSession() : null;

    if (!adminUser) {
      this.renderLockedSystemView(containerEl, appCallbacks);
      return;
    }

    const D = window.PORTFOLIO_DATA;

    const tabs = [
      { id: "profile", label: "1. PERFIL & VISUAL" },
      { id: "menu", label: "2. MENU PRINCIPAL" },
      { id: "projects", label: `3. PROJETOS (${D.projects.length})` },
      { id: "equip", label: "4. TECNOLOGIAS" },
      { id: "persona", label: "5. PERSONA & CARREIRA" },
      { id: "stats", label: "6. STATUS (ESTRELA)" },
      { id: "bonds", label: `7. REDES (${D.bonds.length})` }
    ];

    containerEl.innerHTML = `
      <div class="p5-editor-wrap">
        <!-- BARRA DE AÇÕES FIXA NO TOPO (SOMENTE ADMIN AUTENTICADO) -->
        <div class="p5-editor-toolbar">
          <div class="p5-editor-tabs">
            ${tabs
              .map(
                (t) => `
                <button type="button" class="p5-editor-tab ${this.activeTab === t.id ? "is-active" : ""}" data-tab="${t.id}">
                  ${t.label}
                </button>
              `
              )
              .join("")}
          </div>

          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <span id="editor-status-msg" style="color:var(--p5-yellow);font-weight:800;font-size:0.9rem;">
              ${this.statusMessage}
            </span>
            <button type="button" class="p5-action-btn" id="btn-editor-save" style="padding:7px 15px;font-size:0.92rem;" title="Salva direto no banco de dados Supabase para atualizar o GitHub Pages ao vivo!">
              <span>☁ PUBLICAR NO SUPABASE</span>
            </button>
            <button type="button" class="p5-action-btn secondary" id="btn-editor-export" style="padding:7px 14px;font-size:0.86rem;border-color:var(--p5-yellow);color:var(--p5-yellow);" title="Baixar backup do arquivo data.js">
              <span>⬇ BACKUP data.js</span>
            </button>
            <button type="button" class="editor-mini-btn danger" id="btn-editor-logout" title="Sair da conta Admin e bloquear o painel">
              🔒 SAIR (${this.escapeAttr(window.p5Supabase ? window.p5Supabase.getDisplayName() : "ADMIN")})
            </button>
          </div>
        </div>

        <!-- CONTEÚDO DA ABA ATIVA -->
        <div id="p5-editor-tab-body">
          ${this.renderActiveTabContent()}
        </div>
      </div>
    `;

    this.statusMessage = "";
    this.bindEditorEvents(containerEl, appCallbacks);
  }

  // Tela exibida para visitantes normais no GitHub Pages (Painel Admin Bloqueado por Senha do Supabase!)
  renderLockedSystemView(containerEl, appCallbacks) {
    containerEl.innerHTML = `
      <div class="p5-system-grid">
        <div class="system-box">
          <h3>★ CONFIGURAÇÕES DE ÁUDIO & IDIOMA</h3>
          <p style="font-size:0.92rem;color:#ccc;margin-bottom:16px;line-height:1.5;">
            Ajuste as preferências de som, trilha sonora procedural e idioma de exibição do portfólio.
          </p>

          <div style="display:flex;flex-direction:column;gap:12px;">
            <button type="button" class="p5-action-btn" id="vis-toggle-lang">
              <span>★ ALTERNAR IDIOMA (PORTUGUÊS / ENGLISH)</span>
            </button>

            <button type="button" class="p5-action-btn secondary" id="vis-toggle-sfx">
              <span>EFEITOS SONOROS (SFX): ${window.p5Audio.sfxEnabled ? "ATIVADOS (ON)" : "DESATIVADOS (OFF)"}</span>
            </button>

            <button type="button" class="p5-action-btn secondary" id="vis-toggle-bgm">
              <span>MÚSICA DE FUNDO (ACID-JAZZ): ${window.p5Audio.bgmEnabled ? "TOCANDO (ON)" : "PAUSADA (OFF)"}</span>
            </button>
          </div>
        </div>

        <div class="system-box" style="border-color:var(--p5-red);">
          <span class="persona-header-badge">RESTRICTED AREA // METAVERSE ADMIN</span>
          <h3>🔒 ACESSO DO PROPRIETÁRIO (ADMIN LOGIN)</h3>
          <p style="font-size:0.88rem;color:#ccc;margin-bottom:14px;">
            Apenas o administrador autenticado via <strong>Supabase Auth</strong> pode desbloquear o painel de edição completa do portfólio.
          </p>

          <form id="p5-admin-login-form">
            <div class="p5-field">
              <label for="admin-username">NOME DE USUÁRIO (CODINOME ADMIN)</label>
              <input type="text" id="admin-username" class="p5-input" placeholder="Ex: joker" autocomplete="username" required />
            </div>

            <div class="p5-field">
              <label for="admin-pass">SENHA</label>
              <input type="password" id="admin-pass" class="p5-input" placeholder="••••••••" autocomplete="current-password" required />
            </div>

            <button type="submit" class="p5-action-btn" id="btn-admin-login" style="margin-top:6px;">
              <span>★ DESBLOQUEAR PAINEL EDITOR</span>
            </button>
            <div id="admin-login-feedback" style="margin-top:12px;font-weight:800;color:var(--p5-yellow);font-size:0.9rem;"></div>
          </form>
        </div>
      </div>
    `;

    const langBtn = containerEl.querySelector("#vis-toggle-lang");
    if (langBtn) {
      langBtn.addEventListener("click", () => {
        if (appCallbacks.toggleMenuLanguage) appCallbacks.toggleMenuLanguage();
      });
    }

    const sfxBtn = containerEl.querySelector("#vis-toggle-sfx");
    if (sfxBtn) {
      sfxBtn.addEventListener("click", () => {
        window.p5Audio.sfxEnabled = !window.p5Audio.sfxEnabled;
        if (window.p5Audio.sfxEnabled) window.p5Audio.playHover();
        this.renderLockedSystemView(containerEl, appCallbacks);
      });
    }

    const bgmBtn = containerEl.querySelector("#vis-toggle-bgm");
    if (bgmBtn) {
      bgmBtn.addEventListener("click", () => {
        if (appCallbacks.toggleBgmState) appCallbacks.toggleBgmState();
        this.renderLockedSystemView(containerEl, appCallbacks);
      });
    }

    const loginForm = containerEl.querySelector("#p5-admin-login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = containerEl.querySelector("#admin-username").value.trim();
        const pass = containerEl.querySelector("#admin-pass").value;
        const feedback = containerEl.querySelector("#admin-login-feedback");
        feedback.style.color = "var(--p5-yellow)";
        feedback.textContent = "Autenticando no Supabase...";

        try {
          await window.p5Supabase.signIn(username, pass);
          window.p5Audio.playCallingCard();
          this.statusMessage = `★ Bem-vindo, ${window.p5Supabase.getDisplayName()}! Painel desbloqueado.`;
          this.render(containerEl, appCallbacks);
        } catch (err) {
          window.p5Audio.playBack();
          feedback.style.color = "#ff4d4d";
          feedback.textContent = `✕ Acesso negado: Usuário ou senha inválidos`;
        }
      });
    }
  }

  renderActiveTabContent() {
    switch (this.activeTab) {
      case "profile":
        return this.renderProfileTab();
      case "menu":
        return this.renderMenuTab();
      case "projects":
        return this.renderProjectsTab();
      case "equip":
        return this.renderEquipTab();
      case "persona":
        return this.renderPersonaTab();
      case "stats":
        return this.renderStatsTab();
      case "bonds":
        return this.renderBondsTab();
      default:
        return this.renderProfileTab();
    }
  }

  // --------------------------------------------------------------------------
  // ABA 1: PERFIL, COR DO TEMA, ÁUDIO & AVATAR
  // --------------------------------------------------------------------------
  renderProfileTab() {
    const p = window.PORTFOLIO_DATA.profile;
    return `
      <div class="p5-system-grid">
        <div class="system-box">
          <h3>★ INFORMAÇÕES PRINCIPAIS DO PERFIL</h3>
          <div class="p5-form-row-3">
            <div class="p5-field">
              <label>CODINOME</label>
              <input type="text" id="ed-codename" class="p5-input" value="${this.escapeAttr(p.codename)}" />
            </div>
            <div class="p5-field">
              <label>NÍVEL (LV)</label>
              <input type="number" id="ed-level" class="p5-input" value="${this.escapeAttr(p.level)}" />
            </div>
            <div class="p5-field">
              <label>CONTADOR (IENES / XP)</label>
              <input type="text" id="ed-yen" class="p5-input" value="${this.escapeAttr(p.yen)}" />
            </div>
          </div>

          <div class="p5-form-row-2">
            <div class="p5-field">
              <label>SEU NOME REAL</label>
              <input type="text" id="ed-realname" class="p5-input" value="${this.escapeAttr(p.realName)}" />
            </div>
            <div class="p5-field">
              <label>E-MAIL DE CONTATO</label>
              <input type="text" id="ed-email" class="p5-input" value="${this.escapeAttr(p.email)}" />
            </div>
          </div>

          <div class="p5-form-row-2">
            <div class="p5-field">
              <label>CARGO / ESPECIALIDADE (PT-BR)</label>
              <input type="text" id="ed-role-pt" class="p5-input" value="${this.escapeAttr(p.rolePt)}" />
            </div>
            <div class="p5-field">
              <label>ROLE / SPECIALTY (INGLÊS)</label>
              <input type="text" id="ed-role-en" class="p5-input" value="${this.escapeAttr(p.roleEn)}" />
            </div>
          </div>

          <div class="p5-form-row-3">
            <div class="p5-field">
              <label>ARCANA (PT-BR)</label>
              <input type="text" id="ed-arcana-pt" class="p5-input" value="${this.escapeAttr(p.arcanaPt)}" />
            </div>
            <div class="p5-field">
              <label>ARCANA (INGLÊS)</label>
              <input type="text" id="ed-arcana-en" class="p5-input" value="${this.escapeAttr(p.arcanaEn)}" />
            </div>
            <div class="p5-field">
              <label>PONTOS DE REDE (BADGE)</label>
              <input type="number" id="ed-bond-pts" class="p5-input" value="${this.escapeAttr(p.bondPoints)}" />
            </div>
          </div>

          <div class="p5-form-row-2">
            <div class="p5-field">
              <label>LOCALIZAÇÃO (PT-BR)</label>
              <input type="text" id="ed-loc-pt" class="p5-input" value="${this.escapeAttr(p.locationPt)}" />
            </div>
            <div class="p5-field">
              <label>LOCATION (INGLÊS)</label>
              <input type="text" id="ed-loc-en" class="p5-input" value="${this.escapeAttr(p.locationEn)}" />
            </div>
          </div>

          <div class="p5-field">
            <label>BIOGRAFIA / RESUMO (PT-BR)</label>
            <textarea id="ed-bio-pt" class="p5-textarea" rows="3">${this.escapeAttr(p.bioPt)}</textarea>
          </div>

          <div class="p5-field">
            <label>BIOGRAPHY / SUMMARY (INGLÊS)</label>
            <textarea id="ed-bio-en" class="p5-textarea" rows="3">${this.escapeAttr(p.bioEn)}</textarea>
          </div>
        </div>

        <div class="system-box">
          <h3>★ COR DO TEMA & AVATAR (PERSONAGEM)</h3>
          <div class="p5-field">
            <label>COR PRINCIPAL DO SITE (FAIXA DIAGONAL & DETALHES)</label>
            <div class="color-preset-row">
              <input type="color" id="ed-theme-color" value="${this.escapeAttr(p.themeColor || "#ff2220")}" style="width:50px;height:36px;cursor:pointer;background:#000;border:2px solid #fff;" />
              <button type="button" class="color-swatch-btn" data-color="#ff2220" style="background:#ff2220" title="Vermelho Persona 5"></button>
              <button type="button" class="color-swatch-btn" data-color="#00a8ff" style="background:#00a8ff" title="Azul Persona 3 Reload"></button>
              <button type="button" class="color-swatch-btn" data-color="#ffb800" style="background:#ffb800" title="Amarelo Persona 4 Golden"></button>
              <button type="button" class="color-swatch-btn" data-color="#9d1dff" style="background:#9d1dff" title="Roxo Velvet Room"></button>
              <button type="button" class="color-swatch-btn" data-color="#00e676" style="background:#00e676" title="Verde Futaba Oracle"></button>
            </div>
          </div>

          <hr style="border:none;border-top:2px solid #333;margin:16px 0;" />

          <h3>★ TROCAR PERSONAGEM / ENVIAR SUA FOTO</h3>
          <p style="font-size:0.86rem;color:#ccc;margin-bottom:12px;">
            Você pode enviar uma foto com o <strong>Filtro Nanquim Persona 5 Automático</strong>, enviar um PNG transparente normal (sem filtro) ou manter o Joker HD!
          </p>

          <div class="p5-field">
            <label>OPÇÃO 1: FOTO COM FILTRO NANQUIM PERSONA 5</label>
            <input type="file" id="ed-photo-p5" accept="image/*" class="p5-input" />
          </div>

          <div class="p5-field">
            <label>OPÇÃO 2: IMAGEM / PNG TRANSPARENTE (SEM FILTRO)</label>
            <input type="file" id="ed-photo-raw" accept="image/*" class="p5-input" />
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;">
            <button type="button" class="editor-mini-btn" id="ed-reset-joker">
              ↺ RESTAURAR JOKER HD ORIGINAL
            </button>
          </div>

          <hr style="border:none;border-top:2px solid #333;margin:16px 0;" />

          <h3>★ IDIOMA & ÁUDIO</h3>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="editor-mini-btn" id="ed-toggle-lang">
              ALTERNAR IDIOMA (PT-BR / EN)
            </button>
            <button type="button" class="editor-mini-btn" id="ed-toggle-bgm">
              MÚSICA DE FUNDO (ACID-JAZZ): ${window.p5Audio.bgmEnabled ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // ABA 2: NOMES DO MENU PRINCIPAL
  // --------------------------------------------------------------------------
  renderMenuTab() {
    const items = window.PORTFOLIO_DATA.menuItems;
    return `
      <div class="system-box">
        <h3>★ EDITAR OS 7 ITENS DO MENU EM ARCO (PT-BR & INGLÊS)</h3>
        <p style="color:#ccc;font-size:0.88rem;margin-bottom:14px;">
          Personalize os nomes principais 3D e os subtítulos inclinados que aparecem ao selecionar cada item.
        </p>
        ${items
          .map(
            (m, i) => `
            <div class="editor-item-card" data-menu-idx="${i}">
              <div class="editor-item-header">
                <span class="editor-item-title">#${i + 1} — ID: ${m.id.toUpperCase()}</span>
              </div>
              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>NOME 3D NO MENU (PT-BR)</label>
                  <input type="text" class="p5-input ed-menu-lpt" value="${this.escapeAttr(m.labelPt)}" />
                </div>
                <div class="p5-field">
                  <label>NOME 3D NO MENU (INGLÊS)</label>
                  <input type="text" class="p5-input ed-menu-len" value="${this.escapeAttr(m.labelEn)}" />
                </div>
              </div>
              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>SUBTÍTULO INCLINADO (PT-BR)</label>
                  <input type="text" class="p5-input ed-menu-spt" value="${this.escapeAttr(m.subPt)}" />
                </div>
                <div class="p5-field">
                  <label>SUBTÍTULO INCLINADO (INGLÊS)</label>
                  <input type="text" class="p5-input ed-menu-sen" value="${this.escapeAttr(m.subEn)}" />
                </div>
              </div>
            </div>
          `
          )
          .join("")}
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // ABA 3: PROJETOS (ADICIONAR, EDITAR, REORDENAR E EXCLUIR)
  // --------------------------------------------------------------------------
  renderProjectsTab() {
    const projects = window.PORTFOLIO_DATA.projects;
    return `
      <div class="system-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
          <h3 style="margin:0;">★ GERENCIAR PROJETOS DO PORTFÓLIO (${projects.length})</h3>
          <button type="button" class="p5-action-btn" id="btn-add-project" style="padding:6px 14px;font-size:0.9rem;">
            <span>+ ADICIONAR NOVO PROJETO</span>
          </button>
        </div>

        ${projects
          .map(
            (proj, i) => `
            <div class="editor-item-card" data-proj-idx="${i}">
              <div class="editor-item-header">
                <span class="editor-item-title">PROJETO #${i + 1}: ${this.escapeAttr(proj.titlePt)}</span>
                <div style="display:flex;gap:6px;">
                  <button type="button" class="editor-mini-btn btn-proj-up" data-idx="${i}">▲ SUBIR</button>
                  <button type="button" class="editor-mini-btn btn-proj-down" data-idx="${i}">▼ DESCER</button>
                  <button type="button" class="editor-mini-btn danger btn-proj-del" data-idx="${i}">✕ EXCLUIR</button>
                </div>
              </div>

              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>TÍTULO DO PROJETO (PT-BR)</label>
                  <input type="text" class="p5-input ed-proj-tpt" value="${this.escapeAttr(proj.titlePt)}" />
                </div>
                <div class="p5-field">
                  <label>PROJECT TITLE (INGLÊS)</label>
                  <input type="text" class="p5-input ed-proj-ten" value="${this.escapeAttr(proj.titleEn)}" />
                </div>
              </div>

              <div class="p5-form-row-3">
                <div class="p5-field">
                  <label>CATEGORIA (PT-BR)</label>
                  <input type="text" class="p5-input ed-proj-cpt" value="${this.escapeAttr(proj.categoryPt)}" />
                </div>
                <div class="p5-field">
                  <label>CATEGORY (INGLÊS)</label>
                  <input type="text" class="p5-input ed-proj-cen" value="${this.escapeAttr(proj.categoryEn)}" />
                </div>
                <div class="p5-field">
                  <label>RARIDADE / VERSÃO / NOVO</label>
                  <div style="display:flex;gap:6px;align-items:center;">
                    <input type="text" class="p5-input ed-proj-rar" value="${this.escapeAttr(proj.rarity)}" style="width:70px" placeholder="SSR" />
                    <input type="text" class="p5-input ed-proj-qty" value="${this.escapeAttr(proj.qty)}" style="width:80px" placeholder="v1.0" />
                    <label style="display:flex;align-items:center;gap:4px;margin:0;cursor:pointer;font-size:0.8rem;">
                      <input type="checkbox" class="ed-proj-new" ${proj.isNew ? "checked" : ""} /> NOVO!
                    </label>
                  </div>
                </div>
              </div>

              <div class="p5-field">
                <label>TECNOLOGIAS USADAS (SEPARADAS POR VÍRGULA)</label>
                <input type="text" class="p5-input ed-proj-tech" value="${this.escapeAttr((proj.tech || []).join(", "))}" />
              </div>

              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>RESUMO / DESCRIÇÃO (PT-BR)</label>
                  <textarea class="p5-textarea ed-proj-spt" rows="2">${this.escapeAttr(proj.summaryPt)}</textarea>
                </div>
                <div class="p5-field">
                  <label>SUMMARY / DESCRIPTION (INGLÊS)</label>
                  <textarea class="p5-textarea ed-proj-sen" rows="2">${this.escapeAttr(proj.summaryEn)}</textarea>
                </div>
              </div>

              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>IMPACTO / RESULTADO (PT-BR)</label>
                  <input type="text" class="p5-input ed-proj-ipt" value="${this.escapeAttr(proj.impactPt)}" />
                </div>
                <div class="p5-field">
                  <label>IMPACT / RESULTS (INGLÊS)</label>
                  <input type="text" class="p5-input ed-proj-ien" value="${this.escapeAttr(proj.impactEn)}" />
                </div>
              </div>

              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>LINK DO PROJETO AO VIVO (DEMO URL)</label>
                  <input type="text" class="p5-input ed-proj-demo" value="${this.escapeAttr(proj.demoUrl)}" />
                </div>
                <div class="p5-field">
                  <label>LINK DO REPOSITÓRIO / GITHUB (REPO URL)</label>
                  <input type="text" class="p5-input ed-proj-repo" value="${this.escapeAttr(proj.repoUrl)}" />
                </div>
              </div>

              <div class="p5-field">
                <label>LOGO / ÍCONE AO LADO DO NOME DO PROJETO (URL OU UPLOAD)</label>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  ${proj.iconUrl ? `<img src="${this.escapeAttr(proj.iconUrl)}" alt="" style="width:32px;height:32px;object-fit:contain;background:#222;padding:3px;border:1px solid #fff;" />` : ""}
                  <input type="text" class="p5-input ed-proj-icon" value="${this.escapeAttr(proj.iconUrl || "")}" placeholder="Cole o link da imagem ou envie do PC ->" style="flex:1;min-width:180px;" />
                  <label class="editor-mini-btn" style="cursor:pointer;margin:0;">
                    📁 ENVIAR LOGO
                    <input type="file" accept="image/*" class="ed-proj-icon-file" data-idx="${i}" hidden />
                  </label>
                  ${proj.iconUrl ? `<button type="button" class="editor-mini-btn danger btn-clear-proj-icon" data-idx="${i}">✕</button>` : ""}
                </div>
              </div>
            </div>
          `
          )
          .join("")}
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // ABA 4: TECNOLOGIAS / EQUIPAMENTOS
  // --------------------------------------------------------------------------
  renderEquipTab() {
    const slots = window.PORTFOLIO_DATA.equipment.slots;
    return `
      <div class="system-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="margin:0;">★ CATEGORIAS DE TECNOLOGIAS (${slots.length})</h3>
          <button type="button" class="p5-action-btn" id="btn-add-equip-slot" style="padding:7px 16px;font-size:0.95rem;">
            <span>+ ADICIONAR CATEGORIA</span>
          </button>
        </div>
        ${slots
          .map(
            (slot, sIdx) => `
            <div class="editor-item-card" data-slot-idx="${sIdx}">
              <div class="editor-item-header">
                <span class="editor-item-title">CATEGORIA #${sIdx + 1}: ${this.escapeAttr(slot.slotTypePt)}</span>
                <div style="display:flex;gap:8px;">
                  <button type="button" class="editor-mini-btn btn-add-tech-item" data-slot="${sIdx}">
                    + ADICIONAR SKILL
                  </button>
                  <button type="button" class="editor-mini-btn danger btn-del-equip-slot" data-slot="${sIdx}">
                    ✕ EXCLUIR CATEGORIA
                  </button>
                </div>
              </div>

              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>TÍTULO DO SLOT (PT-BR)</label>
                  <input type="text" class="p5-input ed-slot-tpt" value="${this.escapeAttr(slot.slotTypePt)}" />
                </div>
                <div class="p5-field">
                  <label>SLOT TITLE (INGLÊS)</label>
                  <input type="text" class="p5-input ed-slot-ten" value="${this.escapeAttr(slot.slotTypeEn)}" />
                </div>
              </div>

              <div class="p5-form-row-3">
                <div class="p5-field">
                  <label>EQUIPAMENTO / STACK (PT-BR)</label>
                  <input type="text" class="p5-input ed-slot-npt" value="${this.escapeAttr(slot.equippedNamePt)}" />
                </div>
                <div class="p5-field">
                  <label>EQUIPPED STACK (INGLÊS)</label>
                  <input type="text" class="p5-input ed-slot-nen" value="${this.escapeAttr(slot.equippedNameEn)}" />
                </div>
                <div class="p5-field">
                  <label>ATRIBUTOS (ATQ / VEL)</label>
                  <div style="display:flex;gap:6px;">
                    <input type="number" class="p5-input ed-slot-val1" value="${this.escapeAttr(slot.statValue)}" title="Valor Principal" />
                    <input type="number" class="p5-input ed-slot-val2" value="${this.escapeAttr(slot.subStatValue)}" title="Sub Valor" />
                  </div>
                </div>
              </div>

              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>DESCRIÇÃO DA CATEGORIA (PT-BR)</label>
                  <textarea class="p5-textarea ed-slot-dpt" rows="2">${this.escapeAttr(slot.descriptionPt)}</textarea>
                </div>
                <div class="p5-field">
                  <label>CATEGORY DESCRIPTION (INGLÊS)</label>
                  <textarea class="p5-textarea ed-slot-den" rows="2">${this.escapeAttr(slot.descriptionEn)}</textarea>
                </div>
              </div>

              <div class="p5-field">
                <label>LOGO / IMAGEM AO LADO DO NOME DA CATEGORIA (Ex: HTML5, CSS3)</label>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  ${slot.iconUrl ? `<img src="${this.escapeAttr(slot.iconUrl)}" alt="" style="width:32px;height:32px;object-fit:contain;background:#222;padding:3px;border:1px solid #fff;" />` : ""}
                  <input type="text" class="p5-input ed-slot-icon" value="${this.escapeAttr(slot.iconUrl || "")}" placeholder="URL da imagem ou envie do PC ->" style="flex:1;min-width:180px;" />
                  <label class="editor-mini-btn" style="cursor:pointer;margin:0;white-space:nowrap;">
                    📁 LOGO DO PC
                    <input type="file" accept="image/*" class="ed-slot-icon-file" data-slot="${sIdx}" hidden />
                  </label>
                  ${slot.iconUrl ? `<button type="button" class="editor-mini-btn danger btn-clear-slot-icon" data-slot="${sIdx}" title="Remover logo">✕</button>` : ""}
                </div>
              </div>

              <div style="margin-top:10px;border-top:1px dashed #444;padding-top:10px;">
                <label style="font-family:var(--font-display);color:var(--p5-yellow);display:block;margin-bottom:8px;">
                  LISTA DE TECNOLOGIAS DESTE SLOT:
                </label>
                ${slot.items
                  .map(
                    (it, iIdx) => `
                    <div class="ed-tech-row" data-item-idx="${iIdx}" style="margin-bottom:10px;background:#1a1a1a;padding:10px;border:1px solid #333;">
                      <div class="p5-form-row-3" style="align-items:center;margin-bottom:6px;">
                        <input type="text" class="p5-input ed-tech-npt" value="${this.escapeAttr(it.namePt)}" placeholder="Nome PT" />
                        <input type="text" class="p5-input ed-tech-nen" value="${this.escapeAttr(it.nameEn)}" placeholder="Nome EN" />
                        <div style="display:flex;gap:6px;align-items:center;">
                          <input type="text" class="p5-input ed-tech-tag" value="${this.escapeAttr(it.tag)}" style="width:85px" placeholder="Tag" />
                          <input type="text" class="p5-input ed-tech-mast" value="${this.escapeAttr(it.mastery)}" style="width:65px" placeholder="MAX" />
                          <input type="number" class="p5-input ed-tech-pwr" value="${this.escapeAttr(it.power)}" min="0" max="100" style="width:70px" title="Porcentagem (0-100)" />
                          <button type="button" class="editor-mini-btn danger btn-del-tech-item" data-slot="${sIdx}" data-item="${iIdx}">✕</button>
                        </div>
                      </div>
                      <div style="display:flex;gap:8px;align-items:center;">
                        ${it.iconUrl ? `<img src="${this.escapeAttr(it.iconUrl)}" alt="" style="width:24px;height:24px;object-fit:contain;background:#222;padding:2px;border:1px solid #fff;" />` : ""}
                        <input type="text" class="p5-input ed-tech-icon" value="${this.escapeAttr(it.iconUrl || "")}" placeholder="Logo desta skill (URL ou envie do PC ->)" style="flex:1;padding:5px 8px;font-size:0.84rem;" />
                        <label class="editor-mini-btn" style="cursor:pointer;margin:0;white-space:nowrap;">
                          📁 LOGO
                          <input type="file" accept="image/*" class="ed-tech-icon-file" data-slot="${sIdx}" data-item="${iIdx}" hidden />
                        </label>
                        ${it.iconUrl ? `<button type="button" class="editor-mini-btn danger btn-clear-tech-icon" data-slot="${sIdx}" data-item="${iIdx}" title="Remover logo">✕</button>` : ""}
                      </div>
                    </div>
                  `
                  )
                  .join("")}
              </div>
            </div>
          `
          )
          .join("")}
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // ABA 5: PERSONA, SKILLS & EXPERIÊNCIA PROFISSIONAL (TIMELINE)
  // --------------------------------------------------------------------------
  renderPersonaTab() {
    const info = window.PORTFOLIO_DATA.personaInfo;
    return `
      <div class="system-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;">★ ATRIBUTOS DE BATALHA DEV & NOME DA PERSONA (${info.stats.length})</h3>
          <button type="button" class="editor-mini-btn" id="btn-add-pstat">+ ADICIONAR ATRIBUTO</button>
        </div>
        <div class="p5-form-row-2" style="margin-bottom:14px;">
          <div class="p5-field">
            <label>NOME DA PERSONA (PT-BR)</label>
            <input type="text" id="ed-pname-pt" class="p5-input" value="${this.escapeAttr(info.personaNamePt)}" />
          </div>
          <div class="p5-field">
            <label>PERSONA NAME (INGLÊS)</label>
            <input type="text" id="ed-pname-en" class="p5-input" value="${this.escapeAttr(info.personaNameEn)}" />
          </div>
        </div>

        <div class="p5-field" style="margin-bottom:16px;">
          <label>PNG DE PERSONAGEM NO CARD DA ESQUERDA (URL OU UPLOAD DO PC)</label>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            ${info.personaArtUrl ? `<img src="${this.escapeAttr(info.personaArtUrl)}" alt="" style="width:48px;height:48px;object-fit:contain;background:#222;padding:3px;border:1px solid #fff;" />` : ""}
            <input type="text" id="ed-persona-art" class="p5-input" value="${this.escapeAttr(info.personaArtUrl || "")}" placeholder="Cole o link do PNG ou envie do PC ->" style="flex:1;min-width:180px;" />
            <label class="editor-mini-btn" style="cursor:pointer;margin:0;white-space:nowrap;">
              📁 ENVIAR PNG DO PC
              <input type="file" accept="image/*" id="ed-persona-art-file" hidden />
            </label>
            ${info.personaArtUrl ? `<button type="button" class="editor-mini-btn danger" id="btn-clear-persona-art" title="Remover imagem">✕ REMOVER</button>` : ""}
          </div>
        </div>

        ${info.stats
          .map(
            (st, i) => `
            <div class="p5-form-row-3 ed-pstat-row" data-stat-idx="${i}" style="margin-bottom:8px;align-items:center;">
              <input type="text" class="p5-input ed-pstat-lpt" value="${this.escapeAttr(st.labelPt)}" placeholder="Rótulo PT" />
              <input type="text" class="p5-input ed-pstat-len" value="${this.escapeAttr(st.labelEn)}" placeholder="Label EN" />
              <div style="display:flex;gap:6px;align-items:center;">
                <input type="number" class="p5-input ed-pstat-val" value="${this.escapeAttr(st.val)}" min="0" max="100" />
                <button type="button" class="editor-mini-btn danger btn-del-pstat" data-idx="${i}" title="Excluir atributo">✕</button>
              </div>
            </div>
          `
          )
          .join("")}

        <hr style="border:none;border-top:2px solid #333;margin:18px 0;" />

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;">★ HISTÓRICO & EXPERIÊNCIA PROFISSIONAL (${info.timeline.length})</h3>
          <button type="button" class="editor-mini-btn" id="btn-add-timeline">+ ADICIONAR EXPERIÊNCIA</button>
        </div>

        ${info.timeline
          .map(
            (t, i) => `
            <div class="editor-item-card ed-timeline-card" data-tl-idx="${i}">
              <div class="editor-item-header">
                <span class="editor-item-title">EXPERIÊNCIA #${i + 1}: ${this.escapeAttr(t.company)}</span>
                <button type="button" class="editor-mini-btn danger btn-del-timeline" data-idx="${i}">✕ EXCLUIR</button>
              </div>
              <div class="p5-form-row-3">
                <div class="p5-field">
                  <label>PERÍODO (PT-BR)</label>
                  <input type="text" class="p5-input ed-tl-ppt" value="${this.escapeAttr(t.periodPt)}" />
                </div>
                <div class="p5-field">
                  <label>PERIOD (INGLÊS)</label>
                  <input type="text" class="p5-input ed-tl-pen" value="${this.escapeAttr(t.periodEn)}" />
                </div>
                <div class="p5-field">
                  <label>EMPRESA / LOCAL</label>
                  <input type="text" class="p5-input ed-tl-comp" value="${this.escapeAttr(t.company)}" />
                </div>
              </div>
              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>CARGO (PT-BR)</label>
                  <input type="text" class="p5-input ed-tl-rpt" value="${this.escapeAttr(t.rolePt)}" />
                </div>
                <div class="p5-field">
                  <label>ROLE (INGLÊS)</label>
                  <input type="text" class="p5-input ed-tl-ren" value="${this.escapeAttr(t.roleEn)}" />
                </div>
              </div>
              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>DESCRIÇÃO (PT-BR)</label>
                  <textarea class="p5-textarea ed-tl-dpt" rows="2">${this.escapeAttr(t.descPt)}</textarea>
                </div>
                <div class="p5-field">
                  <label>DESCRIPTION (INGLÊS)</label>
                  <textarea class="p5-textarea ed-tl-den" rows="2">${this.escapeAttr(t.descEn)}</textarea>
                </div>
              </div>
            </div>
          `
          )
          .join("")}

        <hr style="border:none;border-top:2px solid #333;margin:18px 0;" />

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;">★ HABILIDADES ESPECIAIS (PERSONA SKILLS)</h3>
          <button type="button" class="editor-mini-btn" id="btn-add-pskill">+ ADICIONAR SKILL</button>
        </div>

        ${info.skills
          .map(
            (sk, i) => `
            <div class="editor-item-card ed-pskill-card" data-sk-idx="${i}">
              <div class="p5-form-row-3">
                <div class="p5-field">
                  <label>NOME DA SKILL (PT-BR)</label>
                  <input type="text" class="p5-input ed-sk-npt" value="${this.escapeAttr(sk.namePt)}" />
                </div>
                <div class="p5-field">
                  <label>SKILL NAME (INGLÊS)</label>
                  <input type="text" class="p5-input ed-sk-nen" value="${this.escapeAttr(sk.nameEn)}" />
                </div>
                <div class="p5-field">
                  <label>CUSTO (PT / EN)</label>
                  <div style="display:flex;gap:6px;">
                    <input type="text" class="p5-input ed-sk-cpt" value="${this.escapeAttr(sk.costPt)}" placeholder="Passiva" />
                    <input type="text" class="p5-input ed-sk-cen" value="${this.escapeAttr(sk.costEn)}" placeholder="Passive" />
                    <button type="button" class="editor-mini-btn danger btn-del-pskill" data-idx="${i}">✕</button>
                  </div>
                </div>
              </div>
              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>EFEITO / DESCRIÇÃO (PT-BR)</label>
                  <input type="text" class="p5-input ed-sk-dpt" value="${this.escapeAttr(sk.descPt)}" />
                </div>
                <div class="p5-field">
                  <label>EFFECT / DESCRIPTION (INGLÊS)</label>
                  <input type="text" class="p5-input ed-sk-den" value="${this.escapeAttr(sk.descEn)}" />
                </div>
              </div>
            </div>
          `
          )
          .join("")}
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // ABA 6: STATUS (ESTRELA DE 5 PONTAS)
  // --------------------------------------------------------------------------
  renderStatsTab() {
    const stats = window.PORTFOLIO_DATA.socialStats;
    return `
      <div class="system-box">
        <h3>★ EDITAR OS 5 ATRIBUTOS DA ESTRELA PENTÁGONO</h3>
        ${stats
          .map(
            (st, i) => `
            <div class="editor-item-card ed-sstat-card" data-sstat-idx="${i}">
              <div class="editor-item-header">
                <span class="editor-item-title">PONTA #${i + 1}: ${this.escapeAttr(st.namePt)}</span>
              </div>
              <div class="p5-form-row-3">
                <div class="p5-field">
                  <label>NOME DO ATRIBUTO (PT-BR)</label>
                  <input type="text" class="p5-input ed-ss-npt" value="${this.escapeAttr(st.namePt)}" />
                </div>
                <div class="p5-field">
                  <label>PARAMETER NAME (INGLÊS)</label>
                  <input type="text" class="p5-input ed-ss-nen" value="${this.escapeAttr(st.nameEn)}" />
                </div>
                <div class="p5-field">
                  <label>NÍVEL (1-5) & PORCENTAGEM (0-100)</label>
                  <div style="display:flex;gap:6px;">
                    <input type="number" class="p5-input ed-ss-lvl" value="${this.escapeAttr(st.level)}" min="1" max="5" />
                    <input type="number" class="p5-input ed-ss-pct" value="${this.escapeAttr(st.percent)}" min="10" max="100" />
                  </div>
                </div>
              </div>
              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>TÍTULO DO RANK (PT-BR)</label>
                  <input type="text" class="p5-input ed-ss-rpt" value="${this.escapeAttr(st.rankTitlePt)}" />
                </div>
                <div class="p5-field">
                  <label>RANK TITLE (INGLÊS)</label>
                  <input type="text" class="p5-input ed-ss-ren" value="${this.escapeAttr(st.rankTitleEn)}" />
                </div>
              </div>
              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>DESCRIÇÃO (PT-BR)</label>
                  <input type="text" class="p5-input ed-ss-dpt" value="${this.escapeAttr(st.descPt)}" />
                </div>
                <div class="p5-field">
                  <label>DESCRIPTION (INGLÊS)</label>
                  <input type="text" class="p5-input ed-ss-den" value="${this.escapeAttr(st.descEn)}" />
                </div>
              </div>
            </div>
          `
          )
          .join("")}
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // ABA 7: REDES SOCIAIS & LINKS (CARTAS DE TAROT)
  // --------------------------------------------------------------------------
  renderBondsTab() {
    const bonds = window.PORTFOLIO_DATA.bonds;
    return `
      <div class="system-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
          <h3 style="margin:0;">★ EDITAR REDES SOCIAIS & CARTAS DE TAROT (${bonds.length})</h3>
          <button type="button" class="p5-action-btn" id="btn-add-bond" style="padding:6px 14px;font-size:0.9rem;">
            <span>+ ADICIONAR REDE / LINK</span>
          </button>
        </div>

        ${bonds
          .map(
            (b, i) => `
            <div class="editor-item-card ed-bond-card" data-bond-idx="${i}">
              <div class="editor-item-header">
                <span class="editor-item-title">CARTA #${i + 1}: ${this.escapeAttr(b.titlePt)}</span>
                <button type="button" class="editor-mini-btn danger btn-del-bond" data-idx="${i}">✕ EXCLUIR</button>
              </div>
              <div class="p5-form-row-3">
                <div class="p5-field">
                  <label>Nº ROMANO & ESTRELAS (1-10)</label>
                  <div style="display:flex;gap:6px;">
                    <input type="text" class="p5-input ed-bd-num" value="${this.escapeAttr(b.arcanaNum)}" style="width:70px" placeholder="I" />
                    <input type="number" class="p5-input ed-bd-rank" value="${this.escapeAttr(b.rank)}" min="1" max="10" />
                  </div>
                </div>
                <div class="p5-field">
                  <label>NOME DA ARCANA (PT-BR)</label>
                  <input type="text" class="p5-input ed-bd-apt" value="${this.escapeAttr(b.arcanaNamePt)}" />
                </div>
                <div class="p5-field">
                  <label>ARCANA NAME (INGLÊS)</label>
                  <input type="text" class="p5-input ed-bd-aen" value="${this.escapeAttr(b.arcanaNameEn)}" />
                </div>
              </div>

              <div class="p5-form-row-3">
                <div class="p5-field">
                  <label>NOME DA REDE (PT-BR)</label>
                  <input type="text" class="p5-input ed-bd-tpt" value="${this.escapeAttr(b.titlePt)}" />
                </div>
                <div class="p5-field">
                  <label>NETWORK TITLE (INGLÊS)</label>
                  <input type="text" class="p5-input ed-bd-ten" value="${this.escapeAttr(b.titleEn)}" />
                </div>
                <div class="p5-field">
                  <label>@USUÁRIO / HANDLE</label>
                  <input type="text" class="p5-input ed-bd-handle" value="${this.escapeAttr(b.handle || b.handlePt || "")}" />
                </div>
              </div>

              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>URL DO LINK (Ex: https://github.com/seu-user)</label>
                  <input type="text" class="p5-input ed-bd-url" value="${this.escapeAttr(b.url)}" />
                </div>

                <div class="p5-field">
                  <label>LOGO / ÍCONE AO LADO DO TEXTO (URL OU UPLOAD DO PC)</label>
                  <div style="display:flex;gap:8px;align-items:center;">
                    ${b.iconUrl ? `<img src="${this.escapeAttr(b.iconUrl)}" alt="" style="width:32px;height:32px;object-fit:contain;background:#222;padding:3px;border:1px solid #fff;" />` : ""}
                    <input type="text" class="p5-input ed-bd-icon" value="${this.escapeAttr(b.iconUrl || "")}" placeholder="URL da logo ou envie ->" style="flex:1;" />
                    <label class="editor-mini-btn" style="cursor:pointer;margin:0;white-space:nowrap;">
                      📁 LOGO DO PC
                      <input type="file" accept="image/*" class="ed-bd-icon-file" data-idx="${i}" hidden />
                    </label>
                    ${b.iconUrl ? `<button type="button" class="editor-mini-btn danger btn-clear-bd-icon" data-idx="${i}" title="Remover logo">✕</button>` : ""}
                  </div>
                </div>
              </div>

              <div class="p5-form-row-2">
                <div class="p5-field">
                  <label>DESCRIÇÃO DO CARD (PT-BR)</label>
                  <input type="text" class="p5-input ed-bd-abpt" value="${this.escapeAttr(b.abilityPt)}" />
                </div>
                <div class="p5-field">
                  <label>CARD DESCRIPTION (INGLÊS)</label>
                  <input type="text" class="p5-input ed-bd-aben" value="${this.escapeAttr(b.abilityEn)}" />
                </div>
              </div>
            </div>
          `
          )
          .join("")}
      </div>
    `;
  }

  // ==========================================================================
  // COLETA OS VALORES DA ABA ATUAL E ATUALIZA window.PORTFOLIO_DATA
  // ==========================================================================
  collectCurrentTabValues(containerEl) {
    const D = window.PORTFOLIO_DATA;

    if (this.activeTab === "profile") {
      const p = D.profile;
      const getVal = (id) => {
        const el = containerEl.querySelector(`#${id}`);
        return el ? el.value : "";
      };
      p.codename = getVal("ed-codename").trim() || "JOKER";
      p.level = Number(getVal("ed-level")) || 99;
      p.yen = getVal("ed-yen").trim() || "¥14,128";
      p.realName = getVal("ed-realname").trim();
      p.email = getVal("ed-email").trim();
      p.rolePt = getVal("ed-role-pt").trim();
      p.roleEn = getVal("ed-role-en").trim();
      p.arcanaPt = getVal("ed-arcana-pt").trim();
      p.arcanaEn = getVal("ed-arcana-en").trim();
      p.bondPoints = Number(getVal("ed-bond-pts")) || 9;
      p.locationPt = getVal("ed-loc-pt").trim();
      p.locationEn = getVal("ed-loc-en").trim();
      p.bioPt = getVal("ed-bio-pt").trim();
      p.bioEn = getVal("ed-bio-en").trim();
      p.themeColor = getVal("ed-theme-color") || "#ff2220";
    } else if (this.activeTab === "menu") {
      containerEl.querySelectorAll("[data-menu-idx]").forEach((card) => {
        const idx = Number(card.dataset.menuIdx);
        const item = D.menuItems[idx];
        if (!item) return;
        item.labelPt = card.querySelector(".ed-menu-lpt").value.trim() || item.labelPt;
        item.labelEn = card.querySelector(".ed-menu-len").value.trim() || item.labelEn;
        item.subPt = card.querySelector(".ed-menu-spt").value.trim();
        item.subEn = card.querySelector(".ed-menu-sen").value.trim();
      });
    } else if (this.activeTab === "projects") {
      containerEl.querySelectorAll("[data-proj-idx]").forEach((card) => {
        const idx = Number(card.dataset.projIdx);
        const proj = D.projects[idx];
        if (!proj) return;
        proj.titlePt = card.querySelector(".ed-proj-tpt").value.trim();
        proj.titleEn = card.querySelector(".ed-proj-ten").value.trim();
        proj.categoryPt = card.querySelector(".ed-proj-cpt").value.trim();
        proj.categoryEn = card.querySelector(".ed-proj-cen").value.trim();
        proj.rarity = card.querySelector(".ed-proj-rar").value.trim() || "SSR";
        proj.qty = card.querySelector(".ed-proj-qty").value.trim() || "v1.0";
        proj.isNew = card.querySelector(".ed-proj-new").checked;
        proj.tech = card
          .querySelector(".ed-proj-tech")
          .value.split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        proj.summaryPt = card.querySelector(".ed-proj-spt").value.trim();
        proj.summaryEn = card.querySelector(".ed-proj-sen").value.trim();
        proj.impactPt = card.querySelector(".ed-proj-ipt").value.trim();
        proj.impactEn = card.querySelector(".ed-proj-ien").value.trim();
        proj.demoUrl = this.normalizeExternalUrl(card.querySelector(".ed-proj-demo").value);
        proj.repoUrl = this.normalizeExternalUrl(card.querySelector(".ed-proj-repo").value);
        const iconIn = card.querySelector(".ed-proj-icon");
        if (iconIn) proj.iconUrl = iconIn.value.trim();
      });
    } else if (this.activeTab === "equip") {
      containerEl.querySelectorAll("[data-slot-idx]").forEach((card) => {
        const sIdx = Number(card.dataset.slotIdx);
        const slot = D.equipment.slots[sIdx];
        if (!slot) return;
        slot.slotTypePt = card.querySelector(".ed-slot-tpt").value.trim();
        slot.slotTypeEn = card.querySelector(".ed-slot-ten").value.trim();
        slot.equippedNamePt = card.querySelector(".ed-slot-npt").value.trim();
        slot.equippedNameEn = card.querySelector(".ed-slot-nen").value.trim();
        slot.statValue = Number(card.querySelector(".ed-slot-val1").value) || 100;
        slot.subStatValue = Number(card.querySelector(".ed-slot-val2").value) || 100;
        slot.descriptionPt = card.querySelector(".ed-slot-dpt").value.trim();
        slot.descriptionEn = card.querySelector(".ed-slot-den").value.trim();
        const slotIconIn = card.querySelector(".ed-slot-icon");
        if (slotIconIn) slot.iconUrl = slotIconIn.value.trim();

        card.querySelectorAll(".ed-tech-row").forEach((row) => {
          const iIdx = Number(row.dataset.itemIdx);
          const it = slot.items[iIdx];
          if (!it) return;
          it.namePt = row.querySelector(".ed-tech-npt").value.trim();
          it.nameEn = row.querySelector(".ed-tech-nen").value.trim();
          it.tag = row.querySelector(".ed-tech-tag").value.trim();
          it.mastery = row.querySelector(".ed-tech-mast").value.trim();
          it.power = Math.min(100, Math.max(0, Number(row.querySelector(".ed-tech-pwr").value) || 0));
          const techIconIn = row.querySelector(".ed-tech-icon");
          if (techIconIn) it.iconUrl = techIconIn.value.trim();
        });
      });
    } else if (this.activeTab === "persona") {
      const info = D.personaInfo;
      const pnPt = containerEl.querySelector("#ed-pname-pt");
      const pnEn = containerEl.querySelector("#ed-pname-en");
      const pArt = containerEl.querySelector("#ed-persona-art");
      if (pnPt) info.personaNamePt = pnPt.value.trim();
      if (pnEn) info.personaNameEn = pnEn.value.trim();
      if (pArt) info.personaArtUrl = pArt.value.trim();

      containerEl.querySelectorAll(".ed-pstat-row").forEach((row) => {
        const idx = Number(row.dataset.statIdx);
        const st = info.stats[idx];
        if (!st) return;
        st.labelPt = row.querySelector(".ed-pstat-lpt").value.trim();
        st.labelEn = row.querySelector(".ed-pstat-len").value.trim();
        st.val = Math.min(100, Math.max(0, Number(row.querySelector(".ed-pstat-val").value) || 0));
      });

      containerEl.querySelectorAll(".ed-timeline-card").forEach((card) => {
        const idx = Number(card.dataset.tlIdx);
        const tl = info.timeline[idx];
        if (!tl) return;
        tl.periodPt = card.querySelector(".ed-tl-ppt").value.trim();
        tl.periodEn = card.querySelector(".ed-tl-pen").value.trim();
        tl.company = card.querySelector(".ed-tl-comp").value.trim();
        tl.rolePt = card.querySelector(".ed-tl-rpt").value.trim();
        tl.roleEn = card.querySelector(".ed-tl-ren").value.trim();
        tl.descPt = card.querySelector(".ed-tl-dpt").value.trim();
        tl.descEn = card.querySelector(".ed-tl-den").value.trim();
      });

      containerEl.querySelectorAll(".ed-pskill-card").forEach((card) => {
        const idx = Number(card.dataset.skIdx);
        const sk = info.skills[idx];
        if (!sk) return;
        sk.namePt = card.querySelector(".ed-sk-npt").value.trim();
        sk.nameEn = card.querySelector(".ed-sk-nen").value.trim();
        sk.costPt = card.querySelector(".ed-sk-cpt").value.trim();
        sk.costEn = card.querySelector(".ed-sk-cen").value.trim();
        sk.descPt = card.querySelector(".ed-sk-dpt").value.trim();
        sk.descEn = card.querySelector(".ed-sk-den").value.trim();
      });
    } else if (this.activeTab === "stats") {
      containerEl.querySelectorAll(".ed-sstat-card").forEach((card) => {
        const idx = Number(card.dataset.sstatIdx);
        const st = D.socialStats[idx];
        if (!st) return;
        st.namePt = card.querySelector(".ed-ss-npt").value.trim();
        st.nameEn = card.querySelector(".ed-ss-nen").value.trim();
        st.level = Math.min(5, Math.max(1, Number(card.querySelector(".ed-ss-lvl").value) || 5));
        st.percent = Math.min(100, Math.max(10, Number(card.querySelector(".ed-ss-pct").value) || 100));
        st.rankTitlePt = card.querySelector(".ed-ss-rpt").value.trim();
        st.rankTitleEn = card.querySelector(".ed-ss-ren").value.trim();
        st.descPt = card.querySelector(".ed-ss-dpt").value.trim();
        st.descEn = card.querySelector(".ed-ss-den").value.trim();
      });
    } else if (this.activeTab === "bonds") {
      containerEl.querySelectorAll(".ed-bond-card").forEach((card) => {
        const idx = Number(card.dataset.bondIdx);
        const b = D.bonds[idx];
        if (!b) return;
        b.arcanaNum = card.querySelector(".ed-bd-num").value.trim();
        b.rank = Math.min(10, Math.max(1, Number(card.querySelector(".ed-bd-rank").value) || 10));
        b.arcanaNamePt = card.querySelector(".ed-bd-apt").value.trim();
        b.arcanaNameEn = card.querySelector(".ed-bd-aen").value.trim();
        b.titlePt = card.querySelector(".ed-bd-tpt").value.trim();
        b.titleEn = card.querySelector(".ed-bd-ten").value.trim();
        b.handle = card.querySelector(".ed-bd-handle").value.trim();
        b.url = this.normalizeExternalUrl(card.querySelector(".ed-bd-url").value);
        const bdIconIn = card.querySelector(".ed-bd-icon");
        if (bdIconIn) b.iconUrl = bdIconIn.value.trim();
        b.abilityPt = card.querySelector(".ed-bd-abpt").value.trim();
        b.abilityEn = card.querySelector(".ed-bd-aben").value.trim();
      });
    }
  }

  // ==========================================================================
  // EVENTOS DO PAINEL EDITOR
  // ==========================================================================
  bindEditorEvents(containerEl, appCallbacks) {
    const D = window.PORTFOLIO_DATA;

    // Troca de abas (salva automaticamente os campos da aba atual antes de trocar!)
    containerEl.querySelectorAll(".p5-editor-tab").forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        this.collectCurrentTabValues(containerEl);
        this.activeTab = tabBtn.dataset.tab;
        window.p5Audio.playHover();
        this.render(containerEl, appCallbacks);
      });
    });

    // Botão Publicar no Supabase + Salvar Local
    const saveBtn = containerEl.querySelector("#btn-editor-save");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        this.collectCurrentTabValues(containerEl);
        this.saveAllToStorage(appCallbacks);

        const statusEl = containerEl.querySelector("#editor-status-msg");
        if (statusEl) {
          statusEl.style.color = "var(--p5-yellow)";
          statusEl.textContent = "☁ Enviando para o Supabase...";
        }

        try {
          if (window.p5Supabase) {
            await window.p5Supabase.savePortfolioConfig(window.PORTFOLIO_DATA);
          }
          window.p5Audio.playCallingCard();
          this.statusMessage = "★ Publicado no Supabase com sucesso!";
          this.render(containerEl, appCallbacks);
        } catch (err) {
          window.p5Audio.playBack();
          if (statusEl) {
            statusEl.style.color = "#ff4d4d";
            statusEl.textContent = `✕ Erro Supabase: ${err.message}`;
          }
        }
      });
    }

    // Botão Exportar Backup data.js
    const exportBtn = containerEl.querySelector("#btn-editor-export");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.collectCurrentTabValues(containerEl);
        this.saveAllToStorage(appCallbacks);
        this.downloadDataJsFile();
        this.statusMessage = "★ Backup data.js gerado!";
        this.render(containerEl, appCallbacks);
      });
    }

    // Botão Sair (Logout do Admin Supabase)
    const logoutBtn = containerEl.querySelector("#btn-editor-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        this.collectCurrentTabValues(containerEl);
        if (window.p5Supabase) {
          await window.p5Supabase.signOut();
        }
        window.p5Audio.playBack();
        this.render(containerEl, appCallbacks);
      });
    }

    // Eventos específicos da Aba 1 (Perfil & Tema)
    if (this.activeTab === "profile") {
      const colorInput = containerEl.querySelector("#ed-theme-color");
      containerEl.querySelectorAll(".color-swatch-btn").forEach((sw) => {
        sw.addEventListener("click", () => {
          const c = sw.dataset.color;
          if (colorInput) colorInput.value = c;
          D.profile.themeColor = c;
          this.applyThemeAndAvatar(appCallbacks.charMainEl);
          window.p5Audio.playHover();
        });
      });
      if (colorInput) {
        colorInput.addEventListener("input", () => {
          D.profile.themeColor = colorInput.value;
          this.applyThemeAndAvatar(appCallbacks.charMainEl);
        });
      }

      const photoP5 = containerEl.querySelector("#ed-photo-p5");
      if (photoP5) {
        photoP5.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          window.p5Art.processUserPhotoToP5Ink(file, (dataUrl) => {
            D.profile.customAvatarDataUrl = dataUrl;
            this.saveAllToStorage(appCallbacks);
          });
        });
      }

      const photoRaw = containerEl.querySelector("#ed-photo-raw");
      if (photoRaw) {
        photoRaw.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            D.profile.customAvatarDataUrl = ev.target.result;
            this.saveAllToStorage(appCallbacks);
          };
          reader.readAsDataURL(file);
        });
      }

      const resetJoker = containerEl.querySelector("#ed-reset-joker");
      if (resetJoker) {
        resetJoker.addEventListener("click", () => {
          D.profile.customAvatarDataUrl = null;
          this.saveAllToStorage(appCallbacks);
        });
      }

      const toggleLang = containerEl.querySelector("#ed-toggle-lang");
      if (toggleLang) {
        toggleLang.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          if (appCallbacks.toggleMenuLanguage) appCallbacks.toggleMenuLanguage();
        });
      }

      const toggleBgm = containerEl.querySelector("#ed-toggle-bgm");
      if (toggleBgm) {
        toggleBgm.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          if (appCallbacks.toggleBgmState) appCallbacks.toggleBgmState();
          this.render(containerEl, appCallbacks);
        });
      }
    }

    // Eventos da Aba 3 (Projetos)
    if (this.activeTab === "projects") {
      const addProjBtn = containerEl.querySelector("#btn-add-project");
      if (addProjBtn) {
        addProjBtn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          D.projects.unshift({
            id: "proj-" + Date.now(),
            titlePt: "Novo Projeto Rebelde",
            titleEn: "New Rebel Project",
            categoryPt: "WEB APP",
            categoryEn: "WEB APP",
            rarity: "SSR",
            qty: "v1.0",
            isNew: true,
            tech: ["HTML5", "CSS3", "JavaScript"],
            summaryPt: "Descrição detalhada do seu novo projeto incrível.",
            summaryEn: "Detailed description of your awesome new project.",
            impactPt: "Destaque de performance ou resultado alcançado",
            impactEn: "Performance highlight or key metric achieved",
            demoUrl: "https://github.com",
            repoUrl: "https://github.com"
          });
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      }

      containerEl.querySelectorAll(".btn-proj-del").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          const idx = Number(btn.dataset.idx);
          D.projects.splice(idx, 1);
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      });

      containerEl.querySelectorAll(".btn-proj-up").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          const idx = Number(btn.dataset.idx);
          if (idx > 0) {
            const tmp = D.projects[idx - 1];
            D.projects[idx - 1] = D.projects[idx];
            D.projects[idx] = tmp;
            this.saveAllToStorage(appCallbacks);
            this.render(containerEl, appCallbacks);
          }
        });
      });

      containerEl.querySelectorAll(".btn-proj-down").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          const idx = Number(btn.dataset.idx);
          if (idx < D.projects.length - 1) {
            const tmp = D.projects[idx + 1];
            D.projects[idx + 1] = D.projects[idx];
            D.projects[idx] = tmp;
            this.saveAllToStorage(appCallbacks);
            this.render(containerEl, appCallbacks);
          }
        });
      });

      containerEl.querySelectorAll(".ed-proj-icon-file").forEach((fileIn) => {
        fileIn.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          this.collectCurrentTabValues(containerEl);
          const idx = Number(fileIn.dataset.idx);
          this.processLogoFile(file, (dataUrl) => {
            if (D.projects[idx]) {
              D.projects[idx].iconUrl = dataUrl;
              this.saveAllToStorage(appCallbacks);
              this.render(containerEl, appCallbacks);
            }
          });
        });
      });

      containerEl.querySelectorAll(".btn-clear-proj-icon").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          const idx = Number(btn.dataset.idx);
          if (D.projects[idx]) {
            D.projects[idx].iconUrl = "";
            this.saveAllToStorage(appCallbacks);
            this.render(containerEl, appCallbacks);
          }
        });
      });
    }

    // Eventos da Aba 4 (Tecnologias)
    if (this.activeTab === "equip") {
      const addSlotBtn = containerEl.querySelector("#btn-add-equip-slot");
      if (addSlotBtn) {
        addSlotBtn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          D.equipment.slots.push({
            id: "slot-" + Date.now(),
            slotTypePt: "NOVA CATEGORIA",
            slotTypeEn: "NEW CATEGORY",
            equippedNamePt: "Stack Principal",
            equippedNameEn: "Primary Stack",
            statLabelPt: "ATQ",
            statLabelEn: "ATK",
            statValue: 250,
            subStatLabelPt: "VEL",
            subStatLabelEn: "SPD",
            subStatValue: 95,
            descriptionPt: "Descrição das tecnologias desta categoria.",
            descriptionEn: "Description of the technologies in this category.",
            items: [
              {
                namePt: "Nova Tecnologia",
                nameEn: "New Technology",
                power: 90,
                mastery: "MAX",
                tag: "Tech"
              }
            ]
          });
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      }

      containerEl.querySelectorAll(".btn-del-equip-slot").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          const sIdx = Number(btn.dataset.slot);
          D.equipment.slots.splice(sIdx, 1);
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      });

      containerEl.querySelectorAll(".btn-add-tech-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          const sIdx = Number(btn.dataset.slot);
          D.equipment.slots[sIdx].items.push({
            namePt: "Nova Tecnologia",
            nameEn: "New Technology",
            power: 90,
            mastery: "Lv.9",
            tag: "Tech"
          });
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      });

      containerEl.querySelectorAll(".btn-del-tech-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          const sIdx = Number(btn.dataset.slot);
          const iIdx = Number(btn.dataset.item);
          D.equipment.slots[sIdx].items.splice(iIdx, 1);
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      });

      containerEl.querySelectorAll(".ed-slot-icon-file").forEach((fileIn) => {
        fileIn.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          this.collectCurrentTabValues(containerEl);
          const sIdx = Number(fileIn.dataset.slot);
          this.processLogoFile(file, (dataUrl) => {
            if (D.equipment.slots[sIdx]) {
              D.equipment.slots[sIdx].iconUrl = dataUrl;
              this.saveAllToStorage(appCallbacks);
              this.render(containerEl, appCallbacks);
            }
          });
        });
      });

      containerEl.querySelectorAll(".btn-clear-slot-icon").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          const sIdx = Number(btn.dataset.slot);
          if (D.equipment.slots[sIdx]) {
            D.equipment.slots[sIdx].iconUrl = "";
            this.saveAllToStorage(appCallbacks);
            this.render(containerEl, appCallbacks);
          }
        });
      });

      containerEl.querySelectorAll(".ed-tech-icon-file").forEach((fileIn) => {
        fileIn.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          this.collectCurrentTabValues(containerEl);
          const sIdx = Number(fileIn.dataset.slot);
          const iIdx = Number(fileIn.dataset.item);
          this.processLogoFile(file, (dataUrl) => {
            if (D.equipment.slots[sIdx] && D.equipment.slots[sIdx].items[iIdx]) {
              D.equipment.slots[sIdx].items[iIdx].iconUrl = dataUrl;
              this.saveAllToStorage(appCallbacks);
              this.render(containerEl, appCallbacks);
            }
          });
        });
      });

      containerEl.querySelectorAll(".btn-clear-tech-icon").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          const sIdx = Number(btn.dataset.slot);
          const iIdx = Number(btn.dataset.item);
          if (D.equipment.slots[sIdx] && D.equipment.slots[sIdx].items[iIdx]) {
            D.equipment.slots[sIdx].items[iIdx].iconUrl = "";
            this.saveAllToStorage(appCallbacks);
            this.render(containerEl, appCallbacks);
          }
        });
      });
    }

    // Eventos da Aba 5 (Persona & Carreira)
    if (this.activeTab === "persona") {
      const pArtFile = containerEl.querySelector("#ed-persona-art-file");
      if (pArtFile) {
        pArtFile.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          this.collectCurrentTabValues(containerEl);
          this.processLogoFile(
            file,
            (dataUrl) => {
              D.personaInfo.personaArtUrl = dataUrl;
              this.saveAllToStorage(appCallbacks);
              this.render(containerEl, appCallbacks);
            },
            720,
            true
          );
        });
      }

      const clearPArtBtn = containerEl.querySelector("#btn-clear-persona-art");
      if (clearPArtBtn) {
        clearPArtBtn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          D.personaInfo.personaArtUrl = "";
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      }

      const addPstatBtn = containerEl.querySelector("#btn-add-pstat");
      if (addPstatBtn) {
        addPstatBtn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          D.personaInfo.stats.push({
            labelPt: "NOVO ATRIBUTO",
            labelEn: "NEW STAT",
            val: 95
          });
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      }

      containerEl.querySelectorAll(".btn-del-pstat").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          const idx = Number(btn.dataset.idx);
          D.personaInfo.stats.splice(idx, 1);
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      });

      const addTlBtn = containerEl.querySelector("#btn-add-timeline");
      if (addTlBtn) {
        addTlBtn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          D.personaInfo.timeline.unshift({
            periodPt: "2026 — PRESENTE",
            periodEn: "2026 — PRESENT",
            rolePt: "Novo Cargo / Projeto",
            roleEn: "New Role / Project",
            company: "Nome da Empresa",
            descPt: "Principais conquistas e responsabilidades.",
            descEn: "Key achievements and responsibilities."
          });
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      }

      containerEl.querySelectorAll(".btn-del-timeline").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          const idx = Number(btn.dataset.idx);
          D.personaInfo.timeline.splice(idx, 1);
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      });

      const addSkBtn = containerEl.querySelector("#btn-add-pskill");
      if (addSkBtn) {
        addSkBtn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          D.personaInfo.skills.push({
            namePt: "Nova Skill",
            nameEn: "New Skill",
            costPt: "Passiva",
            costEn: "Passive",
            descPt: "Descrição da habilidade.",
            descEn: "Skill description."
          });
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      }

      containerEl.querySelectorAll(".btn-del-pskill").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          const idx = Number(btn.dataset.idx);
          D.personaInfo.skills.splice(idx, 1);
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      });
    }

    // Eventos da Aba 7 (Redes Sociais)
    if (this.activeTab === "bonds") {
      const addBondBtn = containerEl.querySelector("#btn-add-bond");
      if (addBondBtn) {
        addBondBtn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          D.bonds.push({
            arcanaNum: "X",
            arcanaNamePt: "A FORTUNA",
            arcanaNameEn: "WHEEL OF FORTUNE",
            titlePt: "NOVA REDE",
            titleEn: "NEW SOCIAL",
            handle: "@seu-link",
            rank: 10,
            url: "https://",
            abilityPt: "Descrição do link ou rede social.",
            abilityEn: "Description of the social link."
          });
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      }

      containerEl.querySelectorAll(".btn-del-bond").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          const idx = Number(btn.dataset.idx);
          D.bonds.splice(idx, 1);
          this.saveAllToStorage(appCallbacks);
          this.render(containerEl, appCallbacks);
        });
      });

      containerEl.querySelectorAll(".ed-bd-icon-file").forEach((fileIn) => {
        fileIn.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          this.collectCurrentTabValues(containerEl);
          const idx = Number(fileIn.dataset.idx);
          this.processLogoFile(file, (dataUrl) => {
            if (D.bonds[idx]) {
              D.bonds[idx].iconUrl = dataUrl;
              this.saveAllToStorage(appCallbacks);
              this.render(containerEl, appCallbacks);
            }
          });
        });
      });

      containerEl.querySelectorAll(".btn-clear-bd-icon").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.collectCurrentTabValues(containerEl);
          const idx = Number(btn.dataset.idx);
          if (D.bonds[idx]) {
            D.bonds[idx].iconUrl = "";
            this.saveAllToStorage(appCallbacks);
            this.render(containerEl, appCallbacks);
          }
        });
      });
    }
  }
}

window.p5Editor = new P5VisualEditor();
