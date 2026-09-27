@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   Ember - Fix-All Patch
echo ============================================
echo.
echo Zielordner: %CD%
echo.

if not exist "server.js" (
  echo FEHLER: server.js nicht gefunden.
  echo Bitte diese .bat in den Ember-Hauptordner legen.
  pause
  exit /b 1
)

:: --- Backup ---
for /f "tokens=1-4 delims=/:. " %%a in ("%date% %time%") do set STAMP=%%a%%b%%c_%%d
set STAMP=%STAMP: =0%
set BACKUP=backup_%STAMP%
echo [1/4] Backup nach %BACKUP% ...
mkdir "%BACKUP%" 2>nul
if exist lib      xcopy /E /I /Y /Q lib      "%BACKUP%\lib"      >nul
if exist public   xcopy /E /I /Y /Q public   "%BACKUP%\public"   >nul
echo       OK.

:: --- Ordner sicherstellen ---
mkdir lib 2>nul
mkdir public 2>nul
mkdir public\css 2>nul
mkdir public\js 2>nul

echo [2/4] Schreibe Backend (lib\*) ...
call :write_lib
echo       OK.

echo [3/4] Schreibe Frontend (public\*) ...
call :write_public
echo       OK.

echo [4/4] Fertig.
echo.
echo ============================================
echo   Patch abgeschlossen.
echo   Backup:   %BACKUP%\
echo   Naechster Schritt:
echo     1. start.bat schliessen (falls offen)
echo     2. start.bat neu starten
echo     3. Im Browser STRG+F5 druecken
echo ============================================
echo.
pause
exit /b 0


:: ============================================================
:: Backend-Dateien
:: ============================================================
:write_lib

> lib\ids.js (
echo function id^(prefix^) {
echo   if ^(typeof crypto !== "undefined" ^&^& crypto.randomUUID^) {
echo     return prefix + "_" + crypto.randomUUID^(^).slice^(0, 12^);
echo   }
echo   return prefix + "_" + Math.random^(^).toString^(16^).slice^(2^) + Date.now^(^).toString^(16^).slice^(-4^);
echo }
echo function pin^(^) {
echo   return String^(1000 + Math.floor^(Math.random^(^) * 9000^)^);
echo }
echo module.exports = { id, pin };
)

> lib\dice.js (
echo function rollDie^(sides^) {
echo   return 1 + Math.floor^(Math.random^(^) * sides^);
echo }
echo.
echo function resolveActionRoll^(input^) {
echo   const hopeDie = Number^(input.hopeDie ^|^| rollDie^(12^)^);
echo   const fearDie = Number^(input.fearDie ^|^| rollDie^(12^)^);
echo   const traitMod = Number^(input.traitMod ^|^| 0^);
echo   const experiences = input.experiences ^|^| [];
echo   const expBonus = experiences.reduce^(^(s, e^) =^> s + Number^(e.bonus ^|^| 0^), 0^);
echo   let adv = Number^(input.advantageDie ^|^| 0^);
echo   if ^(!adv ^&^& input.mode === "advantage"^) adv = rollDie^(6^);
echo   if ^(!adv ^&^& input.mode === "disadvantage"^) adv = rollDie^(6^);
echo   const signedAdv = input.mode === "disadvantage" ? -adv : input.mode === "advantage" ? adv : 0;
echo   const total = hopeDie + fearDie + traitMod + expBonus + signedAdv;
echo   const critical = hopeDie === fearDie;
echo   const withHope = hopeDie ^> fearDie;
echo   const difficulty = Number^(input.difficulty ^|^| 0^);
echo   const success = ^!difficulty ^|^| total ^>= difficulty ^|^| critical;
echo   let hopeDelta = 0;
echo   let fearDelta = 0;
echo   if ^(critical^) hopeDelta = 1;
echo   else if ^(withHope^) hopeDelta = 1;
echo   else fearDelta = 1;
echo   if ^(experiences.length^) hopeDelta -= 1;
echo   const outcome = {
echo     label: critical ? "Critical Success" : success ? ^(withHope ? "Success with Hope" : "Success with Fear"^) : ^(withHope ? "Failure with Hope" : "Failure with Fear"^),
echo     success,
echo     critical,
echo     withHope,
echo   };
echo   const spoken = `Hope ${hopeDie} - Fear ${fearDie}${signedAdv ? " - W6 " + signedAdv : ""} +${traitMod}${expBonus ? " +XP " + expBonus : ""} = ${total} - ${outcome.label}`;
echo   return {
echo     hopeDie,
echo     fearDie,
echo     advantageDie: adv ^|^| null,
echo     mode: input.mode ^|^| "none",
echo     total,
echo     hopeDelta,
echo     fearDelta,
echo     outcome,
echo     spoken,
echo   };
echo }
echo.
echo module.exports = { resolveActionRoll, rollDie };
)

