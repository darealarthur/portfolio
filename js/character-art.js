// ============================================================================
// PERSONA 5 - MOTOR DE ARTE 3D COMIC (3 CAMADAS SEPARADAS, ZERO SOBREPOSIÇÃO)
// ============================================================================

class P5ArtEngine {
  constructor() {
    this.customPhotoDataUrl = null;
  }

  // Largura proporcional de cada letra na fonte Anton/Impact para espaçamento perfeito
  getCharWidthFactor(ch) {
    if ("IJ1".includes(ch)) return 0.56;
    if ("EFLTZ".includes(ch)) return 0.82;
    if ("PRS".includes(ch)) return 0.88;
    if ("MW".includes(ch)) return 1.24;
    return 0.98;
  }

  // Renderiza cada palavra em 3 CAMADAS SEPARADAS:
  // Camada 1 (Fundo): Extrusão 3D preta profunda de todas as letras
  // Camada 2 (Meio): Extrusão 3D intermediária de todas as letras
  // Camada 3 (Frente): Face frontal limpa de todas as letras (NUNCA coberta pela sombra da letra vizinha!)
  renderMenuWordSVG(item, lang = "pt") {
    const text = lang === "en" ? item.labelEn : item.labelPt;
    const subText = lang === "en" ? item.subEn : item.subPt;
    const letters = text.split("");

    // Tamanho de fonte adaptativo para palavras longas (ex: TECNOLOGIAS) caberem perfeitamente no arco
    const fontSize =
      letters.length >= 10 ? 64 : letters.length >= 8 ? 72 : letters.length >= 7 ? 76 : 82;
    const baseAdvance = fontSize * 0.64;

    // Calcula a posição X proporcional de cada letra sem jamais sobrepor!
    const letterData = [];
    let currentX = 64;

    letters.forEach((ch, idx) => {
      const isFirst = idx === 0;
      const factor = this.getCharWidthFactor(ch);
      const scX = isFirst ? 1.12 : 1.0;
      const scY = isFirst ? 1.16 : idx % 2 === 0 ? 1.02 : 0.96;
      const charW = baseAdvance * factor * scX;

      const centerX = currentX + charW * 0.5;
      const yOffset = isFirst ? 0 : idx % 2 === 0 ? -2 : 2;
      const rot = isFirst ? -3.5 : idx % 2 === 0 ? 2 : -2;

      letterData.push({
        ch,
        idx,
        xPos: Math.round(centerX),
        yPos: 88 + yOffset,
        rot,
        scX,
        scY,
        fontSize
      });

      // Avança para a próxima letra com folga limpa (+5px)
      currentX += charW + 5;
    });

    const wordW = Math.round(currentX + 24);
    const totalW = Math.max(wordW + 60, 380);
    const totalH = 148;

    const hatchDarkId = `hatch-dark-${item.id}`;
    const hatchLightId = `hatch-light-${item.id}`;

    // 3 camadas separadas para que a sombra 3D de uma letra NUNCA pinte por cima da letra anterior!
    let backExtrudeLayer = "";
    let midExtrudeLayer = "";
    let frontFaceLayer = "";

    letterData.forEach((ld) => {
      const delay = (ld.idx * 0.04).toFixed(2);
      const transformStr = `translate(${ld.xPos}, ${ld.yPos}) rotate(${ld.rot}) scale(${ld.scX}, ${ld.scY})`;

      backExtrudeLayer += `
        <g transform="${transformStr}">
          <g class="p5-letter-anim" style="animation-delay: ${delay}s">
            <text
              x="-14"
              y="9"
              text-anchor="middle"
              font-size="${ld.fontSize}"
              class="p5-svg-extrude-back"
              stroke-linejoin="round"
              stroke-linecap="round"
            >${ld.ch}</text>
          </g>
        </g>
      `;

      midExtrudeLayer += `
        <g transform="${transformStr}">
          <g class="p5-letter-anim" style="animation-delay: ${delay}s">
            <text
              x="-8"
              y="5"
              text-anchor="middle"
              font-size="${ld.fontSize}"
              class="p5-svg-extrude-mid"
              stroke-linejoin="round"
              stroke-linecap="round"
            >${ld.ch}</text>
          </g>
        </g>
      `;

      frontFaceLayer += `
        <g transform="${transformStr}">
          <g class="p5-letter-anim" style="animation-delay: ${delay}s">
            <text
              x="0"
              y="0"
              text-anchor="middle"
              font-size="${ld.fontSize}"
              class="p5-svg-letter-face"
              stroke-linejoin="round"
              stroke-linecap="round"
            >${ld.ch}</text>
            ${this.getLetterInnerDetail(item.id, ld.ch, ld.idx, ld.fontSize)}
          </g>
        </g>
      `;
    });

    const bgPolyRight = wordW + 18;

    return `
      <svg
        class="p5-word-svg"
        viewBox="0 0 ${totalW} ${totalH}"
        width="${totalW}"
        height="${totalH}"
        overflow="visible"
      >
        <defs>
          <pattern id="${hatchDarkId}" width="24" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-6)">
            <rect width="24" height="8" fill="#000000" />
            <rect width="24" height="3" y="0" fill="#555555" />
          </pattern>
          <pattern id="${hatchLightId}" width="24" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-6)">
            <rect width="24" height="8" fill="#ffffff" />
            <rect width="24" height="3" y="0" fill="#cfcfcf" />
          </pattern>
        </defs>

        <!-- 1. CURSOR CROMÁTICO RGB/CMYK (Fica atrás da palavra selecionada) -->
        <g class="p5-item-chromatic-bg" pointer-events="none">
          <polygon
            class="c-poly c-blue"
            points="-18,34 58,-24 ${bgPolyRight + 34},38 ${bgPolyRight + 10},116 -12,86"
            fill="#2414ff"
          />
          <polygon
            class="c-poly c-green"
            points="18,-34 104,-28 ${bgPolyRight - 8},104 ${bgPolyRight - 68},130 6,24"
            fill="#2aff00"
          />
          <polygon
            class="c-poly c-yellow"
            points="36,-8 ${bgPolyRight - 34},14 ${bgPolyRight - 10},122 82,98"
            fill="#eaff00"
          />
          <polygon
            class="c-poly c-magenta"
            points="10,44 ${bgPolyRight + 28},36 ${bgPolyRight + 14},104 52,94"
            fill="#ff14a8"
            opacity="0.9"
          />
          <polygon
            class="c-poly c-white"
            points="22,-12 ${bgPolyRight - 16},20 ${bgPolyRight - 30},92 10,74"
            fill="#ffffff"
          />
        </g>

        <!-- 2. BLOCO 3D LISTRADO NA ESQUERDA DA PALAVRA -->
        <g class="p5-word-sideblock" pointer-events="none">
          <polygon points="10,18 44,6 44,90 10,100" fill="#000000" stroke="#000000" stroke-width="4" stroke-linejoin="round" />
          <polygon class="sideblock-hatch-dark" points="13,21 41,10 41,87 13,96" fill="url(#${hatchDarkId})" />
          <polygon class="sideblock-hatch-light" points="13,21 41,10 41,87 13,96" fill="url(#${hatchLightId})" />
        </g>

        <!-- 3. CAMADA TRASEIRA: EXTRUSÃO 3D PRETA PROFUNDA DE TODAS AS LETRAS -->
        <g class="p5-layer-back" pointer-events="none">
          ${backExtrudeLayer}
        </g>

        <!-- 4. CAMADA DO MEIO: EXTRUSÃO 3D INTERMEDIÁRIA DE TODAS AS LETRAS -->
        <g class="p5-layer-mid" pointer-events="none">
          ${midExtrudeLayer}
        </g>

        <!-- 5. CAMADA FRONTAL: FACES BRANCAS LIMPAS DE TODAS AS LETRAS (SEMPRE POR CIMA!) -->
        <g class="p5-layer-front" pointer-events="none">
          ${frontFaceLayer}
        </g>

        <!-- 6. SUBTÍTULO + SETA VERDE/AMARELA NEON -->
        <g class="p5-sublabel-group" pointer-events="none">
          <polygon
            class="p5-sublabel-arrow"
            points="32,102 270,110 278,100 324,126 254,126 262,118 24,110"
            fill="#c6ff00"
            stroke="#000000"
            stroke-width="4"
            stroke-linejoin="round"
          />
          <polygon
            points="48,104 266,112 306,123 260,122"
            fill="#00e676"
          />
          <text
            x="46"
            y="109"
            text-anchor="start"
            class="p5-svg-sublabel"
            stroke-linejoin="round"
          >${subText}</text>
        </g>

        <!-- 7. ÁREA DE CLIQUE/HOVER PRECISA -->
        <rect
          class="p5-word-hitarea"
          x="10"
          y="14"
          width="${wordW - 10}"
          height="84"
          rx="8"
          fill="transparent"
        />
      </svg>
    `;
  }

