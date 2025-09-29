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
          {/* Desktop 50/50 Layout */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start mb-12 sm:mb-16">
            {/* Left Column - Photo and LinkedIn Button */}
            <div className="order-1 lg:order-1">
              <div className="text-center lg:text-left">
                <div className="w-80 h-80 sm:w-96 sm:h-96 lg:w-[400px] lg:h-[400px] xl:w-[450px] xl:h-[450px] mx-auto lg:mx-0 mb-6 rounded-2xl overflow-hidden shadow-xl">
                  <img 
                    src={lucasVitalePhoto} 
                    alt="Lucas Vitale - Fundador da Vitale Mobilidade" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  onClick={handleLinkedInClick}
                  variant="outline"
                  className="bg-white hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300 px-6 py-3 text-base font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <Linkedin className="w-5 h-5 mr-2" />
                  Conheça o LinkedIn de Lucas Vitale
                </Button>
              </div>
            </div>

            {/* Right Column - Title and Text */}
            <div className="order-2 lg:order-2 flex flex-col justify-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6 sm:mb-8 text-gray-900 text-center lg:text-left">
                Quem somos
              </h1>
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