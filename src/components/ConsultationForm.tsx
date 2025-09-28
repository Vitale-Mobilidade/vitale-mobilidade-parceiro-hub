import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Phone, Mail } from 'lucide-react';

const ConsultationForm = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511986893890?text=Ol%C3%A1%2C%0A%0AGostaria%20de%20agendar%20uma%20consultoria%20para%20entrar%20no%20mercado%20de%20ve%C3%ADculos%20el%C3%A9tricos.%20Voc%C3%AA%20pode%20me%20ajudar%3F', '_blank');
  };

  const benefits = [
    "Diagnóstico completo do seu negócio",
    "Indicação de fornecedores confiáveis",
    "Estratégia personalizada para seu perfil",
    "Orientação para evitar erros comuns",
    "Networking qualificado no setor",
    "Acompanhamento na implementação"
  ];

  return (
    <section id="contato" className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-green-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
            <span className="text-gradient-green">Agende sua consultoria</span> agora mesmo
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Dê o primeiro passo para estruturar sua operação de veículos elétricos com segurança e resultados
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side - Benefits */}
          <div className="space-y-6 order-2 lg:order-1">
            <h3 className="text-xl sm:text-2xl font-bold text-center lg:text-left">
              O que você ganha com a <span className="text-gradient-green">consultoria:</span>
            </h3>
            
            <div className="space-y-3 sm:space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-gray-700 text-sm sm:text-base">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md border border-green-100">
              <h4 className="font-semibold text-gray-800 mb-3">Por que escolher a Vitale Mobilidade?</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• 10 anos de experiência comprovada no setor</li>
                <li>• Participação em mais de R$100 milhões em vendas</li>
                <li>• Experiência nacional em grandes centros</li>
                <li>• Rede de fornecedores testada e confiável</li>
                <li>• Abordagem prática, não apenas teórica</li>
              </ul>
            </div>
          </div>

          {/* Right side - Call to Action */}
          <Card className="shadow-xl w-full order-1 lg:order-2">
            <CardHeader className="bg-gradient-green text-white rounded-t-lg">
              <CardTitle className="text-lg sm:text-xl text-center">Consultoria Estratégica</CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 text-center space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                  Pronto para entrar no mercado de veículos elétricos?
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Agende uma conversa comigo e descubra como estruturar sua operação com segurança, 
                  evitar erros comuns e acelerar seus resultados no setor.
                </p>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={handleWhatsAppClick}
                  className="w-full bg-gradient-green hover:opacity-90 text-white text-sm sm:text-base md:text-lg py-3 sm:py-4"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Agendar consultoria
                </Button>

                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-3">Ou entre em contato diretamente:</p>
                  <div className="flex justify-center items-center text-sm">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-green-600" />
                      <span className="text-gray-600">(11) 98689-3890</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Respondo em até 2 horas. Vamos conversar sobre seus objetivos e como posso ajudar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ConsultationForm;