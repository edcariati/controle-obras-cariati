# Design system "Vidro Luminoso"

Camada visual do Controle de Obras Cariati. Só aparência e navegação: nenhuma regra de negócio, dado ou integração foi alterada.

## Direção visual
Painéis de vidro sobre ambiente escuro (#0B0D14) com luz de entardecer. Quanto mais importante o elemento, mais ele brilha:
laranja (#FF9F1C→#FF6B35) = ação e destaque; violeta (#8B5CF6→#C084FC) = progresso e metas; ciano (#22D3EE) = dados e links.
Escuro é o padrão; o claro usa vidro claro com os mesmos acentos (alternar pelo ◐ ou na busca).

## Tokens (src/tema.css, seção 1)
- Superfícies: --bg, --surface (#12151F), --surface2 (#1A1E2C); texto --ink/--ink2/--ink3 (#F5F7FA / #A4ADBF / #8590A6).
- Acentos: --pri, --pri2, --vio, --vio2, --mag, --cy. Estados: --ok #34D399, --amber #FBBF24, --crit #F87171 (sempre com texto ou ícone).
- Vidro: --glass, --glass2, --blur (12–24px), bordas em degradê 1px laranja→violeta, --glow-pri/--glow-vio.
- Espaço em escala de 4px, raios 12–28px, durações 150/220/300ms (--t, --t-lento), easing --ease.
- Fontes: Plus Jakarta Sans (títulos), Inter (texto), Space Grotesk (números, com algarismos tabulares).

## Componentes
Botão (primário/vidro/fantasma/perigoso), chip, KPI, card de vidro, medidor circular luminoso (`gaugeHtml`), orbes (`orbHtml`),
sparkline (`sparkHtml`), faixa de destaque (`heroHtml`), tabela (vira cartões no celular), formulário com rótulo e erro, modal
(vira bottom sheet no celular), toast, skeleton, estado vazio, quadro Kanban, régua de etapas, busca global (Ctrl/Cmd+K ou "/"),
breadcrumbs, favoritas (estrela na obra → aparecem no menu lateral), menu lateral recolhível (desktop) e barra inferior com "Mais" (celular).

## Acessibilidade e desempenho
Foco visível, alvos ≥44px, contraste AA, `prefers-reduced-motion` (sem animação nem contagem), `prefers-reduced-transparency` e
aparelhos fracos (classe `fx-leve`) trocam vidro por superfície sólida; áreas seguras (safe-area) no celular; impressão sem efeitos.
