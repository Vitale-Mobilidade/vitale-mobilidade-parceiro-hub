import { useEffect } from "react";

const GROUP_URL = "https://chat.whatsapp.com/KwPwrNzMcEyB4uOKAVAWTJ?mode=gi_t";

const GrupoDeOfertas = () => {
  useEffect(() => {
    window.location.replace(GROUP_URL);
  }, []);

  return (
    <main>
      <a href={GROUP_URL} target="_blank" rel="noopener noreferrer">Acessar o grupo de ofertas da Vitale</a>
    </main>
  );
};

export default GrupoDeOfertas;
