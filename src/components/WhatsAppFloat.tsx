import { MessageCircle } from 'lucide-react';

const WhatsAppFloat = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511986893890?text=Ol%C3%A1%2C%0A%0AGostaria%20de%20agendar%20uma%20consultoria%20para%20entrar%20no%20mercado%20de%20ve%C3%ADculos%20el%C3%A9tricos.%20Voc%C3%AA%20pode%20me%20ajudar%3F', '_blank');
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full p-3 sm:p-4 shadow-lg hover:shadow-xl transition-all duration-300"
      aria-label="Abrir WhatsApp para consultoria"
    >
      <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
    </button>
  );
};

export default WhatsAppFloat;