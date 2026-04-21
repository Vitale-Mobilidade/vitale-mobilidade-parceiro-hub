import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Phone } from 'lucide-react';

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
    <section id="contato" className="py-16 sm:py-20 md:py-24 lg:py-28 xl:py-32 bg-gradient-to-br from-green-50 to-background">
      <div className="responsive-container">
        <div className="text-center mb-10 sm:mb-14 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] xl:text-5xl font-bold mb-4 sm:mb-6">
            <span className="text-gradient-green">Agende sua consultoria</span> agora mesmo
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto">
            Dê o primeiro passo para estruturar sua operação de veículos elétricos com segurança e resultados
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center max-w-7xl mx-auto">
          {/* Left side - Benefits */}
          <div className="space-y-6 lg:space-y-8 order-2 lg:order-1">
            <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-center lg:text-left">
              O que você ganha com a <span className="text-gradient-green">consultoria:</span>
            </h3>
            
            <div className="space-y-3 sm:space-y-4 lg:space-y-5">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3 lg:space-x-4">
                  <div className="w-6 h-6 lg:w-7 lg:h-7 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs lg:text-sm">✓</span>
                  </div>
                  <span className="text-muted-foreground text-sm sm:text-base lg:text-lg xl:text-xl">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="bg-background rounded-xl p-6 sm:p-8 lg:p-10 shadow-md border border-green-100">
              <h4 className="font-semibold text-foreground mb-4 lg:mb-5 text-base lg:text-lg">Por que escolher a Vitale Mobilidade?</h4>
              <ul className="text-sm lg:text-base text-muted-foreground space-y-2 lg:space-y-3">
                <li>• 10 anos de experiência comprovada no setor</li>
                <li>• Participação em mais de R$100 milhões em vendas</li>
                <li>• Experiência nacional em grandes centros</li>
                <li>• Rede de fornecedores testada e confiável</li>
                <li>• Abordagem prática, não apenas teórica</li>
              </ul>
            </div>
          </div>

          {/* Right side - Call to Action */}
          <Card className="shadow-xl w-full order-1 lg:order-2 border-border">
            <CardHeader className="bg-gradient-green text-white rounded-t-lg py-6 lg:py-8">
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl text-center">Consultoria Estratégica</CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 lg:p-10 text-center space-y-6 lg:space-y-8">
              <div className="space-y-4 lg:space-y-5">
                <h3 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-foreground">
                  Pronto para entrar no mercado de veículos elétricos?
                </h3>
                <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground">
                  Agende uma conversa comigo e descubra como estruturar sua operação com segurança, 
                  evitar erros comuns e acelerar seus resultados no setor.
                </p>
              </div>

              <div className="space-y-4 lg:space-y-5">
                <Button 
                  onClick={handleWhatsAppClick}
                  className="w-full bg-gradient-green hover:opacity-90 text-white text-base sm:text-lg lg:text-xl py-4 sm:py-5 lg:py-6"
                >
                  <MessageCircle className="w-5 h-5 lg:w-6 lg:h-6 mr-2" />
                  Agendar consultoria
                </Button>

                <div className="text-center">
                  <p className="text-xs lg:text-sm text-muted-foreground mb-3">Ou entre em contato diretamente:</p>
                  <div className="flex justify-center items-center text-sm lg:text-base">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                      <span className="text-muted-foreground">(11) 98689-3890</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs lg:text-sm text-muted-foreground text-center">
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
