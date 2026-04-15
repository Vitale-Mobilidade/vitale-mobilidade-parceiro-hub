import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, MessageCircle } from 'lucide-react';

const CTAButton = ({ children, className = "", href }: any) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-block ${className}`}>
    <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg font-bold px-8 py-6 rounded-xl shadow-lg bg-primary text-primary-foreground">
      <MessageCircle className="mr-2 h-5 w-5" />
      {children}
    </Button>
  </a>
);

const questions = [
  { id: 'uso', title: 'Qual será o principal uso da sua bike elétrica?', options: ['Trabalho (delivery / renda)', 'Locomoção diária', 'Lazer / passeio'] },
  { id: 'distancia', title: 'Quantos km você roda por dia?', options: ['Até 10 km', '10 a 25 km', 'Mais de 25 km'] },
  { id: 'trajeto', title: 'Como é o trajeto?', options: ['Plano', 'Misto', 'Muitas subidas'] },
  { id: 'orcamento', title: 'Qual seu orçamento?', options: ['Até R$5.000', 'R$5.000 a R$8.000', 'R$8.000+'] },
  { id: 'experiencia', title: 'Você já teve uma bike elétrica antes?', options: ['Sim', 'Não'] },
  { id: 'ajuda', title: 'Quer ajuda personalizada?', options: ['Sim', 'Não'] },
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

  const generateWhatsAppLink = () => {
    const message = `
Fala Lucas, vim do quiz.

Minhas respostas:

Uso: ${answers.uso || "-"}
Distância: ${answers.distancia || "-"}
Terreno: ${answers.trajeto || "-"}
Orçamento: ${answers.orcamento || "-"}
Experiência: ${answers.experiencia || "-"}

Quero ajuda para escolher minha bike ideal.
    `;

    return `https://wa.me/5511986893890?text=${encodeURIComponent(message)}`;
  };

  if (quizFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div className="max-w-xl">
          <h1 className="text-3xl font-bold mb-4">🔥 Já tenho uma recomendação ideal pra você</h1>

          <p className="mb-6">
            Agora me chama no WhatsApp que eu te explico exatamente qual modelo faz sentido — e quais evitar.
          </p>

          <CTAButton href={generateWhatsAppLink()}>
            Falar com especialista
          </CTAButton>
        </div>
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
      
      <h1 className="text-4xl font-bold mb-4">
        Vai comprar uma bike elétrica?
      </h1>

      <h2 className="text-2xl font-semibold mb-6">
        Descubra em 2 minutos qual modelo ideal — e evite jogar dinheiro fora
      </h2>

      <p className="mb-4">
        A maioria das pessoas escolhe errado e só percebe depois.
      </p>

      <p className="mb-8">
        +10 anos no mercado | +R$100 milhões vendidos
      </p>

      <Button onClick={() => setQuizStarted(true)}>
        👉 Começar agora
      </Button>
    </div>
  );
}
