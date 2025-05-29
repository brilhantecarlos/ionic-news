# Ionic News

Bem vindo ao Ionic News, o seu app favorito de notícias internacionais, com suporte completo para funcionamento offline.

## 📚 Contexto Acadêmico

Este projeto foi desenvolvido como atividade prática da disciplina **Desenvolvimento Mobile de Alta Performance**, ministrada pelo professor **João Ferreira**, no curso de **Análise e Desenvolvimento de Sistemas** da **Uninassau - Embarque Digital**, 4º período (turno noite).

## 💡 Descrição do Projeto

A aplicação consiste em um sistema de **notícias internacionais**, desenvolvido com foco em performance, modularidade e portabilidade. Ela permite que usuários recebam atualizações sobre notícias em tempo real, com uma interface intuitiva e adaptada para dispositivos móveis.

## ✨ Funcionalidades Principais

- **Visualização de Notícias por Categoria**: Acesse notícias em diferentes categorias (geral, negócios, tecnologia, entretenimento, etc.)
- **Modo Offline**: Acesso completo às notícias mesmo sem conexão com a internet
- **Indicador de Status de Conexão**: Interface intuitiva que mostra o status atual da conexão (online/offline)
- **Notificações de Status**: Alertas quando o status de conexão muda ou quando os dados são carregados do cache
- **Favoritos**: Salve suas notícias favoritas para acesso rápido

## 🚀 Otimizações de Performance

### Sistema de Cache Multicamada

- **Cache em Memória**: Armazenamento temporário de notícias em memória para acesso ultra-rápido
- **Cache SQLite (Nativo)**: Armazenamento persistente em dispositivos nativos usando SQLite
- **Cache LocalStorage (Web)**: Armazenamento persistente em ambiente web
- **TTL (Time-To-Live)**: Sistema inteligente que garante dados atualizados após 5 minutos

### Otimizações de Rede

- **Debounce de Requisições**: Evita chamadas duplicadas à API em curto período
- **Detecção Dual de Conectividade**: Combina Capacitor Network e navigator.onLine para detecção mais robusta
- **Listeners para Eventos de Conexão**: Detecta mudanças de status online/offline automaticamente
- **Processamento Assíncrono**: Salva dados em cache sem bloquear a interface do usuário

## 🔧 Tecnologias e Ferramentas Utilizadas

- **Ionic Framework / Angular** – Interface mobile híbrida
- **Capacitor** – Integração com funcionalidades nativas
- **SQLite** – Armazenamento persistente em dispositivos nativos
- **LocalStorage** – Armazenamento persistente em ambiente web
- **News API** – API de notícias em tempo real
- **RxJS** – Programação reativa para melhor gestão de eventos assíncronos

## 💶 Objetivo DevOps

O projeto busca aplicar conceitos essenciais da cultura DevOps, como:

- **Padronização de ambientes** via contêneres
- **Portabilidade da aplicação** entre sistemas diferentes
- **Redução de problemas de dependência**
- **Execução isolada da aplicação** para facilitar o desenvolvimento, testes e futuras entregas
- **Gerenciamento e versionamento de código** com o GitHub

## 📱 Como Executar

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Execute o app em modo de desenvolvimento: `ionic serve`
4. Para dispositivos nativos: `ionic capacitor add android` ou `ionic capacitor add ios`
5. Para compilar: `ionic capacitor build android` ou `ionic capacitor build ios`
