
const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-6 sm:py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-2 mb-3 sm:mb-4">
              <img 
                src="/lovable-uploads/d25498ea-45b8-4dca-a2c2-dcdb6a860b82.png" 
                alt="Vitale Mobilidade" 
                className="w-6 h-6 sm:w-8 sm:h-8"
              />
              <span className="text-base sm:text-lg md:text-xl font-bold">Vitale Mobilidade</span>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-xs mx-auto sm:mx-0">
              Distribuidora B2B de veículos elétricos sustentáveis. Conectando lojistas ao futuro da mobilidade.
            </p>
          </div>

          <div className="text-center sm:text-left">
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Produtos</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li><a href="#catalogo" className="hover:text-white transition-colors">Bicicletas Elétricas</a></li>
              <li><a href="#catalogo" className="hover:text-white transition-colors">Triciclos Elétricos</a></li>
              <li><a href="#catalogo" className="hover:text-white transition-colors">Motos Elétricas</a></li>
              <li><a href="#catalogo" className="hover:text-white transition-colors">Catálogo Completo</a></li>
            </ul>
          </div>

          <div className="text-center sm:text-left">
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Parceiros</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li><a href="#seja-revendedor" className="hover:text-white transition-colors">Seja Revendedor</a></li>
              <li><a href="#consultoria" className="hover:text-white transition-colors">Consultoria</a></li>
              <li><a href="#calculadora" className="hover:text-white transition-colors">Calculadora</a></li>
            </ul>
          </div>

          <div className="text-center sm:text-left">
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Contato</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li className="break-words">📧 lucas.vitale@vitalemobilidade.com</li>
              <li>📱 (11) 96839-0253</li>
              <li>📍 São Paulo - SP</li>
              <li>🕒 Seg-Sex: 8h às 18h</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-4 sm:mt-6 md:mt-8 pt-4 sm:pt-6 md:pt-8 text-center text-xs sm:text-sm text-gray-400">
          <p>&copy; 2025 Vitale Mobilidade. Todos os direitos reservados.</p>
          <p className="mt-1 sm:mt-2">Mobilidade sustentável para um futuro melhor.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
