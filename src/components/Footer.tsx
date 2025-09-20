
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
              Consultoria estratégica nacional em veículos elétricos. Ajudamos empresas a crescer no mercado com segurança.
            </p>
          </div>

          <div className="text-center sm:text-left">
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Serviços</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li><a href="#servicos" className="hover:text-white transition-colors">Diagnóstico de Mercado</a></li>
              <li><a href="#servicos" className="hover:text-white transition-colors">Avaliação de Fornecedores</a></li>
              <li><a href="#servicos" className="hover:text-white transition-colors">Estruturação Comercial</a></li>
              <li><a href="#servicos" className="hover:text-white transition-colors">Treinamento de Equipes</a></li>
            </ul>
          </div>

          <div className="text-center sm:text-left">
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Empresa</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li><a href="#sobre" className="hover:text-white transition-colors">Sobre Nós</a></li>
              <li><a href="#casos-sucesso" className="hover:text-white transition-colors">Casos de Sucesso</a></li>
              <li><a href="#conteudo" className="hover:text-white transition-colors">Conteúdo</a></li>
            </ul>
          </div>

          <div className="text-center sm:text-left">
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Contato</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li>📱 (11) 98689-3890</li>
              <li>📍 Atendimento Nacional</li>
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
