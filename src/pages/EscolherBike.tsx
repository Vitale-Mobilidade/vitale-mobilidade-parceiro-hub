
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, Clock, AlertTriangle, MessageCircle, Zap, Shield, Target, ChevronRight } from 'lucide-react';

const WHATSAPP_URL = "https://wa.me/5511986893890?text=Oi,%20vim%20do%20site%20e%20quero%20ajuda%20para%20escolher%20minha%20bike%20elétrica";

const CTAButton = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={`block ${className}`}>
    <Button size="lg" className={`w-full sm:w-auto text-base sm:text-lg font-bold px-8 sm:px-12 py-6 sm:py-7 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-primary text-primary-foreground ${className}`}>
      <MessageCircle className="mr-2 h-5 w-5" />
      {children}
    </Button>
  </a>
);

const EscolherBike = () => {
  const deliverables = [
    "O modelo ideal para o seu uso",
    "Faixa de preço justa (pra não pagar caro)",
    "Onde comprar com segurança",
    "O que evitar (erros comuns)",
    "Clareza total pra tomar decisão",
  ];

  const painPoints = [
    "Está pensando em comprar uma bike elétrica, mas não sabe qual escolher",
    "Quer evitar erro e não jogar dinheiro fora",
    "Está em dúvida entre modelos, marcas ou tipos",
    "Quer usar para trabalho (delivery) ou mobilidade no dia a dia",
    "Quer tomar uma decisão segura antes de comprar",
  ];

  const considerations = [
    { icon: Target, text: "Tipo de uso (trabalho, lazer, deslocamento)" },
    { icon: Zap, text: "Autonomia real da bateria" },
    { icon: Shield, text: "Qualidade dos componentes" },
    { icon: Clock, text: "Custo de manutenção" },
    { icon: Check, text: "Suporte e reposição" },
  ];

  const steps = [
    "Você clica no botão abaixo",
    "Fala direto comigo no WhatsApp",
    "Eu entendo seu perfil",
    "Te entrego a recomendação certa",
  ];

  const faqs = [
    { q: "Preciso já estar decidido a comprar?", a: "Não. A consultoria é justamente pra te ajudar a decidir com segurança." },
    { q: "Você vende a bike também?", a: "Posso te direcionar para os melhores caminhos ou fornecedores confiáveis." },
    { q: "Isso serve pra qualquer tipo de uso?", a: "Sim — trabalho, lazer ou mobilidade diária." },
    { q: "Quanto tempo demora?", a: "É rápido e direto. O suficiente pra você sair com clareza total." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="relative max-w-3xl mx-auto px-6 py-16 sm:py-24 text-center">
          <p className="text-muted-foreground text-base sm:text-lg mb-6 italic">
            "Se você está pensando em comprar uma bike elétrica, deixa eu te poupar um erro que eu vejo todo dia..."
          </p>
          <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <AlertTriangle className="h-4 w-4" />
            VAI COMPRAR UMA BIKE ELÉTRICA?
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-6 text-foreground">
            NÃO COMETA ESSE ERRO
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            A maioria das pessoas escolhe o modelo errado — e só percebe depois de gastar dinheiro.
          </p>
          <p className="text-lg sm:text-xl text-foreground font-medium mb-10 max-w-2xl mx-auto">
            Eu te ajudo a escolher a elétrica certa pro seu perfil, uso e orçamento, evitando dor de cabeça e prejuízo.
          </p>
          <CTAButton>QUERO ESCOLHER MINHA ELÉTRICA</CTAButton>
        </div>
      </section>

      {/* Identification / Pain Points */}
      <section className="bg-muted/50 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            💡 PRA QUEM É ISSO?
          </h2>
          <p className="text-center text-muted-foreground mb-8 text-lg">
            Essa consultoria é pra você que:
          </p>
          <div className="space-y-4 max-w-xl mx-auto">
            {painPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-3 bg-card p-4 rounded-xl shadow-sm border border-border">
                <ChevronRight className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground">{point}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-foreground font-semibold mt-8 text-lg">
            Se você se encaixa em algum desses pontos, isso é pra você.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6">
            ⚠️ A VERDADE QUE NINGUÉM TE CONTA
          </h2>
          <p className="text-center text-muted-foreground text-lg mb-10">
            Escolher uma elétrica não é só ver preço ou aparência. Você precisa considerar:
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            {considerations.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                <item.icon className="h-5 w-5 text-primary shrink-0" />
                <span className="text-foreground text-sm sm:text-base">{item.text}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-destructive font-semibold mt-8 text-lg">
            A maioria das pessoas ignora isso — e paga caro depois.
          </p>
        </div>
      </section>

      {/* Authority */}
      <section className="bg-muted/50 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">
            👊 COMO EU POSSO TE AJUDAR
          </h2>
          <p className="text-muted-foreground text-lg mb-4">
            Eu trabalho há mais de 10 anos com veículos elétricos e já vendi milhões nesse mercado.
          </p>
          <p className="text-foreground text-lg mb-10">
            Na prática, eu analiso seu perfil e te entrego uma recomendação direta, sem enrolação.
          </p>
          <h3 className="text-xl font-semibold mb-6">Você vai sair com:</h3>
          <div className="space-y-3 max-w-md mx-auto text-left">
            {deliverables.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Price */}
      <section className="py-16 sm:py-20">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">💰 INVESTIMENTO</h2>
          <div className="bg-card border-2 border-primary/20 rounded-2xl p-8 sm:p-10 shadow-lg">
            <p className="text-muted-foreground mb-2">Consultoria personalizada</p>
            <p className="text-4xl sm:text-5xl font-extrabold text-primary mb-4">R$197</p>
            <p className="text-muted-foreground text-sm sm:text-base">
              Um valor que pode te economizar milhares de reais evitando uma escolha errada.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/50 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-10">🚀 COMO FUNCIONA</h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 bg-card p-4 rounded-xl shadow-sm border border-border">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-foreground text-sm sm:text-base text-left">{step}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-lg mb-8">Simples, direto e prático.</p>
          <CTAButton>QUERO ESCOLHER MINHA ELÉTRICA AGORA</CTAButton>
        </div>
      </section>

      {/* Urgency */}
      <section className="py-16 sm:py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">⏳ ATENDIMENTO LIMITADO</h2>
          <p className="text-muted-foreground text-lg mb-4">
            Eu atendo um número limitado de pessoas por semana pra garantir qualidade.
          </p>
          <p className="text-foreground font-semibold text-lg mb-8">
            Se fizer sentido pra você, recomendo garantir sua vaga agora.
          </p>
          <CTAButton>GARANTIR MINHA VAGA</CTAButton>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/50 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">❓ PERGUNTAS FREQUENTES</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-4 overflow-hidden">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Transparency */}
      <section className="py-12 sm:py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="bg-muted/50 border border-border rounded-xl p-6 sm:p-8">
            <h3 className="font-bold text-lg mb-3">⚠️ IMPORTANTE</h3>
            <p className="text-muted-foreground text-sm sm:text-base">
              Algumas recomendações podem incluir links de parceiros que me geram comissão, sem custo adicional pra você.
              Meu compromisso é sempre indicar o que faz mais sentido pro seu perfil.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary/5 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Pronto pra fazer a escolha certa?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Fale comigo agora e evite um erro que pode custar caro.
          </p>
          <CTAButton>QUERO ESCOLHER MINHA ELÉTRICA</CTAButton>
        </div>
      </section>
    </div>
  );
};

export default EscolherBike;
