# Defan Brechó

E-commerce completo inicial para brechó com Next.js, Firebase, Bootstrap, CSS inline e Mercado Pago preparado.

## Rodar

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Firebase

Crie um projeto Firebase e ative:

- Authentication com Email/Senha
- Firestore Database
- Storage

Depois preencha o `.env.local`.

## Admin

O admin é liberado pelo e-mail em:

```env
NEXT_PUBLIC_ADMIN_EMAIL=seuemail@email.com
```

## Mercado Pago

Preencha:

```env
MERCADO_PAGO_ACCESS_TOKEN=
NEXT_PUBLIC_SITE_URL=https://seudominio.com.br
```

A integração usa Checkout Pro por preferência de pagamento.
