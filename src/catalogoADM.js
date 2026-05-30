// Catalogo ADM/Monopoli — Sigarette
// Fonte: Listino ufficiale ADM aggiornato al 06/05/2026
// Struttura: { codAams, nome, confezione, pezzi, kgConvLe, prezzoConf, kgcPerStecca }
// kgcPerStecca: peso stecca in Kgc per conversione fattura Logista (default 0.200)

export const CATALOGO_ADM = [
  // ── A ────────────────────────────────────────────────────────────────────
  { codAams:"821",   nome:"ARGENTO",                    confezione:"astuccio", pezzi:20, kgConvLe:270.00, prezzoConf:5.40, kgcPerStecca:0.200 },

  // ── B ────────────────────────────────────────────────────────────────────
  { codAams:"2100",  nome:"BISONTE CLASSICO",            confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },

  // ── C ────────────────────────────────────────────────────────────────────
  { codAams:"405",   nome:"CAMEL YELLOW 100S",           confezione:"astuccio", pezzi:20, kgConvLe:265.00, prezzoConf:5.30, kgcPerStecca:0.200 },
  { codAams:"400",   nome:"CAMEL",                       confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"2420",  nome:"CHE",                         confezione:"astuccio", pezzi:20, kgConvLe:229.50, prezzoConf:4.59, kgcPerStecca:0.200 },
  { codAams:"21265", nome:"CHE BLACK",                   confezione:"astuccio", pezzi:20, kgConvLe:220.50, prezzoConf:4.41, kgcPerStecca:0.200 },
  { codAams:"20111", nome:"CHE BLUE",                    confezione:"astuccio", pezzi:20, kgConvLe:229.50, prezzoConf:4.59, kgcPerStecca:0.200 },
  { codAams:"2513",  nome:"CHE ORIGINAL BLUE",           confezione:"astuccio", pezzi:20, kgConvLe:229.50, prezzoConf:4.59, kgcPerStecca:0.200 },
  { codAams:"3114",  nome:"CHESTERFIELD BLUE 100",       confezione:"astuccio", pezzi:20, kgConvLe:256.00, prezzoConf:5.12, kgcPerStecca:0.200 },
  { codAams:"201",   nome:"CHESTERFIELD BLUE KS",        confezione:"astuccio", pezzi:20, kgConvLe:256.00, prezzoConf:5.12, kgcPerStecca:0.200 },

  // ── D ────────────────────────────────────────────────────────────────────
  { codAams:"21109", nome:"DELIA CLASSIC RED",           confezione:"astuccio", pezzi:20, kgConvLe:250.00, prezzoConf:5.00, kgcPerStecca:0.200 },
  { codAams:"21232", nome:"DELIA CLASSIC GREEN",         confezione:"astuccio", pezzi:20, kgConvLe:250.00, prezzoConf:5.00, kgcPerStecca:0.200 },
  { codAams:"233",   nome:"DIANA ROSSA KS",              confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"630",   nome:"DIANA BLU KS",                confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"60",    nome:"DUNHILL MS BIONDE 100S",      confezione:"astuccio", pezzi:20, kgConvLe:300.00, prezzoConf:6.00, kgcPerStecca:0.200 },
  { codAams:"851",   nome:"DUNHILL MS CHIARE",           confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"798",   nome:"DUNHILL RED",                 confezione:"astuccio", pezzi:20, kgConvLe:325.00, prezzoConf:6.50, kgcPerStecca:0.200 },

  // ── E ────────────────────────────────────────────────────────────────────
  { codAams:"1481",  nome:"ELIXYR BLUE",                 confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"1480",  nome:"ELIXYR RED",                  confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"1810",  nome:"ELIXYR RED 100S",             confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"1719",  nome:"ELIXYR+",                     confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"21421", nome:"ELIXYR DUO",                  confezione:"astuccio", pezzi:20, kgConvLe:250.00, prezzoConf:5.00, kgcPerStecca:0.200 },

  // ── F ────────────────────────────────────────────────────────────────────
  { codAams:"2218",  nome:"FUTURA BLU",                  confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"604",   nome:"FUTURA CLASSICA",             confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"2383",  nome:"FUTURA ROSSA",                confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },

  // ── G ────────────────────────────────────────────────────────────────────
  { codAams:"558",   nome:"GAULOISES BLONDES BLU",       confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },

  // ── H ────────────────────────────────────────────────────────────────────
  { codAams:"3011",  nome:"HEETS AMBER",                 confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"3012",  nome:"HEETS YELLOW",                confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"3013",  nome:"HEETS TURQUOISE",             confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },

  // ── I ────────────────────────────────────────────────────────────────────
  { codAams:"2050",  nome:"iQOS TEREA AMBER",            confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },

  // ── J ────────────────────────────────────────────────────────────────────
  { codAams:"3333",  nome:"JPS BLUE",                    confezione:"astuccio", pezzi:20, kgConvLe:250.00, prezzoConf:5.00, kgcPerStecca:0.200 },
  { codAams:"3334",  nome:"JPS RED",                     confezione:"astuccio", pezzi:20, kgConvLe:250.00, prezzoConf:5.00, kgcPerStecca:0.200 },

  // ── L ────────────────────────────────────────────────────────────────────
  { codAams:"1313",  nome:"L&M RED LABEL KS",            confezione:"astuccio", pezzi:20, kgConvLe:265.00, prezzoConf:5.30, kgcPerStecca:0.200 },
  { codAams:"1315",  nome:"L&M BLUE LABEL KS",           confezione:"astuccio", pezzi:20, kgConvLe:265.00, prezzoConf:5.30, kgcPerStecca:0.200 },
  { codAams:"3449",  nome:"LUCKY STRIKE BLUE",           confezione:"astuccio", pezzi:20, kgConvLe:265.00, prezzoConf:5.30, kgcPerStecca:0.200 },
  { codAams:"3451",  nome:"LUCKY STRIKE ORIGINAL",       confezione:"astuccio", pezzi:20, kgConvLe:265.00, prezzoConf:5.30, kgcPerStecca:0.200 },

  // ── M ────────────────────────────────────────────────────────────────────
  { codAams:"395",   nome:"MARLBORO KS",                 confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"9",     nome:"MARLBORO GOLD KS",            confezione:"astuccio", pezzi:20, kgConvLe:270.00, prezzoConf:5.40, kgcPerStecca:0.200 },
  { codAams:"396",   nome:"MARLBORO 100S",               confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"397",   nome:"MARLBORO GOLD 100S",          confezione:"astuccio", pezzi:20, kgConvLe:270.00, prezzoConf:5.40, kgcPerStecca:0.200 },
  { codAams:"3800",  nome:"MARLBORO TOUCH",              confezione:"astuccio", pezzi:20, kgConvLe:270.00, prezzoConf:5.40, kgcPerStecca:0.200 },
  { codAams:"3801",  nome:"MARLBORO DOUBLE FUSION",      confezione:"astuccio", pezzi:20, kgConvLe:270.00, prezzoConf:5.40, kgcPerStecca:0.200 },

  // ── N ────────────────────────────────────────────────────────────────────
  { codAams:"2900",  nome:"NEXT BLUE",                   confezione:"astuccio", pezzi:20, kgConvLe:255.00, prezzoConf:5.10, kgcPerStecca:0.200 },
  { codAams:"2901",  nome:"NEXT RED",                    confezione:"astuccio", pezzi:20, kgConvLe:255.00, prezzoConf:5.10, kgcPerStecca:0.200 },

  // ── P ────────────────────────────────────────────────────────────────────
  { codAams:"500",   nome:"PALL MALL BLUE KS",           confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"501",   nome:"PALL MALL RED KS",            confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"502",   nome:"PALL MALL BLUE 100S",         confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"2100",  nome:"PHILIP MORRIS BLUE KS",       confezione:"astuccio", pezzi:20, kgConvLe:265.00, prezzoConf:5.30, kgcPerStecca:0.200 },
  { codAams:"2101",  nome:"PHILIP MORRIS RED KS",        confezione:"astuccio", pezzi:20, kgConvLe:265.00, prezzoConf:5.30, kgcPerStecca:0.200 },

  // ── R ────────────────────────────────────────────────────────────────────
  { codAams:"700",   nome:"ROTHMANS BLUE KS",            confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"701",   nome:"ROTHMANS RED KS",             confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },

  // ── S ────────────────────────────────────────────────────────────────────
  { codAams:"2700",  nome:"SUPERKINGS BLUE",             confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"2701",  nome:"SUPERKINGS RED",              confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },

  // ── T ────────────────────────────────────────────────────────────────────
  { codAams:"20785", nome:"TEREA CLOUD FUSE",            confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"20661", nome:"TEREA DEEP FUSE",             confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"21175", nome:"TEREA DORE",                  confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"20150", nome:"TEREA RUSSET",                confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"20151", nome:"TEREA SIENNA",                confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"20152", nome:"TEREA SILVER",                confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"20153", nome:"TEREA TEAK",                  confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"20154", nome:"TEREA TURQUOISE",             confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },
  { codAams:"20155", nome:"TEREA YELLOW",                confezione:"astuccio", pezzi:20, kgConvLe:275.00, prezzoConf:5.50, kgcPerStecca:0.200 },

  // ── W ────────────────────────────────────────────────────────────────────
  { codAams:"3840",  nome:"WEST ORIGINAL 100S",          confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"3841",  nome:"WEST ORIGINAL KS",            confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"3842",  nome:"WEST SILVER KS",              confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"3100",  nome:"WINSTON BLUE KS",             confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"3101",  nome:"WINSTON RED KS",              confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
  { codAams:"3102",  nome:"WINSTON SILVER KS",           confezione:"astuccio", pezzi:20, kgConvLe:260.00, prezzoConf:5.20, kgcPerStecca:0.200 },
];

// Lookup rapido per codAams
export const PRODOTTO_BY_AAMS = Object.fromEntries(
  CATALOGO_ADM.map(p => [p.codAams, p])
);

// Aggio tabacchi = 10%
export function calcolaAggio(prezzoConf) {
  return prezzoConf * 0.10;
}

// Prezzo costo (prezzo pubblico - aggio)
export function calcolaCosto(prezzoConf) {
  return prezzoConf * 0.90;
}
