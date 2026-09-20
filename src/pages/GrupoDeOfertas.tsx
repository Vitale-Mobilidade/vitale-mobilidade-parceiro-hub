import { useEffect } from "react";

const GROUP_URL = "https://chat.whatsapp.com/DnYGmcdvGiN4GtWLaEreft?mode=gi_t";

const GrupoDeOfertas = () => {
  useEffect(() => {
    window.location.replace(GROUP_URL);
  }, []);

  return (
    <main>
      <a href={GROUP_URL}>Acessar o grupo de ofertas da Vitale</a>
    </main>
  );
};

export default GrupoDeOfertas;