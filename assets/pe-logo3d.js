/* Prime Era · живой 3D-кубик логотипа в меню экосистемы.
   Подключается ядром (pe-core.js) как <script type="module">, рисует кубик в
   элемент window.__peLogoHost. Собран генератором «Получить код» из
   logo-3d/prime-era-studio.html с настройками владельца (30.09.2026):
   размер 64px, свечение в зазорах 1, свечение букв 0.3, ореол #fafdff 0.38,
   слежение за курсором 0.4, крестик #3784c3. Если three.js не загрузится —
   в меню остаётся статичная картинка кубика. */
/* PRIME ERA · 3D-логотип для подвала сайта.
   Куб из шести плит со знаками P, E, X, свечение изнутри. Фон прозрачный,
   минимальный размер — 64x64. */
(async function () {
  const CONFIG = {
    container: 'prime-era-cube',
    hitAreaSelector: '.pe2-nav-logo', // наведение работает на весь логотип в меню, не только на сам кубик
    glowEnabled: true,        // свечение изнутри: выключатель
    glow: 1,                  // яркость свечения изнутри: 1 — чистый цвет из colors.inside, меньше — темнее
    haloEnabled: true,       // мягкое цветное свечение позади куба — держит куб заметным на тёмном фоне
    haloStrength: 0.19,        // сила свечения позади куба, 0-1 (владелец: в 2 раза слабее, чем в студии)
    plate: 0.13,              // толщина плиты (доля ребра)
    gap: 0.06,                 // зазор между плитами (доля ребра) — как в оригинальном SVG (~7%)
    glyphGlowEnabled: true,    // свечение (bloom) вокруг знаков P, E, X: выключатель
    glyphGlow: 0.3,            // сила свечения знаков — само по себе, не задевает грани
    motion: {
      idle: 0.05,             // амплитуда медленной "вибрации" в покое, рад (0 — выключить)
      idleSpeed: 1,           // скорость вибрации, множитель (меньше — медленнее)
      tilt: 0.4,              // наклон вслед за курсором по всей странице, рад (0 — выключить)
      hoverTurnsMin: 1,        // минимум полных оборотов в кувырке при наведении
      hoverTurnsMax: 2,        // максимум полных оборотов — каждый раз случайно между min и max
      hoverDuration: 1.2       // сколько секунд длится кувырок
    },
    colors: {
      plate: '#06070A',      // сами плиты, они просто чёрные и не бликуют
      inside: '#FFFFFF',     // свечение в зазорах между плитами
      top: '#FFFFFF',        // знак P
      right: '#FFFFFF',      // знак E
      left: '#3784c3',       // знак X
      halo: '#fafdff'        // цвет свечения позади куба
    }
  };

  const GLYPHS = {
    top: { unproject: 'matrix(0.577351,-0.577351,1,1,-361.480327,361.480327)', d: 'M828.142 230.747C828.139 230.749 828.139 230.751 828.142 230.753C869.513 255.089 892.723 287.839 892.723 321.972C892.723 356.51 868.959 389.634 826.658 414.057C784.357 438.479 726.985 452.199 667.162 452.199C608.047 452.199 551.327 438.8 509.176 414.916C509.175 414.916 509.173 414.916 509.172 414.916C509.17 414.917 509.168 414.917 509.167 414.916L508.597 414.587C508.288 414.411 507.977 414.236 507.67 414.058C507.668 414.057 507.668 414.056 507.67 414.055C507.671 414.054 507.671 414.052 507.67 414.052L461.179 387.21C456.396 384.449 448.642 384.449 443.859 387.21L377.699 425.408C372.916 428.169 365.162 428.169 360.379 425.408L273.357 375.166C268.574 372.404 268.574 367.927 273.357 365.166L658.502 142.802C663.285 140.04 671.04 140.04 675.823 142.802L738.708 179.108C738.708 179.109 738.709 179.109 738.709 179.108C738.71 179.108 738.71 179.108 738.711 179.108L828.142 230.741C828.144 230.743 828.144 230.745 828.142 230.747ZM723.835 290.969C723.818 290.978 723.79 290.978 723.773 290.969L675.824 263.285C671.041 260.524 663.287 260.524 658.504 263.285L565.522 316.968C560.739 319.73 560.739 324.207 565.522 326.968L613.478 354.656C613.497 354.667 613.497 354.684 613.478 354.695C613.459 354.706 613.46 354.724 613.479 354.734C627.964 362.646 647.168 367.072 667.162 367.072C687.88 367.072 707.75 362.321 722.399 353.863C737.049 345.405 745.28 333.933 745.28 321.971C745.28 310.424 737.609 299.333 723.898 290.969C723.881 290.959 723.852 290.958 723.835 290.969Z' },
    right: { unproject: 'matrix(1.154701,0.577351,0,1,-756.229901,-1110.936950)', d: 'M1106.45 584.773C1111.24 582.012 1115.11 584.251 1115.11 589.773V690.258C1115.11 695.781 1111.24 702.496 1106.45 705.258L904.803 821.681C902.412 823.062 900.473 826.42 900.473 829.181V870.572C900.473 873.333 902.412 874.452 904.803 873.072L1106.98 756.347C1111.76 753.586 1115.64 755.824 1115.64 761.347V861.369C1115.64 866.891 1111.76 873.607 1106.98 876.369L904.803 993.093C902.412 994.474 900.473 997.832 900.473 1000.59V1042.94C900.473 1045.7 902.412 1046.82 904.803 1045.44L1106.45 929.018C1111.24 926.256 1115.11 928.495 1115.11 934.018V1034.5C1115.11 1040.03 1111.24 1046.74 1106.45 1049.5L900.477 1168.42C900.475 1168.43 900.473 1168.43 900.473 1168.43C900.473 1168.43 900.471 1168.44 900.469 1168.44L800.46 1226.18C798.068 1227.56 796.13 1226.44 796.13 1223.68V1218.99C796.127 1218.88 796.123 1218.78 796.123 1218.67V1118.19C796.123 1118.08 796.127 1117.97 796.13 1117.87V1046.48C796.118 1046.27 796.109 1046.06 796.109 1045.85V945.826C796.109 945.609 796.118 945.389 796.13 945.169V874.74C796.127 874.637 796.123 874.534 796.123 874.428V773.943C796.123 773.837 796.127 773.729 796.13 773.622V768.95C796.13 766.189 798.068 762.831 800.46 761.45L804.406 759.172C804.531 759.093 804.657 759.016 804.783 758.943L1106.45 584.773Z' },
    left: { unproject: 'matrix(1.154701,-0.577351,0,1,0,-386.738000)', d: 'M448.151 731.437C488.366 754.655 520.967 811.723 520.967 858.902C520.967 906.081 488.366 925.506 448.151 902.288C424.293 888.513 397.457 873.851 380.587 883.591L357.873 896.704C337.919 908.224 337.919 945.581 357.873 980.143L382.936 1023.55C399.258 1051.82 425.068 1067.88 448.151 1081.21C488.366 1104.43 520.967 1161.49 520.967 1208.67C520.967 1255.85 488.366 1275.28 448.151 1252.06C407.937 1228.84 375.337 1171.77 375.337 1124.59C375.337 1123.95 375.343 1123.31 375.355 1122.68C375.879 1095.11 375.151 1063.34 358.08 1033.77L334.806 993.461C314.852 958.899 282.501 940.221 262.547 951.741L240.945 964.212C223.629 974.21 223.14 1005.86 223.856 1034.54C223.878 1035.41 223.889 1036.28 223.889 1037.14C223.889 1084.32 191.288 1103.75 151.073 1080.53C110.859 1057.31 78.2579 1000.24 78.2578 953.064C78.2578 905.885 110.858 886.461 151.073 909.679C173.45 922.598 198.339 935.541 214.162 926.406L239.48 911.788C259.434 900.268 259.434 862.911 239.48 828.35L220.192 794.942C203.095 765.329 175.839 748.875 151.661 735.136C151.465 735.025 151.269 734.913 151.073 734.8C110.859 711.582 78.2579 655.116 78.2578 608.68C78.2578 562.244 110.858 543.422 151.073 566.64C191.288 589.858 223.889 646.324 223.889 692.76C223.889 719.492 224.989 749.981 241.359 778.335L262.546 815.032C282.5 849.594 314.852 868.272 334.806 856.751L357.876 843.432C374.671 833.735 375.656 803.598 375.343 775.993C375.339 775.602 375.337 775.212 375.337 774.822C375.337 727.644 407.937 708.219 448.151 731.437Z' }
  };
  const SRC = 692.174;               // размер грани в исходном SVG
  const CORNER = 15 / SRC;           // скругление углов из SVG (rx=15)
  const EDGE = 100;                  // ребро куба в единицах сцены
  const RELIEF = 2.3;                // высота знаков над гранью

  /* three.js — своя сборка только нужных частей (assets/vendor/three-cube.min.js,
     three@0.185.1, собрана esbuild), без обращения к чужим серверам */
  const lib = await import(new URL('vendor/three-cube.min.js', import.meta.url).href);
  const THREE = lib;
  const { SVGLoader, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, RoundedBoxGeometry } = lib;

  /* в экосистеме место под кубик создаёт ядро (pe-core.js) в меню и кладёт в window.__peLogoHost */
  const host = window.__peLogoHost || document.getElementById(CONFIG.container);
  if (!host || host.__peCube) return;
  host.__peCube = true;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

  // Мягкое цветное свечение позади куба — обычный CSS-градиент за канвасом,
  // держит куб заметным на любом фоне, особенно на тёмном
  let haloEl = null;
  if (CONFIG.haloEnabled) {
    haloEl = document.createElement('div');
    haloEl.style.cssText = 'position:absolute;inset:-40%;border-radius:50%;pointer-events:none;' +
      'background:radial-gradient(circle, ' + CONFIG.colors.halo + ' 0%, transparent 70%);' +
      'opacity:' + Math.max(0, Math.min(1, CONFIG.haloStrength)) + ';';
    host.appendChild(haloEl);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.appendChild(renderer.domElement);
  host.classList.add('pe2-cube-live');   // живой кубик готов — убираем статичную картинку-заглушку

  const scene = new THREE.Scene();
  const extent = EDGE * 0.95;
  const camera = new THREE.OrthographicCamera(-extent, extent, extent, -extent, 1, 1000);
  camera.position.set(0, 0, 400);

  // Изометрическая поза логотипа: Rx(35.26°) · Ry(-45°) — зафиксирована
  // раз и навсегда, не участвует в анимации.
  const pitch = new THREE.Group();
  pitch.rotation.x = Math.atan(1 / Math.SQRT2);
  scene.add(pitch);
  const yaw = new THREE.Group();
  yaw.rotation.y = -Math.PI / 4;
  pitch.add(yaw);
  // На эту вложенную группу крутится всё "живое" движение (вибрация в покое,
  // наклон за курсором, кувырок при наведении) — поверх зафиксированной позы
  const rig = new THREE.Group();
  yaw.add(rig);

  // Источников света в сцене нет: плиты просто чёрные, светятся только знаки
  // и сердечник, который видно в зазорах между плитами.
  const plateMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(CONFIG.colors.plate) });
  const insideMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(CONFIG.colors.inside).multiplyScalar(Math.max(0, CONFIG.glow))
  });
  function glyphMaterial(hex) {
    return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex) });
  }

  /* --- Плита: внешняя грань плоская, как в SVG, стенка уходит внутрь под углом --- */
  function plateGeometry(size, radius, thickness) {
    const taper = thickness * 0.55;
    const half = size / 2;
    const r = Math.min(radius, half * 0.9);
    const contour = [];
    [[half - r, half - r, 0], [-half + r, half - r, Math.PI / 2],
     [-half + r, -half + r, Math.PI], [half - r, -half + r, Math.PI * 1.5]
    ].forEach(function (c) {
      for (let i = 0; i <= 6; i++) {
        const a = c[2] + (Math.PI / 2) * (i / 6);
        contour.push(new THREE.Vector2(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r));
      }
    });
    const n = contour.length;
    const out = contour.map(function (p, i) {
      const prev = contour[(i - 1 + n) % n];
      const next = contour[(i + 1) % n];
      const tx = next.x - prev.x, ty = next.y - prev.y;
      const len = Math.hypot(tx, ty) || 1;
      return new THREE.Vector2(ty / len, -tx / len);
    });
    const slope = Math.atan2(taper, thickness);
    const position = [], normal = [];
    function shift(i, o) { return [contour[i].x - out[i].x * o, contour[i].y - out[i].y * o]; }
    function add(p, nrm) { position.push(p[0], p[1], p[2]); normal.push(nrm[0], nrm[1], nrm[2]); }

    // внешняя плоская грань
    THREE.ShapeUtils.triangulateShape(contour, []).forEach(function (f) {
      f.forEach(function (i) { add([contour[i].x, contour[i].y, 0], [0, 0, 1]); });
    });
    // стенка внутрь
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a0 = shift(i, 0), b0 = shift(j, 0);
      const a1 = shift(i, taper), b1 = shift(j, taper);
      const na = [out[i].x * Math.cos(slope), out[i].y * Math.cos(slope), -Math.sin(slope)];
      const nb = [out[j].x * Math.cos(slope), out[j].y * Math.cos(slope), -Math.sin(slope)];
      add([a0[0], a0[1], 0], na); add([a1[0], a1[1], -thickness], na); add([b1[0], b1[1], -thickness], nb);
      add([a0[0], a0[1], 0], na); add([b1[0], b1[1], -thickness], nb); add([b0[0], b0[1], 0], nb);
    }
    // внутренняя крышка
    const inner = contour.map(function (p, i) { const s = shift(i, taper); return new THREE.Vector2(s[0], s[1]); });
    THREE.ShapeUtils.triangulateShape(inner, []).forEach(function (f) {
      [f[2], f[1], f[0]].forEach(function (i) { add([inner[i].x, inner[i].y, -thickness], [0, 0, -1]); });
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
    return geometry;
  }

  const thickness = EDGE * CONFIG.plate;
  const plateSize = EDGE - EDGE * CONFIG.gap * 2;
  const plateRadius = EDGE * CORNER;
  const geometry = plateGeometry(plateSize, plateRadius, thickness);
  const plateDefs = [[0, 0, 1, 0, 0, 0], [0, 0, -1, 0, Math.PI, 0], [1, 0, 0, 0, Math.PI / 2, 0],
   [-1, 0, 0, 0, -Math.PI / 2, 0], [0, 1, 0, -Math.PI / 2, 0, 0], [0, -1, 0, Math.PI / 2, 0, 0]];
  plateDefs.forEach(function (p) {
    const plate = new THREE.Mesh(geometry, plateMaterial);
    plate.position.set(p[0] * EDGE / 2, p[1] * EDGE / 2, p[2] * EDGE / 2);
    plate.rotation.set(p[3], p[4], p[5]);
    rig.add(plate);
  });

  // Светящийся сердечник: виден в швах между плитами
  if (CONFIG.glowEnabled && CONFIG.glow > 0) {
    const coreSize = EDGE - thickness * 0.5;
    const coreRadius = Math.min(EDGE * CORNER, coreSize * 0.45);
    const core = new THREE.Mesh(new RoundedBoxGeometry(coreSize, coreSize, coreSize, 3, coreRadius), insideMaterial);
    rig.add(core);
  }

  /* --- Знаки: контуры развёрнуты из изометрии исходного SVG --- */
  const loader = new SVGLoader();
  const scale = EDGE / SRC;
  const glyphMeshes = [];
  Object.keys(GLYPHS).forEach(function (face) {
    const g = GLYPHS[face];
    const markup = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SRC + ' ' + SRC +
      '"><g transform="' + g.unproject + '"><path fill="#000" d="' + g.d + '"/></g></svg>';
    const shapes = [];
    loader.parse(markup).paths.forEach(function (p) { shapes.push.apply(shapes, SVGLoader.createShapes(p)); });
    if (!shapes.length) return;

    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: (RELIEF + 1) / scale, bevelEnabled: true,
      bevelThickness: 0.4 / scale, bevelSize: 0.4 / scale, bevelSegments: 2, curveSegments: 14, steps: 1
    });
    geo.scale(scale, -scale, scale);
    // отражение по Y перевернуло обход треугольников — возвращаем обратно
    const index = geo.getIndex();
    if (index) {
      const a = index.array;
      for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
    } else {
      const p = geo.getAttribute('position').array;
      for (let i = 0; i < p.length; i += 9) {
        for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; }
      }
    }
    geo.translate(-EDGE / 2, EDGE / 2, 0);
    geo.computeBoundingBox();
    geo.translate(0, 0, EDGE / 2 + RELIEF - geo.boundingBox.max.z);
    if (face === 'right') geo.rotateY(Math.PI / 2);
    if (face === 'top') geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();

    const material = glyphMaterial(CONFIG.colors[face]);
    const front = new THREE.Mesh(geo, material);
    rig.add(front);
    glyphMeshes.push(front);
    // тот же знак на противоположной грани
    const back = new THREE.Mesh(geo, material);
    if (face === 'top') back.rotation.x = Math.PI; else back.rotation.y = Math.PI;
    rig.add(back);
    glyphMeshes.push(back);
  });

  /* --- Свечение знаков: выборочный (selective) bloom — размывается только
     то, что помечено как "знак", грани и швы в размытие не попадают, поэтому
     тут не бывает тёмной каймы по контуру на прозрачном фоне. Приём в три
     шага: 1) всё, что не знак, красим в чёрный и рендерим только это в
     отдельный буфер, размываем — получаем bloomTexture; 2) рендерим обычную
     сцену как есть — baseTexture; 3) шейдером складываем base + bloom. --- */
  let bloomComposer = null, finalComposer = null, darkenNonBloomed = null, restoreMaterial = null;
  if (CONFIG.glyphGlowEnabled && CONFIG.glyphGlow > 0) {
    const BLOOM_LAYER = 1;
    const bloomLayer = new THREE.Layers();
    bloomLayer.set(BLOOM_LAYER);
    glyphMeshes.forEach(function (m) { m.layers.enable(BLOOM_LAYER); });

    const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const materialCache = {};
    darkenNonBloomed = function (obj) {
      if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
        materialCache[obj.uuid] = obj.material;
        obj.material = darkMaterial;
      }
    };
    restoreMaterial = function (obj) {
      if (materialCache[obj.uuid]) {
        obj.material = materialCache[obj.uuid];
        delete materialCache[obj.uuid];
      }
    };

    const bloomTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    bloomComposer = new EffectComposer(renderer, bloomTarget);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(new RenderPass(scene, camera));
    bloomComposer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), CONFIG.glyphGlow * 0.4, 0.15, 0.4));

    const mixPass = new ShaderPass(new THREE.ShaderMaterial({
      uniforms: { baseTexture: { value: null }, bloomTexture: { value: bloomComposer.renderTarget2.texture } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv;' +
        'void main() { vec4 base = texture2D(baseTexture, vUv); vec4 bloom = texture2D(bloomTexture, vUv);' +
        ' gl_FragColor = vec4(base.rgb + bloom.rgb, base.a); }'
    }), 'baseTexture');
    mixPass.needsSwap = true;

    const finalTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    finalComposer = new EffectComposer(renderer, finalTarget);
    finalComposer.addPass(new RenderPass(scene, camera));
    finalComposer.addPass(mixPass);
    finalComposer.addPass(new OutputPass());
  }

  function resize() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const aspect = w / h;
    camera.left = aspect > 1 ? -extent * aspect : -extent;
    camera.right = -camera.left;
    camera.top = aspect > 1 ? extent : extent / aspect;
    camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    if (bloomComposer) {
      // Свечение считаем на буфере с минимальным разрешением, даже если сам
      // кубик крошечный (32-64px) — иначе блюр размывает знак в кашу: слишком
      // мало пикселей, чтобы держать свечение тонким и близко к контуру.
      const BLOOM_MIN_RES = 320;
      const bloomW = Math.max(w * ratio, BLOOM_MIN_RES);
      const bloomH = Math.max(h * ratio, BLOOM_MIN_RES);
      bloomComposer.setPixelRatio(1);
      bloomComposer.setSize(bloomW, bloomH);
      finalComposer.setPixelRatio(ratio);
      finalComposer.setSize(w, h);
    }
    if (haloEl) haloEl.style.filter = 'blur(' + Math.max(4, w * 0.12) + 'px)';
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
  window.addEventListener('resize', resize);

  const M = CONFIG.motion;
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Наведение: куб перекувыркивается вокруг случайной оси на целое число
  // оборотов и возвращается ровно в исходную позу — поворот на 360°/720°
  // вокруг ЛЮБОЙ оси всегда приводит обратно к тому же положению. Знаки
  // продублированы на всех гранях, поэтому пустых граней не бывает, в какой
  // момент кувырка его ни застать. При каждом новом наведении — свежая
  // случайная ось, поэтому кувырок каждый раз выглядит немного иначе.
  let hoverT = 1, hovering = false, hoverTurns = 1;
  const hoverAxis = new THREE.Vector3(0, 1, 0);
  const hoverQuat = new THREE.Quaternion();
  function startHover() {
    if (hovering || reduceMotion || M.hoverTurnsMax <= 0) return;
    hovering = true;
    hoverT = 0;
    hoverAxis.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    const span = Math.max(0, M.hoverTurnsMax - M.hoverTurnsMin);
    hoverTurns = M.hoverTurnsMin + Math.round(Math.random() * span);
  }
  // Область наведения — весь блок подписи (куб + текст), а не только сам
  // кубик, чтобы доворот запускался и при наведении на «PRIME ERA» с тег-лайном
  const hitEl = (CONFIG.hitAreaSelector && host.closest(CONFIG.hitAreaSelector)) || host;
  hitEl.style.cursor = 'pointer';
  hitEl.addEventListener('touchstart', startHover, { passive: true });

  // Вход курсора в область проверяем сами на каждом pointermove, а не
  // полагаемся на pointerenter — у WebGL-канваса это событие на границе
  // фигуры иногда не срабатывает при быстром движении мыши. Заодно этим же
  // слушателем считаем лёгкий наклон вслед за курсором по всей странице —
  // он чувствуется даже когда курсор рядом, а не точно над кубом.
  let tiltTargetX = 0, tiltTargetY = 0, tiltX = 0, tiltY = 0;
  let pointerWasInside = false;
  window.addEventListener('pointermove', function (event) {
    if (!reduceMotion && M.tilt > 0) {
      const nx = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = (event.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
      tiltTargetY = Math.max(-1, Math.min(1, nx)) * M.tilt;
      tiltTargetX = Math.max(-1, Math.min(1, -ny)) * M.tilt * 0.6;
    }
    const r = hitEl.getBoundingClientRect();
    const inside = event.clientX >= r.left && event.clientX <= r.right &&
      event.clientY >= r.top && event.clientY <= r.bottom;
    if (inside && !pointerWasInside) startHover();
    pointerWasInside = inside;
  });

  function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }

  const idleQuat = new THREE.Quaternion();
  const tiltQuat = new THREE.Quaternion();
  const idleEuler = new THREE.Euler();
  const tiltEuler = new THREE.Euler();

  const clock = new THREE.Clock();
  let idleT = 0;
  /* экономия батареи: в покое (лёгкое «дыхание») — 24 кадра в секунду,
     при кувырке и движении мыши — полная частота; на скрытой вкладке — ничего */
  let lastFrame = 0;
  renderer.setAnimationLoop(function (time) {
    const calm = !hovering && Math.abs(tiltTargetX - tiltX) + Math.abs(tiltTargetY - tiltY) < 0.002;
    if (calm && time - lastFrame < 1000 / 24) return;
    lastFrame = time;
    const dt = Math.min(0.05, clock.getDelta());
    idleT += dt;

    const smooth = 1 - Math.pow(0.001, dt);
    tiltX += (tiltTargetX - tiltX) * smooth;
    tiltY += (tiltTargetY - tiltY) * smooth;

    let wobbleY = 0, wobbleX = 0;
    if (!reduceMotion && M.idle > 0) {
      wobbleY = Math.sin(idleT * 0.6 * M.idleSpeed) * M.idle;
      wobbleX = Math.sin(idleT * 0.42 * M.idleSpeed + 1.1) * M.idle * 0.6;
    }

    if (hovering) {
      hoverT = Math.min(1, hoverT + dt / M.hoverDuration);
      hoverQuat.setFromAxisAngle(hoverAxis, easeOutQuint(hoverT) * Math.PI * 2 * hoverTurns);
      if (hoverT >= 1) hovering = false;
    }

    idleEuler.set(wobbleX, wobbleY, 0);
    tiltEuler.set(tiltX, tiltY, 0);
    idleQuat.setFromEuler(idleEuler);
    tiltQuat.setFromEuler(tiltEuler);
    rig.quaternion.copy(idleQuat).multiply(tiltQuat).multiply(hoverQuat);

    if (bloomComposer) {
      scene.traverse(darkenNonBloomed);
      bloomComposer.render();
      scene.traverse(restoreMaterial);
      finalComposer.render();
    } else {
      renderer.render(scene, camera);
    }
  });
})();
