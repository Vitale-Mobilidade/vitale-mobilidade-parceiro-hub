
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const ResellerForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    city: '',
    storeType: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast({
      title: "Cadastro enviado com sucesso!",
      description: "Entraremos em contato em breve para apresentar as condições de parceria.",
    });

    setFormData({
      name: '',
      email: '',
      city: '',
      storeType: ''
    });
  };

  return (
    <section id="seja-revendedor" className="py-20 bg-gradient-to-br from-green-50 to-white">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Seja um <span className="text-gradient-green">Revendedor Vitale</span>
            </h2>
            <p className="text-xl text-gray-600">
              Acesse nossa Área do Parceiro e aprenda a vender mais veículos elétricos com alta margem de lucro.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700">Margem de até 35% de lucro para o lojista</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700">Pedido mínimo de apenas 3 unidades</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700">Estoque com pronta entrega no Brasil</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700">Produtos com e sem exigência de CNH</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700">Apoio comercial e materiais de vendas</span>
              </div>
            </div>
          </div>

          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-green text-white rounded-t-lg">
              <CardTitle className="text-xl text-center">Formulário de Interesse</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Ex: São Paulo - SP"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="storeType">Tipo de Loja / Operação *</Label>
                  <Textarea
                    id="storeType"
                    value={formData.storeType}
                    onChange={(e) => setFormData(prev => ({ ...prev, storeType: e.target.value }))}
                    placeholder="Descreva seu negócio atual ou pretendido"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-green hover:opacity-90 text-white text-lg py-3"
                >
                  Quero Ser Revendedor
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Nossa equipe entrará em contato em até 24 horas para apresentar as condições de parceria.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ResellerForm;
