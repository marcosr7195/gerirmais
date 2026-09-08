# GerirMais

Crie um mini ERP SaaS em português para pequenos negócios brasileiros (prestadores



de serviços, profissionais liberais, MEI). O sistema deve ter:

 

AUTENTICAÇÃO:

- Login e cadastro com email/senha via Supabase Auth

- Tela de onboarding: nome do negócio, tipo de serviço, CNPJ/CPF opcional

 

DASHBOARD PRINCIPAL:

- Saudação com nome do usuário

- Cards resumo: Saldo do mês, Orçamentos pendentes, Entregas hoje, Leads novos

- Alerta de contas a vencer nos próximos 3 dias

- Gráfico de receita x despesa dos últimos 6 meses

 

MÓDULO FINANÇAS:

- Lançamento de receitas e despesas com categoria e data

- Fluxo de caixa mensal em gráfico de barras

- Contas a pagar e receber com status

- Saldo atual em destaque

 

MÓDULO VENDAS:

- Pipeline Kanban: Lead / Negociando / Fechado / Perdido

- Cadastro de clientes com telefone, email e origem

- Geração de orçamento simples com itens e total

- Ao fechar venda, criar OS automaticamente no módulo Entrega

 

MÓDULO ENTREGA:

- Lista de Ordens de Serviço vinculadas ao cliente

- Checklist de entrega por OS

- Status visual: Em andamento / Concluído / Atrasado

- Ao concluir OS, lançar receita automaticamente nas Finanças

 

DESIGN:

- Interface limpa e moderna, 100% em português

- Totalmente responsivo para mobile

- Menu lateral com ícones para cada módulo

- Cores: azul (#4A90D9) como cor principal

 

BANCO DE DADOS: Use Supabase com tabelas para users, clients, deals,

service_orders, transactions e checklists.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gerirmais.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3d4d1234-de82-4358-adfe-069aff5e5f87).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
