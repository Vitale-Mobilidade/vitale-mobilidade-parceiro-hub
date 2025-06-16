
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Clock, DollarSign } from 'lucide-react';

const Consultoria = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511968390253?text=Ol%C3%A1%2C%0A%0ATenho%20interesse%20na%20consultoria.%20Como%20que%20funciona%3F', '_blank');
  };

  return (
    <section id="consultoria" className="py-8 sm:py-12 md:py-16 lg:py-20 bg-gradient-to-br from-green-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
            <span className="text-gradient-green">Consultoria</span> Especializada
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-4 sm:mb-6 md:mb-8 px-2">
            Não sabe qual veículo elétrico escolher? Nossos especialistas podem te ajudar!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-start">
          {/* Lado esquerdo - Informações */}
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold text-primary">
                  O Foco do nosso trabalho:
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                  Você não sabe o que fazer? Qual veículo elétrico comprar? Está com algum problema? 
                  Quanto pagar? Como é o mercado do veículo elétrico que você quer? O que você precisa 
                  saber antes de tomar essa decisão?
                </p>
                
                <div className="space-y-2">
                  <h4 className="text-sm sm:text-base font-semibold text-primary">Alguns exemplos do que podemos te ajudar:</h4>
                  <ul className="space-y-1 text-sm sm:text-base text-gray-700">
                    <li>• Precisa usar para lazer?</li>
                    <li>• Precisa usar para deslocamento urbano?</li>
                    <li>• Precisa usar para trabalhar?</li>
                    <li>• Você tem uma empresa e precisa eletrificar a sua frota?</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-3 sm:p-4 md:p-6 rounded-lg space-y-3 sm:space-y-4">
                  <h4 className="text-sm sm:text-base md:text-lg font-semibold text-primary">Como funciona nossa consultoria:</h4>
                  <p className="text-xs sm:text-sm md:text-base text-gray-700">
                    A <strong>CONSULTORIA</strong> é o serviço para você. Nesse caso, você preencherá um formulário 
                    que o nosso time te enviará contando para nós o seu "dilema elétrico" e nós marcaremos uma 
                    conferência por vídeo para discutir o assunto com duração de até 45 minutos.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 mt-3 sm:mt-4 md:mt-6">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <Video className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary" />
                      <span className="text-xs sm:text-sm font-medium">Videoconferência</span>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary" />
                      <span className="text-xs sm:text-sm font-medium">Até 45 minutos</span>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary" />
                      <span className="text-xs sm:text-sm font-medium">Atendimento matutino</span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-2">R$ 949,00</div>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600">Investimento na consultoria</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lado direito - Call to Action */}
          <div>
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg md:text-xl font-bold text-primary text-center">
                  Consultoria Especializada
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 text-center space-y-3 sm:space-y-4 md:space-y-6">
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800">
                    Precisa de ajuda para escolher o veículo elétrico ideal?
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600">
                    Entre em contato conosco pelo WhatsApp e saiba como funciona nossa consultoria especializada. 
                    Nossos especialistas vão te ajudar a tomar a melhor decisão.
                  </p>
                </div>

                <Button 
                  onClick={handleWhatsAppClick}
                  className="w-full bg-gradient-green hover:opacity-90 text-white py-3 text-sm sm:text-base md:text-lg min-h-[44px]"
                >
                  Agendar Consultoria - R$ 949,00
                </Button>

                <p className="text-xs text-gray-500">
                  Videoconferência de até 45 minutos com nossos especialistas
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Consultoria;
