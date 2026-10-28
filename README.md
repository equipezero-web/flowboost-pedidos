# FlowBoost — Sistema de Pedidos

Sistema web para registrar pedidos de pacotes de seguidores, com frontend responsivo, envio do resumo para WhatsApp e persistência real no Supabase.

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

## Arquitetura

- `public/index.html`: interface do cliente.
- `supabase/functions/flowboost-order/index.ts`: Edge Function pública para receber e validar pedidos.
- `supabase/schema.sql`: estrutura da tabela `flowboost_orders`.
- Supabase Postgres: guarda código, perfil, pacote, valor, status e datas.

## Segurança

- O frontend nunca envia nem conhece chaves secretas do Supabase.
- O valor é recalculado e validado na Edge Function.
- A tabela usa RLS e `anon`/`authenticated` não têm acesso direto.
- A função aceita somente os 7 pacotes oficiais.
- Links fornecidos são validados para `instagram.com`.
- Pedidos duplicados iguais em menos de 30 segundos são bloqueados.
- Códigos usam 12 caracteres hexadecimais aleatórios.

## Supabase usado

Projeto: `fqisewatypluagngmgka`

Edge Function:

`https://fqisewatypluagngmgka.supabase.co/functions/v1/flowboost-order`

Tabela:

`public.flowboost_orders`

## E-mail

A Edge Function encaminha os dados do pedido para `deividdanilo15@gmail.com` usando FormSubmit e registra o resultado em `email_status`. Na primeira utilização do FormSubmit, o endereço de destino pode precisar confirmar a ativação do serviço.

## Publicação do frontend

O diretório `public/` pode ser publicado diretamente no GitHub Pages, Cloudflare Pages ou outro host estático. O backend permanece no Supabase.

Use o sistema apenas para perfis próprios ou autorizados e de forma compatível com as regras da plataforma utilizada.
