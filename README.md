# TechNova Store

Protótipo local de loja feito com HTML, CSS e JavaScript. Não usa backend nem serviço externo: catálogo, estoque, contas e pedidos são guardados no `localStorage` do navegador.

## Abrir o projeto

Abra a pasta no VS Code e inicie `homepage.html` com a extensão Live Server. O Live Server serve os arquivos estáticos em `localhost`; ele não executa um backend. O uso de `localhost` permite que o navegador carregue os componentes compartilhados e a API Web Crypto usada no cadastro.

## Fluxo de demonstração

1. Crie uma conta em **Criar conta** e entre.
2. Na página de produtos, escolha quantidade e adicione itens ao carrinho.
3. Confirme o pedido para retirada no estabelecimento e pagamento presencial.
4. Acompanhe o pedido em **Minha conta**.
5. Abra `admin.html` no mesmo navegador para filtrar pedidos e alterar seus status.

O catálogo começa com três produtos e quantidades de estoque demonstrativas. A finalização confere os itens e o estoque atuais antes de gravar o pedido, preservando nome, quantidade e preço no momento da compra. Cancelar um pedido repõe o estoque local; reativá-lo confere o estoque disponível.

## Limites deste protótipo

Os dados pertencem apenas a este navegador e podem ser apagados pelo usuário. A autenticação local é apenas uma simulação: não protege dados contra acesso pelo próprio navegador nem permite distinguir com segurança um administrador de um cliente. Pedidos e estoque não são compartilhados entre dispositivos, e o armazenamento local não oferece transações de banco de dados. Não use este protótipo para vendas, credenciais ou dados reais. Um sistema de produção precisa de servidor, autenticação e banco de dados no lado do servidor.

Para reiniciar a demonstração, limpe o armazenamento local do site no navegador (as chaves `technovaStoreDb`, `carrinhoTechNova` e `technovaPendingOrder`).
