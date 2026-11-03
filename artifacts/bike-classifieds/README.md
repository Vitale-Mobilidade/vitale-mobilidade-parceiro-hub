# Evidência local — dados sintéticos

Capturas de Playwright contra Vite + mock HTTP local, sem serviços externos.
As quatro bikes e as fotos com a marcação “Foto de teste” não são anúncios reais.
A conta piloto da captura é fictícia (`example.invalid`).

- hub-desktop/mobile: até três destaques e listagem completa.
- editor-desktop/mobile: formulário, cinco fotos, capa e publicação condicionada.
- listing-desktop: galeria e contato consentido (número sintético).
- profile-desktop: foto, nome e menu após o Quiz.

Comando: `PLAYWRIGHT_MODULE=/caminho/playwright/index.mjs node tests/bike-classifieds-ui.mjs`.
Usa somente `127.0.0.1:4318` (Vite com envs fake) e `127.0.0.1:54321` (mock descartável).
