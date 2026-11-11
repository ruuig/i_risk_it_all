/* =====================================================================
   TEXTOS QUE PUEDES CAMBIAR
   ===================================================================== */
window.DEDICATORIA = {
  clave: '1111',                         // se escribe como 11:11
  para: 'para ti',                       // arriba de la clave. Ej: 'para Sofía'
  pregunta: '¿Qué fecha es hoy?',
  claveMal: 'casi… inténtalo otra vez',
  idiomaInicial: 'en',                   // 'en' o 'es'
  ajuste: 0,                             // si la letra va adelantada pon 0.15; si va atrasada, -0.15 (segundos)

  // Pies de foto del álbum (aparece en el puente instrumental)
  // "Por qué me gustas": aparece justo antes de las fotos; cada pie de foto es una razón
  albumTitulo: '~por ~qué ~me / #gustas',
  fotos: [
    { src: 'assets/img/cafe.jpg',          pie: 'por lo linda que eres' },
    { src: 'assets/img/figuras-1.jpg',     pie: 'por tus ojitos lindos' },
    { src: 'assets/img/figuras-close.jpg', pie: 'porque eres maravillosa' },
    { src: 'assets/img/figuras-2.jpg',     pie: 'por tu sonrisa' },
    { src: 'assets/img/selfie.jpg',        pie: 'porque eres tú', alta: true },
  ],


  // Pantalla final
  finalTitulo: ['lo arriesgo todo', 'por ti'],   // cada texto es un renglón
  finalNota: 'hoy, mañana y cada 11:11',
  firma: '',                             // Ej: 'con amor, Rudy'. Vacío = no se muestra
};

/* =====================================================================
   COREOGRAFÍA DE LA LETRA
   Cada tarjeta: l = líneas de la letra que cubre, t = cómo se dibuja.
     ~palabra  pequeña
      palabra  mediana, cursiva
     *palabra  grande, cursiva
     #palabra  enorme, caligrafía
     !palabra  GIGANTE, mayúsculas elegantes
     ^palabra  GIGANTE, mayúsculas gruesas
     /         salto de renglón
     {fx}      efecto extra: moon, float, warm, wave, spark
   c    = alineación (al | ac | ar) y altura (vm centro | vb bajo la luna | vu un poco arriba)
   bg   = fondo de color que corta con la frase: cream, blush, lilac, ink, wine, rose, red
   art  = dibujito a mano: heart, stars, wish, flower, plane, spiral, clock, pulse, infinity, rays
          (':top' lo pone arriba del texto, ':behind' detrás)
   pose = tl / tr (texto inclinado), side (texto de lado, llenando la pantalla)
   ===================================================================== */
