export const getMobileInputProps = (type: string) => {
  const props: Record<string, string | boolean | number> = {
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
      pattern: '[0-9]*',
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
  
  return props[type] || {};
};

export const getPhoneProps = () => ({
  inputMode: 'tel',
  autoComplete: 'tel',
  pattern: '[0-9]*',
  autoCorrect: 'off',
  autoCapitalize: 'none',
});

export const getEmailProps = () => ({
  inputMode: 'email',
  autoComplete: 'email',
  autoCorrect: 'off',
  autoCapitalize: 'none',
});

export const getPasswordProps = (isNew = true) => ({
  inputMode: 'text',
  autoComplete: isNew ? 'new-password' : 'current-password',
  spellCheck: false,
});
