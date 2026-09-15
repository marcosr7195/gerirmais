# Comprovante de Entrega em PDF (Entregáveis)

Gerar um documento imprimível com tudo que foi feito e entregue em uma ordem de serviço.

## O que muda na tela

- Em cada OS (na aba principal e na de concluídas/arquivadas) aparece o botão **Imprimir entrega**.
- Dentro do resumo da OS concluída também fica esse botão.
- Ao clicar, o PDF é gerado na hora e baixado, com nome como `entrega-nome-da-os.pdf`. Dá para imprimir direto pelo leitor de PDF.

## O que sai no documento

- Cabeçalho com sua logo, nome do negócio, CNPJ/CPF, e-mail, WhatsApp e endereço (puxados do perfil, igual à proposta comercial).
- Dados do cliente: nome, empresa, telefone.
- Dados da entrega: título da OS, data de criação, prazo, data de conclusão, status e valor do negócio vinculado.
- Tabela do que foi executado: cada item do checklist com prazo próprio, data de conclusão e situação (concluído/pendente).
- Observações da OS, quando houver.
- Rodapé com contato do negócio e espaço para assinatura do cliente ("Recebi e conferi os serviços descritos acima"), com data.

## Detalhes técnicos

- Usar `jspdf` + `jspdf-autotable`, já instalados e usados em `ProposalGenerator.tsx` — mesma identidade visual (cores do tema, logo no topo).
- Novo componente `src/components/operations/DeliveryReceipt.tsx` exportando uma função `generateDeliveryPdf(order, profile)`; sem tabelas novas nem migrações.
- Dados: `service_orders` + `checklist_items` + `clients` + `deals` já carregados em `Entregas.tsx`; perfil vem do `AuthContext`.
- Botão adicionado em `Entregas.tsx` (lista ativa e arquivo) e em `ArchivedOrderDetailsDialog.tsx`.
