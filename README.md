# Controle Financeiro Pessoal

Um aplicativo de planejamento financeiro completo, projetado para oferecer uma visão clara e projeções futuras de suas finanças, tudo isso rodando localmente no seu dispositivo.

## Sobre o Projeto

A ideia central deste projeto é fornecer uma ferramenta de controle financeiro que seja poderosa, privada e fácil de usar. Diferente de outras soluções que dependem de serviços na nuvem, este aplicativo armazena todos os dados diretamente no seu dispositivo, garantindo total privacidade e controle sobre suas informações.

Ele foi desenhado para quem recebe o pagamento em ciclos (salário e adiantamento/vale) e precisa de uma forma clara de visualizar para onde o dinheiro está indo e como será o balanço dos próximos meses.

## Funcionalidades Principais

*   **Visão por Ciclos:** As finanças são divididas em ciclos de pagamento (ex: Salário dia 5, Vale dia 20), alocando despesas ao ciclo mais próximo para um planejamento mais realista.
*   **Projeção Futura:** Visualize o balanço financeiro para os próximos 6 meses, com base em suas despesas fixas e parcelamentos.
*   **Importação Inteligente:** Importe extratos bancários em PDF ou texto. O aplicativo lê, interpreta, categoriza e detecta transações que já foram lançadas, evitando duplicatas.
*   **Lançamentos Manuais:** Adicione rendas e despesas manualmente com opções para contas fixas ou parceladas.
*   **Categorização:** Crie e personalize suas próprias categorias de despesa, com cores para fácil identificação nos gráficos.
*   **Dashboard Visual:** Gráficos e resumos que mostram de forma clara a distribuição de suas despesas e o balanço do mês.
*   **Backup e Restauração:** Exporte todos os seus dados para um arquivo JSON e restaure-os a qualquer momento.

## Como Funciona (Arquitetura)

Este projeto é construído com tecnologias web modernas e empacotado para mobile usando Capacitor.

*   **Frontend:** [Next.js](https://nextjs.org/) (um framework React).
*   **Estado Global:** A gestão de todo o estado da aplicação é feita com React Context API, centralizada no `FinancialContext`.
*   **Armazenamento de Dados:** **Não há banco de dados externo.** Todos os dados financeiros são persistidos localmente no navegador ou no dispositivo usando `localStorage`. Isso garante que seus dados são apenas seus.
*   **Mobile:** [Capacitor](https://capacitorjs.com/) é usado para transformar a aplicação web em um projeto nativo Android.

## Como Usar (Desenvolvimento)

Siga os passos abaixo para rodar o projeto em um ambiente de desenvolvimento.

**Pré-requisitos:**
*   [Node.js](https://nodejs.org/) (versão 18 ou superior)
*   `npm` ou `yarn`

**1. Clone o repositório:**
```bash
git clone https://github.com/seu-usuario/seu-repositorio.git
cd seu-repositorio
```

**2. Instale as dependências:**
```bash
npm install
```

**3. Rode o servidor de desenvolvimento:**
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para ver o resultado.

## Build para Android

A aplicação está configurada para gerar um APK para Android.

**Pré-requisitos:**
*   Android Studio instalado e configurado.
*   Java Development Kit (JDK) instalado.

**1. Gere a build da aplicação web:**
```bash
npm run build
```

**2. Sincronize com o Capacitor:**
Este comando copia os arquivos da web para o projeto nativo Android.
```bash
npx cap sync android
```

**3. Abra no Android Studio:**
```bash
npx cap open android
```

**4. Gere o APK:**
Dentro do Android Studio, vá para o menu `Build > Build Bundle(s) / APK(s) > Build APK(s)`. O arquivo `app-debug.apk` estará disponível na pasta `android/app/build/outputs/apk/debug/`.