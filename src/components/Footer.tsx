const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-10 sm:py-12 md:py-16 lg:py-20">
      <div className="responsive-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-2 sm:space-x-3 mb-4 lg:mb-5">
              <img
                src="/lovable-uploads/d25498ea-45b8-4dca-a2c2-dcdb6a860b82.png"
                alt="Vitale Mobilidade - Consultoria em veículos elétricos"
                className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10"
              />
              <span className="text-lg sm:text-xl lg:text-2xl font-bold">Vitale Mobilidade</span>
            </div>
            <h2 className="sr-only">Sobre a Vitale Mobilidade</h2>
            <p className="text-gray-400 text-sm sm:text-base lg:text-lg leading-relaxed max-w-xs mx-auto sm:mx-0">
              <strong className="text-white">Consultoria estratégica nacional em veículos elétricos.</strong> Ajudamos empresas, lojistas e empreendedores a escolher fornecedores confiáveis, estruturar operações B2B e B2C e crescer com segurança no mercado de mobilidade elétrica.
            </p>
            <p className="text-gray-400 text-sm sm:text-base mt-4 max-w-xs mx-auto sm:mx-0">
              Mais de <strong className="text-white">10 anos de experiência</strong> e <strong className="text-white">R$ 100 milhões</strong> em vendas no setor.
            </p>
          </div>

          <div className="text-center sm:text-left">
            <h3 className="font-semibold mb-4 lg:mb-5 text-base sm:text-lg">Serviços</h3>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-400">
              <li><a href="#servicos" className="hover:text-white transition-colors">Diagnóstico de Mercado</a></li>
              <li><a href="#servicos" className="hover:text-white transition-colors">Avaliação de Fornecedores</a></li>
              <li><a href="#servicos" className="hover:text-white transition-colors">Estruturação Comercial</a></li>
              <li><a href="#servicos" className="hover:text-white transition-colors">Treinamento de Equipes</a></li>
            </ul>
          </div>

          <div className="text-center sm:text-left">
            <h3 className="font-semibold mb-4 lg:mb-5 text-base sm:text-lg">Empresa</h3>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-400">
              <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="#sobre" className="hover:text-white transition-colors">Sobre Nós</a></li>
              <li><a href="#casos-sucesso" className="hover:text-white transition-colors">Casos de Sucesso</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Perguntas Frequentes</a></li>
              <li><a href="#contato" className="hover:text-white transition-colors">Contato</a></li>
            </ul>
          </div>

          <div className="text-center sm:text-left">
            <h3 className="font-semibold mb-4 lg:mb-5 text-base sm:text-lg">Contato</h3>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-400">
              <li>
                <a href="https://wa.me/5511986893890" className="hover:text-white transition-colors">
                  📱 WhatsApp (11) 98689-3890
                </a>
              </li>
              <li>📍 Atendimento Nacional — Brasil</li>
              <li>🕒 Seg-Sex: 8h às 18h</li>
              <li>
                <a href="https://www.linkedin.com/in/lucasvitale1/" className="hover:text-white transition-colors" rel="noopener">
                  LinkedIn de Lucas Vitale
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 sm:mt-12 lg:mt-16 pt-8 sm:pt-10 lg:pt-12 text-center text-sm sm:text-base text-gray-400">
          <p>&copy; 2026 <strong className="text-white">Vitale Mobilidade</strong>. Todos os direitos reservados.</p>
          <p className="mt-2">Consultoria em veículos elétricos para uma mobilidade sustentável e lucrativa.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
