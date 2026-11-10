// ============================================================================
// PERSONA 5 PORTFOLIO - CONTROLADOR PRINCIPAL BILÍNGUE (100% PT-BR / 100% EN)
// ============================================================================

(function () {
  const DATA = window.PORTFOLIO_DATA;

  // Carrega customizações completas salvas no navegador (se houver)
  try {
    const savedFull = localStorage.getItem("p5_portfolio_full_data");
    if (savedFull) {
      const parsed = JSON.parse(savedFull);
      if (parsed && typeof parsed === "object") {
        Object.assign(DATA, parsed);
      }
    } else {
      const savedProfile = localStorage.getItem("p5_portfolio_profile");
      if (savedProfile) {
        Object.assign(DATA.profile, JSON.parse(savedProfile));
      }
    }
  } catch (e) {}

  const state = {
    selectedIndex: 0,
    lang: "pt", // Padrão: 100% Português (PT-BR). Alterna para 100% Inglês ("en") no botão ou tecla L!
    activeSubscreen: null,
    selectedProjectIdx: 0,
    selectedEquipSlotIdx: 0,
    hudHidden: false,
    yenNumeric: 14128
  };

  // Referências DOM
  const stageEl = document.getElementById("p5-stage");
  const bgWrapperEl = document.getElementById("p5-bg-wrapper");
  const redSlashPoly = document.getElementById("p5-red-slash-poly");
  const pixelGridEl = document.getElementById("p5-pixel-grid");
  const charContainerEl = document.getElementById("p5-character-container");
  const charPoseWrapEl = document.getElementById("p5-character-pose-wrap");
  const charMainEl = document.getElementById("p5-char-main");
  const yenBadgeEl = document.getElementById("p5-yen-badge");
  const yenValueEl = document.getElementById("p5-yen-value");
  const footerCreditEl = document.getElementById("p5-footer-credit");
  const menuListEl = document.getElementById("p5-menu-list");

  const hudTopbarEl = document.getElementById("p5-hud-topbar");
  const controlsHintEl = document.getElementById("p5-controls-hint");
  const hudCodenameEl = document.getElementById("hud-codename");
  const btnToggleLabels = document.getElementById("btn-toggle-labels");
  const labelModeText = document.getElementById("label-mode-text");
  const btnToggleSfx = document.getElementById("btn-toggle-sfx");
  const btnToggleBgm = document.getElementById("btn-toggle-bgm");
  const btnCleanHud = document.getElementById("btn-clean-hud");
  const hudOpenPersona = document.getElementById("hud-open-persona");

  const slashTransitionEl = document.getElementById("p5-slash-transition");
  const subscreenOverlayEl = document.getElementById("p5-subscreen-overlay");
  const subscreenBackdropEl = document.getElementById("subscreen-backdrop");
  const subscreenP5BadgeEl = document.getElementById("subscreen-p5-badge");
  const subscreenMainTitleEl = document.getElementById("subscreen-main-title");
  const subscreenBodyEl = document.getElementById("subscreen-body");
  const subscreenCloseBtn = document.getElementById("subscreen-close-btn");

  function isEn() {
    return state.lang === "en";
  }

  function tUI() {
    return DATA.ui[state.lang] || DATA.ui.pt;
  }

  function formatExternalUrl(rawUrl) {
    const u = String(rawUrl || "").trim();
    if (!u || u === "#") return "#";
    if (/^(https?:\/\/|mailto:|tel:|#)/i.test(u)) return u;
    return `https://${u.replace(/^\/+/, "")}`;
  }

  // ==========================================================================
  // 1. INICIALIZAÇÃO DO PALCO 1920x1080 E ESCALA RESPONSIVA UNIFORME
  // ==========================================================================
  async function init() {
    updateStageScale();
    buildRightPixelGrid();
    if (window.p5Editor) {
      window.p5Editor.applyThemeAndAvatar(charMainEl);
    }
    syncProfileHUD();
    renderArcMenu();
    bindEvents();

    // Carrega os dados oficiais publicados no banco do Supabase (para todos os visitantes do GitHub Pages!)
    if (window.p5Supabase) {
      const cloudData = await window.p5Supabase.fetchPortfolioConfig();
      if (cloudData && typeof cloudData === "object" && Object.keys(cloudData).length > 0) {
        Object.assign(DATA, cloudData);
        try {
          localStorage.setItem("p5_portfolio_full_data", JSON.stringify(DATA));
        } catch (e) {}

        if (window.p5Editor) {
          window.p5Editor.applyThemeAndAvatar(charMainEl);
        }
        syncProfileHUD();
        renderArcMenu();
        if (state.activeSubscreen && state.activeSubscreen !== "system") {
          renderSubscreenContent(state.activeSubscreen);
        }
      }
    }
  }

  function updateStageScale() {
    const scaleX = window.innerWidth / 1920;
    const scaleY = window.innerHeight / 1080;
    const scale = Math.min(scaleX, scaleY);
    document.documentElement.style.setProperty("--stage-scale", scale.toFixed(4));
  }

  function buildRightPixelGrid() {
    const squares = [
      { right: "310px", top: "10px", size: 36 },
      { right: "180px", top: "32px", size: 62 },
      { right: "32px", top: "28px", size: 48 },
      { right: "185px", top: "120px", size: 54 },
      { right: "54px", top: "145px", size: 42 },
      { right: "285px", top: "205px", size: 46 },
      { right: "182px", top: "225px", size: 56 },
      { right: "42px", top: "245px", size: 38 },
      { right: "178px", top: "315px", size: 56 },
      { right: "30px", top: "335px", size: 64 },
      { right: "180px", top: "405px", size: 52 },
      { right: "38px", top: "425px", size: 52 },
      { right: "290px", top: "495px", size: 50 },
      { right: "175px", top: "515px", size: 56 },
      { right: "26px", top: "525px", size: 62 },
      { right: "170px", top: "610px", size: 48 },
      { right: "42px", top: "630px", size: 42 }
    ];

    pixelGridEl.innerHTML = squares
      .map(
        (sq, idx) => `
        <div class="p5-bg-square" style="
          right: ${sq.right};
          top: ${sq.top};
          width: ${sq.size}px;
          height: ${sq.size}px;
          animation-delay: ${(idx * 0.23).toFixed(2)}s;
        "></div>
      `
      )
      .join("");
  }

  function syncProfileHUD() {
    const ui = tUI();
    hudCodenameEl.textContent = DATA.profile.codename || "JOKER";
    yenValueEl.textContent = DATA.profile.yen || "¥14,128";
    labelModeText.textContent = ui.langBtn;

    const tagEl = hudOpenPersona.querySelector(".hud-tag");
    if (tagEl) tagEl.textContent = ui.codenameTag;

    const backLabelEl = subscreenCloseBtn.querySelector(".back-label");
    if (backLabelEl) backLabelEl.textContent = ui.backBtn;

    if (footerCreditEl) footerCreditEl.textContent = ui.footerCredit;

    if (controlsHintEl) {
      controlsHintEl.innerHTML = `
        <span><kbd>↑</kbd><kbd>↓</kbd> / <kbd>MOUSE</kbd> ${ui.hintNav}</span>
        <span><kbd>ENTER</kbd> / <kbd>CLICK</kbd> ${ui.hintOpen}</span>
        <span><kbd>L</kbd> ${ui.hintLang}</span>
      `;
    }
  }

  // ==========================================================================
  // 2. RENDERIZAÇÃO DO MENU EM ARCO 3D
  // ==========================================================================
  function renderArcMenu() {
    menuListEl.innerHTML = DATA.menuItems
      .map((item, idx) => {
        const isSelected = idx === state.selectedIndex;
        const wordSvg = window.p5Art.renderMenuWordSVG(item, state.lang);

        const bondBadgeSvg =
          item.id === "bond"
            ? `
            <svg class="p5-bond-badge" viewBox="0 0 185 105" overflow="visible" aria-label="${DATA.profile.bondPoints} points">
              <polygon points="8,52 38,10 138,18 134,30 176,20 138,64 134,92 24,96"
                fill="#000000" stroke="#ffffff" stroke-width="7.5" stroke-linejoin="round" />
              <text x="64" y="70" fill="#ffffff" font-family="Anton, Impact, sans-serif" font-size="48" font-weight="900" transform="rotate(-6, 64, 60)">${DATA.profile.bondPoints}</text>
              <text x="98" y="73" fill="#ffffff" font-family="Chakra Petch, sans-serif" font-weight="800" font-size="24" transform="rotate(-4, 98, 66)">pt</text>
            </svg>
          `
            : "";

        return `
          <li
            class="p5-menu-item ${isSelected ? "is-selected" : ""}"
            data-id="${item.id}"
            data-index="${idx}"
            role="menuitem"
            aria-label="${isEn() ? item.labelEn : item.labelPt}"
          >
            ${bondBadgeSvg}
            ${wordSvg}
          </li>
        `;
      })
      .join("");

    const items = menuListEl.querySelectorAll(".p5-menu-item");
    items.forEach((el) => {
      const idx = Number(el.dataset.index);
      const hitArea = el.querySelector(".p5-word-hitarea") || el;

      hitArea.addEventListener("mouseenter", () => {
        if (state.selectedIndex !== idx && !state.activeSubscreen) {
          selectMenuItem(idx, true);
        }
      });

      hitArea.addEventListener("click", (e) => {
        e.stopPropagation();
        if (state.selectedIndex !== idx) {
          selectMenuItem(idx, false);
        }
        openSubscreen(DATA.menuItems[idx].id);
      });
    });
  }

  function selectMenuItem(newIndex, playSound = true) {
    const count = DATA.menuItems.length;
    state.selectedIndex = ((newIndex % count) + count) % count;

    if (playSound) {
      window.p5Audio.playHover();
    }

    const activeItem = DATA.menuItems[state.selectedIndex];
    stageEl.setAttribute("data-active-menu", activeItem.id);

    const items = menuListEl.querySelectorAll(".p5-menu-item");
    items.forEach((el, idx) => {
      el.classList.toggle("is-selected", idx === state.selectedIndex);
    });

    triggerCharacterPoseShift(state.selectedIndex);
  }

  function triggerCharacterPoseShift(idx) {
    const shiftX = (idx - 2) * -6;
    const shiftY = (idx - 2) * 3.5;
    const slashSkew = (idx - 2) * 1.1;

    if (charPoseWrapEl) {
      charPoseWrapEl.style.transform = `translate(${shiftX}px, ${shiftY}px) rotate(${(idx - 2) * 0.45}deg) scale(1.012)`;
    }
    if (redSlashPoly) {
      redSlashPoly.style.transform = `skewX(${slashSkew}deg) translateX(${shiftX * -1.4}px)`;
    }
  }

  // ==========================================================================
  // 3. ABERTURA E TRANSIÇÃO DAS 7 SUB-TELAS DO PORTFÓLIO
  // ==========================================================================
  function triggerSlashTransition(callback) {
    slashTransitionEl.classList.remove("is-animating");
    void slashTransitionEl.offsetWidth;
    slashTransitionEl.classList.add("is-animating");

    if (callback) {
      setTimeout(callback, 190);
    }
    setTimeout(() => {
      slashTransitionEl.classList.remove("is-animating");
    }, 620);
  }

  function openSubscreen(menuId) {
    window.p5Audio.playConfirm();
    state.activeSubscreen = menuId;

    triggerSlashTransition(() => {
      renderSubscreenContent(menuId);
      subscreenOverlayEl.classList.add("is-open");
      subscreenOverlayEl.setAttribute("aria-hidden", "false");
      charContainerEl.style.transform = "translateX(190px) scale(0.98)";
    });
  }

  function closeSubscreen() {
    if (!state.activeSubscreen) return;
    window.p5Audio.playBack();
    state.activeSubscreen = null;

    subscreenOverlayEl.classList.remove("is-open");
    subscreenOverlayEl.setAttribute("aria-hidden", "true");
    charContainerEl.style.transform = "translate(0px, 0px)";
  }

  function renderSubscreenContent(menuId) {
    const ui = tUI();
    const itemObj = DATA.menuItems.find((m) => m.id === menuId) || DATA.menuItems[0];
    subscreenP5BadgeEl.textContent = isEn() ? itemObj.labelEn : itemObj.labelPt;
    subscreenMainTitleEl.textContent = ui.subtitles[menuId] || "";

    switch (menuId) {
      case "item":
        renderItemProjectsView();
        break;
      case "equip":
        renderEquipSkillsView();
        break;
      case "persona":
        renderPersonaBioView();
        break;
      case "stats":
        renderStatsStarView();
        break;
      case "bond":
        renderBondLinksView();
        break;
      case "request":
        renderRequestContactView();
        break;
      case "system":
        renderSystemConfigView();
        break;
    }
  }

  // --------------------------------------------------------------------------
  // VIEW 1: PROJETOS / ITEM
  // --------------------------------------------------------------------------
  function renderItemProjectsView() {
    const ui = tUI().itemView;
    const projects = DATA.projects || [];
    if (projects.length === 0) {
      subscreenBodyEl.innerHTML = `<div class="system-box"><h3>Nenhum projeto cadastrado ainda.</h3></div>`;
      return;
    }
    const activeProj = projects[state.selectedProjectIdx] || projects[0];
    const title = isEn() ? activeProj.titleEn : activeProj.titlePt;
    const cat = isEn() ? activeProj.categoryEn : activeProj.categoryPt;
    const summary = isEn() ? activeProj.summaryEn : activeProj.summaryPt;
    const impact = isEn() ? activeProj.impactEn : activeProj.impactPt;

    subscreenBodyEl.innerHTML = `
      <div class="p5-item-layout">
        <div class="p5-item-list">
          ${projects
            .map((p, i) => {
              const pTitle = isEn() ? p.titleEn : p.titlePt;
              const pCat = isEn() ? p.categoryEn : p.categoryPt;
              return `
                <div class="p5-project-row ${i === state.selectedProjectIdx ? "is-active" : ""}" data-proj-idx="${i}">
                  <div class="proj-row-left">
                    <span class="proj-rarity">${p.rarity}</span>
                    ${p.iconUrl ? `<img src="${p.iconUrl}" alt="" class="p5-inline-logo" style="width:26px;height:26px;" />` : ""}
                    <span class="proj-title">${pTitle}</span>
                    ${p.isNew ? `<span class="proj-new-badge">${ui.newBadge}</span>` : ""}
                  </div>
                  <span class="proj-cat-tag">${pCat} • ${p.qty}</span>
                </div>
              `;
            })
            .join("")}
        </div>

        <div class="p5-project-detail">
          <div class="detail-header-banner">
            <h2 style="display:flex;align-items:center;gap:10px;">
              ${activeProj.iconUrl ? `<img src="${activeProj.iconUrl}" alt="" class="p5-inline-logo" />` : ""}
              <span>${title}</span>
            </h2>
            <span class="proj-new-badge">${cat}</span>
          </div>

          <p class="detail-summary">${summary}</p>

          <div class="detail-impact-box">
            ${ui.impactLabel} ${impact}
          </div>

          <div class="detail-tech-chips">
            ${activeProj.tech.map((t) => `<span class="tech-chip">${t}</span>`).join("")}
          </div>

          <div class="detail-actions">
            ${
              activeProj.demoUrl
                ? `<a href="${formatExternalUrl(activeProj.demoUrl)}" target="_blank" rel="noopener" class="p5-action-btn">
                    <span>${ui.liveBtn}</span>
                  </a>`
                : ""
            }
            ${
              activeProj.repoUrl
                ? `<a href="${formatExternalUrl(activeProj.repoUrl)}" target="_blank" rel="noopener" class="p5-action-btn secondary">
                    <span>${ui.codeBtn}</span>
                  </a>`
                : ""
            }
          </div>
        </div>
      </div>
    `;

    subscreenBodyEl.querySelectorAll(".p5-project-row").forEach((row) => {
      row.addEventListener("mouseenter", () => {
        const idx = Number(row.dataset.projIdx);
        if (state.selectedProjectIdx !== idx) {
          state.selectedProjectIdx = idx;
          window.p5Audio.playHover();
          renderItemProjectsView();
        }
      });
      row.addEventListener("click", () => {
        const idx = Number(row.dataset.projIdx);
        state.selectedProjectIdx = idx;
        window.p5Audio.playConfirm();
        renderItemProjectsView();
      });
    });
  }

  // --------------------------------------------------------------------------
  // VIEW 2: TECNOLOGIAS / EQUIP
  // --------------------------------------------------------------------------
  function renderEquipSkillsView() {
    const slots = DATA.equipment.slots || [];
    if (slots.length === 0) {
      subscreenBodyEl.innerHTML = `<div class="system-box"><h3>Nenhuma categoria de tecnologia cadastrada.</h3></div>`;
      return;
    }
    const activeSlot = slots[state.selectedEquipSlotIdx] || slots[0];
    const activeType = isEn() ? activeSlot.slotTypeEn : activeSlot.slotTypePt;
    const activeName = isEn() ? activeSlot.equippedNameEn : activeSlot.equippedNamePt;
    const activeDesc = isEn() ? activeSlot.descriptionEn : activeSlot.descriptionPt;

    subscreenBodyEl.innerHTML = `
      <div class="p5-equip-layout">
        <div class="equip-slots-col">
          ${slots
            .map((slot, i) => {
              const sType = isEn() ? slot.slotTypeEn : slot.slotTypePt;
              const sName = isEn() ? slot.equippedNameEn : slot.equippedNamePt;
              const stLbl = isEn() ? slot.statLabelEn : slot.statLabelPt;
              const subLbl = isEn() ? slot.subStatLabelEn : slot.subStatLabelPt;
              return `
                <div class="equip-slot-card ${i === state.selectedEquipSlotIdx ? "is-active" : ""}" data-slot-idx="${i}">
                  <div class="slot-type-label">${sType}</div>
                  <div class="slot-equipped-name">${sName}</div>
                  <div class="slot-stats-row">
                    <span>${stLbl}: <strong>${slot.statValue}</strong></span>
                    <span>${subLbl}: <strong>${slot.subStatValue}</strong></span>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>

        <div class="equip-items-panel">
          <div class="persona-header-badge">${activeType}</div>
          <h3 style="font-family:var(--font-display);font-size:1.65rem;margin-bottom:8px;">
            ${activeName}
          </h3>
          <p style="color:#ddd;margin-bottom:18px;font-size:0.95rem;line-height:1.5;">
            ${activeDesc}
          </p>

          ${activeSlot.items
            .map((it) => {
              const iName = isEn() ? it.nameEn : it.namePt;
              return `
                <div class="skill-bar-row">
                  <div class="skill-bar-top">
                    <span style="display:inline-flex;align-items:center;gap:6px;">
                      ${it.iconUrl ? `<img src="${it.iconUrl}" alt="" class="p5-inline-logo" style="width:22px;height:22px;" />` : "★"}
                      ${iName} <small style="color:var(--p5-yellow)">[${it.tag}]</small>
                    </span>
                    <span style="color:var(--p5-yellow)">${it.mastery} (${it.power}%)</span>
                  </div>
                  <div class="skill-bar-track">
                    <div class="skill-bar-fill" style="width:${it.power}%"></div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;

    subscreenBodyEl.querySelectorAll(".equip-slot-card").forEach((card) => {
      card.addEventListener("mouseenter", () => {
        const idx = Number(card.dataset.slotIdx);
        if (state.selectedEquipSlotIdx !== idx) {
          state.selectedEquipSlotIdx = idx;
          window.p5Audio.playHover();
          renderEquipSkillsView();
        }
      });
      card.addEventListener("click", () => {
        const idx = Number(card.dataset.slotIdx);
        state.selectedEquipSlotIdx = idx;
        window.p5Audio.playConfirm();
        renderEquipSkillsView();
      });
    });
  }

  // --------------------------------------------------------------------------
  // VIEW 3: PERSONA -> SOBRE MIM, BIO & EXPERIÊNCIA
  // --------------------------------------------------------------------------
  function renderPersonaBioView() {
    const ui = tUI().personaView;
    const p = DATA.profile;
    const info = DATA.personaInfo;

    const arcana = isEn() ? p.arcanaEn : p.arcanaPt;
    const role = isEn() ? p.roleEn : p.rolePt;
    const loc = isEn() ? p.locationEn : p.locationPt;
    const bio = isEn() ? p.bioEn : p.bioPt;
    const pName = isEn() ? info.personaNameEn : info.personaNamePt;

    subscreenBodyEl.innerHTML = `
      <div class="p5-persona-layout">
        <div class="persona-bio-card">
          <span class="persona-header-badge">${arcana} • LV.${p.level}</span>
          <h2 style="font-family:var(--font-display);font-size:2.1rem;letter-spacing:1px;margin-bottom:4px;">
            ${p.realName} <span style="color:var(--p5-red)">// ${p.codename}</span>
          </h2>
          <p style="color:var(--p5-yellow);font-weight:800;margin-bottom:14px;">
            ${role} • ${loc}
          </p>
          <p style="line-height:1.6;color:#efefef;margin-bottom:16px;">
            ${bio}
          </p>

          ${
            info.timeline && info.timeline.length > 0
              ? `
                <h3 style="font-family:var(--font-display);font-size:1.3rem;color:var(--p5-yellow);border-bottom:2px solid #fff;padding-bottom:4px;">
                  ${ui.historyTitle}
                </h3>
                ${info.timeline
                  .map((t) => {
                    const period = isEn() ? t.periodEn : t.periodPt;
                    const tRole = isEn() ? t.roleEn : t.rolePt;
                    const tDesc = isEn() ? t.descEn : t.descPt;
                    return `
                      <div class="timeline-item">
                        <div class="timeline-period">${period}${t.company ? ` // ${t.company}` : ""}</div>
                        <strong style="font-size:1.02rem;display:block;margin:2px 0;">${tRole}</strong>
                        <p style="font-size:0.88rem;color:#ccc;">${tDesc}</p>
                      </div>
                    `;
                  })
                  .join("")}
              `
              : ""
          }
        </div>

        <div class="persona-skills-card">
          ${pName ? `<span class="persona-header-badge">${pName}</span>` : ""}
          ${
            info.stats && info.stats.length > 0
              ? `
                <h3 style="font-family:var(--font-display);font-size:1.45rem;margin-bottom:12px;">
                  ${ui.battleStatsTitle}
                </h3>
                ${info.stats
                  .map((st) => {
                    const lbl = isEn() ? st.labelEn : st.labelPt;
                    return `
                      <div class="skill-bar-row">
                        <div class="skill-bar-top">
                          <span>${lbl}</span>
                          <span style="font-family:var(--font-display);font-size:1.1rem;color:var(--p5-yellow)">${st.val}</span>
                        </div>
                        <div class="skill-bar-track">
                          <div class="skill-bar-fill" style="width:${st.val}%"></div>
                        </div>
                      </div>
                    `;
                  })
                  .join("")}
              `
              : ""
          }

          ${
            info.skills && info.skills.length > 0
              ? `
                <h3 style="font-family:var(--font-display);font-size:1.35rem;margin-top:18px;color:var(--p5-yellow);">
                  ${ui.activeSkillsTitle}
                </h3>
                <div class="persona-skill-grid">
                  ${info.skills
                    .map((sk) => {
                      const sName = isEn() ? sk.nameEn : sk.namePt;
                      const sCost = isEn() ? sk.costEn : sk.costPt;
                      const sDesc = isEn() ? sk.descEn : sk.descPt;
                      return `
                        <div class="persona-skill-item">
                          <strong>★ ${sName} <small style="color:#fff;float:right">${sCost}</small></strong>
                          <span style="font-size:0.8rem;color:#ddd;">${sDesc}</span>
                        </div>
                      `;
                    })
                    .join("")}
                </div>
              `
              : ""
          }
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // VIEW 4: STATUS / STATS (ESTRELA DE 5 PONTAS)
  // --------------------------------------------------------------------------
  function renderStatsStarView() {
    const ui = tUI().statsView;
    const stats = DATA.socialStats;
    const cx = 190;
    const cy = 190;
    const maxR = 135;

    const outerPts = [];
    const valuePts = [];
    const labelCoords = [];

    stats.forEach((st, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const ox = cx + Math.cos(angle) * maxR;
      const oy = cy + Math.sin(angle) * maxR;
      outerPts.push(`${ox.toFixed(1)},${oy.toFixed(1)}`);

      const vr = (st.percent / 100) * maxR;
      const vx = cx + Math.cos(angle) * vr;
      const vy = cy + Math.sin(angle) * vr;
      valuePts.push(`${vx.toFixed(1)},${vy.toFixed(1)}`);

      const lx = cx + Math.cos(angle) * (maxR + 36);
      const ly = cy + Math.sin(angle) * (maxR + 28);
      labelCoords.push({
        x: lx,
        y: ly,
        label: isEn() ? st.nameEn : st.namePt,
        rank: st.level
      });
    });

    const starOrder = [0, 2, 4, 1, 3, 0];
    const starLines = starOrder.map((idx) => outerPts[idx]).join(" ");

    subscreenBodyEl.innerHTML = `
      <div class="p5-stats-layout">
        <div class="stats-star-box">
          <span class="persona-header-badge">${ui.starBadge}</span>
          <svg viewBox="0 0 380 380" width="100%" style="max-width:370px;overflow:visible;">
            <polygon points="${outerPts.join(" ")}" fill="#141414" stroke="#ffffff" stroke-width="3" />
            <polyline points="${starLines}" fill="none" stroke="#444444" stroke-width="2" />

            ${outerPts
              .map(
                (pt) => `<line x1="${cx}" y1="${cy}" x2="${pt.split(",")[0]}" y2="${pt.split(",")[1]}" stroke="#555" stroke-width="1.5" stroke-dasharray="4 4" />`
              )
              .join("")}

            <polygon points="${valuePts.join(" ")}" fill="rgba(244, 255, 0, 0.72)" stroke="#ffffff" stroke-width="4" />
            <circle cx="${cx}" cy="${cy}" r="14" fill="#ff201e" stroke="#000" stroke-width="3" />

            ${labelCoords
              .map(
                (lc) => `
                <g transform="translate(${lc.x.toFixed(1)}, ${lc.y.toFixed(1)})">
                  <rect x="-58" y="-16" width="116" height="28" fill="#000" stroke="#fff" stroke-width="2" transform="skewX(-12)" />
                  <text x="0" y="3" text-anchor="middle" fill="#f4ff00" font-family="Anton, sans-serif" font-size="12.5">${lc.label} ★${lc.rank}</text>
                </g>
              `
              )
              .join("")}
          </svg>
        </div>

        <div class="stats-cards-col">
          ${stats
            .map((st) => {
              const sName = isEn() ? st.nameEn : st.namePt;
              const sRank = isEn() ? st.rankTitleEn : st.rankTitlePt;
              const sDesc = isEn() ? st.descEn : st.descPt;
              return `
                <div class="social-stat-card">
                  <div class="social-stat-header">
                    <span class="social-stat-name">★ ${sName}</span>
                    <span class="social-stat-rank">${ui.rankPrefix} ${st.level}: ${sRank.toUpperCase()}</span>
                  </div>
                  <p style="font-size:0.88rem;color:#ddd;margin-bottom:6px;">${sDesc}</p>
                  <div class="skill-bar-track" style="height:10px;">
                    <div class="skill-bar-fill" style="width:${st.percent}%"></div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // VIEW 5: REDES / BOND
  // --------------------------------------------------------------------------
  function renderBondLinksView() {
    const ui = tUI().bondView;

    subscreenBodyEl.innerHTML = `
      <div style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
        <span class="persona-header-badge">${ui.badgePrefix} ${DATA.profile.bondPoints} ${ui.badgeSuffix}</span>
        <span style="font-weight:700;color:#ccc;font-size:0.9rem;">${ui.ClickHint}</span>
      </div>
      <div class="p5-bond-grid">
        ${DATA.bonds
          .map((b) => {
            const arcName = isEn() ? b.arcanaNameEn : b.arcanaNamePt;
            const title = isEn() ? b.titleEn : b.titlePt;
            const handle = b.handle || (isEn() ? b.handleEn : b.handlePt);
            const ability = isEn() ? b.abilityEn : b.abilityPt;
            const safeBondUrl = formatExternalUrl(b.url);
            return `
              <a href="${safeBondUrl}" ${safeBondUrl.startsWith("#") ? "" : 'target="_blank" rel="noopener"'} class="tarot-card" data-bond-url="${safeBondUrl}">
                <div>
                  <div class="tarot-roman">
                    <span>${b.arcanaNum}</span>
                    <span style="font-size:0.8rem;letter-spacing:1px;">${arcName}</span>
                  </div>
                  <div class="tarot-title">
                    ${b.iconUrl ? `<img src="${b.iconUrl}" alt="" class="p5-inline-logo" />` : ""}
                    <span>${title}</span>
                  </div>
                  <div style="font-weight:800;color:var(--p5-red);margin-bottom:8px;">${handle}</div>
                  <p style="font-size:0.85rem;line-height:1.4;opacity:0.9;">${ability}</p>
                </div>
                <div style="margin-top:14px;">
                  <div class="tarot-stars">${"★".repeat(b.rank)}</div>
                  <div style="font-family:var(--font-display);font-size:0.82rem;margin-top:4px;">${ui.rankMax} (${b.rank})</div>
                </div>
              </a>
            `;
          })
          .join("")}
      </div>
    `;

    subscreenBodyEl.querySelectorAll(".tarot-card").forEach((card) => {
      card.addEventListener("mouseenter", () => window.p5Audio.playHover());
      card.addEventListener("click", (e) => {
        const url = card.getAttribute("data-bond-url");
        if (url === "#request") {
          e.preventDefault();
          openSubscreen("request");
        } else {
          window.p5Audio.playConfirm();
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // VIEW 6: CONTATO / REQUEST
  // --------------------------------------------------------------------------
  function renderRequestContactView() {
    const ui = tUI().requestView;

    subscreenBodyEl.innerHTML = `
      <div class="p5-request-layout">
        <form class="calling-card-form" id="p5-contact-form">
          <span class="persona-header-badge">${ui.badge}</span>
          <h3 style="font-family:var(--font-display);font-size:1.5rem;margin-bottom:12px;">
            ${ui.title}
          </h3>

          <div class="p5-field">
            <label for="cc-name">${ui.nameLabel}</label>
            <input type="text" id="cc-name" class="p5-input" placeholder="${ui.namePlaceholder}" required />
          </div>

          <div class="p5-field">
            <label for="cc-email">${ui.emailLabel}</label>
            <input type="text" id="cc-email" class="p5-input" placeholder="${ui.emailPlaceholder}" required />
          </div>

          <div class="p5-field">
            <label for="cc-msg">${ui.msgLabel}</label>
            <textarea id="cc-msg" class="p5-textarea" rows="4" placeholder="${ui.msgPlaceholder}" required></textarea>
          </div>

          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;">
            <button type="submit" class="p5-action-btn">
              <span>${ui.sendBtn}</span>
            </button>
            <button type="button" class="p5-action-btn secondary" id="btn-copy-email">
              <span>${ui.copyBtn} (${DATA.profile.email})</span>
            </button>
          </div>
          <div id="cc-feedback" style="margin-top:12px;font-weight:800;color:var(--p5-yellow);"></div>
        </form>

        <div class="calling-card-preview" id="calling-card-preview">
          <div class="ransom-title">${ui.cardHeader}</div>
          <p id="cc-preview-target" style="font-family:var(--font-display);font-size:1.35rem;color:#000;background:#fff;padding:3px 12px;transform:rotate(1.5deg);margin-bottom:12px;">
            ${ui.cardToPrefix} ${DATA.profile.codename} (${DATA.profile.realName})
          </p>
          <p id="cc-preview-body" style="font-weight:800;font-size:1rem;color:#ffffff;text-shadow:-2px 2px 0 #000;max-width:90%;line-height:1.5;">
            "${ui.cardDefaultMsg}"
          </p>
          <div style="margin-top:18px;font-family:var(--font-display);background:#000;color:var(--p5-yellow);padding:4px 14px;border:2px solid #fff;transform:rotate(-2deg);">
            ${ui.cardFromPrefix} <span id="cc-preview-sender">${ui.cardDefaultSender}</span>
          </div>
        </div>
      </div>
    `;

    const nameIn = document.getElementById("cc-name");
    const msgIn = document.getElementById("cc-msg");
    const senderPreview = document.getElementById("cc-preview-sender");
    const bodyPreview = document.getElementById("cc-preview-body");
    const feedbackEl = document.getElementById("cc-feedback");

    nameIn.addEventListener("input", () => {
      senderPreview.textContent = (nameIn.value || ui.cardDefaultSender).toUpperCase();
    });

    msgIn.addEventListener("input", () => {
      bodyPreview.textContent = `"${msgIn.value || ui.cardDefaultMsg}"`;
    });

    document.getElementById("p5-contact-form").addEventListener("submit", (e) => {
      e.preventDefault();
      window.p5Audio.playCallingCard();
      const previewCard = document.getElementById("calling-card-preview");
      previewCard.style.transform = "rotate(-4deg) scale(1.06)";
      setTimeout(() => {
        previewCard.style.transform = "rotate(2deg) scale(1)";
      }, 350);

      feedbackEl.textContent = ui.sentFeedback;
      const subject = encodeURIComponent(`[Portfólio] Contato de ${nameIn.value}`);
      const body = encodeURIComponent(
        `Nome: ${nameIn.value}\nContato: ${document.getElementById("cc-email").value}\n\nMensagem:\n${msgIn.value}`
      );
      setTimeout(() => {
        window.location.href = `mailto:${DATA.profile.email}?subject=${subject}&body=${body}`;
      }, 600);
    });

    document.getElementById("btn-copy-email").addEventListener("click", () => {
      window.p5Audio.playConfirm();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(DATA.profile.email);
      }
      feedbackEl.textContent = `${ui.copiedFeedback} ${DATA.profile.email}`;
    });
  }

  // --------------------------------------------------------------------------
  // VIEW 7: SISTEMA / SYSTEM (PAINEL EDITOR COMPLETO DE 7 ABAS + EXPORTADOR)
  // --------------------------------------------------------------------------
  function renderSystemConfigView() {
    if (window.p5Editor) {
      window.p5Editor.render(subscreenBodyEl, {
        charMainEl,
        syncProfileHUD,
        renderArcMenu,
        toggleMenuLanguage,
        toggleBgmState
      });
    }
  }

  // ==========================================================================
  // 4. EVENTOS GLOBAIS (IDIOMA, RESIZE, PARALLAX, TECLADO)
  // ==========================================================================
  function toggleMenuLanguage() {
    state.lang = state.lang === "pt" ? "en" : "pt";
    window.p5Audio.playConfirm();
    syncProfileHUD();
    renderArcMenu();
    if (state.activeSubscreen) {
      renderSubscreenContent(state.activeSubscreen);
    }
  }

  function toggleBgmState() {
    const isPlaying = window.p5Audio.toggleBGM();
    btnToggleBgm.classList.toggle("is-active", isPlaying);
    btnToggleBgm.innerHTML = `<span>BGM: ${isPlaying ? "ON" : "OFF"}</span>`;
  }

  function bindEvents() {
    window.addEventListener("resize", updateStageScale);

    window.addEventListener("mousemove", (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;

      if (!state.activeSubscreen) {
        bgWrapperEl.style.transform = `translate(${nx * -12}px, ${ny * -8}px)`;
        charContainerEl.style.transform = `translate(${nx * 14}px, ${ny * 9}px)`;
      }
    });

    window.addEventListener("keydown", (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        if (e.key === "Escape") closeSubscreen();
        return;
      }

      if (state.activeSubscreen) {
        if (e.key === "Escape" || e.key === "Backspace") {
          e.preventDefault();
          closeSubscreen();
        }
        return;
      }

      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        selectMenuItem(state.selectedIndex + 1, true);
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        selectMenuItem(state.selectedIndex - 1, true);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openSubscreen(DATA.menuItems[state.selectedIndex].id);
      } else if (e.key === "l" || e.key === "L") {
        toggleMenuLanguage();
      } else if (e.key === "h" || e.key === "H") {
        toggleCleanHud();
      }
    });

    yenBadgeEl.addEventListener("click", () => {
      window.p5Audio.playHover();
      state.yenNumeric += Math.floor(Math.random() * 900) + 120;
      yenValueEl.textContent = `¥${state.yenNumeric.toLocaleString("en-US")}`;
    });

    btnToggleLabels.addEventListener("click", toggleMenuLanguage);

    btnToggleSfx.addEventListener("click", () => {
      window.p5Audio.sfxEnabled = !window.p5Audio.sfxEnabled;
      btnToggleSfx.classList.toggle("is-active", window.p5Audio.sfxEnabled);
      btnToggleSfx.innerHTML = `<span>SFX: ${window.p5Audio.sfxEnabled ? "ON" : "OFF"}</span>`;
      if (window.p5Audio.sfxEnabled) window.p5Audio.playHover();
    });

    btnToggleBgm.addEventListener("click", toggleBgmState);
    btnCleanHud.addEventListener("click", toggleCleanHud);
    hudOpenPersona.addEventListener("click", () => openSubscreen("persona"));
    subscreenCloseBtn.addEventListener("click", closeSubscreen);
    subscreenBackdropEl.addEventListener("click", closeSubscreen);
  }

  function toggleCleanHud() {
    state.hudHidden = !state.hudHidden;
    hudTopbarEl.classList.toggle("is-hidden-hud", state.hudHidden);
    controlsHintEl.classList.toggle("is-hidden-hud", state.hudHidden);
    window.p5Audio.playHover();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
