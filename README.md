# HueForge

Nástroj pro přípravu barevných 3D tisků z obrázku. Z fotky spočítá výškovou mapu,
složí z ní stack filamentů a v živém 3D náhledu simuluje, jak bude tisk vypadat
po prosvícení světlem. Výstupem je STL, instrukce výměn filamentu a později 3MF.

Všechno běží v prohlížeči, data zůstávají u tebe — nic se nikam neposílá.

## Spuštění

```bash
npm install
npm run dev
```

| Příkaz              | Co dělá                                     |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Vývojový server                             |
| `npm run build`     | Produkční build do `dist/`                  |
| `npm run lint`      | ESLint                                      |
| `npm run typecheck` | Kontrola typů                               |
| `npm test`          | Unit testy (Vitest)                         |
| `npm run test:e2e`  | UI testy (Playwright)                       |

Minimální rozlišení je 1366 × 768, optimalizováno pro 1920 × 1080 a víc.
Mobil není cílem.

## Struktura

| Cesta                | Obsah                                                     |
| -------------------- | --------------------------------------------------------- |
| `src/core`           | Výpočetní jádro bez UI: výšková mapa, simulace, mesh, export |
| `src/workers`        | Web Workery pro těžké výpočty                             |
| `src/render`         | Three.js scéna a shadery                                  |
| `src/ui/panels`      | Jednotlivé panely aplikace                                |
| `src/ui/components`  | Sdílené prvky (NumberInput, Slider, Tooltip, …)           |
| `src/ui/layout`      | Dokovatelné rozvržení                                     |
| `src/store`          | Centrální stav a undo/redo                                |
| `src/i18n`           | Překlady CZ/EN                                            |
| `design`             | Design tokeny a wireframy                                 |
| `e2e`                | Playwright testy                                          |

Jádro v `src/core` nesmí importovat nic z UI — díky tomu jde testovat samostatně
a později přesunout do Web Workeru nebo do Rustu.

## Stav

| Milník                                                            | Stav     |
| ----------------------------------------------------------------- | -------- |
| 1. Kostra UI: dokovatelné panely, tmavé téma, deploy na Pages      | hotovo   |
| 2. MVP: obrázek, výšková mapa, geometrie, export STL               | hotovo   |
| 3. Simulace: knihovna filamentů, vrstvy, barevný sloupec, náhled   | hotovo   |
| 4. Kalibrace: testovací vzorky, ladění podle reálných tisků        | čeká     |
| 5. Pohodlí: SpotFix, řez výškou, porovnání, projekty, 3MF, průvodce | čeká     |

Panely, které patří k pozdějším milníkům, jsou v rozvržení už teď a říkají,
ve kterém milníku se naplní.

> **TD hodnoty ve výchozí knihovně jsou odhad, ne měření.** Než se na simulované
> barvy začneš spoléhat, změř si TD vlastního filamentu — na to je milník 4.
> Podrobnosti v [`public/filaments/README.md`](./public/filaments/README.md).

## Nasazení

Merge do `main` spustí build a deploy na GitHub Pages. Každý PR projde lintem,
kontrolou typů, unit testy a UI testy.

Jednorázově je potřeba v **Settings → Pages** nastavit **Source: GitHub Actions**.
Workflow si Pages zapnout nemůže — `GITHUB_TOKEN` na vytvoření webu nemá právo,
ani s `enablement: true`. Dokud to není nastavené, deploy padá na
`Get Pages site failed`.
