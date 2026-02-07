import { MapPin, TrendingUp, Users, Award } from 'lucide-react';

const SuccessCases = () => {
  const cases = [
    {
      icon: MapPin,
      title: "Expansão Nacional",
      challenge: "Expandir operação de veículos elétricos para novas capitais",
      solution: "Desenvolvimento de estratégia de expansão e estruturação de equipes locais",
      result: "Operações implementadas com sucesso em território nacional com foco em grandes centros urbanos"
    },
    {
      icon: TrendingUp,
      title: "Crescimento B2B",
      challenge: "Criar canal B2B para distribuidores e lojistas",
      solution: "Estruturação de modelo comercial B2B com foco em margem e volume",
      result: "Participação em vendas que ultrapassaram R$100 milhões no setor"
    },
    {
      icon: Users,
      title: "Times Comerciais",
      challenge: "Formar equipes especializadas em mobilidade elétrica",
      solution: "Criação e treinamento de times comerciais e digitais focados no setor",
      result: "Equipes formadas geraram crescimento de 300% nas vendas em 12 meses"
    },
    {
      icon: Award,
      title: "Otimização de Custos",
      challenge: "Reduzir custos operacionais sem perder qualidade",
      solution: "Renegociação com fornecedores e otimização de processos",
      result: "Redução de 25% nos custos operacionais com melhoria na margem de lucro"
    }
  ];

  return (
    <section id="casos-sucesso" className="py-16 sm:py-20 md:py-24 lg:py-28 xl:py-32 bg-muted/50">
      <div className="responsive-container">
        <div className="text-center mb-10 sm:mb-14 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] xl:text-5xl font-bold mb-4 sm:mb-6">
            Casos de <span className="text-gradient-green">Sucesso</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto">
            Exemplos reais da minha experiência no mercado de veículos elétricos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 xl:gap-12 max-w-7xl mx-auto">
          {cases.map((case_, index) => (
            <div key={index} className="bg-background rounded-xl shadow-lg p-6 sm:p-8 lg:p-10 hover:shadow-xl transition-shadow border border-border">
              <div className="flex items-center mb-5 sm:mb-6 lg:mb-8">
                <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-18 lg:h-18 bg-gradient-green rounded-full flex items-center justify-center mr-4 lg:mr-5">
                  <case_.icon className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{case_.title}</h3>
              </div>
              
              <div className="space-y-4 lg:space-y-5">
                <div>
                  <h4 className="font-semibold text-red-600 mb-2 text-sm lg:text-base">Desafio:</h4>
                  <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">{case_.challenge}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-blue-600 mb-2 text-sm lg:text-base">Como a consultoria ajudou:</h4>
                  <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">{case_.solution}</p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 lg:p-5">
                  <h4 className="font-semibold text-green-800 mb-2 text-sm lg:text-base">Resultado alcançado:</h4>
                  <p className="text-sm sm:text-base lg:text-lg text-green-700 font-medium">{case_.result}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 sm:mt-16 lg:mt-20">
          <div className="bg-background rounded-2xl shadow-lg p-8 sm:p-10 lg:p-12 max-w-6xl mx-auto border border-border">
            <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-6 lg:mb-8">
              Depoimentos de Clientes
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 text-left">
              <blockquote className="bg-muted/50 p-6 sm:p-8 lg:p-10 rounded-xl border-l-4 border-green-500">
                <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground italic mb-4 lg:mb-5">
                  "A consultoria foi fundamental para estruturar nossa operação B2B. Os insights sobre fornecedores 
                  e estratégia comercial nos pouparam meses de tentativa e erro."
                </p>
                <footer className="text-sm lg:text-base font-semibold text-foreground">
                  — CEO de distribuidora, São Paulo
                </footer>
              </blockquote>
              
              <blockquote className="bg-muted/50 p-6 sm:p-8 lg:p-10 rounded-xl border-l-4 border-green-500">
                <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground italic mb-4 lg:mb-5">
                  "Conseguimos reduzir custos e aumentar nossa margem significativamente seguindo as orientações. 
                  O conhecimento de mercado fez toda a diferença."
                </p>
                <footer className="text-sm lg:text-base font-semibold text-foreground">
                  — Diretor comercial, Rio de Janeiro
                </footer>
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SuccessCases;
