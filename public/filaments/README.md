# Výchozí knihovna filamentů

`default.json` se načte při prvním spuštění. Od té chvíle žije knihovna
v IndexedDB prohlížeče a tenhle soubor se už nepoužívá — tvoje úpravy tedy
nikdo nepřepíše.

## TD hodnoty jsou odhad

Čísla `td` v tomhle souboru jsou **řádové odhady podle typu barvy**, ne měření.
Tmavé barvy propouštějí málo, světlé a průsvitné víc. Skutečné TD se u každé
značky a šarže liší.

Než se na náhled začneš spoléhat, změř si TD vlastního filamentu schodovým
testovacím vzorkem — na to je milník 4 (Kalibrace). Do té doby ber barvy
v náhledu jako orientační.

## Formát

```json
{
  "id": "pla-red",
  "brand": "Generic",
  "name": "Červená",
  "material": "PLA",
  "color": "#c0272d",
  "td": 1.3,
  "owned": true
}
```

| Pole       | Význam                                                          |
| ---------- | --------------------------------------------------------------- |
| `id`       | Jednoznačný klíč, podle něj se filament poznává ve stacku        |
| `material` | `PLA`, `PLA+`, `PETG`, `ABS`, `ASA` nebo `custom`                |
| `color`    | Barva jako `#rrggbb`                                             |
| `td`       | Transmission distance v mm — tloušťka, přes kterou už neprosvítá |
| `owned`    | Zaškrtávátko „mám doma"                                          |

Stejný formát má i export z panelu Knihovna filamentů, takže vyexportovaný
soubor jde rovnou vložit sem.