> lib\catalog.js (
echo const { id, pin } = require^("./ids"^);
echo.
echo function pc^(data^) {
echo   return {
echo     id: id^("pc"^),
echo     playerPin: pin^(^),
echo     hope: 2,
echo     hopeMax: 6,
echo     stressMarked: 0,
echo     stressMax: 6,
echo     hpMarked: 0,
echo     hpMax: 6,
echo     armorScore: 0,
echo     armorMarked: 0,
echo     proficiency: 1,
echo     sheetPhotos: [],
echo     notes: "",
echo     portrait: "",
echo     weapons: [],
echo     armor: { name: "", thresholds: "", score: 0, feature: "" },
echo     createdAt: new Date^(^).toISOString^(^),
echo     color: data.color ^|^| "#e85d04",
echo     ...data,
echo   };
echo }
echo.
echo function sablewoodPregens^(^) {
echo   return [
echo     pc^({
echo       name: "Marlowe Fairwind",
echo       pronouns: "she/her",
echo       ancestry: "Elf",
echo       community: "Loreborne",
echo       class: "Sorcerer",
echo       subclass: "Primal Origin",
echo       level: 1,
echo       color: "#7b2cbf",
echo       traits: { agility: 0, strength: -1, finesse: 1, instinct: 2, presence: 1, knowledge: 0 },
echo       experiences: [{ id: id^("xp"^), name: "Royal Mage", bonus: 2 }, { id: id^("xp"^), name: "Not On My Watch", bonus: 2 }],
echo       hpMax: 6, major: 7, severe: 14, evasion: 10,
echo       features: [{ id: id^("feat"^), name: "Arcane Sense", text: "Du spuerst Magie in der Naehe." }],
echo     }),
echo     pc^({
echo       name: "Barnacle",
echo       pronouns: "he/him",
echo       ancestry: "Ribbet",
echo       community: "Underborne",
echo       class: "Rogue",
echo       subclass: "Nightwalker",
echo       level: 1,
echo       color: "#2d6a4f",
echo       traits: { agility: 1, strength: -1, finesse: 2, instinct: 1, presence: 0, knowledge: 0 },
echo       experiences: [{ id: id^("xp"^), name: "No Lock Too Proud", bonus: 2 }],
echo       hpMax: 6, major: 6, severe: 12, evasion: 12,
echo       features: [{ id: id^("feat"^), name: "Cloaked", text: "Im Schatten schwerer zu sehen." }],
echo     }),
echo     pc^({
echo       name: "Garrick Reed",
echo       pronouns: "he/him",
echo       ancestry: "Human",
echo       community: "Highborne",
echo       class: "Warrior",
echo       subclass: "Call of the Brave",
echo       level: 1,
echo       color: "#1d3557",
echo       traits: { agility: 1, strength: 2, finesse: 0, instinct: 0, presence: 1, knowledge: -1 },
echo       experiences: [{ id: id^("xp"^), name: "Kill em with Kindness", bonus: 2 }],
echo       hpMax: 7, major: 8, severe: 15, evasion: 9,
echo       features: [{ id: id^("feat"^), name: "No Mercy", text: "Ein extra Impuls im Nahkampf." }],
echo     }),
echo     pc^({
echo       name: "Khari Nix",
echo       pronouns: "she/her",
echo       ancestry: "Giant",
echo       community: "Ridgeborne",
echo       class: "Guardian",
echo       subclass: "Stalwart",
echo       level: 1,
echo       color: "#9c6644",
echo       traits: { agility: 0, strength: 2, finesse: -1, instinct: 1, presence: 1, knowledge: 0 },
echo       experiences: [{ id: id^("xp"^), name: "Born with an Axe", bonus: 2 }],
echo       hpMax: 8, major: 9, severe: 18, evasion: 8,
echo       features: [{ id: id^("feat"^), name: "Unstoppable", text: "Du haelst die Linie." }],
echo     }),
echo     pc^({
echo       name: "Varian Soto",
echo       pronouns: "they/them",
echo       ancestry: "Katari",
echo       community: "Wildborne",
echo       class: "Ranger",
echo       subclass: "Wayfinder",
echo       level: 1,
echo       color: "#52796f",
echo       traits: { agility: 2, strength: 0, finesse: 1, instinct: 1, presence: -1, knowledge: 0 },
echo       experiences: [{ id: id^("xp"^), name: "Shoot First", bonus: 2 }],
echo       hpMax: 6, major: 7, severe: 14, evasion: 11,
echo       features: [{ id: id^("feat"^), name: "Hold Them Off", text: "Fernkampf haelt Distanz." }],
echo     }),
echo   ];
echo }
echo.
echo function defaultMap^(heroes^) {
echo   const tokens = ^(heroes ^|^| []^).map^(^(c, i^) =^> ^({
echo     id: id^("tok"^),
echo     kind: "pc",
echo     characterId: c.id,
echo     label: c.name.split^(" "^)[0],
echo     color: c.color ^|^| "#e85d04",
echo     x: 18 + i * 8,
echo     y: 68,
echo   }^)^);
echo   tokens.push^(
echo     { id: id^("tok"^), kind: "foe", label: "Ambusher 1", color: "#6a040f", x: 62, y: 38 },
echo     { id: id^("tok"^), kind: "foe", label: "Ambusher 2", color: "#6a040f", x: 70, y: 46 },
echo     { id: id^("tok"^), kind: "foe", label: "Ambusher 3", color: "#6a040f", x: 78, y: 40 },
echo     { id: id^("tok"^), kind: "foe", label: "Thief", color: "#3c096c", x: 22, y: 28 }
echo   ^);
echo   return { image: "", tokens, fow: { on: false, radius: 16, persist: false, gmSeesAll: true, explored: [] } };
echo }
echo.
echo module.exports = { sablewoodPregens, defaultMap };
)

