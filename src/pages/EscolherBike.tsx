import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, AlertTriangle, MessageCircle, Zap, Shield, Target, ArrowRight, Battery, Route, DollarSign, Bike } from 'lucide-react';

const WHATSAPP_QUIZ_URL = "https://wa.me/5511986893890?text=Fala%20Lucas%2C%20vim%20do%20quiz.%20Quero%20ajuda%20pra%20escolher%20minha%20bike%20ideal.";
const WHATSAPP_URL = "https://wa.me/5511986893890?text=Oi,%20vim%20do%20site%20e%20quero%20ajuda%20para%20escolher%20minha%20bike%20elétrica";

const CTAButton = ({ children, className = "", href = WHATSAPP_URL }: any) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-block ${className}`}>
    <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg font-bold px-8 sm:px-12 py-6 sm:py-7 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-primary text-primary-foreground">
      <MessageCircle className="mr-2 h-5 w-5" />
      {children}
    </Button>
  </a>
);

const questions = [
  {
    id: 'uso',
    emoji: '🚴',
    title: 'Qual será o principal uso da sua bike elétrica?',
    options: ['Trabalho (delivery / renda)', 'Locomoção diária (casa → trabalho)', 'Lazer / passeio'],
  },
  {
    id: 'distancia',
    emoji: '📏',
    title: 'Quantos km você roda por dia?',
    options: ['Até 10 km', '10 a 25 km', 'Mais de 25 km'],
  },
  {
    id: 'trajeto',
    emoji: '🛤️',
    title: 'Como é o trajeto?',
    options: ['Plano', 'Misto (subidas leves)', 'Muitas subidas'],
  },
  {
    id: 'orcamento',
    emoji: '💰',
    title: 'Qual seu orçamento?',
    options: ['Até R$5.000', 'R$5.000 a R$8.000', 'R$8.000+'],
  },
  {
    id: 'experiencia',
    emoji: '🔧',
    title: 'Você já teve uma bike elétrica antes?',
    options: ['Sim', 'Não'],
  },
  {
    id: 'ajuda',
    emoji: '🤝',
    title: 'Quer ajuda personalizada pra escolher o modelo ideal?',
    options: ['Sim, quero recomendação no WhatsApp', 'Prefiro ver opções sozinho'],
  },
];

export default function EscolherBike() {
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [quizFinished, setQuizFinished] = useState(false);

  const handleAnswer = (id: string, value: string) => {
    const updated = { ...answers, [id]: value };
    setAnswers(updated);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const wantsWhatsApp = answers.ajuda === 'Sim, quero recomendação no WhatsApp';

  if (quizFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        {wantsWhatsApp ? (
          <div className="max-w-xl">
            <h1 className="text-3xl font-bold mb-4">🔥 Já tenho uma recomendação ideal pra você</h1>

            <p className="mb-6">Agora você pode seguir de duas formas:</p>

            <div className="text-left mb-6">
              <p>👉 Ver recomendações gerais (gratuito)</p>
              <p>👉 Ou falar comigo e receber uma indicação exata, personalizada pro seu caso</p>
            </div>

            <p className="text-sm mb-6">
              Na consultoria, eu te mostro exatamente qual modelo comprar, quais evitar e como economizar.
            </p>

            <CTAButton href={WHATSAPP_QUIZ_URL}>Falar com especialista</CTAButton>
          </div>
        ) : (
          <div className="max-w-xl">
            <h1 className="text-3xl font-bold mb-6">Você precisa de uma bike com:</h1>

            <ul className="text-left mb-6">
              <li>✔ Boa autonomia</li>
              <li>✔ Motor compatível com seu uso</li>
              <li>✔ Bateria de qualidade (ESSENCIAL)</li>
            </ul>

            <CTAButton href={WHATSAPP_QUIZ_URL}>Falar com especialista</CTAButton>
          </div>
        )}
      </div>
    );
  }

  if (quizStarted) {
    const q = questions[currentQuestion];

    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div className="max-w-xl w-full">
          <p className="mb-2">Pergunta {currentQuestion + 1} de {questions.length}</p>
          <h2 className="text-2xl font-bold mb-6">{q.title}</h2>

          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(q.id, opt)}
                className="w-full p-4 border rounded-lg hover:border-primary"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-center px-6 py-20">
      <h1 className="text-4xl font-bold mb-6">
        Vai comprar uma bike elétrica? Descubra em 2 minutos qual modelo ideal — e evite jogar dinheiro fora
      </h1>

      <p className="mb-4">
        A maioria das pessoas escolhe errado e só percebe depois.
      </p>

      <p className="mb-4">
        +10 anos no mercado | +R$100 milhões vendidos
      </p>

      <div className="bg-gray-100 p-4 rounded-lg mb-6 max-w-xl mx-auto">
        <p>💡 Você pode fazer o quiz gratuitamente.</p>
        <p>Se quiser ajuda completa, ofereço consultoria personalizada.</p>
        <p className="font-bold mt-2">💰 Consultoria: R$XXX</p>
        <p className="text-sm">(100% opcional)</p>
      </div>

      <Button onClick={() => setQuizStarted(true)}>
        👉 Começar agora
      </Button>
    </div>
  );
}
