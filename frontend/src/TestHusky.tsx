import React from 'react';

// Arquivo de teste para verificar se Husky + lint-staged está funcionando
// Este arquivo tem formatação propositalmente ruim

export const TestComponent: React.FC = () => {
  const mensagem = 'Testando Husky';
  const numero = 123;

  const objeto = {
    nome: 'Teste',
    idade: 25,
    ativo: true,
  };

  return (
    <div>
      <h1>{mensagem}</h1>
      <p>Número: {numero}</p>
      <p>Nome: {objeto.nome}</p>
    </div>
  );
};

export default TestComponent;