window.CARDS = {
  en: [
    // verso 1
    { l: [0],  c: 'al vm', bg: 'cream', art: 'heart', pose: 'tl', t: '~For ~just ~the / ^chance / ~to ~win ~your / #heart' },
    { l: [1],  c: 'ar vm', art: 'stars:top', pose: 'tr', t: '~You ~could ~set ~the / !bar / ~beyond ~the / #stars{spark}' },
    { l: [2],  c: 'ac vm', bg: 'blush', t: "~I'll ~do / ^anything" },
    { l: [3],  c: 'ac vm', bg: 'wine', art: 'flower', t: '#Anything / ~you ~ask ~me ~to' },
    // coro 1
    { l: [4],  c: 'ac vb', t: '~Say ~you ~want ~the / !Moon{moon}' },
    { l: [5],  c: 'ac vb', art: 'plane:top', t: '~Watch ~me / ~learn ~to *fly{float}' },
    { l: [6],  c: 'al vb', pose: 'tl', t: "~Ain't ~no / ^mountain / ~you ~could ~point ~to" },
    { l: [7],  c: 'ac vm', bg: 'cream', pose: 'side', t: "~I ~wouldn't / !climb" },
    { l: [8],  c: 'ac vm', bg: 'rose', art: 'spiral', pose: 'tr', t: "~It's ^crazy, / ~but ~it's #true" },
    { l: [9],  c: 'ac vb', t: "~There's / !nothing / ~I ~won't ~do" },
    { l: [10], c: 'ac vb hero', art: 'rays:behind', t: "~I'd / !risk ~it !all / ~for #you" },
    // verso 2
    { l: [11], c: 'ac vb', t: '~To ~hold ~your ^hand / ~and ~call ~you #mine' },
    { l: [12], c: 'ac vm', bg: 'ink', art: 'clock', t: "~I'm ~tryna ~be / ~your !man / ~till ~the ~end ~of / #time" },
    { l: [13], c: 'al vm', bg: 'blush', pose: 'tl', t: "~Oh, / ~I'll ~do / ^anything" },
    { l: [14], c: 'ar vm', bg: 'cream', art: 'flower', t: '#Anything / ~you ~ask ~me ~to' },
    // coro 2
    { l: [15], c: 'ac vu', t: '~I ~would ^run / ~through ~a #fire{warm}' },
    { l: [16], c: 'ac vu', pose: 'tr', t: '~Just ~to ~be / ~by ~your !side' },
    { l: [17], c: 'al vm', bg: 'red', art: 'pulse', t: "~If ~your / *heart's / ~on ~the ~line" },
    { l: [18], c: 'ar vm', bg: 'cream', art: 'heart', pose: 'tl', t: '~You ~could / ~take !mine' },
    { l: [19], c: 'ac vm', bg: 'blush', art: 'spiral', pose: 'tr', t: "~It's ^crazy, / ~but ~it's #true" },
    { l: [20], c: 'ac vm', bg: 'blush', t: "~There's / !nothing / ~I ~won't ~do" },
    { l: [21], c: 'ac vm hero', bg: 'rose', art: 'rays:behind', t: "~I'd / !risk ~it !all / ~for #you" },
    // puente
    { l: [22], c: 'al vu', t: '~I ~would ^swim / ~across ~the #sea{wave} / ~just ~to ~show ~you' },
    { l: [23], c: 'ar vu', pose: 'tr', t: '!Sacrifice / ~my #life / ~just ~to ~hold ~you' },
    { l: [24], c: 'ac vu', art: 'infinity', t: '~I ~could ~go / ^on ~and ^on' },
    { l: [25], c: 'ac vu', t: '~To ~prove ~that ~you / !belong / ~here ~in ~my #arms' },
    // coro final
    { l: [26], c: 'ac vb', t: '~Say ~you ~want ~the / !Moon{moon}' },
    { l: [27], c: 'ac vb', art: 'plane:top', t: '~Watch ~me / ~learn ~to *fly{float}' },
    { l: [28], c: 'ar vb', pose: 'tr', t: "~Ain't ~no / ^mountain / ~you ~could ~point ~to" },
    { l: [29], c: 'ac vm', bg: 'blush', pose: 'side', t: "~I ~wouldn't / !climb" },
    { l: [30], c: 'ac vm', bg: 'cream', art: 'spiral', pose: 'tl', t: "~It's ^crazy, / ~but ~it's #true" },
    { l: [31], c: 'ac vb', t: "~There's / !nothing / ~I ~won't ~do" },
    { l: [32], c: 'ac vb hero', art: 'rays:behind', t: "~I'd / !risk ~it !all / ~for #you" },
    { l: [33], c: 'ac vm', bg: 'rose', pose: 'tr', t: "~It's ^crazy, / ~but ~it's #true" },
    { l: [34], c: 'ac vm', bg: 'cream', t: "~There's / !nothing / ~I ~won't ~do" },
    { l: [35], c: 'ac vb hero last', art: 'rays:behind', t: "~I'd / !risk ~it !all / ~for #you" },
  ],

  es: [
    // verso 1
    { l: [0, 1],   c: 'al vm', bg: 'cream', art: 'heart', pose: 'tl', t: '~Yo ~por ^tener / ~tu / #corazón' },
    { l: [2, 3],   c: 'ar vm', art: 'stars:top', pose: 'tr', t: '~La !estrella{spark} / ~más ~lejana / ~te ~la #doy' },
    { l: [4],      c: 'ac vm', bg: 'blush', t: '~Haré / ^todo' },
    { l: [5],      c: 'ac vm', bg: 'wine', art: 'flower', t: '#Todo / ~lo ~que ~pidas ~tú' },
    // coro 1
    { l: [6],      c: 'ac vb', t: '~Pídeme ~la / !luna{moon}' },
    { l: [7],      c: 'ac vb', art: 'plane:top', t: '~Yo ~aprendo / ~a *volar{float}' },
    { l: [8],      c: 'al vb', pose: 'tl', t: '~Por ~tu ~amor / ~no ~hay / ^montaña' },
    { l: [9],      c: 'ac vm', bg: 'cream', pose: 'side', t: '~que ~no ~pueda / !escalar' },
    { l: [10],     c: 'ac vm', bg: 'rose', art: 'spiral', pose: 'tr', t: '~Es ^loco, / ~pero #sí' },
    { l: [11],     c: 'ac vb', t: '~Yo ~te / !quiero / ~así' },
    { l: [12],     c: 'ac vb hero', art: 'rays:behind', t: '~Lo / !arriesgo / !todo / ~por #ti' },
    // verso 2
    { l: [13, 14], c: 'ac vb', t: '~Tomar ~tu ^mano / ~hacerte #mía' },
    { l: [15, 16], c: 'ac vm', bg: 'ink', art: 'clock', t: '~Quiero ~ser ~solo ~yo / ~el !hombre / ~de ~tu #vida' },
    { l: [17],     c: 'al vm', bg: 'blush', pose: 'tl', t: '~Yo ~haré / ^todo' },
    { l: [18],     c: 'ar vm', bg: 'cream', art: 'flower', t: '#Todo / ~lo ~que ~pidas ~tú,' },
    // coro 2
    { l: [19],     c: 'ac vu', t: '~Sobre #fuego{warm} / ^caminar' },
    { l: [20],     c: 'ac vu', pose: 'tr', t: '~para ~a ~tu / !lado ~estar' },
    { l: [21],     c: 'al vm', bg: 'red', art: 'pulse', t: '~Tu / *corazón / ~herido' },
    { l: [22],     c: 'ar vm', bg: 'cream', art: 'heart', pose: 'tl', t: '~Yo ~puedo / !curar' },
    { l: [23],     c: 'ac vm', bg: 'blush', art: 'spiral', pose: 'tr', t: '~Es ^loco, / ~pero #sí' },
    { l: [24],     c: 'ac vm', bg: 'blush', t: '~Yo ~te / !quiero / ~así' },
    { l: [25],     c: 'ac vm hero', bg: 'rose', art: 'rays:behind', t: '~Lo / !arriesgo / !todo / ~por #ti' },
    // puente
    { l: [26],     c: 'al vu', t: '^Cruzaría / ~todo ~el #mar{wave} / ~para ~abrazarte' },
    { l: [27],     c: 'ar vu', pose: 'tr', t: '~Doy ~mi #vida / ~solo ~por / !besarte' },
    { l: [28],     c: 'ac vu', art: 'infinity', t: '~Yo ~no ~voy ~a / ^parar' },
    { l: [29, 30], c: 'ac vu', t: '~hasta !demostrar / ~que ~te ~puedo #amar' },
    // coro final
    { l: [31],     c: 'ac vb', t: '~Pídeme ~la / !luna{moon}' },
    { l: [32],     c: 'ac vb', art: 'plane:top', t: '~Yo ~aprendo / ~a *volar{float}' },
    { l: [33],     c: 'ar vb', pose: 'tr', t: '~Por ~tu ~amor / ~no ~hay / ^montaña' },
    { l: [34],     c: 'ac vm', bg: 'blush', pose: 'side', t: '~que ~no ~pueda / !escalar' },
    { l: [35],     c: 'ac vm', bg: 'cream', art: 'spiral', pose: 'tl', t: '~Es ^loco, / ~pero #sí' },
    { l: [36],     c: 'ac vb', t: '~Yo ~te / !quiero / ~así' },
    { l: [37],     c: 'ac vb hero', art: 'rays:behind', t: '~Lo / !arriesgo / !todo / ~por #ti' },
    { l: [38],     c: 'ac vm', bg: 'rose', pose: 'tr', t: '~Es ^loco, / ~pero #sí' },
    { l: [39],     c: 'ac vm', bg: 'cream', t: '~Yo ~te / !quiero / ~así' },
    { l: [40],     c: 'ac vb hero last', art: 'rays:behind', t: '~Lo / !arriesgo / !todo / ~por #ti' },
  ],

  // Intro instrumental y título del álbum (igual en los dos idiomas). at = segundo, step = ritmo por palabra
  common: [
    { at: 0.5,   dur: 5.0, step: 0.5,  c: 'ac vm clock', t: '*11:11' },
    { at: 6.2,   dur: 6.2, step: 0.42, c: 'ac vm', bg: 'cream', art: 'wish:top', pose: 'tl', t: '~cada ~once ~y ~once / ~pido ~el ^mismo / #deseo' },
    { at: 13.0,  dur: 8.3, step: 0.5,  c: 'ac vm', bg: 'rose', pose: 'tr', t: '~y ~siempre / ~eres / !tú' },
    { at: 132.2, dur: 3.0, step: 0.34, c: 'ac vm', bg: 'cream', art: 'heart', t: window.DEDICATORIA.albumTitulo },
  ],
};

