
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Clock, DollarSign } from 'lucide-react';

const Consultoria = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511968390253?text=Ol%C3%A1%2C%0A%0ATenho%20interesse%20na%20consultoria.%20Como%20que%20funciona%3F', '_blank');
  };

  return (
    <section id="consultoria" className="py-20 bg-gradient-to-br from-green-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            <span className="text-gradient-green">Consultoria</span> Especializada
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Não sabe qual veículo elétrico escolher? Nossos especialistas podem te ajudar!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Lado esquerdo - Informações */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-primary">
                  O Foco do nosso trabalho:
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Você não sabe o que fazer? Qual veículo elétrico comprar? Está com algum problema? 
                  Quanto pagar? Como é o mercado do veículo elétrico que você quer? O que você precisa 
                  saber antes de tomar essa decisão?
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-primary">Alguns exemplos do que podemos te ajudar:</h4>
                  <ul className="space-y-1 text-gray-700">
                    <li>• Precisa usar para lazer?</li>
                    <li>• Precisa usar para deslocamento urbano?</li>
                    <li>• Precisa usar para trabalhar?</li>
                    <li>• Você tem uma empresa e precisa eletrificar a sua frota?</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-6 rounded-lg space-y-4">
                  <h4 className="font-semibold text-primary text-lg">Como funciona nossa consultoria:</h4>
                  <p className="text-gray-700">
                    A <strong>CONSULTORIA</strong> é o serviço para você. Nesse caso, você preencherá um formulário 
                    que o nosso time te enviará contando para nós o seu "dilema elétrico" e nós marcaremos uma 
                    conferência por vídeo para discutir o assunto com duração de até 45 minutos.
                  </p>
                  
                  <div className="flex flex-wrap gap-4 mt-6">
                    <div className="flex items-center space-x-2">
                      <Video className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">Videoconferência</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">Até 45 minutos</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">Atendimento matutino</span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">R$ 949,00</div>
                  <p className="text-gray-600">Investimento na consultoria</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lado direito - Call to Action */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-primary text-center">
                  Consultoria Especializada
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Precisa de ajuda para escolher o veículo elétrico ideal?
                  </h3>
                  <p className="text-gray-600">
                    Entre em contato conosco pelo WhatsApp e saiba como funciona nossa consultoria especializada. 
                    Nossos especialistas vão te ajudar a tomar a melhor decisão.
                  </p>
                </div>

                <Button 
                  onClick={handleWhatsAppClick}
                  className="w-full bg-gradient-green hover:opacity-90 text-white py-3 text-lg"
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
