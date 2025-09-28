import { Button } from '@/components/ui/button';
import { TrendingUp, Users, Building, Shield, Linkedin } from 'lucide-react';
import lucasVitalePhoto from '@/assets/lucas-vitale-photo.png';

const AboutUs = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511986893890?text=Ol%C3%A1%2C%0A%0AGostaria%20de%20agendar%20uma%20consultoria%20para%20entender%20como%20posso%20crescer%20no%20mercado%20de%20mobilidade%20el%C3%A9trica.%20Pode%20me%20ajudar%3F', '_blank');
  };

  const handleLinkedInClick = () => {
    window.open('https://www.linkedin.com/in/lucasvitale1/', '_blank');
  };

  const achievements = [
    {
      icon: TrendingUp,
      title: "+10 anos",
      description: "De experiência na linha de frente da mobilidade elétrica"
    },
    {
      icon: Building,
      title: "+R$100 milhões",
      description: "Movimentados em vendas ao longo da carreira"
    },
    {
      icon: Users,
      title: "Expansão Nacional",
      description: "Estruturação de operações no Brasil inteiro"
    },
    {
      icon: Shield,
      title: "B2B Expert",
      description: "Especialista em frotas elétricas e parcerias estratégicas"
    }
  ];

  return (
    <section id="sobre" className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-gray-900">
              Quem somos
            </h1>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-12 sm:mb-16">
            <div className="space-y-6 sm:space-y-8 order-2 lg:order-1">
              <div className="prose prose-lg max-w-none">
                <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed mb-6">
                  A <strong>Vitale Mobilidade</strong>, liderada por <strong>Lucas Vitale</strong>, <strong>nasceu para transformar experiência em estratégia</strong>. Após mais de 10 anos atuando na linha de frente da mobilidade elétrica no Brasil — movimentando mais de R$ 100 milhões em vendas e expandindo operações no Brasil inteiro — percebemos que muitos empreendedores e empresas ainda têm dúvidas na hora de escolher fornecedores, estruturar processos e crescer com segurança nesse mercado.
                </p>
                <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed mb-6">
                  Nossa <strong>missão é simples</strong>: compartilhar conhecimento prático para ajudar você a tomar decisões assertivas, reduzir riscos e acelerar seus resultados.
                </p>
                <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed font-medium">
                  Acreditamos que a mobilidade elétrica é um caminho sem volta — e estamos aqui para garantir que você esteja à frente dessa transformação.
                </p>
              </div>
            </div>

            <div className="space-y-6 order-1 lg:order-2">
              <div className="text-center">
                <div className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 mx-auto mb-6 rounded-xl overflow-hidden shadow-lg">
                  <img 
                    src={lucasVitalePhoto} 
                    alt="Lucas Vitale - Fundador da Vitale Mobilidade" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  onClick={handleLinkedInClick}
                  variant="outline"
                  className="bg-white hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300 px-6 py-3 text-base font-semibold transition-all duration-300"
                >
                  <Linkedin className="w-5 h-5 mr-2" />
                  Conheça o LinkedIn de Lucas Vitale
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                {achievements.map((achievement, index) => (
                  <div key={index} className="text-center p-4 sm:p-6 bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-100 hover:shadow-lg transition-shadow duration-300">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-green rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <achievement.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-2">{achievement.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{achievement.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-100 p-6 sm:p-8 lg:p-10 text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">
              Por que escolher a Vitale Mobilidade?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-10">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800 mb-3">Experiência Prática</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">Vivência real no mercado, não apenas teoria. Conhecimento validado em campo.</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800 mb-3">Networking Qualificado</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">Rede de fornecedores confiáveis e testados em todo o Brasil.</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800 mb-3">Visão Estratégica</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">Planejamento que evita erros custosos e acelera seus resultados.</p>
              </div>
            </div>
            
            <Button 
              onClick={handleWhatsAppClick}
              size="lg"
              className="bg-gradient-green hover:opacity-90 text-white px-6 sm:px-8 lg:px-10 py-3 sm:py-4 text-base sm:text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Agendar uma consultoria
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;