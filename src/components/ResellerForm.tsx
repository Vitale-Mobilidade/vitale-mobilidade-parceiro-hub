
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ResellerForm = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511968390253?text=Ol%C3%A1%2C%0A%0ATenho%20interesse%20em%20comprar%203%20unidades%20para%20a%20minha%20loja.%20Voc%C3%AA%20pode%20me%20enviar%20o%20cat%C3%A1logo%20e%20as%20condi%C3%A7%C3%B5es%3F', '_blank');
  };

  return (
    <section id="seja-revendedor" className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-green-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side - Benefits */}
          <div className="space-y-6 order-2 lg:order-1">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center lg:text-left">
              Seja um <span className="text-gradient-green">Revendedor Vitale</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 text-center lg:text-left">
              Aprenda a vender mais veículos elétricos com alta margem de lucro.
            </p>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-gray-700 text-sm sm:text-base">Margem de até 50% de lucro para o lojista</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-gray-700 text-sm sm:text-base">Pedido mínimo de apenas 3 unidades</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-gray-700 text-sm sm:text-base">Estoque com pronta entrega no Brasil</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-gray-700 text-sm sm:text-base">Atendimento especializado</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-gray-700 text-sm sm:text-base">Veículos com e sem necessidade de CNH</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-gray-700 text-sm sm:text-base">Mix de produtos para todos os perfis</span>
              </div>
            </div>
          </div>

          {/* Right side - Call to Action */}
          <Card className="shadow-xl w-full order-1 lg:order-2">
            <CardHeader className="bg-gradient-green text-white rounded-t-lg">
              <CardTitle className="text-lg sm:text-xl text-center">Torne-se um revendedor</CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 text-center space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                  Pronto para começar a vender veículos elétricos?
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Entre em contato conosco pelo WhatsApp e receba todas as informações sobre nossa parceria, catálogo completo e condições especiais para revendedores.
                </p>
              </div>

              <Button 
                onClick={handleWhatsAppClick}
                className="w-full bg-gradient-green hover:opacity-90 text-white text-sm sm:text-base md:text-lg py-3 sm:py-4 mt-6"
              >
                Quero me tornar um revendedor da Vitale
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Nossa equipe entrará em contato em até 24 horas para apresentar as condições de parceria.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ResellerForm;
