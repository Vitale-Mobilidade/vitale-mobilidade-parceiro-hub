
const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-green rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-lg sm:text-xl font-bold">Vitale Mobilidade</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto sm:mx-0">
              Distribuidora B2B de veículos elétricos sustentáveis. Conectando lojistas ao futuro da mobilidade.
            </p>
          </div>

          <div className="text-center sm:text-left">
            <h4 className="font-semibold mb-4">Produtos</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#catalogo" className="hover:text-white transition-colors">Bicicletas Elétricas</a></li>
              <li><a href="#catalogo" className="hover:text-white transition-colors">Triciclos Elétricos</a></li>
              <li><a href="#catalogo" className="hover:text-white transition-colors">Motos Elétricas</a></li>
              <li><a href="#catalogo" className="hover:text-white transition-colors">Catálogo Completo</a></li>
            </ul>
          </div>

          <div className="text-center sm:text-left">
            <h4 className="font-semibold mb-4">Parceiros</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#seja-revendedor" className="hover:text-white transition-colors">Seja Revendedor</a></li>
              <li><a href="#consultoria" className="hover:text-white transition-colors">Consultoria</a></li>
              <li><a href="#calculadora" className="hover:text-white transition-colors">Calculadora</a></li>
            </ul>
          </div>

          <div className="text-center sm:text-left">
            <h4 className="font-semibold mb-4">Contato</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="break-words">📧 contato@vitalemobilidade.com.br</li>
              <li>📱 (11) 96839-0253</li>
              <li>📍 São Paulo - SP</li>
              <li>🕒 Seg-Sex: 8h às 18h</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2024 Vitale Mobilidade. Todos os direitos reservados.</p>
          <p className="mt-2">Mobilidade sustentável para um futuro melhor.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
