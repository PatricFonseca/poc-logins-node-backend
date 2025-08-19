# Configuração da Autenticação Google

## Problemas Corrigidos

1. ✅ Adicionada dependência `qs` e `@types/qs`
2. ✅ Corrigido GOOGLE_REDIRECT_URI para apontar para o backend (porta 4000)
3. ✅ Melhorado tratamento de erros no callback
4. ✅ Adicionados endpoints `/auth/me` e `/auth/logout`
5. ✅ Corrigido import do qs para default import
6. ✅ Adicionado AppService no módulo principal

## Como Configurar no Google Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a API "Google+ API" ou "People API"
4. Vá em "Credenciais" > "Criar Credenciais" > "ID do cliente OAuth 2.0"
5. Configure as URLs autorizadas:
   - **Origens JavaScript autorizadas**: `http://localhost:5173`
   - **URIs de redirecionamento autorizados**: `http://localhost:4000/auth/callback`

## Endpoints Disponíveis

- `GET /auth/google` - Inicia o fluxo OAuth
- `GET /auth/callback` - Callback do Google (não chamar diretamente)
- `GET /auth/me` - Retorna dados do usuário logado
- `GET /auth/logout` - Faz logout

## Como Testar

1. Inicie o servidor:
```bash
npm run start:dev
```

2. No seu frontend, redirecione para:
```javascript
window.location.href = 'http://localhost:4000/auth/google';
```

3. Após login, verifique se está autenticado:
```javascript
fetch('http://localhost:4000/auth/me', {
  credentials: 'include'
})
.then(res => res.json())
.then(user => console.log(user));
```

## Variáveis de Ambiente Necessárias

Certifique-se de que seu `.env` tem:
```
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/callback
COOKIE_SECRET=uma_chave_bem_longa_e_aleatoria
CORS_ORIGIN=http://localhost:5173
```

## Troubleshooting

- **Erro "redirect_uri_mismatch"**: Verifique se a URI no Google Console é exatamente `http://localhost:4000/auth/callback`
- **Erro de CORS**: Certifique-se de que CORS_ORIGIN está configurado corretamente
- **Cookie não sendo enviado**: Verifique se está usando `credentials: 'include'` nas requisições do frontend