import type { InputHTMLAttributes } from 'react';

export const getMobileInputProps = (type: string): InputHTMLAttributes<HTMLInputElement> => {
  const props: Record<string, InputHTMLAttributes<HTMLInputElement>> = {
    email: {
      inputMode: 'email',
      autoComplete: 'email',
      autoCorrect: 'off',
      autoCapitalize: 'none',
    },
    username: {
      inputMode: 'text',
      autoComplete: 'username',
      autoCorrect: 'off',
      autoCapitalize: 'none',
    },
    password: {
      autoComplete: 'new-password',
      spellCheck: false,
    },
    'current-password': {
      autoComplete: 'current-password',
      spellCheck: false,
    },
    tel: {
      inputMode: 'tel',
      autoComplete: 'tel',
    },
    url: {
      inputMode: 'url',
      autoComplete: 'url',
      autoCorrect: 'off',
      autoCapitalize: 'none',
    },
    search: {
      inputMode: 'search',
      autoComplete: 'off',
      autoCorrect: 'off',
    },
    number: {
      inputMode: 'decimal',
      autoComplete: 'off',
    },
    date: {
      inputMode: 'none',
    },
    time: {
      inputMode: 'none',
      readOnly: true,
    },
    datetime: {
      inputMode: 'none',
    },
    'street-address': {
      inputMode: 'text',
      autoComplete: 'street-address',
      autoCorrect: 'off',
    },
    'postal-code': {
      inputMode: 'text',
      autoComplete: 'postal-code',
      autoCorrect: 'off',
    },
  };

  return props[type] ?? {};
};

export const getPhoneProps = (): InputHTMLAttributes<HTMLInputElement> => ({
  inputMode: 'tel',
  autoComplete: 'tel',
  autoCorrect: 'off',
  autoCapitalize: 'none',
});

export const getEmailProps = (): InputHTMLAttributes<HTMLInputElement> => ({
  inputMode: 'email',
  autoComplete: 'email',
  autoCorrect: 'off',
  autoCapitalize: 'none',
});

export const getPasswordProps = (isNew = true): InputHTMLAttributes<HTMLInputElement> => ({
  inputMode: 'text',
  autoComplete: isNew ? 'new-password' : 'current-password',
  spellCheck: false,
});

export const getTimeProps = (): InputHTMLAttributes<HTMLInputElement> => ({
  inputMode: 'none',
  readOnly: true,
});