  // Estrelas internas proporcionais ao fontSize da palavra
  getLetterInnerDetail(itemId, ch, idx, fontSize) {
    if (
      (itemId === "persona" && idx === 0 && ch === "P") ||
      (itemId === "item" && idx === 0 && ch === "P") ||
      (itemId === "stats" && ch === "A") ||
      (itemId === "bond" && ch === "D")
    ) {
      const scale = fontSize / 100;
      const cx = (ch === "P" ? 3 : ch === "D" ? 2 : 0) * scale;
      const cy = (ch === "P" ? -49 : ch === "A" ? -31 : -38) * scale;
      const rOut = 9.5 * scale;
      const rIn = 4.0 * scale;
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? rOut : rIn;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
      }
      return `<polygon class="p5-letter-inner-detail" points="${pts.join(" ")}" />`;
    }
    return "";
  }

  // Converte qualquer foto enviada pelo usuário em um retrato estilo Persona 5
  processUserPhotoToP5Ink(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 800;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const a = d[i + 3];
          if (a < 30) continue;

          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum > 150) {
            d[i] = 255;
            d[i + 1] = 255;
            d[i + 2] = 255;
          } else if (lum > 92) {
            d[i] = 40;
            d[i + 1] = 40;
            d[i + 2] = 42;
          } else {
            d[i] = 0;
            d[i + 1] = 0;
            d[i + 2] = 0;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        this.customPhotoDataUrl = dataUrl;
        if (callback) callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

window.p5Art = new P5ArtEngine();
