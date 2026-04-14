
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, Clock, AlertTriangle, MessageCircle, Zap, Shield, Target, ChevronRight, ArrowRight, Battery, Route, DollarSign, Bike } from 'lucide-react';

const WHATSAPP_QUIZ_URL = "https://wa.me/5511986893890?text=Fala%20Lucas%2C%20vim%20do%20quiz%20e%20quero%20ajuda%20pra%20escolher%20minha%20bike%20el%C3%A9trica%20ideal.";
const WHATSAPP_URL = "https://wa.me/5511986893890?text=Oi,%20vim%20do%20site%20e%20quero%20ajuda%20para%20escolher%20minha%20bike%20elétrica";

const CTAButton = ({ children, className = "", href = WHATSAPP_URL }: { children: React.ReactNode; className?: string; href?: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-block ${className}`}>
    <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg font-bold px-8 sm:px-12 py-6 sm:py-7 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-primary text-primary-foreground">
      <MessageCircle className="mr-2 h-5 w-5" />
      {children}
    </Button>
  </a>
);

type QuizAnswers = {
  uso: string;
  distancia: string;
  trajeto: string;
  orcamento: string;
  experiencia: string;
  ajuda: string;
};

const questions = [
  {
    id: 'uso' as const,
    emoji: '🚴',
    title: 'Qual será o principal uso da sua bike elétrica?',
    options: [
      { label: 'Trabalho (delivery / renda)', icon: Target },
      { label: 'Locomoção diária (casa → trabalho)', icon: Route },
      { label: 'Lazer / passeio', icon: Bike },
    ],
  },
  {
    id: 'distancia' as const,
    emoji: '📏',
    title: 'Quantos km você roda por dia?',
    options: [
      { label: 'Até 10 km', icon: Battery },
      { label: '10 a 25 km', icon: Battery },
      { label: 'Mais de 25 km', icon: Battery },
    ],
  },
  {
    id: 'trajeto' as const,
    emoji: '🛤️',
    title: 'Como é o trajeto?',
    options: [
      { label: 'Plano', icon: Route },
      { label: 'Misto (subidas leves)', icon: Route },
      { label: 'Muitas subidas', icon: Route },
    ],
  },
  {
    id: 'orcamento' as const,
    emoji: '💰',
    title: 'Qual seu orçamento?',
    options: [
      { label: 'Até R$5.000', icon: DollarSign },
      { label: 'R$5.000 a R$8.000', icon: DollarSign },
      { label: 'R$8.000+', icon: DollarSign },
    ],
  },
  {
    id: 'experiencia' as const,
    emoji: '🔧',
    title: 'Você já teve uma bike elétrica antes?',
    options: [
      { label: 'Sim', icon: Check },
      { label: 'Não', icon: Zap },
    ],
  },
  {
    id: 'ajuda' as const,
    emoji: '🤝',
    title: 'Quer ajuda personalizada pra escolher o modelo ideal?',
    options: [
      { label: 'Sim, quero recomendação no WhatsApp', icon: MessageCircle },
      { label: 'Prefiro ver opções sozinho', icon: Shield },
    ],
  },
];

const EscolherBike = () => {
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [quizFinished, setQuizFinished] = useState(false);

  const handleAnswer = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      setTimeout(() => setQuizFinished(true), 300);
    }
  };

  const wantsWhatsApp = answers.ajuda === 'Sim, quero recomendação no WhatsApp';

  const errors = [
    { icon: AlertTriangle, text: 'Escolhe modelo fraco para o próprio uso' },
    { icon: Battery, text: 'Compra bateria ruim que dura menos de 1 ano' },
    { icon: DollarSign, text: 'Paga caro em algo que não atende o dia a dia' },
    { icon: Zap, text: 'Não entende autonomia real vs prometida' },
  ];

  const steps = [
    'Você responde algumas perguntas rápidas',
    'Eu analiso seu perfil de uso',
    'Te mostro o tipo ideal de bike elétrica',
    '(Opcional) Te ajudo pessoalmente no WhatsApp',
  ];

  // Quiz result view
  if (quizFinished) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="max-w-xl mx-auto px-6 py-16 text-center">
          {wantsWhatsApp ? (
            <>
              <div className="text-5xl mb-6">🔥</div>
              <h1 className="text-2xl sm:text-3xl font-extrabold mb-4 text-foreground">
                Com base nas suas respostas, já tenho uma recomendação ideal pra você.
              </h1>
              <p className="text-muted-foreground text-lg mb-10">
                Agora me chama no WhatsApp que eu te explico exatamente qual modelo faz sentido — e quais evitar.
              </p>
              <CTAButton href={WHATSAPP_QUIZ_URL}>Falar com especialista</CTAButton>
            </>
          ) : (
            <>
              <div className="text-5xl mb-6">✅</div>
              <h1 className="text-2xl sm:text-3xl font-extrabold mb-6 text-foreground">
                Com base no seu perfil, você precisa de uma bike com:
              </h1>
              <div className="space-y-3 text-left max-w-sm mx-auto mb-10">
                {[
                  'Boa autonomia',
                  'Motor compatível com seu uso',
                  'Bateria de qualidade (ESSENCIAL)',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-muted/50 p-4 rounded-xl border border-border">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-foreground font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground text-lg mb-8">
                Se quiser evitar erro e escolher com segurança, posso te ajudar direto no WhatsApp.
              </p>
              <CTAButton href={WHATSAPP_QUIZ_URL}>Falar com especialista</CTAButton>

              <div className="mt-12 bg-destructive/10 border border-destructive/20 rounded-xl p-6">
                <p className="text-destructive font-semibold">
                  ⚠️ Escolher errado pode te custar milhares de reais
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Quiz in progress
  if (quizStarted) {
    const q = questions[currentQuestion];
    const progress = ((currentQuestion) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Progress bar */}
        <div className="w-full h-2 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-lg w-full">
            <p className="text-muted-foreground text-sm mb-2 text-center">
              Pergunta {currentQuestion + 1} de {questions.length}
            </p>
            <div className="text-4xl text-center mb-4">{q.emoji}</div>
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 text-foreground">
              {q.title}
            </h2>
            <div className="space-y-3">
              {q.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(q.id, option.label)}
                  className="w-full flex items-center gap-4 p-4 sm:p-5 rounded-xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all duration-200 text-left group"
                >
                  <option.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                  <span className="text-foreground font-medium text-base sm:text-lg">{option.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main landing page
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="relative max-w-3xl mx-auto px-6 py-16 sm:py-24 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight mb-6 text-foreground">
            Vai comprar uma bike elétrica? Descubra em 2 minutos qual modelo é ideal — e evite jogar dinheiro fora
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
            A maioria das pessoas escolhe errado e só percebe depois. Eu te ajudo a escolher com base no seu uso, distância e orçamento.
          </p>
          <p className="text-sm sm:text-base text-muted-foreground mb-10">
            +10 anos no mercado &nbsp;|&nbsp; +R$100 milhões vendidos em veículos elétricos
          </p>
          <Button
            size="lg"
            onClick={() => setQuizStarted(true)}
            className="text-base sm:text-lg font-bold px-8 sm:px-12 py-6 sm:py-7 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-primary text-primary-foreground"
          >
            👉 Quero descobrir minha bike ideal
          </Button>
        </div>
      </section>

      {/* Common mistakes */}
      <section className="bg-muted/50 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-10">
            ⚠️ A maioria das pessoas comete esses erros ao comprar uma bike elétrica:
          </h2>
          <div className="space-y-3 max-w-xl mx-auto">
            {errors.map((err, i) => (
              <div key={i} className="flex items-start gap-3 bg-card p-4 rounded-xl shadow-sm border border-border">
                <err.icon className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <span className="text-foreground">{err.text}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-destructive font-semibold mt-8 text-lg">
            E o pior: só descobre depois que já gastou o dinheiro.
          </p>
        </div>
      </section>

      {/* Solution intro */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-muted-foreground text-lg mb-4">
            Foi exatamente por isso que eu criei esse guia rápido.
          </p>
          <h2 className="text-xl sm:text-2xl font-bold mb-8 text-foreground">
            Em menos de 2 minutos, você descobre qual tipo de bike elétrica faz sentido pra você — sem achismo.
          </h2>
          <Button
            size="lg"
            onClick={() => setQuizStarted(true)}
            className="text-base sm:text-lg font-bold px-8 sm:px-12 py-6 sm:py-7 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-primary text-primary-foreground"
          >
            👉 Começar agora
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/50 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-10">Como funciona:</h2>
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
        </div>
      </section>

      {/* Authority */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-muted-foreground text-lg mb-4">
            Eu trabalho há mais de 10 anos com veículos elétricos e já ajudei centenas de pessoas e empresas a escolherem o modelo certo — evitando prejuízo e dor de cabeça.
          </p>
          <Button
            size="lg"
            onClick={() => setQuizStarted(true)}
            className="mt-6 text-base sm:text-lg font-bold px-8 sm:px-12 py-6 sm:py-7 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-primary text-primary-foreground"
          >
            👉 Descobrir minha bike ideal agora
          </Button>
          <p className="text-muted-foreground text-sm mt-4">⏱️ Leva menos de 2 minutos</p>
        </div>
      </section>

      {/* Urgency */}
      <section className="bg-destructive/5 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-destructive font-bold text-lg sm:text-xl">
            ⚠️ Escolher errado pode te custar milhares de reais
          </p>
        </div>
      </section>
    </div>
  );
};

export default EscolherBike;