/* =====================================================================
   ESCENAS (segundos de la canción)
   ===================================================================== */
window.SCENES = {
  tones: [[0, 'night'], [64.9, 'wine'], [86.3, 'ember'], [93.5, 'night'],
          [110.2, 'sunset'], [131.7, 'wine'], [153.6, 'dawn']],
  flags: {
    moon:     [[42.9, 65.4], [153.8, 1e9]],
    mount:    [[48.1, 65.4], [153.8, 1e9]],
    clouds:   [[110.4, 131.9]],
    bokeh:    [[65.2, 86.3], [131.8, 153.6]],
    fire:     [[86.5, 93.6]],
    petals:   [[98.5, 110.3]],
    sea:      [[110.4, 131.9]],
    lanterns: [[153.8, 1e9]],
    solo:     [[66.1, 71.5]],
    album:    [[131.9, 153.5]],
    bright:   [[29.6, 33.4]],
    glints:   [[153.8, 1e9]],
    end:      [[190.8, 1e9]],
  },
  albumStart: 135.4,
  albumStep: 3.45,
  events: [
    [0.35, 'shoot'], [5.3, 'shoot'], [30.4, 'shoot'], [31.2, 'shoot'], [31.6, 'shoot'], [32.3, 'shoot'],
    [43.19, 'flash'], [48.53, 'kick'], [60.02, 'flash'], [63.0, 'bloom'],
    [66.51, 'kick'], [77.2, 'kick'], [86.94, 'flash'], [90.88, 'kick'], [104.63, 'flash'], [107.66, 'bloom'],
    [111.18, 'flash'], [116.78, 'kick'], [124.57, 'kick'], [130.34, 'bloom'], [133.2, 'bloom'],
    [154.44, 'flash'], [156.62, 'shoot'], [160.2, 'kick'], [171.55, 'flash'], [175.96, 'bloom'],
    [182.94, 'flash'], [187.9, 'bloom'], [189.2, 'shoot'],
  ],
};
