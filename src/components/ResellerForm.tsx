
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

const ResellerForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    city: '',
    state: '',
    storeType: '',
    interests: [] as string[],
    observations: ''
  });

  const estados = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  const storeTypes = ['Loja física', 'Online', 'Híbrida', 'Outro'];
  const productInterests = ['Bike elétrica', 'Triciclo passeio', 'Triciclo carga', 'Motos elétricas', 'Autopropelidos'];

  const handleInterestChange = (interest: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, interest]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        interests: prev.interests.filter(i => i !== interest)
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Cadastro enviado com sucesso!",
      description: "Entraremos em contato em breve para apresentar as condições de parceria."
    });
    setFormData({
      name: '',
      email: '',
      city: '',
      state: '',
      storeType: '',
      interests: [],
      observations: ''
    });
  };

  return (
    <section id="seja-revendedor" className="py-12 md:py-20 bg-gradient-to-br from-green-50 to-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left side - Benefits */}
          <div className="space-y-6 order-2 lg:order-1">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center lg:text-left">
              Seja um <span className="text-gradient-green">Revendedor Vitale</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-600 text-center lg:text-left">
              Aprenda a vender mais veículos elétricos com alta margem de lucro.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700 text-sm md:text-base">Margem de até 50% de lucro para o lojista</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700 text-sm md:text-base">Pedido mínimo de apenas 3 unidades</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700 text-sm md:text-base">Estoque com pronta entrega no Brasil</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700 text-sm md:text-base">Atendimento especializado</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700 text-sm md:text-base">Veículos com e sem necessidade de CNH</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700 text-sm md:text-base">Mix de produtos para todos os perfis</span>
              </div>
            </div>
          </div>

          {/* Right side - Form */}
          <Card className="shadow-xl w-full order-1 lg:order-2">
            <CardHeader className="bg-gradient-green text-white rounded-t-lg">
              <CardTitle className="text-lg md:text-xl text-center">Cadastre-se como revendedor</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm md:text-base">Nome *</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      name: e.target.value
                    }))} 
                    required 
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm md:text-base">E-mail *</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      email: e.target.value
                    }))} 
                    required 
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-sm md:text-base">Cidade *</Label>
                    <Input 
                      id="city" 
                      value={formData.city} 
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        city: e.target.value
                      }))} 
                      required 
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state" className="text-sm md:text-base">Estado *</Label>
                    <Select 
                      value={formData.state} 
                      onValueChange={value => setFormData(prev => ({
                        ...prev,
                        state: value
                      }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {estados.map(estado => (
                          <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="storeType" className="text-sm md:text-base">Tipo de loja *</Label>
                  <Select 
                    value={formData.storeType} 
                    onValueChange={value => setFormData(prev => ({
                      ...prev,
                      storeType: value
                    }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {storeTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm md:text-base">Interesse em quais produtos? *</Label>
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    {productInterests.map(interest => (
                      <div key={interest} className="flex items-center space-x-2">
                        <Checkbox 
                          id={interest} 
                          checked={formData.interests.includes(interest)} 
                          onCheckedChange={checked => handleInterestChange(interest, !!checked)} 
                        />
                        <Label htmlFor={interest} className="text-sm flex-1">{interest}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="observations" className="text-sm md:text-base">Observações adicionais</Label>
                  <Textarea 
                    id="observations" 
                    value={formData.observations} 
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      observations: e.target.value
                    }))} 
                    placeholder="Conte-nos mais sobre sua operação" 
                    className="mt-1 min-h-[80px]"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-green hover:opacity-90 text-white text-base md:text-lg py-3 mt-6"
                >
                  Quero me tornar um revendedor da Vitale
                </Button>

                <p className="text-xs text-gray-500 text-center mt-4">
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
