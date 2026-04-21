const FAQ = () => {
  const faqs = [
    {
      q: 'O que faz a Vitale Mobilidade?',
      a: 'Somos uma consultoria estratégica em veículos elétricos que ajuda empresas e empreendedores a escolher fornecedores confiáveis, estruturar operações comerciais B2B e B2C e crescer com segurança no mercado de mobilidade elétrica.',
    },
    {
      q: 'Quem pode contratar a consultoria?',
      a: 'Empreendedores que querem entrar no mercado de veículos elétricos, lojistas, distribuidores, frotistas e empresas que desejam estruturar ou expandir uma operação no setor.',
    },
    {
      q: 'A consultoria atende em todo o Brasil?',
      a: 'Sim. Atendemos clientes em todo o território nacional, com experiência consolidada em grandes centros urbanos e expansão para diferentes regiões.',
    },
    {
      q: 'Como funciona o primeiro contato?',
      a: 'O primeiro contato é uma conversa de diagnóstico via WhatsApp para entender seus objetivos, perfil de negócio e expectativas, antes de propor um plano personalizado.',
    },
    {
      q: 'A Vitale Mobilidade vende veículos elétricos?',
      a: 'Não. Atuamos exclusivamente como consultoria estratégica. Indicamos fornecedores testados e ajudamos a estruturar a operação, mas não comercializamos veículos.',
    },
    {
      q: 'Quais áreas a consultoria cobre?',
      a: 'Diagnóstico de mercado, avaliação e curadoria de fornecedores, estruturação comercial B2B/B2C/B2B2C, precificação, canais de distribuição e treinamento de equipes.',
    },
    {
      q: 'Quanto tempo dura uma consultoria?',
      a: 'Depende do escopo. Existem desde diagnósticos pontuais até acompanhamentos contínuos durante a implementação da estratégia, ajustados ao perfil de cada cliente.',
    },
    {
      q: 'Como agendar uma consultoria?',
      a: 'O agendamento é feito diretamente pelo WhatsApp (11) 98689-3890. Basta enviar uma mensagem informando seu objetivo para receber o retorno e iniciar o diagnóstico.',
    },
  ];

  return (
    <section id="faq" className="py-16 sm:py-20 md:py-24 lg:py-28 xl:py-32 bg-background">
      <div className="responsive-container">
        <div className="text-center mb-10 sm:mb-14 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] xl:text-5xl font-bold mb-4 sm:mb-6">
            Perguntas <span className="text-gradient-green">Frequentes</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto">
            Tire suas dúvidas sobre a consultoria em veículos elétricos da Vitale Mobilidade
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {faqs.map((item, i) => (
            <details
              key={i}
              className="group bg-gradient-to-br from-green-50 to-background border border-green-100 rounded-xl p-5 sm:p-6 lg:p-7 shadow-sm hover:shadow-md transition-shadow"
            >
              <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground leading-snug">
                  {item.q}
                </h3>
                <span
                  aria-hidden="true"
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-green text-white flex items-center justify-center text-lg leading-none transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
