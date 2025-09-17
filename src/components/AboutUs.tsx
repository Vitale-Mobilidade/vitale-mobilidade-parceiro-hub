import { Button } from '@/components/ui/button';
import { TrendingUp, Users, MapPin, Trophy } from 'lucide-react';

const AboutUs = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511968390253?text=Ol%C3%A1%2C%0A%0AGostaria%20de%20conversar%20com%20voc%C3%AA%20sobre%20como%20posso%20entrar%20no%20mercado%20de%20ve%C3%ADculos%20el%C3%A9tricos.%20Pode%20me%20ajudar%3F', '_blank');
  };

  const achievements = [
    {
      icon: TrendingUp,
      title: "10 anos de experiência",
      description: "Década de atuação no mercado de mobilidade elétrica"
    },
    {
      icon: Trophy,
      title: "+R$100 milhões em vendas",
      description: "Participação direta em vendas que ultrapassam R$100 milhões"
    },
    {
      icon: MapPin,
      title: "Expansão para 4 capitais",
      description: "São Paulo, Curitiba, Brasília e Rio de Janeiro"
    },
    {
      icon: Users,
      title: "Liderança de equipes",
      description: "Criação e gestão de times B2B e digitais"
    }
  ];

  return (
    <section id="sobre" className="py-8 sm:py-12 md:py-16 lg:py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 px-2">
              Sobre a <span className="text-gradient-green">Vitale Mobilidade</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-4xl mx-auto px-4">
              <strong>Transformamos conhecimento em resultados práticos para quem deseja crescer no mercado de veículos elétricos.</strong>
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-8 sm:mb-12">
            <div className="space-y-4 sm:space-y-6">
              <div className="prose prose-lg max-w-none">
                <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
                  Com <strong>10 anos de experiência</strong> no setor de veículos elétricos, construí uma trajetória sólida 
                  liderando equipes comerciais e expandindo operações para as principais capitais do Brasil.
                </p>
                <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
                  Participei diretamente de vendas que <strong>ultrapassam R$100 milhões</strong>, criando e gerenciando 
                  times B2B e digitais que revolucionaram a forma de vender mobilidade elétrica no país.
                </p>
                <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
                  Minha expertise inclui a <strong>expansão de operações para 4 capitais</strong> (São Paulo, Curitiba, 
                  Brasília e Rio de Janeiro), desenvolvimento de estratégias comerciais e criação de redes de 
                  fornecedores confiáveis.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {achievements.map((achievement, index) => (
                <div key={index} className="text-center p-4 sm:p-6 bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-100">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-green rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <achievement.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">{achievement.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">{achievement.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-100 p-6 sm:p-8 text-center">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">
              Meus Diferenciais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="text-center">
                <h4 className="font-semibold text-gray-800 mb-2">Experiência Prática</h4>
                <p className="text-sm text-gray-600">Vivência real no mercado, não apenas teoria</p>
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-gray-800 mb-2">Networking Qualificado</h4>
                <p className="text-sm text-gray-600">Rede de fornecedores confiáveis e testados</p>
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-gray-800 mb-2">Visão Estratégica</h4>
                <p className="text-sm text-gray-600">Planejamento que evita erros e acelera resultados</p>
              </div>
            </div>
            
            <Button 
              onClick={handleWhatsAppClick}
              className="bg-gradient-green hover:opacity-90 text-white px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold"
            >
              Converse comigo e descubra como posso ajudar
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;