# Figma Export Plugin – HL001

## 1. Overview
- **Purpose**: keep web/AppScript UI in sync with the latest Figma screens by exporting layout JSON + PNG bundles that Codex can consume.
- **Scope**: `docs/figma-plugin/export-codex-layout/*` (manifest ID `1564290291107280052`).
- **Supported editors**: Figma only (`editorType: ["figma"]`).

## 2. Why the plugin is necessary
1. Designers iterate purely in Figma; engineers need pixel-accurate assets without manually slicing.
2. App UI (login/home/quiz) mixes static imagery and dynamic data, so layout metadata (`x/y/width/height`) must travel with each asset.
3. GAS deploy latency requires us to package everything locally (`images/<screen>.ui-assets`) and push via `codex ui-assets sync ./exports/<layout>.zip`.

## 3. Feature summary
| Feature | Details |
| --- | --- |
| Asset export | For every visible node the plugin assigns `section/area/assetName` IDs (`global_<screen>_*`) and exports PNGs via `node.exportAsync`. |
| Frame preview | Adds `<layout>.preview.png` so reviewers can confirm the entire screen without opening Figma. |
| CSS template detection | Layers whose **name** or **description** contains `css-template` (or descriptions mentioning “CSS/HTML”) are flagged as `metadata.cssTemplate = true` and PNG generation is skipped. Coordinates + `designNote` still reach Codex so the area can be reconstructed with HTML/CSS. |
| Design notes | The Figma layer `description` is copied into `metadata.designNote`, letting designers specify button specs / interactions directly in the layout JSON. |
| Bundle compression | JSZip now outputs DEFLATE-compressed `.ui-assets.zip` bundles, keeping JSON/text payloads light. |

## 4. Usage flow
1. In Figma select a frame (e.g., `screen_login`) and run **Codex Layout Exporter**.
2. Verify assets & preview in the plugin UI, copy the `codex ui-assets sync ./exports/<layout>.zip` command if needed.
3. Save the generated ZIP+JSON under `images/<layout>.ui-assets/`.
4. Commit assets + layout JSON alongside the consuming HTML/Apps Script.
5. Codex CLI / GAS uses `getUiBase()` to serve the same assets to production.

## 5. Deployment
1. Update plugin code/UI → `npx spec-driven-codex init` (if schema changed) → `tsc` or manual build.
2. Zip contents of `docs/figma-plugin/export-codex-layout` and upload to Figma (or use `figplug` CLI) with manifest ID `1564290291107280052`.
3. Designers re-run the plugin from the “Development” tab; no extra configuration needed.

## 6. Future extensions
- **Selectable export formats**: allow per-layer JPG/WebP for photographic assets.
- **Comment harvesting**: parse Figma comments and append to `designNote` so reviewers see all instructions in code.
- **Auto CSS snippets**: when `cssTemplate` is true, output a suggested CSS block (border radius, gradient, etc.) derived from the Figma node.
- **Asset diffing**: embed hash metadata to detect when a PNG truly changed before syncing to storage.
