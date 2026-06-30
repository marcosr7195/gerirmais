import { Link } from "react-router-dom";
import logoCompleta from "@/assets/logo-completa.png";

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/inicio">
            <img src={logoCompleta} alt="Gerir+" className="h-10 w-auto object-contain" />
          </Link>
          <Link to="/inicio" className="text-sm text-primary hover:underline">
            Voltar
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: 30 de junho de 2026
        </p>

        <article className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <p className="text-muted-foreground">
              Esta Política descreve como o Gerir+ coleta, utiliza, compartilha e protege os dados
              pessoais dos seus usuários, em conformidade com a Lei Geral de Proteção de Dados
              Pessoais (Lei nº 13.709/2018 – LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">1. Dados Coletados</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                <strong>Dados de cadastro:</strong> nome, e-mail, telefone, nome da empresa e demais
                informações fornecidas no onboarding.
              </li>
              <li>
                <strong>Dados financeiros:</strong> lançamentos de receitas, despesas, categorias e
                informações de assinatura processadas pela Kiwify (não armazenamos dados completos
                de cartão de crédito).
              </li>
              <li>
                <strong>Dados de clientes do usuário:</strong> nome, telefone, e-mail, empresa e
                histórico de negócios/serviços cadastrados pelo próprio usuário em sua conta.
              </li>
              <li>
                <strong>Dados de uso:</strong> logs de acesso, endereço IP e informações de
                navegação para fins de segurança e melhoria do serviço.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Finalidade do Uso dos Dados</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Fornecer e operar as funcionalidades da Plataforma;</li>
              <li>Processar pagamentos e gerenciar assinaturas;</li>
              <li>Prestar suporte, comunicar atualizações e enviar avisos transacionais;</li>
              <li>Cumprir obrigações legais e regulatórias;</li>
              <li>Melhorar a Plataforma, prevenir fraudes e garantir segurança.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Base Legal (LGPD)</h2>
            <p className="text-muted-foreground">
              O tratamento dos dados é fundamentado nas seguintes bases legais, conforme art. 7º da
              LGPD: <strong>execução de contrato</strong> (para entregar o serviço contratado),{" "}
              <strong>cumprimento de obrigação legal/regulatória</strong>,{" "}
              <strong>legítimo interesse</strong> (para segurança e prevenção a fraudes) e{" "}
              <strong>consentimento</strong> do titular, quando aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Compartilhamento com Terceiros</h2>
            <p className="text-muted-foreground">
              O Gerir+ não vende dados pessoais. Compartilhamos dados estritamente necessários com
              parceiros operacionais:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                <strong>Kiwify</strong> – processamento de pagamentos e gestão da assinatura
                recorrente.
              </li>
              <li>
                <strong>Supabase</strong> – infraestrutura de banco de dados, autenticação e
                hospedagem dos dados da Plataforma.
              </li>
              <li>Autoridades públicas, mediante ordem judicial ou obrigação legal.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Direitos do Titular dos Dados</h2>
            <p className="text-muted-foreground">
              Conforme a LGPD, você pode, a qualquer momento, solicitar:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Confirmação da existência e acesso aos seus dados;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
              <li>Portabilidade dos dados;</li>
              <li>Eliminação dos dados tratados com base no consentimento;</li>
              <li>Revogação do consentimento.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              As solicitações podem ser feitas pelo e-mail{" "}
              <a href="mailto:contato@gerirmais.com.br" className="text-primary hover:underline">
                contato@gerirmais.com.br
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Prazo de Retenção</h2>
            <p className="text-muted-foreground">
              Os dados são mantidos enquanto a conta estiver ativa e pelo prazo necessário para
              cumprir as finalidades descritas, atender obrigações legais (como guarda fiscal de até
              5 anos) e exercício regular de direitos em processos judiciais. Após esses prazos, os
              dados são eliminados ou anonimizados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Segurança da Informação</h2>
            <p className="text-muted-foreground">
              Adotamos medidas técnicas e administrativas apropriadas para proteger os dados
              pessoais: criptografia em trânsito (HTTPS/TLS), controles de acesso baseados em
              função, políticas de Row Level Security no banco de dados, autenticação segura e
              monitoramento contínuo da infraestrutura.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Canal de Contato</h2>
            <p className="text-muted-foreground">
              Para dúvidas, reclamações ou exercício de direitos relacionados aos seus dados
              pessoais, entre em contato com nosso encarregado pelo e-mail:{" "}
              <a href="mailto:contato@gerirmais.com.br" className="text-primary hover:underline">
                contato@gerirmais.com.br
              </a>
              .
            </p>
          </section>
        </article>

        <div className="mt-10 text-sm">
          <Link to="/termos" className="text-primary hover:underline">
            Ver Termos de Uso →
          </Link>
        </div>
      </main>
    </div>
  );
}
