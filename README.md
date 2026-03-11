# Open City Driver

Projeto de jogo 3D de carro em mundo aberto para navegador, feito com **TypeScript + Vite + Three.js + cannon-es**.

## Como rodar

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```

## Controles

- **W / ↑** acelera
- **S / ↓** freia / ré
- **A / ←** vira à esquerda
- **D / →** vira à direita
- **Espaço** freio de mão
- **C** alterna câmera
- **R** reposiciona o carro
- **F3** debug

## Estrutura

- `src/core`: renderer, câmera, ambiente, assets, áudio
- `src/game`: bootstrap e loop principal
- `src/physics`: mundo físico, colisão, veículo
- `src/entities`: carro do jogador e trânsito
- `src/world`: cidade procedural e malha viária
- `src/ui`: HUD e menu
- `src/utils`: config, matemática, input

## Assets

O projeto já funciona sem modelos externos, usando **fallback procedural**. Para trocar o carro ou props futuramente, coloque arquivos `.glb` em `public/models/` e ajuste o `AssetManager`/entidades.
