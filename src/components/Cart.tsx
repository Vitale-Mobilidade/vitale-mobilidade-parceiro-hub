import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/hooks/useCart';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
const Cart = () => {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    total
  } = useCart();
  const {
    toast
  } = useToast();
  const [formData, setFormData] = useState({
    companyName: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    observations: ''
  });
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos ao carrinho antes de finalizar o pedido.",
        variant: "destructive"
      });
      return;
    }

    // Simular envio do pedido
    toast({
      title: "Pedido enviado com sucesso!",
      description: `Total: ${formatPrice(total)} - Entraremos em contato em breve.`
    });
    clearCart();
    setFormData({
      companyName: '',
      cnpj: '',
      email: '',
      phone: '',
      address: '',
      observations: ''
    });
  };
  if (items.length === 0) {
    return;
  }
  return <section id="carrinho" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          Finalizar <span className="text-gradient-green">Pedido</span>
        </h2>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Itens do Carrinho */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Itens do Pedido</h3>
            {items.map(item => <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-500 capitalize">{item.type}</p>
                      <p className="text-sm font-medium">{formatPrice(item.price)} / unidade</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, Math.max(3, item.quantity - 1))} disabled={item.quantity <= 3}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => removeItem(item.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="font-semibold">Subtotal: {formatPrice(item.price * item.quantity)}</span>
                  </div>
                </CardContent>
              </Card>)}
            
            <Card className="bg-primary text-white">
              <CardContent className="p-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total do Pedido:</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle>Dados para Finalização</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Nome ou Razão Social *</Label>
                  <Input id="companyName" value={formData.companyName} onChange={e => setFormData(prev => ({
                  ...prev,
                  companyName: e.target.value
                }))} required />
                </div>

                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input id="cnpj" value={formData.cnpj} onChange={e => setFormData(prev => ({
                  ...prev,
                  cnpj: e.target.value
                }))} placeholder="00.000.000/0000-00" required />
                </div>

                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => setFormData(prev => ({
                  ...prev,
                  email: e.target.value
                }))} required />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input id="phone" value={formData.phone} onChange={e => setFormData(prev => ({
                  ...prev,
                  phone: e.target.value
                }))} placeholder="(11) 99999-9999" required />
                </div>

                <div>
                  <Label htmlFor="address">Endereço Completo *</Label>
                  <Textarea id="address" value={formData.address} onChange={e => setFormData(prev => ({
                  ...prev,
                  address: e.target.value
                }))} placeholder="Rua, número, bairro, cidade, estado, CEP" required />
                </div>

                <div>
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea id="observations" value={formData.observations} onChange={e => setFormData(prev => ({
                  ...prev,
                  observations: e.target.value
                }))} placeholder="Informações adicionais sobre o pedido" />
                </div>

                <Button type="submit" className="w-full bg-gradient-green hover:opacity-90 text-white text-lg py-3">
                  Finalizar Pedido - {formatPrice(total)}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Após o envio, nossa equipe entrará em contato para confirmar o pedido e processar o pagamento.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>;
};
export default Cart;