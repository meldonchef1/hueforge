# Design

Rozvržení je závazné, vizuál je na implementaci. Barvy, typografie a rozestupy
jsou v [`tokens.css`](./tokens.css) — nepoužívej v komponentách natvrdo zapsané
hodnoty, vždy sáhni po tokenu.

## Wireframe hlavního okna

```
┌──────────────────────────────────────────────────────────────────────┐
│ Menu: Soubor | Úpravy | Zobrazení | Předvolby | Nápověda             │
├──────────────────────────────────────────────────────────────────────┤
│ HORNÍ LIŠTA: Světlo | Pohled | Režim | Výšky vrstev                  │
├────────────┬──────────────────────────┬────┬──┬─────────────────────┤
│ KNIHOVNA   │                          │ C  │S │                     │
│ FILAMENTŮ  │     ŽIVÝ 3D NÁHLED       │ O  │L │   ZDROJOVÝ OBRÁZEK  │
│            │                          │ L  │I │                     │
│ [PLA][PETG]│                          │ O  │C │                     │
│ ☐ ■ název  │                          │ R  │E │                     │
│ ...        │                          │    │  │                     │
├────────────┴──────────────────────────┴────┴──┴─────────────────────┤
│ VRSTVY FILAMENTŮ (posuvníky)   │  GEOMETRIE MODELU                  │
├────────────────────────────────┴────────────────────────────────────┤
│ Stavový řádek: výška meshe | trojúhelníky | FPS | uloženo            │
└──────────────────────────────────────────────────────────────────────┘
```

Menu, horní lišta a stavový řádek jsou pevné. Všechno mezi nimi je dokovatelné:
panely jde přesunout, zmenšit, zavřít, odpojit a vrátit přes menu Zobrazení.
Rozvržení se ukládá do prohlížeče, menu Zobrazení ho vrátí na výchozí.

## Rozlišení

Minimum 1366×768, cílem je 1920×1080 a víc. Pod 900 px šířky se místo aplikace
zobrazí hláška, ať uživatel přejde na počítač.

## Téma

Tmavé je výchozí — u práce s barvami světlé okolí zkresluje vnímání náhledu.
Světlé je volitelné v Předvolbách. Chrome kolem náhledu je záměrně neutrálně
šedý, aby neovlivňoval vnímání simulovaných barev.