:: store.js wird NICHT ueberschrieben, weil schon vorhanden und nur Migration betroffen.
:: Falls du sie auch patchen willst, hier ein minimaler Hinweis.
echo       store.js: unveraendert gelassen (Migration laeuft bereits).
exit /b 0


:: ============================================================
:: Frontend-Dateien
:: ============================================================
:write_public

:: ---------- CSS: settings-panel.css ----------
> public\css\settings-panel.css (
echo /* Ember - global settings panel */
echo #emberSettingsDock { position: fixed; top: 58px; right: 16px; z-index: 60; }
echo .ember-dock-btn {
echo   width: 38px; height: 38px; border-radius: 50%%;
echo   display: grid; place-items: center;
echo   border: 1px solid #5c2a16; background: rgba^(12,8,7,.92^);
echo   color: #f3e6d8; cursor: pointer; padding: 0;
echo   box-shadow: 0 8px 24px rgba^(0,0,0,.45^);
echo   transition: border-color .15s ease, color .15s ease, transform .1s ease;
echo }
echo .ember-dock-btn:hover { border-color: #e85d04; color: #ffb703; transform: translateY^(-1px^); }
echo .ember-settings {
echo   position: fixed; top: 0; right: 0; bottom: 0;
echo   width: min^(380px, 94vw^); z-index: 70;
echo   background: #12100e; border-left: 1px solid #3a2a24;
echo   box-shadow: -12px 0 40px rgba^(0,0,0,.55^);
echo   display: flex; flex-direction: column;
echo   transform: translateX^(0^); transition: transform .18s ease;
echo }
echo .ember-settings.hidden { transform: translateX^(105%%^); }
echo .ember-settings header {
echo   display: flex; align-items: center; justify-content: space-between;
echo   padding: 14px 16px; border-bottom: 1px solid #3a2a24;
echo }
echo .ember-settings header h2 { margin: 0; font-size: 18px; color: #f4d6a0; }
echo .ember-close {
echo   background: transparent; border: 1px solid #3a2a24; color: #f3e6d8;
echo   width: 30px; height: 30px; border-radius: 50%%; cursor: pointer; font-size: 18px; line-height: 1;
echo }
echo .ember-close:hover { border-color: #e85d04; color: #ffb703; }
echo .ember-settings-body { padding: 14px 16px; overflow: auto; display: grid; gap: 14px; }
echo .ember-section { border-top: 1px solid #2a1f1a; padding-top: 12px; margin-top: 4px; display: grid; gap: 12px; }
echo .ember-section h3 {
echo   margin: 0; font-size: 12px; text-transform: uppercase;
echo   letter-spacing: .16em; color: #e85d04; font-weight: 500;
echo }
echo .ember-field { display: grid; gap: 6px; font-size: 13px; color: #9a8476; }
echo .ember-field ^> span { display: flex; justify-content: space-between; align-items: baseline; }
echo .ember-field output { color: #e9c46a; font-variant-numeric: tabular-nums; }
echo .ember-field input[type="range"] { width: 100%%; }
echo .ember-field select, .ember-field input {
echo   background: #0c0908; border: 1px solid #3a2a24; color: #f3e6d8; padding: 8px; width: 100%%;
echo }
echo .ember-settings-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; }
echo .ember-settings-actions .btn {
echo   background: #1c1412; border: 1px solid #3a2a24; color: #f4d6a0; padding: 8px 12px; cursor: pointer;
echo }
echo .ember-settings-actions .btn.primary { background: #3b1408; border-color: #e85d04; }
echo .ember-themes { display: grid; grid-template-columns: repeat^(4, 1fr^); gap: 6px; }
echo .ember-theme-swatch {
echo   aspect-ratio: 1 / 1; border-radius: 8px; cursor: pointer;
echo   border: 2px solid transparent; position: relative; overflow: hidden;
echo }
echo .ember-theme-swatch.on { border-color: #f4d6a0; }
echo .ember-theme-swatch span {
echo   position: absolute; inset: auto 4px 4px 4px;
echo   font-size: 9px; text-align: center; color: #fff;
echo   text-shadow: 0 1px 3px #000; letter-spacing: .04em;
echo }
echo body.reduce-motion *, body.reduce-motion *::before, body.reduce-motion *::after {
echo   animation-duration: .001ms ^!important; transition-duration: .001ms ^!important;
echo }
echo body.high-contrast { --mute: #c7b8ab; }
echo body.high-contrast .card, body.high-contrast .btn { border-color: #6a4a3a; }
echo @media ^(max-width: 700px^) { #emberSettingsDock { top: auto; bottom: 16px; right: 16px; } }
)

:: ---------- CSS: topbar.css ----------
> public\css\topbar.css (
echo .ember-topbar {
echo   position: sticky; top: 0; z-index: 50;
echo   display: flex; align-items: center; gap: 10px;
echo   padding: 10px 16px;
echo   background: linear-gradient^(180deg, #0d0908 0%%, #0a0605 100%%^);
echo   border-bottom: 2px solid var^(--ember, #e85d04^);
echo }
echo .ember-topbar .brand { font-family: var^(--serif, Georgia, serif^); letter-spacing: .04em; color: #f3e6d8; }
echo .ember-topbar .grow { flex: 1; }
echo .ember-topbar .chip { font-size: 12px; color: var^(--mute, #9a8476^); max-width: 42vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
echo .ember-topbar .icon-btn {
echo   width: 34px; height: 34px; border-radius: 50%%;
echo   display: grid; place-items: center;
echo   border: 1px solid #3a2a24; background: #1a1210; color: #f3e6d8;
echo   text-decoration: none; cursor: pointer; padding: 0;
echo   transition: border-color .15s ease, color .15s ease, transform .1s ease;
echo }
echo .ember-topbar .icon-btn:hover { border-color: #e85d04; color: #ffb703; transform: translateY^(-1px^); }
echo .ember-topbar .icon-btn svg { display: block; }
)

:: ---------- CSS: themes.css ----------
> public\css\themes.css (
echo html[data-theme="ember"]  { --bg: #0c0908; --panel: #161010; --line: #3a2a24; --ember: #e85d04; }
echo html[data-theme="umbra"]  { --bg: #08060a; --panel: #100c14; --line: #2c2438; --ember: #9b5de5; }
echo html[data-theme="frost"]  { --bg: #070a0d; --panel: #0e141a; --line: #243440; --ember: #4cc9f0; }
echo html[data-theme="moss"]   { --bg: #080b08; --panel: #101410; --line: #233024; --ember: #86a85a; }
echo html[data-theme="wine"]   { --bg: #0d0708; --panel: #180d0f; --line: #3a1f22; --ember: #c4506a; }
echo html[data-theme="sand"]   { --bg: #0d0a06; --panel: #1a140c; --line: #3a2e1e; --ember: #d4a373; }
echo html[data-theme="ocean"]  { --bg: #050a0c; --panel: #0c161a; --line: #1f3540; --ember: #2ec4b6; }
echo html[data-theme="ash"]    { --bg: #0a0a0a; --panel: #141414; --line: #2e2e2e; --ember: #b8b8b8; }
)

:: ---------- CSS: start.css ----------
> public\css\start.css (
echo .start-body { min-height: 100vh; background: var^(--bg, #070605^); overflow: hidden; display: flex; flex-direction: column; }
echo .start { display: grid; grid-template-columns: minmax^(320px, 460px^) 1fr; flex: 1; min-height: 0; width: 100%%; }
echo .start-card {
echo   display: flex; flex-direction: column; align-items: stretch; justify-content: center;
echo   padding: 32px;
echo   background: linear-gradient^(180deg, var^(--panel, #161010^) 0%%, var^(--bg, #0c0908^) 100%%^);
echo   border-right: 1px solid var^(--line, #3a2a24^); overflow: auto;
echo }
echo .start-card .sigil { width: 22px; height: 22px; border-radius: 50%%; margin: 0 auto 14px; background: radial-gradient^(circle, #ffb703, var^(--ember, #e85d04^) 55%%, #6a040f^); box-shadow: 0 0 28px var^(--ember, #e85d04^); }
echo .start-title { font-family: var^(--serif, Georgia, serif^); font-size: 40px; font-weight: 500; text-align: center; margin: 0 0 6px; color: var^(--gold, #f4d6a0^); }
echo .start .tagline { text-align: center; color: var^(--mute, #9a8476^); letter-spacing: .22em; text-transform: uppercase; font-size: 11px; margin: 0 0 22px; }
echo .start-menu { display: grid; gap: 8px; }
echo .start-item {
echo   display: flex; justify-content: space-between; align-items: baseline; gap: 14px;
echo   padding: 12px 14px; background: rgba^(0,0,0,.25^); border: 1px solid var^(--line, #3a2a24^);
echo   color: inherit; text-align: left; cursor: pointer; text-decoration: none; font: inherit;
echo   transition: border-color .15s ease, transform .1s ease, background .15s ease;
echo }
echo .start-item:hover { border-color: var^(--ember, #e85d04^); transform: translateX^(2px^); background: rgba^(0,0,0,.4^); }
echo .start-item b { font-family: var^(--serif, Georgia, serif^); color: var^(--gold, #f4d6a0^); font-weight: 500; }
echo .start-item span { color: var^(--mute, #9a8476^); font-size: 12px; text-align: right; }
echo .start-item-danger { border-color: #4a1a14; }
echo .start-item-danger:hover { border-color: #9b2226; }
echo .start-item-danger b { color: #e5989b; }
echo .start-art { background: var^(--bg, #070605^) url^("/img/umbra-fire.jpg"^) center / cover no-repeat; min-height: 320px; position: relative; }
echo .start-art::after { content: ""; position: absolute; inset: 0; background: linear-gradient^(90deg, rgba^(12,9,8,.55^) 0%%, rgba^(12,9,8,0^) 28%%^); pointer-events: none; }
echo .desk-wrap {
echo   position: relative; flex: 1; min-height: 0; margin: 8px 24px 24px;
echo   border: 1px dashed rgba^(126,160,196,0.25^);
echo   background-image: linear-gradient^(to right, rgba^(126,160,196,0.06^) 1px, transparent 1px^), linear-gradient^(to bottom, rgba^(126,160,196,0.06^) 1px, transparent 1px^);
echo   background-size: var^(--grid, 24px^) var^(--grid, 24px^); overflow: hidden;
echo }
echo .desk-tile {
echo   position: absolute; display: flex; flex-direction: column; justify-content: center; gap: 4px;
echo   padding: 14px 16px; border: 1px solid var^(--line, #2c3a48^); background: var^(--panel, #16202a^);
echo   color: inherit; text-align: left; cursor: grab; user-select: none; font-size: inherit;
echo }
echo .desk-tile b { font-size: 1.05em; color: var^(--gold, #f4d6a0^); }
echo .desk-tile span { color: var^(--mute, #8aa0b5^); font-size: 0.85em; }
echo .start-tabs { display: flex; gap: 6px; padding: 8px 16px 0; border-bottom: 1px solid var^(--line, #3a2a24^); background: var^(--bg, #0c0908^); }
echo .start-tabs .btn { border-radius: 0; }
echo .start-tabs .btn.on { border-color: var^(--ember, #e85d04^); color: var^(--hope, #e9c46a^); background: rgba^(232,93,4,.12^); }
echo .desk-panel { position: fixed; inset: 0; background: rgba^(0,0,0,.72^); display: grid; place-items: center; z-index: 20; padding: 20px; }
echo .desk-panel.hidden { display: none; }
echo .desk-panel-card { width: min^(420px, 94vw^); max-height: 90vh; overflow: auto; background: var^(--panel, #141c24^); border: 1px solid var^(--line, #2c3a48^); padding: 18px; display: grid; gap: 10px; }
echo .desk-panel-card.wide { width: min^(720px, 94vw^); }
echo .desk-panel-card video { width: 100%%; max-height: 320px; background: #0b1016; }
echo @media ^(max-width: 900px^) { .start { grid-template-columns: 1fr; } .start-art { min-height: 200px; order: -1; } .start-card { border-right: none; border-bottom: 1px solid var^(--line, #3a2a24^); padding: 28px 20px; } }
)

:: ---------- CSS: ember.css - Menue-Hero ergaenzen ----------
>> public\css\ember.css (
echo.
echo /* === Ember Fix-All: grosses Menue-Hero === */
echo .menu-hero {
echo   display: grid;
echo   grid-template-columns: minmax^(420px, 560px^) 1fr;
echo   width: 100%%; height: 100%%; min-height: 0;
echo }
echo .menu-hero-card {
echo   display: flex; flex-direction: column; justify-content: center;
echo   padding: 40px 36px;
echo   background: linear-gradient^(180deg, var^(--panel, #1a1210^), var^(--bg, #100c0b^)^);
echo   border-right: 1px solid var^(--line); overflow: auto;
echo }
echo .menu-hero-card .sigil { width: 22px; height: 22px; margin: 0 auto 16px; }
echo .menu-hero-card h1 { text-align: center; font-size: 44px; margin: 0 0 6px; color: var^(--gold); }
echo .menu-hero-card .tagline { text-align: center; margin: 0 0 26px; font-size: 11px; }
echo .menu-list-lg button { padding: 16px 18px; font-size: 15px; }
echo .menu-list-lg button b { font-size: 17px; }
echo .menu-list-lg button span { font-size: 13px; }
echo .menu-hero-art {
echo   background: #070605 url^("/img/umbra-fire.jpg"^) center / cover no-repeat;
echo   min-height: 240px; position: relative;
echo }
echo .menu-hero-art::after {
echo   content: ""; position: absolute; inset: 0;
echo   background: linear-gradient^(90deg, rgba^(12,9,8,.55^) 0%%, rgba^(12,9,8,0^) 30%%^);
echo   pointer-events: none;
echo }
echo @media ^(max-width: 900px^) {
echo   .menu-hero { grid-template-columns: 1fr; }
echo   .menu-hero-art { min-height: 180px; order: -1; }
echo   .menu-hero-card { border-right: none; border-bottom: 1px solid var^(--line); padding: 28px 20px; }
echo }
)

:: ---------- JS: settings-panel.js ----------
> public\js\settings-panel.js (
echo ^(function ^(^) {
echo   const KEY = "ember.settings.v1";
echo   const THEMES = [
echo     { id: "ember", label: "Ember",  bg: "#0c0908", panel: "#161010", line: "#3a2a24", accent: "#e85d04" },
echo     { id: "umbra", label: "Umbra",  bg: "#08060a", panel: "#100c14", line: "#2c2438", accent: "#9b5de5" },
echo     { id: "frost", label: "Frost",  bg: "#070a0d", panel: "#0e141a", line: "#243440", accent: "#4cc9f0" },
echo     { id: "moss",  label: "Moss",   bg: "#080b08", panel: "#101410", line: "#233024", accent: "#86a85a" },
echo     { id: "wine",  label: "Wein",   bg: "#0d0708", panel: "#180d0f", line: "#3a1f22", accent: "#c4506a" },
echo     { id: "sand",  label: "Sand",   bg: "#0d0a06", panel: "#1a140c", line: "#3a2e1e", accent: "#d4a373" },
echo     { id: "ocean", label: "Ozean",  bg: "#050a0c", panel: "#0c161a", line: "#1f3540", accent: "#2ec4b6" },
echo     { id: "ash",   label: "Asche",  bg: "#0a0a0a", panel: "#141414", line: "#2e2e2e", accent: "#b8b8b8" },
echo   ];
echo   const DEFAULTS = { fontScale: 100, fontFamily: "auto", lineHeight: 145, maxWidth: 1100, letterSpacing: 0, density