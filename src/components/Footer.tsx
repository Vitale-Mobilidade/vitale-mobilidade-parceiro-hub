
const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-green rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-xl font-bold">Vitale Mobilidade</span>
            </div>
            <p className="text-gray-400 text-sm">
              Distribuidora B2B de veículos elétricos sustentáveis. Conectando lojistas ao futuro da mobilidade.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Produtos</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#catalogo" className="hover:text-white transition-colors">Bicicletas Elétricas</a></li>
              <li><a href="#catalogo" className="hover:text-white transition-colors">Triciclos Elétricos</a></li>
              <li><a href="#catalogo" className="hover:text-white transition-colors">Motos Elétricas</a></li>
              <li><a href="#catalogo" className="hover:text-white transition-colors">Catálogo Completo</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Parceiros</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#seja-revendedor" className="hover:text-white transition-colors">Seja Revendedor</a></li>
              <li><a href="#consultoria" className="hover:text-white transition-colors">Consultoria</a></li>
              <li><a href="#calculadora" className="hover:text-white transition-colors">Calculadora</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contato</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>📧 contato@vitalemobilidade.com.br</li>
              <li>📱 (11) 99999-9999</li>
              <li>📍 São Paulo - SP</li>
              <li>🕒 Seg-Sex: 8h às 18h</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2024 Vitale Mobilidade. Todos os direitos reservados.</p>
          <p className="mt-2">Mobilidade sustentável para um futuro melhor.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
