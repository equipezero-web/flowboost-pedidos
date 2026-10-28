# FlowBoost — Sistema de Pedidos

Sistema web responsivo para registrar pedidos de pacotes de seguidores, gerar código de acompanhamento, preparar o resumo para WhatsApp e armazenar os pedidos no Supabase.

## Pacotes

| Quantidade | Valor |
|---:|---:|
| 100 | R$ 4,00 |
| 250 | R$ 7,00 |
| 500 | R$ 12,00 |
| 1.000 | R$ 19,90 |
| 2.500 | R$ 44,90 |
| 5.000 | R$ 74,90 |
| 10.000 | R$ 129,90 |

WhatsApp de destino: `+55 81 9302-8646`  
E-mail de destino: `deividdanilo15@gmail.com`

## Estrutura

```text
flowboost-pedidos/
├── index.html
├── assets/
│   ├── styles.css
│   └── app.js
├── supabase/
│   ├── config.toml
│   ├── schema.sql
│   └── functions/
│       └── flowboost-order/
│           └── index.ts
├── .gitignore
└── README.md
```

## Arquitetura

- `index.html`: interface principal pronta para hospedagem estática.
- `assets/styles.css`: layout tecnológico azul, responsividade, cards e animações.
- `assets/app.js`: seleção de pacotes, validação, WhatsApp, histórico local e integração com o backend.
- `supabase/functions/flowboost-order/index.ts`: Edge Function que recebe, valida e grava pedidos.
- `supabase/schema.sql`: definição da tabela `public.flowboost_orders`.
- Supabase Postgres: persistência real de códigos, perfis, pacotes, valores, status e datas.

## Segurança

- Nenhuma chave secreta do Supabase fica no frontend.
- O preço é recalculado no servidor; o navegador não decide o valor gravado.
- A tabela `flowboost_orders` usa RLS e não possui acesso direto para `anon` ou `authenticated`.
- A Edge Function aceita somente os 7 pacotes oficiais.
- Links enviados são validados para `instagram.com`.
- Pedidos iguais repetidos em menos de 30 segundos são bloqueados.
- Os códigos usam 12 caracteres hexadecimais aleatórios após o prefixo `FB-`.
- A solicitação só aparece como gerada no frontend depois da confirmação do backend.

## Supabase

Projeto conectado: `fqisewatypluagngmgka`

Edge Function ativa:

`https://fqisewatypluagngmgka.supabase.co/functions/v1/flowboost-order`

Tabela:

`public.flowboost_orders`

A configuração em `supabase/config.toml` mantém a função pública (`verify_jwt = false`) para que o formulário possa ser usado sem login. A própria função faz a validação dos dados e usa credenciais do ambiente do Supabase apenas no servidor.

## WhatsApp e e-mail

Depois que o Supabase confirma o pedido, o frontend libera o envio do resumo para o WhatsApp `+55 81 9302-8646`.

A Edge Function também tenta encaminhar uma cópia do pedido para `deividdanilo15@gmail.com` via FormSubmit e registra o resultado em `email_status`. Na primeira utilização, o endereço de destino pode precisar confirmar a ativação do serviço.

## Hospedagem

Como o `index.html` está na raiz, o frontend pode ser publicado por GitHub Pages ou outro host estático sem processo de build. O backend continua hospedado no Supabase.

Use o sistema apenas para perfis próprios ou autorizados e de forma compatível com as regras da plataforma utilizada.
