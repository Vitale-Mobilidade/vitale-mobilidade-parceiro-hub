import { MapPin, TrendingUp, Users, Award } from 'lucide-react';

const SuccessCases = () => {
  const cases = [
    {
      icon: MapPin,
      title: "Expansão Nacional",
      challenge: "Expandir operação de veículos elétricos para novas capitais",
      solution: "Desenvolvimento de estratégia de expansão e estruturação de equipes locais",
      result: "Operações implementadas com sucesso em 4 capitais: SP, Curitiba, Brasília e Rio de Janeiro"
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
    <section id="casos-sucesso" className="py-8 sm:py-12 md:py-16 lg:py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 px-2">
            Casos de <span className="text-gradient-green">Sucesso</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 px-4 max-w-3xl mx-auto">
            Exemplos reais da minha experiência no mercado de veículos elétricos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {cases.map((case_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg p-6 sm:p-8 hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-green rounded-full flex items-center justify-center mr-4">
                  <case_.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">{case_.title}</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Desafio:</h4>
                  <p className="text-sm sm:text-base text-gray-700">{case_.challenge}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-blue-600 mb-2">Como a consultoria ajudou:</h4>
                  <p className="text-sm sm:text-base text-gray-700">{case_.solution}</p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Resultado alcançado:</h4>
                  <p className="text-sm sm:text-base text-green-700 font-medium">{case_.result}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 sm:mt-12">
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 max-w-4xl mx-auto">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-4">
              Depoimentos de Clientes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <blockquote className="bg-gray-50 p-4 sm:p-6 rounded-lg border-l-4 border-green-500">
                <p className="text-sm sm:text-base text-gray-700 italic mb-3">
                  "A consultoria foi fundamental para estruturar nossa operação B2B. Os insights sobre fornecedores 
                  e estratégia comercial nos pouparam meses de tentativa e erro."
                </p>
                <footer className="text-sm font-semibold text-gray-800">
                  — CEO de distribuidora, São Paulo
                </footer>
              </blockquote>
              
              <blockquote className="bg-gray-50 p-4 sm:p-6 rounded-lg border-l-4 border-green-500">
                <p className="text-sm sm:text-base text-gray-700 italic mb-3">
                  "Conseguimos reduzir custos e aumentar nossa margem significativamente seguindo as orientações. 
                  O conhecimento de mercado fez toda a diferença."
                </p>
                <footer className="text-sm font-semibold text-gray-800">
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