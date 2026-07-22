// No login, salvar a senha temporariamente
const handleLogin = async (loginValue: string, password: string) => {
  sessionStorage.setItem('temp_password', password);
  // ... resto do login
};
