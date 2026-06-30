import { Link } from "react-router-dom";
import logoCompleta from "@/assets/logo-completa.png";

export default function Termos() {
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
        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: 30 de junho de 2026
        </p>

        <article className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground">
              Ao criar uma conta ou utilizar o Gerir+ (“Plataforma”), você declara que leu, entendeu e
              concorda integralmente com estes Termos de Uso e com a nossa Política de Privacidade.
              Caso não concorde com qualquer condição, você não deve utilizar a Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground">
              O Gerir+ é uma plataforma SaaS de gestão para pequenos empresários, oferecendo módulos
              de finanças, vendas (pipeline/CRM), entregas/ordens de serviço, vitrine de produtos e
              serviços, marketing e configurações. O serviço é fornecido pela internet, no modelo de
              assinatura, sujeito a atualizações e melhorias contínuas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Cadastro e Responsabilidades do Usuário</h2>
            <p className="text-muted-foreground">
              O usuário se compromete a fornecer informações verdadeiras, completas e atualizadas no
              momento do cadastro. É responsabilidade exclusiva do usuário manter a confidencialidade
              de suas credenciais de acesso e por todas as atividades realizadas em sua conta. É
              vedado o uso da Plataforma para fins ilícitos, fraudulentos ou que violem direitos de
              terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Planos e Pagamento Recorrente</h2>
            <p className="text-muted-foreground">
              A Plataforma é oferecida em planos pagos, comercializados em assinatura recorrente
              (mensal ou anual) processada pela plataforma <strong>Kiwify</strong>. Ao contratar um
              plano, o usuário autoriza cobranças automáticas no método de pagamento informado,
              conforme a periodicidade contratada, até o cancelamento da assinatura.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Cancelamento e Reembolso</h2>
            <p className="text-muted-foreground">
              O usuário pode cancelar a assinatura a qualquer momento. Conforme o Código de Defesa do
              Consumidor (art. 49), nas contratações realizadas pela internet é assegurado o direito
              de arrependimento em até 7 (sete) dias corridos a contar da data da contratação, com
              reembolso integral. Após esse prazo, não haverá reembolso proporcional do período já
              contratado, mas o acesso permanecerá ativo até o fim do ciclo pago.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Propriedade Intelectual</h2>
            <p className="text-muted-foreground">
              Todo o conteúdo, marca, layout, código-fonte, design e funcionalidades do Gerir+ são de
              titularidade exclusiva da empresa, protegidos pela legislação brasileira de propriedade
              intelectual. O usuário recebe apenas uma licença pessoal, não exclusiva, intransferível
              e revogável para uso da Plataforma. Os dados inseridos pelo usuário permanecem de sua
              propriedade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground">
              O Gerir+ envida esforços para manter a Plataforma disponível e segura, mas não garante
              ausência total de falhas, interrupções ou erros. Na máxima extensão permitida em lei,
              não nos responsabilizamos por danos indiretos, lucros cessantes, perda de dados ou
              prejuízos decorrentes do uso ou indisponibilidade da Plataforma, nem por decisões
              comerciais tomadas pelo usuário com base nas informações apresentadas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Alterações nos Termos</h2>
            <p className="text-muted-foreground">
              Estes Termos podem ser atualizados a qualquer momento para refletir mudanças legais,
              técnicas ou de negócio. A versão vigente estará sempre disponível nesta página, com a
              respectiva data de atualização. O uso continuado da Plataforma após alterações
              caracteriza concordância com a nova versão.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Foro e Legislação Aplicável</h2>
            <p className="text-muted-foreground">
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o
              foro da comarca do domicílio do usuário consumidor para dirimir quaisquer controvérsias
              decorrentes deste instrumento, com renúncia expressa a qualquer outro, por mais
              privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">10. Contato</h2>
            <p className="text-muted-foreground">
              Dúvidas sobre estes Termos podem ser enviadas para{" "}
              <a href="mailto:contato@gerirmais.com.br" className="text-primary hover:underline">
                contato@gerirmais.com.br
              </a>
              .
            </p>
          </section>
        </article>

        <div className="mt-10 text-sm">
          <Link to="/privacidade" className="text-primary hover:underline">
            Ver Política de Privacidade →
          </Link>
        </div>
      </main>
    </div>
  );
}
